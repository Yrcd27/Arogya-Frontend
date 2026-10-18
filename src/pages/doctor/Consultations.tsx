import { PageContent } from '../../components/PageContent';
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { StatusBadge } from '../../components/StatusBadge';
import { PaginationFooter } from '../../components/PaginationFooter';
import { toast } from 'react-toastify';
import { consultationAPI, Consultation, ConsultationUpdate, ConsultationWithTests } from "../../services/consultationService";
import { userAPI } from "../../services/userService";
import { clinicAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from '../../services/httpClient';
import { FileText, FlaskConical, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { focusFirstInvalidField, getApiFieldErrors } from '../../utils/formValidation';
import { CONSULTATION_FIELDS, isPositiveId, normalizeConsultation, validateConsultation, type ConsultationErrors, type ConsultationField } from '../../utils/clinicalValidation';

type PatientInfo = {
  id: number;
  name: string;
};

type ClinicInfo = {
  id: number;
  clinicName: string;
};

const isEmptyConsultationsResponse = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 400 &&
  error.bodyEmpty === true;

export default function Consultations() {
  const location = useLocation();
  const { user, sessionKey } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Record<number, PatientInfo>>({});
  const [clinics, setClinics] = useState<Record<number, ClinicInfo>>({});
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithTests | Consultation | null>(null);
  const [loadingLabTests, setLoadingLabTests] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
  const [editForm, setEditForm] = useState<ConsultationUpdate>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'single'; id: number } | { type: 'bulk' } | null>(null);
  const loadConsultationsRef = useRef<(displayPage: number, size?: number) => Promise<void>>(async () => undefined);
  const detailRequestRef = useRef(0);
  const listRequestRef = useRef(0);
  const listLoadingRef = useRef(false);
  const actionRef = useRef(false);
  const [actionPending, setActionPending] = useState(false);
  const editSavingRef = useRef(false);
  const editFormRef = useRef<HTMLFormElement>(null);
  const currentSessionRef = useRef(sessionKey);
  currentSessionRef.current = sessionKey;
  const [editErrors, setEditErrors] = useState<ConsultationErrors>({});
  const [editError, setEditError] = useState('');

  const sortByNewestFirst = (list: Consultation[]) =>
    [...list].sort((a, b) => {
      const aTime = a.bookedAt ? new Date(a.bookedAt).getTime() : 0;
      const bTime = b.bookedAt ? new Date(b.bookedAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return b.id - a.id;
    });

  useEffect(() => {
    currentSessionRef.current = sessionKey;
    actionRef.current = false;
    editSavingRef.current = false;
    setActionPending(false);
    setSavingEdit(false);
    setDeletingId(null);
    setBulkDeleting(false);
    setConsultations([]);
    setPatients({});
    setClinics({});
    setTotalElements(null);
    setSelectedIds(new Set());
    setSelectedConsultation(null);
    setEditingConsultation(null);
    setConfirmAction(null);
    void loadConsultationsRef.current(1);
    return () => {
      currentSessionRef.current = -1;
      listRequestRef.current += 1;
      detailRequestRef.current += 1;
    };
  }, [user?.id, sessionKey]);

  useEffect(() => {
    // Reload when returning from consultation creation
    if (location.state?.consultationCreated) {
      const timeoutId = setTimeout(() => {
        void loadConsultationsRef.current(1);
      }, 500);
      // Clear the state
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timeoutId);
    }
  }, [location.state]);

  const loadConsultations = async (displayPage: number, size: number = pageSize) => {
    const requestId = ++listRequestRef.current;
    const requestSession = sessionKey;
    const isCurrent = () => requestId === listRequestRef.current && currentSessionRef.current === requestSession;
    if (!user || !isPositiveId(user.id)) {
      listLoadingRef.current = false;
      setLoading(false);
      setError('The signed-in doctor could not be verified. Sign in again before loading consultations.');
      return;
    }
    listLoadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const [usersAll, clinicsAll] = await Promise.all([
        userAPI.getAllUsers(),
        clinicAPI.getAllClinics(),
      ]);
      if (!isCurrent()) return;

      let probedTotal: number;
      try {
        ({ total: probedTotal } = await consultationAPI.list({ doctorId: user.id, page: 0, size: 1 }));
      } catch (error) {
        if (!isCurrent()) return;
        if (!isEmptyConsultationsResponse(error)) throw error;
        setConsultations([]);
        setTotalElements(0);
        setCurrentPage(1);
        setSelectedIds(new Set());
        return;
      }
      if (!isCurrent()) return;
      const totalBackendPages = Math.max(1, Math.ceil(probedTotal / size));
      const safeDisplayPage = Math.min(Math.max(1, displayPage), totalBackendPages);
      const backendPageIndex = totalBackendPages - safeDisplayPage;

      const { items: data, total } = await consultationAPI.list({
        doctorId: user.id,
        page: backendPageIndex,
        size,
      });

      if (!isCurrent()) return;
      if (data.some(item => item.doctorId !== user.id)) throw new Error('The returned consultations do not match the signed-in doctor. Please try again.');
      if (safeDisplayPage === currentPage) {
        const previousPageIds = new Set(consultations.map(item => item.id));
        const returnedIds = new Set(data.map(item => item.id));
        setSelectedIds(previous => new Set([...previous].filter(id => !previousPageIds.has(id) || returnedIds.has(id))));
      }
      setConsultations(sortByNewestFirst(data));
      setTotalElements(total);
      setCurrentPage(safeDisplayPage);

      const patientMap: Record<number, PatientInfo> = {};
      (usersAll || []).forEach(u => {
        patientMap[u.id] = { id: u.id, name: u.username || `User #${u.id}` };
      });
      setPatients(patientMap);

      const clinicMap: Record<number, ClinicInfo> = {};
      (clinicsAll || []).forEach(c => {
        clinicMap[c.id] = { id: c.id, clinicName: c.clinicName || `Clinic #${c.id}` };
      });
      setClinics(clinicMap);
    } catch (err) {
      if (!isCurrent()) return;
      setError(err instanceof Error ? err.message : 'Failed to load consultations');
    } finally {
      if (isCurrent()) {
        listLoadingRef.current = false;
        setLoading(false);
      }
    }
  };

  loadConsultationsRef.current = loadConsultations;

  const canMutate = (id: number) => {
    if (actionRef.current || editSavingRef.current || listLoadingRef.current || currentSessionRef.current !== sessionKey) return false;
    const consultation = consultations.find(item => item.id === id);
    if (!isPositiveId(id) || !isPositiveId(user?.id) || consultation?.doctorId !== user?.id) {
      toast.error('The consultation or signed-in doctor could not be verified. Refresh before continuing.');
      return false;
    }
    return true;
  };

  const changeStatus = async (id: number, operation: 'complete' | 'cancel') => {
    if (!canMutate(id)) return false;
    const submittedSession = sessionKey;
    actionRef.current = true;
    setActionPending(true);
    try {
      const updated = await consultationAPI[operation](id);
      if (currentSessionRef.current !== submittedSession) return false;
      if (updated.id !== id || updated.doctorId !== user?.id) throw new Error('The service did not confirm the updated consultation. Refresh before continuing.');
      setConsultations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success(operation === 'complete' ? 'Consultation marked as complete' : 'Consultation cancelled');
      return true;
    } catch (err) {
      if (currentSessionRef.current !== submittedSession) return false;
      toast.error(err instanceof Error ? err.message : `Failed to ${operation} consultation`);
      return false;
    } finally {
      if (currentSessionRef.current === submittedSession) {
        actionRef.current = false;
        setActionPending(false);
      }
    }
  };

  const handleComplete = (id: number) => changeStatus(id, 'complete');
  const handleCancel = (id: number) => changeStatus(id, 'cancel');

  const openEdit = (c: Consultation) => {
    if (!canMutate(c.id)) return;
    setEditErrors({});
    setEditError('');
    setEditingConsultation(c);
    setEditForm({
      chiefComplaint: c.chiefComplaint || '',
      presentIllness: c.presentIllness || '',
      pastMedicalHistory: c.pastMedicalHistory || '',
      recommendations: c.recommendations || '',
    });
  };

  const closeEdit = () => {
    if (!editSavingRef.current) setEditingConsultation(null);
  };

  const changeEditField = (field: ConsultationField, value: string) => {
    if (editSavingRef.current) return;
    setEditForm(previous => ({ ...previous, [field]: value }));
    setEditError('');
    setEditErrors(previous => ({ ...previous, [field]: previous[field] ? validateConsultation({ ...editForm, [field]: value })[field] : undefined }));
  };

  const editProps = (field: ConsultationField) => ({
    id: `edit-consultation-${field}`,
    disabled: savingEdit,
    'aria-invalid': !!editErrors[field],
    'aria-describedby': editErrors[field] ? `edit-consultation-${field}-error` : undefined,
    onBlur: () => setEditErrors(previous => ({ ...previous, [field]: validateConsultation(editForm)[field] ?? previous[field] })),
  });

  const editFieldError = (field: ConsultationField) => editErrors[field]
    ? <p id={`edit-consultation-${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{editErrors[field]}</p> : null;

  const handleSaveEdit = async () => {
    if (editSavingRef.current || actionRef.current || listLoadingRef.current || !editingConsultation || currentSessionRef.current !== sessionKey) return;
    setEditError('');
    if (!isPositiveId(user?.id) || !isPositiveId(editingConsultation.id) || editingConsultation.doctorId !== user?.id) {
      setEditError('The consultation or signed-in doctor could not be verified. Reload your consultations before saving.');
      return;
    }
    const errors = validateConsultation(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length) {
      if (editFormRef.current) focusFirstInvalidField(editFormRef.current);
      return;
    }
    const submittedSession = sessionKey;
    editSavingRef.current = true;
    setSavingEdit(true);
    try {
      const updated = await consultationAPI.update(editingConsultation.id, normalizeConsultation(editForm));
      if (currentSessionRef.current !== submittedSession) return;
      if (updated.id !== editingConsultation.id || updated.doctorId !== user?.id) throw new Error('The service did not confirm the saved consultation. Refresh before editing again.');
      setConsultations((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      toast.success('Consultation updated');
      setEditingConsultation(null);
    } catch (err) {
      if (currentSessionRef.current !== submittedSession) return;
      const errors = getApiFieldErrors(err, CONSULTATION_FIELDS);
      setEditErrors(errors);
      if (Object.keys(errors).length) {
        if (editFormRef.current) focusFirstInvalidField(editFormRef.current);
      } else setEditError(err instanceof Error ? err.message : 'Failed to update consultation');
    } finally {
      if (currentSessionRef.current === submittedSession) {
        editSavingRef.current = false;
        setSavingEdit(false);
      }
    }
  };

  const handleDelete = (id: number) => {
    if (!canMutate(id)) return;
    setConfirmAction({ type: 'single', id });
  };

  const confirmSingleDelete = async (id: number) => {
    if (!canMutate(id)) return;
    const submittedSession = sessionKey;
    actionRef.current = true;
    setActionPending(true);
    setDeletingId(id);
    try {
      await consultationAPI.remove(id);
      if (currentSessionRef.current !== submittedSession) return;
      setSelectedIds(previous => new Set([...previous].filter(selectedId => selectedId !== id)));
      await loadConsultations(currentPage);
      if (currentSessionRef.current !== submittedSession) return;
      toast.success('Consultation deleted');
    } catch (err) {
      if (currentSessionRef.current !== submittedSession) return;
      toast.error(err instanceof Error ? err.message : 'Failed to delete consultation');
    } finally {
      if (currentSessionRef.current === submittedSession) {
        actionRef.current = false;
        setActionPending(false);
        setDeletingId(null);
        setConfirmAction(null);
      }
    }
  };

  const toggleSelectRow = (id: number) => {
    if (!canMutate(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    if (actionRef.current || editSavingRef.current || listLoadingRef.current) return;
    const pageIds = paginatedConsultations.map((c) => c.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0 || actionRef.current || editSavingRef.current || listLoadingRef.current) return;
    setConfirmAction({ type: 'bulk' });
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || ids.some(id => !isPositiveId(id)) || !isPositiveId(user?.id)
      || actionRef.current || editSavingRef.current || listLoadingRef.current || currentSessionRef.current !== sessionKey) return;
    const submittedSession = sessionKey;
    actionRef.current = true;
    setActionPending(true);
    setBulkDeleting(true);
    try {
      await consultationAPI.removeMany(ids);
      if (currentSessionRef.current !== submittedSession) return;
      setSelectedIds(new Set());
      await loadConsultations(currentPage);
      if (currentSessionRef.current !== submittedSession) return;
      toast.success(`${ids.length} consultation${ids.length > 1 ? 's' : ''} deleted`);
    } catch (err) {
      if (currentSessionRef.current !== submittedSession) return;
      toast.error(err instanceof Error ? err.message : 'Failed to delete selected consultations');
    } finally {
      if (currentSessionRef.current === submittedSession) {
        actionRef.current = false;
        setActionPending(false);
        setConfirmAction(null);
        setBulkDeleting(false);
      }
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const closeConsultationDetails = () => {
    if (actionRef.current) return;
    detailRequestRef.current += 1;
    setSelectedConsultation(null);
    setDetailError(null);
    setLoadingLabTests(false);
  };

  const handleConsultationClick = async (consultation: Consultation) => {
    if (actionRef.current || editSavingRef.current) return;
    const requestId = ++detailRequestRef.current;
    const requestSession = sessionKey;
    setSelectedConsultation(consultation);
    setLoadingLabTests(true);
    setDetailError(null);
    try {
      const withTests = await consultationAPI.getWithTests(consultation.id);
      if (requestId !== detailRequestRef.current || currentSessionRef.current !== requestSession) return;
      if (withTests.id !== consultation.id || withTests.patientId !== consultation.patientId || withTests.doctorId !== user?.id) throw new Error('The returned details do not match this consultation. Refresh before continuing.');
      setSelectedConsultation(withTests);
    } catch (err) {
      if (requestId !== detailRequestRef.current || currentSessionRef.current !== requestSession) return;
      console.error('Failed to load consultation details:', err);
      setDetailError(err instanceof Error ? err.message : 'Failed to load consultation details. Please try again.');
    } finally {
      if (requestId === detailRequestRef.current && currentSessionRef.current === requestSession) setLoadingLabTests(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((totalElements ?? 0) / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedConsultations = consultations;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex min-h-screen flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent fill={!loading && !error && consultations.length === 0}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600 text-sm mb-1">Dashboard / Consultations</p>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Consultations</h1>
                {!loading && (totalElements ?? 0) > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-[#38A3A5]/10 text-[#2d8284] text-xs font-semibold">
                    {totalElements}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-red-700 font-medium">{selectedIds.size} selected</span>
                  <button
                    onClick={handleBulkDelete}
                    disabled={actionPending || savingEdit || loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
                  </button>
                  <button
                    onClick={() => { if (!actionRef.current && !editSavingRef.current) setSelectedIds(new Set()); }}
                    disabled={actionPending || savingEdit}
                    className="text-sm text-gray-500 hover:text-gray-700 px-1"
                  >
                    Clear
                  </button>
                </div>
              )}
              <button
                onClick={() => { if (actionRef.current || editSavingRef.current) return; setSelectedIds(new Set()); void loadConsultations(currentPage); }}
                disabled={loading || actionPending || savingEdit}
                className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="text-gray-600">Loading consultations...</div>
            </div>
          ) : error ? null : consultations.length === 0 ? (
            <EmptyState variant="page" icon={<FileText />} title="No consultations yet"
              description="Your consultation records will appear here when available." />
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-4 text-left w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all consultations on this page"
                          disabled={actionPending || savingEdit}
                          checked={paginatedConsultations.length > 0 && paginatedConsultations.every((c) => selectedIds.has(c.id))}
                          onChange={toggleSelectAllOnPage}
                          className="w-4 h-4 text-[#38A3A5] border-gray-300 rounded focus:ring-[#38A3A5]"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Chief Complaint</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Booked At</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedConsultations.map((c) => (
                        <tr
                          key={c.id}
                          className={`hover:bg-gray-50 cursor-pointer ${selectedIds.has(c.id) ? 'bg-[#38A3A5]/5' : ''}`}
                          onClick={() => handleConsultationClick(c)}
                        >
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select consultation ${c.id}`}
                              disabled={actionPending || savingEdit}
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelectRow(c.id)}
                              className="w-4 h-4 text-[#38A3A5] border-gray-300 rounded focus:ring-[#38A3A5]"
                            />
                          </td>
                          <td className="px-6 py-4">
                            {patients[c.patientId]?.name ? (
                              <span className="text-sm text-gray-900">{patients[c.patientId]?.name}</span>
                            ) : (
                              <span className="inline-block h-4 w-24 bg-gray-200 rounded animate-pulse" />
                            )}
                            {clinics[c.clinicId]?.clinicName ? (
                              <p className="text-xs text-gray-500">{clinics[c.clinicId]?.clinicName}</p>
                            ) : (
                              <span className="block mt-1 h-3 w-16 bg-gray-100 rounded animate-pulse" />
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">{c.chiefComplaint || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{formatDateTime(c.bookedAt)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {c.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleComplete(c.id);
                                  }}
                                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Mark as complete"
                                  disabled={actionPending || savingEdit}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              {(c.status === 'SCHEDULED' || c.status === 'IN_PROGRESS') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel(c.id);
                                  }}
                                  className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Cancel consultation"
                                  disabled={actionPending || savingEdit}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(c);
                                }}
                                className="p-2 text-gray-500 hover:text-[#2d8284] hover:bg-[#38A3A5]/10 rounded-lg transition-colors"
                                title="Edit consultation"
                                disabled={actionPending || savingEdit}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(c.id);
                                }}
                                disabled={actionPending || savingEdit}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                title="Delete consultation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <PaginationFooter
                currentPage={safePage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalElements ?? 0}
                loading={loading || actionPending || savingEdit}
                onPageChange={(p) => loadConsultations(p)}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  loadConsultations(1, newSize);
                }}
              />
            </div>
          )}
        </PageContent>
      </div>

      {/* Detail Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={closeConsultationDetails}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Consultation Details</h3>
              <button onClick={closeConsultationDetails} disabled={actionPending} className="text-gray-500 hover:text-gray-700" aria-label="Close consultation details">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ID</label>
                <p className="text-gray-900">{selectedConsultation.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p>
                  <StatusBadge status={selectedConsultation.status} />
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Patient</label>
                <p className="text-gray-900">{patients[selectedConsultation.patientId]?.name || `Patient #${selectedConsultation.patientId}`}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Clinic</label>
                <p className="text-gray-900">{clinics[selectedConsultation.clinicId]?.clinicName || `Clinic #${selectedConsultation.clinicId}`}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Session Number</label>
                <p className="text-gray-900">{selectedConsultation.sessionNumber || '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Chief Complaint</label>
                <p className="text-gray-900">{selectedConsultation.chiefComplaint || '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Past Medical History</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedConsultation.pastMedicalHistory || '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Present Illness</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedConsultation.presentIllness || '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Recommendations</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedConsultation.recommendations || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Booked At</label>
                <p className="text-gray-900">{formatDateTime(selectedConsultation.bookedAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Completed At</label>
                <p className="text-gray-900">{formatDateTime(selectedConsultation.completedAt)}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">{formatDateTime(selectedConsultation.updatedAt)}</p>
              </div>
            </div>
            
            {/* Lab Tests Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-[#38A3A5]" />
                <h4 className="text-lg font-semibold text-gray-900">Lab Tests</h4>
              </div>
              
              {loadingLabTests ? (
                <div className="text-center py-4 text-gray-600">Loading lab tests...</div>
              ) : detailError ? (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-center text-red-700">
                  <p>{detailError}</p>
                  <button
                    type="button"
                    onClick={() => void handleConsultationClick(selectedConsultation)}
                    className="mt-2 text-sm font-medium text-red-800 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : !selectedConsultation || !('labTests' in selectedConsultation) || selectedConsultation.labTests.length === 0 ? (
                <EmptyState icon={<FlaskConical />} title="No lab tests requested"
                  description="No lab tests were requested for this consultation." headingLevel={5} />
              ) : (
                <div className="space-y-3">
                  {selectedConsultation.labTests.map((test) => (
                    <div key={test.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-[#38A3A5]" />
                          <h5 className="font-semibold text-gray-900">{test.testName}</h5>
                        </div>
                        <StatusBadge status={test.status} />
                      </div>
                      {test.testDescription && (
                        <p className="text-sm text-gray-700 mb-2">{test.testDescription}</p>
                      )}
                      {test.testInstructions && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-500">Instructions:</span>
                          <p className="text-sm text-gray-700 mt-1">{test.testInstructions}</p>
                        </div>
                      )}
                      {test.testResults && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                          <span className="text-xs font-medium text-green-700">Results:</span>
                          <p className="text-sm text-green-900 mt-1 whitespace-pre-wrap">{test.testResults}</p>
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                        <span>Test ID: {test.id}</span>
                        <span>Created: {formatDateTime(test.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              {selectedConsultation.status === 'IN_PROGRESS' && (
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={actionPending || savingEdit || loading}
                  onClick={async () => {
                    if (await handleComplete(selectedConsultation.id)) closeConsultationDetails();
                  }}
                >
                  Mark Complete
                </button>
              )}
              {(selectedConsultation.status === 'SCHEDULED' || selectedConsultation.status === 'IN_PROGRESS') && (
                <button
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  disabled={actionPending || savingEdit || loading}
                  onClick={async () => {
                    if (await handleCancel(selectedConsultation.id)) closeConsultationDetails();
                  }}
                >
                  Cancel Consultation
                </button>
              )}
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={actionPending}
                onClick={closeConsultationDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingConsultation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
          onClick={closeEdit}
        >
          <form
            ref={editFormRef}
            noValidate
            aria-busy={savingEdit}
            onSubmit={event => { event.preventDefault(); void handleSaveEdit(); }}
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Consultation #{editingConsultation.id}</h3>
                <p className="text-sm text-gray-500">
                  {patients[editingConsultation.patientId]?.name || `Patient #${editingConsultation.patientId}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                aria-label="Close edit consultation"
                disabled={savingEdit}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              {editError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editError}</div>}
              <div>
                <label htmlFor="edit-consultation-chiefComplaint" className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint *</label>
                <input
                  {...editProps('chiefComplaint')}
                  value={editForm.chiefComplaint || ''}
                  onChange={e => changeEditField('chiefComplaint', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent transition-colors"
                />
                {editFieldError('chiefComplaint')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-consultation-presentIllness" className="block text-sm font-medium text-gray-700 mb-2">Present Illness</label>
                  <textarea
                    {...editProps('presentIllness')}
                    value={editForm.presentIllness || ''}
                    onChange={e => changeEditField('presentIllness', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                  />
                  {editFieldError('presentIllness')}
                </div>
                <div>
                  <label htmlFor="edit-consultation-pastMedicalHistory" className="block text-sm font-medium text-gray-700 mb-2">Past Medical History</label>
                  <textarea
                    {...editProps('pastMedicalHistory')}
                    value={editForm.pastMedicalHistory || ''}
                    onChange={e => changeEditField('pastMedicalHistory', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                  />
                  {editFieldError('pastMedicalHistory')}
                </div>
              </div>
              <div>
                <label htmlFor="edit-consultation-recommendations" className="block text-sm font-medium text-gray-700 mb-2">Recommendations *</label>
                <textarea
                  {...editProps('recommendations')}
                  value={editForm.recommendations || ''}
                  onChange={e => changeEditField('recommendations', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                />
                {editFieldError('recommendations')}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmAction !== null}
        title={confirmAction?.type === 'bulk' ? 'Delete selected consultations?' : 'Delete consultation?'}
        message={
          confirmAction?.type === 'bulk'
            ? `Delete ${selectedIds.size} selected consultation${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`
            : 'Delete this consultation? This cannot be undone.'
        }
        confirmLabel="Delete"
        loading={confirmAction?.type === 'bulk' ? bulkDeleting : deletingId !== null}
        onCancel={() => { if (!actionRef.current) setConfirmAction(null); }}
        onConfirm={() => {
          if (confirmAction?.type === 'single') confirmSingleDelete(confirmAction.id);
          else if (confirmAction?.type === 'bulk') confirmBulkDelete();
        }}
      />
    </div>
  );
}
