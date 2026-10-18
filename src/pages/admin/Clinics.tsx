import { Select } from '../../components/Select';
import { PageContent } from '../../components/PageContent';
import { EmptyState } from '../../components/EmptyState';
import { useState, useEffect, useRef } from 'react';
import { useLinkedSearch } from '../../hooks/useLinkedSearch';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { SearchIcon, PlusIcon, CalendarIcon, UsersIcon, EditIcon, TrashIcon, XIcon, XCircle, CheckIcon } from 'lucide-react';
import { clinicAPI, clinicDoctorAPI, doctorAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { Clinic, Doctor, SelectedDoctor, PROVINCES_DISTRICTS } from '../../types/clinic';
import {
  CLINIC_FIELDS,
  CLINIC_LOCATION_MAX_LENGTH,
  CLINIC_NAME_MAX_LENGTH,
  CLINIC_STATUSES,
  validateClinicFields,
  getDistrictOptions,
  type ClinicField,
  formatTimeForAPI,
  filterClinics,
  sortClinics
} from '../../utils/clinic';
import { focusFirstInvalidField, getApiFieldErrors, type FieldErrors } from '../../utils/formValidation';
import { localDateString } from '../../utils/profileValidation';
import { isPositiveId } from '../../utils/clinicalValidation';
import { useAuth } from '../../hooks/useAuth';
import { ClinicCard } from '../../components/clinic/ClinicCard';
import { DoctorSearch } from '../../components/clinic/DoctorSearch';
import { DatePicker } from '../../components/DatePicker';
import { TimePicker } from '../../components/TimePicker';

export function Clinics() {
  const { user, sessionKey } = useAuth();
  const currentSessionRef = useRef(sessionKey);
  currentSessionRef.current = sessionKey;
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctorCounts, setDoctorCounts] = useState<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  useLinkedSearch(setSearchTerm);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [clinicToDelete, setClinicToDelete] = useState<Clinic | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [doctorLookupFailed, setDoctorLookupFailed] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ClinicField>>({});
  const [saving, setSaving] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const deleteRef = useRef(false);
  const assignmentsReadyRef = useRef(false);
  const assignmentsLoadingRef = useRef(false);
  const assignmentRequestRef = useRef(0);
  const listRequestRef = useRef(0);
  const doctorsRequestRef = useRef(0);
  const editingClinicIdRef = useRef<number | null>(null);
  const originalDoctorIdsRef = useRef<number[]>([]);
  const loadClinicsRef = useRef<() => Promise<void>>(async () => undefined);
  const loadDoctorsRef = useRef<() => Promise<void>>(async () => undefined);

  // Form state
  const [formData, setFormData] = useState({
    clinicName: '',
    province: '',
    district: '',
    location: '',
    scheduledDate: '',
    scheduledTime: '',
    status: 'SCHEDULED'
  });

  // Doctor search and selection state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<SelectedDoctor[]>([]);
  const [doctorToRemove, setDoctorToRemove] = useState<{ doctor: SelectedDoctor; session: number; clinicId: number | null } | null>(null);
  const [confirmingCancellation, setConfirmingCancellation] = useState(false);
  const clinicFormRef = useRef<HTMLFormElement>(null);

  // Load clinics on component mount
  useEffect(() => {
    void loadClinicsRef.current();
    void loadDoctorsRef.current();
    setIsModalOpen(false);
    setDoctorToRemove(null);
    setConfirmingCancellation(false);
    assignmentRequestRef.current += 1;
    return () => {
      listRequestRef.current += 1;
      doctorsRequestRef.current += 1;
      assignmentRequestRef.current += 1;
    };
  }, [sessionKey]);

  // Batch doctor count fetching with concurrency control to prevent triggering API Gateway rate limiting (HTTP 429)
  const loadDoctorCountsInBatches = async (clinicList: Clinic[], requestId: number, requestSession: number) => {
    const batchSize = 2;
    for (let i = 0; i < clinicList.length; i += batchSize) {
      if (listRequestRef.current !== requestId || currentSessionRef.current !== requestSession) return;
      const batch = clinicList.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (c) => {
          try {
            const assigned = await clinicDoctorAPI.getClinicDoctorsByClinicId(c.id);
            return { id: c.id, count: assigned?.length || 0 };
          } catch {
            return { id: c.id, count: 0 };
          }
        })
      );
      if (listRequestRef.current !== requestId || currentSessionRef.current !== requestSession) return;
      setDoctorCounts(prev => {
        const next = { ...prev };
        batchResults.forEach(r => { next[r.id] = r.count; });
        return next;
      });
      if (i + batchSize < clinicList.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const loadClinics = async () => {
    const requestId = ++listRequestRef.current;
    const requestSession = sessionKey;
    try {
      setIsLoading(true);
      setListError(null);
      const data = await clinicAPI.getAllClinics();
      if (listRequestRef.current !== requestId || currentSessionRef.current !== requestSession) return;
      const list = data || [];
      setClinics(list);
      void loadDoctorCountsInBatches(list, requestId, requestSession);
    } catch (error) {
      if (listRequestRef.current !== requestId || currentSessionRef.current !== requestSession) return;
      console.error('Failed to load clinics:', error);
      setListError(error instanceof Error ? error.message : 'Failed to load clinics');
    } finally {
      if (listRequestRef.current === requestId && currentSessionRef.current === requestSession) setIsLoading(false);
    }
  };

  const loadDoctors = async () => {
    const requestId = ++doctorsRequestRef.current;
    const requestSession = sessionKey;
    try {
      setDoctorsLoading(true);
      setDoctorsError(null);
      const data = await doctorAPI.getAllDoctors();
      if (doctorsRequestRef.current !== requestId || currentSessionRef.current !== requestSession) return;
      setDoctors(data || []);
    } catch (error) {
      if (doctorsRequestRef.current !== requestId || currentSessionRef.current !== requestSession) return;
      console.error('Failed to load doctors:', error);
      setDoctors([]);
      setDoctorsError(error instanceof Error ? error.message : 'Could not load the available doctors.');
    } finally {
      if (doctorsRequestRef.current === requestId && currentSessionRef.current === requestSession) setDoctorsLoading(false);
    }
  };

  loadClinicsRef.current = loadClinics;
  loadDoctorsRef.current = loadDoctors;

  const allowedDoctorIds = () => [...doctors.map(doctor => doctor.doctorId), ...originalDoctorIdsRef.current];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (savingRef.current) return;
    const { name, value } = e.target;
    const field = name as Exclude<ClinicField, 'doctorIds'>;
    const next = {
      ...formData,
      [name]: value,
      ...(name === 'province' && { district: '' }) // Reset district when province changes
    };
    setFormData(next);
    setError(null);
    const errors = validateClinicFields(next, selectedDoctors, isEditMode, allowedDoctorIds());
    setFieldErrors(previous => ({ ...previous, [field]: previous[field] ? errors[field] : undefined, ...(field === 'province' && { district: undefined }) }));
  };

  const fieldProps = (field: ClinicField) => ({
    id: `clinic-${field}`,
    disabled: saving,
    'aria-invalid': !!fieldErrors[field],
    'aria-describedby': fieldErrors[field] ? `clinic-${field}-error` : undefined,
    onBlur: () => {
      if (savingRef.current) return;
      if (field === 'clinicName' || field === 'location') setFormData(previous => ({ ...previous, [field]: previous[field].trim() }));
      const message = validateClinicFields(formData, selectedDoctors, isEditMode, allowedDoctorIds())[field];
      setFieldErrors(previous => ({ ...previous, [field]: message ?? previous[field] }));
    },
  });

  const fieldError = (field: ClinicField) => fieldErrors[field]
    ? <p id={`clinic-${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors[field]}</p> : null;

  const handleDoctorSelect = (doctor: Doctor) => {
    if (savingRef.current || assignmentsLoadingRef.current || isEditMode && !assignmentsReadyRef.current) return;
    if (!isPositiveId(doctor.doctorId) || !doctors.some(item => item.doctorId === doctor.doctorId)) {
      setFieldErrors(previous => ({ ...previous, doctorIds: 'Select a doctor from the available list.' }));
      return;
    }
    setSelectedDoctors(prev => prev.some(selected => selected.doctorId === doctor.doctorId) ? prev : [...prev, {
        doctorId: doctor.doctorId,
        name: doctor.name,
        specialization: doctor.specialization
      }]);
    
    setFieldErrors(previous => ({ ...previous, doctorIds: undefined }));
  };

  const handleRemoveDoctor = (doctorId: number) => {
    if (savingRef.current || assignmentsLoadingRef.current || isEditMode && !assignmentsReadyRef.current) return;
    if (!isModalOpen || !doctorToRemove || doctorToRemove.doctor.doctorId !== doctorId
      || doctorToRemove.session !== currentSessionRef.current || doctorToRemove.clinicId !== editingClinicIdRef.current
      || !selectedDoctors.some(doctor => doctor.doctorId === doctorId)) return;
    setSelectedDoctors(prev => prev.filter(doctor => doctor.doctorId !== doctorId));
    setFieldErrors(previous => ({ ...previous, doctorIds: previous.doctorIds && selectedDoctors.length <= 1 ? 'At least one doctor must be assigned to the clinic.' : undefined }));
    setDoctorToRemove(null);
  };

  const validateForm = () => {
    if (isEditMode && !assignmentsReadyRef.current) {
      setError('Could not confirm the currently assigned doctors — retry loading them before saving, or this would remove all doctor assignments.');
      return false;
    }
    const errors = validateClinicFields(formData, selectedDoctors, isEditMode, allowedDoctorIds());
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || assignmentsLoadingRef.current || doctorToRemove || confirmingCancellation) return;
    const form = e.currentTarget as HTMLFormElement;
    setError(null);

    if (!isPositiveId(user?.id) || isEditMode && (!editingClinic || !isPositiveId(editingClinic.id) || editingClinicIdRef.current !== editingClinic.id)) {
      setError('The signed-in user or clinic could not be verified. Reload the page before saving.');
      return;
    }

    if (!validateForm()) {
      focusFirstInvalidField(form);
      return;
    }

    if (isEditMode && editingClinic?.status !== 'CANCELLED' && formData.status === 'CANCELLED') {
      setConfirmingCancellation(true);
      return;
    }
    await saveClinic();
  };

  const saveClinic = async () => {
    if (savingRef.current || assignmentsLoadingRef.current || currentSessionRef.current !== sessionKey) return;
    const form = clinicFormRef.current;
    if (!form || !isModalOpen || !isPositiveId(user?.id)
      || isEditMode && (!editingClinic || editingClinicIdRef.current !== editingClinic.id)) return;
    if (!validateForm()) {
      focusFirstInvalidField(form);
      return;
    }
    const requestSession = sessionKey;
    savingRef.current = true;
    setSaving(true);
    try {

      // Step 1: Create clinic with doctor IDs included
      const clinicData = {
        clinicName: formData.clinicName.trim(),
        province: formData.province,
        district: formData.district,
        location: formData.location.trim() || undefined,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formatTimeForAPI(formData.scheduledTime), // Ensure proper format
        status: formData.status,
        doctorIds: selectedDoctors.map(doctor => doctor.doctorId) // Include doctor IDs for backend
      };

      if (isEditMode && editingClinic) {
        // Update clinic with doctor assignments - backend handles doctor assignment via doctorIds
        await clinicAPI.updateClinic({ ...clinicData, id: editingClinic.id });
      } else {
        // Create clinic with doctors assigned via doctorIds field
        await clinicAPI.createClinic(clinicData);
      }

      if (currentSessionRef.current !== requestSession) return;

      // Success
      setIsModalOpen(false);
      resetForm();
      void loadClinics();
      setRefreshTrigger(prev => prev + 1); // Trigger refresh of clinic cards
      toast.success(isEditMode ? 'Clinic updated successfully' : 'Clinic created successfully');
    } catch (error) {
      if (currentSessionRef.current !== requestSession) return;
      console.error('Failed to create/update clinic:', error);
      const errors = getApiFieldErrors(error, CLINIC_FIELDS, { selectedDoctors: 'doctorIds' });
      setFieldErrors(errors);
      if (Object.keys(errors).length) {
        if (errors.status && !isEditMode) setError(errors.status);
        focusFirstInvalidField(form);
      }
      else setError(error instanceof Error ? error.message : 'Failed to save clinic');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDoctorToRemove(null);
    setConfirmingCancellation(false);
    assignmentRequestRef.current += 1;
    editingClinicIdRef.current = null;
    assignmentsReadyRef.current = false;
    assignmentsLoadingRef.current = false;
    originalDoctorIdsRef.current = [];
    setAssignmentsLoading(false);
    setFieldErrors({});
    setFormData({
      clinicName: '',
      province: '',
      district: '',
      location: '',
      scheduledDate: '',
      scheduledTime: '',
      status: 'SCHEDULED'
    });
    setSelectedDoctors([]);
    setError(null);
    setIsEditMode(false);
    setEditingClinic(null);
    setDoctorLookupFailed(false);
  };

  const closeModal = () => {
    if (savingRef.current) return;
    setDoctorToRemove(null);
    setConfirmingCancellation(false);
    assignmentRequestRef.current += 1;
    editingClinicIdRef.current = null;
    setIsModalOpen(false);
  };

  const openCreate = () => {
    if (savingRef.current) return;
    resetForm();
    setIsModalOpen(true);
  };

  const loadAssignedDoctorsForEdit = async (clinicId: number) => {
    if (savingRef.current || editingClinicIdRef.current !== clinicId || !isPositiveId(clinicId)) return;
    const requestId = ++assignmentRequestRef.current;
    const requestSession = sessionKey;
    const isCurrent = () => requestId === assignmentRequestRef.current && currentSessionRef.current === requestSession && editingClinicIdRef.current === clinicId;
    assignmentsLoadingRef.current = true;
    assignmentsReadyRef.current = false;
    setAssignmentsLoading(true);
    setError(null);
    try {
      const assignedDoctors = await clinicDoctorAPI.getClinicDoctorsByClinicId(clinicId);
      if (!isCurrent()) return;
      const selectedDoctorsForEdit = (assignedDoctors || []).map(cd => ({
        doctorId: cd.doctorRefId,
        name: cd.doctorName,
        specialization: cd.specialization,
      }));
      if (selectedDoctorsForEdit.some(doctor => typeof doctor.doctorId !== 'number' || !isPositiveId(doctor.doctorId)) || new Set(selectedDoctorsForEdit.map(doctor => doctor.doctorId)).size !== selectedDoctorsForEdit.length) {
        throw new Error('The assigned doctors could not be verified.');
      }
      originalDoctorIdsRef.current = selectedDoctorsForEdit.map(doctor => doctor.doctorId);
      assignmentsReadyRef.current = true;
      setSelectedDoctors(selectedDoctorsForEdit);
      setDoctorLookupFailed(false);
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Failed to load assigned doctors:', error);
      setDoctorLookupFailed(true);
      setError('Could not load the doctors currently assigned to this clinic. Saving is disabled until this loads successfully, so existing assignments are never accidentally cleared.');
    } finally {
      if (isCurrent()) {
        assignmentsLoadingRef.current = false;
        setAssignmentsLoading(false);
      }
    }
  };

  const handleEdit = async (clinic: Clinic) => {
    if (savingRef.current || !isPositiveId(clinic.id)) return;
    resetForm();
    editingClinicIdRef.current = clinic.id;
    setEditingClinic(clinic);
    setFormData({
      clinicName: clinic.clinicName,
      province: clinic.province,
      district: clinic.district,
      location: clinic.location || '',
      scheduledDate: clinic.scheduledDate,
      scheduledTime: clinic.scheduledTime,
      status: clinic.status
    });

    setIsEditMode(true);
    setIsModalOpen(true);

    await loadAssignedDoctorsForEdit(clinic.id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteRef.current || !clinicToDelete || !isPositiveId(clinicToDelete.id) || !isPositiveId(user?.id)) return;
    const requestSession = sessionKey;
    deleteRef.current = true;
    
    try {
      setDeleteLoading(true);
      await clinicAPI.deleteClinic(clinicToDelete.id);
      if (currentSessionRef.current !== requestSession) return;
      void loadClinics();
      setRefreshTrigger(prev => prev + 1); // Trigger refresh of clinic cards
      toast.success('Clinic deleted successfully');
      setClinicToDelete(null);
    } catch (error) {
      if (currentSessionRef.current !== requestSession) return;
      console.error('Failed to delete clinic:', error);
      toast.error('Failed to delete clinic. Please try again.');
    } finally {
      deleteRef.current = false;
      setDeleteLoading(false);
    }
  };

  // Filter clinics based on search and status
  const filteredClinics = sortClinics(
    filterClinics(clinics, {
      searchTerm,
      province: '',
      district: '',
      dateRange: { start: '', end: '' },
      status: statusFilter,
      sortBy: 'date'
    }),
    'date'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent fill={!isLoading && !listError && filteredClinics.length === 0}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Dashboard / Clinics</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Mobile Clinics
              </h1>
            </div>
            <button 
              onClick={openCreate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Schedule Clinic
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  aria-label="Search clinics"
                  type="text" 
                  placeholder="Search by clinic name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                />
              </div>
              <Select 
                aria-label="Filter clinics by status"
                value={statusFilter}
                onChange={e => {
                  if (e.target.value === 'All Status' || CLINIC_STATUSES.includes(e.target.value)) setStatusFilter(e.target.value);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              >
                <option>All Status</option>
                <option>SCHEDULED</option>
                <option>IN_PROGRESS</option>
                <option>COMPLETED</option>
                <option>CANCELLED</option>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#38A3A5]"></div>
              <p className="mt-2 text-gray-600">Loading clinics...</p>
            </div>
          )}

          {/* Error State */}
          {listError && (
            <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {listError}
              <button type="button" onClick={() => void loadClinics()} disabled={isLoading} className="ml-3 underline">Retry</button>
            </div>
          )}

          {/* Clinics Grid */}
          {filteredClinics.length > 0 && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredClinics.map(clinic => {
              const doctorCount = doctorCounts[clinic.id] ?? 0;
              return (
                <ClinicCard
                  key={`${clinic.id}-${refreshTrigger}`}
                  clinic={clinic}
                  additionalInfo={
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <UsersIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
                      <span>{doctorCount} {doctorCount === 1 ? 'doctor assigned' : 'doctors assigned'}</span>
                    </div>
                  }
                  footer={
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(clinic)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#38A3A5] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d8284]"
                      >
                        <EditIcon aria-hidden="true" className="h-4 w-4" />
                        Edit Clinic
                      </button>
                      <button
                        type="button"
                        onClick={() => setClinicToDelete(clinic)}
                        aria-label={`Delete ${clinic.clinicName}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50"
                      >
                        <TrashIcon aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>}

          {/* Empty State */}
          {!isLoading && !listError && filteredClinics.length === 0 && (
            <EmptyState variant="page" surface icon={<CalendarIcon />}
              title={clinics.length === 0 ? 'No clinics scheduled' : 'No matching clinics'}
              description={searchTerm || statusFilter !== 'All Status' ? 'Try adjusting your search or status filter.' : 'Get started by scheduling your first mobile clinic.'}
              action={!searchTerm && statusFilter === 'All Status' ? { label: 'Schedule Clinic', onClick: openCreate } : undefined} />
          )}
        </PageContent>
      </div>

      {/* Schedule Clinic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Clinic' : 'Schedule New Clinic'}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close clinic form"
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form ref={clinicFormRef} onSubmit={handleSubmit} noValidate aria-busy={saving || assignmentsLoading} className="space-y-4">
                {/* Clinic Name */}
                <div>
                  <label htmlFor="clinic-clinicName" className="block text-sm font-medium text-gray-700 mb-1">
                    Clinic Name *
                  </label>
                  <input
                    {...fieldProps('clinicName')}
                    maxLength={CLINIC_NAME_MAX_LENGTH}
                    type="text"
                    name="clinicName"
                    value={formData.clinicName}
                    onChange={handleInputChange}
                    placeholder="e.g., Galle Mobile Clinic"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    required
                  />
                  {fieldError('clinicName')}
                </div>

                {/* Province and District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="clinic-province" className="block text-sm font-medium text-gray-700 mb-1">
                      Province *
                    </label>
                    <Select
                      {...fieldProps('province')}
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      required
                    >
                      <option value="">Select Province</option>
                      {Object.keys(PROVINCES_DISTRICTS).map(province => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                    </Select>
                    {fieldError('province')}
                  </div>

                  <div>
                    <label htmlFor="clinic-district" className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <Select
                      {...fieldProps('district')}
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      required
                      disabled={saving || !formData.province}
                    >
                      <option value="">Select District</option>
                      {getDistrictOptions(formData.province).map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </Select>
                    {fieldError('district')}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="clinic-location" className="block text-sm font-medium text-gray-700 mb-1">
                    Specific Location (Optional)
                  </label>
                  <input
                    {...fieldProps('location')}
                    maxLength={CLINIC_LOCATION_MAX_LENGTH}
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Town Center, Near Hospital"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  />
                  {fieldError('location')}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="clinic-scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Date *
                    </label>
                    <DatePicker
                      {...fieldProps('scheduledDate')}
                      name="scheduledDate"
                      value={formData.scheduledDate}
                      onChange={handleInputChange}
                      min={isEditMode ? undefined : localDateString()}
                      required
                    />
                    {fieldError('scheduledDate')}
                  </div>

                  <div>
                    <label htmlFor="clinic-scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Time *
                    </label>
                    <TimePicker
                      {...fieldProps('scheduledTime')}
                      step={1}
                      name="scheduledTime"
                      value={formData.scheduledTime}
                      onChange={handleInputChange}
                      required
                    />
                    {fieldError('scheduledTime')}
                  </div>
                </div>

                {/* Status (only in edit mode) */}
                {isEditMode && (
                  <div>
                    <label htmlFor="clinic-status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Select
                      {...fieldProps('status')}
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    >
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </Select>
                    {fieldError('status')}
                  </div>
                )}

                {/* Doctor Assignment */}
                <div>
                  <label htmlFor="clinic-doctorIds" className="block text-sm font-medium text-gray-700 mb-1">
                    {isEditMode ? 'Update Assigned Doctors' : 'Assign Doctors'} *
                  </label>

                  {/* Loading state for edit mode */}
                  {isEditMode && assignmentsLoading && (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#38A3A5]"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading assigned doctors...</p>
                    </div>
                  )}

                  {isEditMode && !assignmentsLoading && doctorLookupFailed && (
                    <div className="mb-3 flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-sm text-red-700">Couldn't confirm current assignments.</p>
                      <button
                        type="button"
                        onClick={() => editingClinic && loadAssignedDoctorsForEdit(editingClinic.id)}
                        className="text-sm font-medium text-red-700 underline hover:text-red-800 flex-shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Only show doctor selection when not loading */}
                  {!(isEditMode && assignmentsLoading) && (
                    <>
                    {doctorsLoading && <p role="status" className="mb-2 text-sm text-gray-600">Loading available doctors...</p>}
                    {doctorsError && <div role="alert" className="mb-3 text-sm text-red-700">
                      {doctorsError}
                      <button type="button" disabled={saving || doctorsLoading} onClick={() => void loadDoctors()} className="ml-2 underline">Retry doctor search</button>
                    </div>}
                    {/* Doctor Search */}
                    <div className="mb-3">
                      <DoctorSearch
                        {...fieldProps('doctorIds')}
                        disabled={saving || assignmentsLoading || doctorLookupFailed || doctorsLoading || !!doctorsError}
                        doctors={doctors}
                        selectedDoctorIds={selectedDoctors.map(doctor => doctor.doctorId)}
                        onSelect={handleDoctorSelect}
                        placeholder="Search doctors by name or specialization..."
                      />
                    </div>

                    {/* Selected Doctors */}
                    {selectedDoctors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Selected Doctors:</p>
                        <div className="space-y-2">
                          {selectedDoctors.map(doctor => (
                            <div key={doctor.doctorId} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckIcon className="w-4 h-4 text-green-600" />
                                <div>
                                  <span className="font-medium">{doctor.name}</span>
                                  <span className="text-gray-600 text-sm ml-2">- {doctor.specialization}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={saving || assignmentsLoading || doctorLookupFailed}
                                aria-label={`Remove ${doctor.name} from this clinic`}
                                title="Remove Doctor"
                                onClick={() => setDoctorToRemove({ doctor, session: sessionKey, clinicId: editingClinicIdRef.current })}
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <XCircle aria-hidden="true" className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </>
                  )}
                  {fieldError('doctorIds')}
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || assignmentsLoading || (isEditMode && doctorLookupFailed)}
                    title={isEditMode && doctorLookupFailed ? "Can't save until assigned doctors load successfully" : undefined}
                    className="flex-1 px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : assignmentsLoading ? 'Loading assignments...' : (isEditMode ? 'Update Clinic' : 'Schedule Clinic')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isModalOpen && doctorToRemove !== null && doctorToRemove.session === sessionKey}
        title="Remove Doctor?"
        message={`Remove ${doctorToRemove?.doctor.name ?? 'this doctor'} from this clinic's selected doctors? The assignment changes when you save the clinic.`}
        confirmLabel="Remove Doctor"
        cancelLabel="Keep Doctor"
        loading={saving || assignmentsLoading}
        onCancel={() => setDoctorToRemove(null)}
        onConfirm={() => { if (doctorToRemove) handleRemoveDoctor(doctorToRemove.doctor.doctorId); }}
      />

      <ConfirmDialog
        isOpen={isModalOpen && confirmingCancellation}
        title="Cancel Clinic?"
        message={`Save changes and mark "${editingClinic?.clinicName ?? formData.clinicName}" as cancelled?`}
        confirmLabel="Cancel Clinic"
        cancelLabel="Keep Editing"
        loading={saving}
        onCancel={() => setConfirmingCancellation(false)}
        onConfirm={async () => {
          await saveClinic();
          if (currentSessionRef.current === sessionKey) setConfirmingCancellation(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={clinicToDelete !== null}
        title="Delete Clinic"
        message={`Are you sure you want to delete "${clinicToDelete?.clinicName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmClassName="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
        onConfirm={handleDeleteConfirm}
        onCancel={() => { if (!deleteRef.current) setClinicToDelete(null); }}
        loading={deleteLoading}
      />
    </div>
  );
}

