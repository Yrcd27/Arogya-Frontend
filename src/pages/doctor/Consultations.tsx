import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmModal } from '../../components/ConfirmModal';
import { toast } from 'react-toastify';
import { consultationAPI, Consultation, ConsultationUpdate, ConsultationWithTests } from "../../services/consultationService";
import { userAPI } from "../../services/userService";
import { clinicAPI } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { FlaskConical, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';

type PatientInfo = {
  id: number;
  name: string;
};

type ClinicInfo = {
  id: number;
  clinicName: string;
};

export default function Consultations() {
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Record<number, PatientInfo>>({});
  const [clinics, setClinics] = useState<Record<number, ClinicInfo>>({});
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationWithTests | Consultation | null>(null);
  const [loadingLabTests, setLoadingLabTests] = useState(false);
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

  const sortByNewestFirst = (list: Consultation[]) =>
    [...list].sort((a, b) => {
      const aTime = a.bookedAt ? new Date(a.bookedAt).getTime() : 0;
      const bTime = b.bookedAt ? new Date(b.bookedAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return b.id - a.id;
    });

  useEffect(() => {
    void loadConsultationsRef.current(1);
  }, [user?.id]);

  useEffect(() => {
    // Reload when returning from consultation creation
    if (location.state?.consultationCreated) {
      setTimeout(() => {
        void loadConsultationsRef.current(1);
      }, 500);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadConsultations = async (displayPage: number, size: number = pageSize) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [usersAll, clinicsAll] = await Promise.all([
        userAPI.getAllUsers(),
        clinicAPI.getAllClinics(),
      ]);

      const { total: probedTotal } = await consultationAPI.list({ doctorId: user.id, page: 0, size: 1 });
      const totalBackendPages = Math.max(1, Math.ceil(probedTotal / size));
      const safeDisplayPage = Math.min(Math.max(1, displayPage), totalBackendPages);
      const backendPageIndex = totalBackendPages - safeDisplayPage;

      const { items: data, total } = await consultationAPI.list({
        doctorId: user.id,
        page: backendPageIndex,
        size,
      });

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
      setError("Failed to load consultations");
    } finally {
      setLoading(false);
    }
  };

  loadConsultationsRef.current = loadConsultations;

  const handleComplete = async (id: number) => {
    try {
      const updated = await consultationAPI.complete(id);
      setConsultations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success('Consultation marked as complete');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete consultation');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      const updated = await consultationAPI.cancel(id);
      setConsultations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success('Consultation cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel consultation');
    }
  };

  const openEdit = (c: Consultation) => {
    setEditingConsultation(c);
    setEditForm({
      chiefComplaint: c.chiefComplaint || '',
      presentIllness: c.presentIllness || '',
      pastMedicalHistory: c.pastMedicalHistory || '',
      recommendations: c.recommendations || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingConsultation) return;
    setSavingEdit(true);
    try {
      const updated = await consultationAPI.update(editingConsultation.id, editForm);
      setConsultations((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      toast.success('Consultation updated');
      setEditingConsultation(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update consultation');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmAction({ type: 'single', id });
  };

  const confirmSingleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await consultationAPI.remove(id);
      await loadConsultations(currentPage);
      toast.success('Consultation deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete consultation');
    } finally {
      setDeletingId(null);
      setConfirmAction(null);
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
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
    if (selectedIds.size === 0) return;
    setConfirmAction({ type: 'bulk' });
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      await consultationAPI.removeMany(ids);
      setSelectedIds(new Set());
      await loadConsultations(currentPage);
      toast.success(`${ids.length} consultation${ids.length > 1 ? 's' : ''} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete selected consultations');
    } finally {
      setConfirmAction(null);
      setBulkDeleting(false);
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

  const handleConsultationClick = async (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setLoadingLabTests(true);
    try {
      const withTests = await consultationAPI.getWithTests(consultation.id);
      setSelectedConsultation(withTests);
    } catch (err) {
      console.error('Failed to load consultation details:', err);
    } finally {
      setLoadingLabTests(false);
    }
  };

  const getLabTestStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const totalPages = Math.max(1, Math.ceil((totalElements ?? 0) / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedConsultations = consultations;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const windowSize = 1;
    for (let p = 1; p <= totalPages; p++) {
      if (
        p === 1 ||
        p === totalPages ||
        (p >= safePage - windowSize && p <= safePage + windowSize)
      ) {
        pages.push(p);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 lg:p-6">
          <div className="mb-6 flex justify-between items-center">
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
                    disabled={bulkDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    disabled={bulkDeleting}
                    className="text-sm text-gray-500 hover:text-gray-700 px-1"
                  >
                    Clear
                  </button>
                </div>
              )}
              <button
                onClick={() => loadConsultations(currentPage)}
                disabled={loading}
                className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="text-gray-600">Loading consultations...</div>
            </div>
          ) : consultations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm">
              <EmptyState 
                title="No consultations"
                description="Your consultation history will appear here"
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-4 text-left w-10">
                        <input
                          type="checkbox"
                          checked={paginatedConsultations.length > 0 && paginatedConsultations.every((c) => selectedIds.has(c.id))}
                          onChange={toggleSelectAllOnPage}
                          className="w-4 h-4 text-[#38A3A5] border-gray-300 rounded focus:ring-[#38A3A5]"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Clinic</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Chief Complaint</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Session #</th>
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
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelectRow(c.id)}
                              className="w-4 h-4 text-[#38A3A5] border-gray-300 rounded focus:ring-[#38A3A5]"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{c.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900">
                              {patients[c.patientId]?.name || `Patient #${c.patientId}`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900">
                              {clinics[c.clinicId]?.clinicName || `Clinic #${c.clinicId}`}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">{c.chiefComplaint || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">{c.sessionNumber || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{formatDateTime(c.bookedAt)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              c.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              c.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                              c.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {c.status}
                            </span>
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
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(c.id);
                                }}
                                disabled={deletingId === c.id}
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

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>
                    Showing <span className="font-medium text-gray-900">{startIndex + 1}</span>–
                    <span className="font-medium text-gray-900">{Math.min(startIndex + pageSize, totalElements ?? 0)}</span> of{' '}
                    <span className="font-medium text-gray-900">{totalElements ?? 0}</span>
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setPageSize(newSize);
                      loadConsultations(1, newSize);
                    }}
                    disabled={loading}
                    className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent disabled:opacity-60"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadConsultations(Math.max(1, safePage - 1))}
                    disabled={loading || safePage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  {getPageNumbers().map((p, idx) =>
                    p === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => loadConsultations(p)}
                        disabled={loading}
                        className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-60 ${
                          p === safePage
                            ? 'bg-[#38A3A5] text-white'
                            : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => loadConsultations(Math.min(totalPages, safePage + 1))}
                    disabled={loading || safePage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setSelectedConsultation(null)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Consultation Details</h3>
              <button onClick={() => setSelectedConsultation(null)} className="text-gray-500 hover:text-gray-700">
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
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedConsultation.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    selectedConsultation.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    selectedConsultation.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedConsultation.status}
                  </span>
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
              <div>
                <label className="text-sm font-medium text-gray-500">Queue Token ID</label>
                <p className="text-gray-900">{selectedConsultation.queueTokenId}</p>
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
              ) : !selectedConsultation || !('labTests' in selectedConsultation) || selectedConsultation.labTests.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  No lab tests requested for this consultation
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedConsultation.labTests.map((test) => (
                    <div key={test.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-[#38A3A5]" />
                          <h5 className="font-semibold text-gray-900">{test.testName}</h5>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLabTestStatusColor(test.status)}`}>
                          {test.status}
                        </span>
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
                  onClick={async () => {
                    await handleComplete(selectedConsultation.id);
                    setSelectedConsultation(null);
                  }}
                >
                  Mark Complete
                </button>
              )}
              {(selectedConsultation.status === 'SCHEDULED' || selectedConsultation.status === 'IN_PROGRESS') && (
                <button
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  onClick={async () => {
                    await handleCancel(selectedConsultation.id);
                    setSelectedConsultation(null);
                  }}
                >
                  Cancel Consultation
                </button>
              )}
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setSelectedConsultation(null)}
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
          onClick={() => !savingEdit && setEditingConsultation(null)}
        >
          <div
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
                onClick={() => setEditingConsultation(null)}
                disabled={savingEdit}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
                <input
                  value={editForm.chiefComplaint || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Present Illness</label>
                  <textarea
                    value={editForm.presentIllness || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, presentIllness: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Past Medical History</label>
                  <textarea
                    value={editForm.pastMedicalHistory || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, pastMedicalHistory: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recommendations</label>
                <textarea
                  value={editForm.recommendations || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, recommendations: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent resize-none transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                onClick={() => setEditingConsultation(null)}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
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
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.type === 'single') confirmSingleDelete(confirmAction.id);
          else if (confirmAction?.type === 'bulk') confirmBulkDelete();
        }}
      />
    </div>
  );
}
