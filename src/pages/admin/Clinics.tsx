import { PageContent } from '../../components/PageContent';
import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { SearchIcon, PlusIcon, MapPinIcon, CalendarIcon, UsersIcon, EditIcon, TrashIcon, XIcon, CheckIcon } from 'lucide-react';
import { clinicAPI, clinicDoctorAPI, doctorAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { ConfirmModal } from '../../components/ConfirmModal';
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

export function Clinics() {
  const { user, sessionKey } = useAuth();
  const currentSessionRef = useRef(sessionKey);
  currentSessionRef.current = sessionKey;
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctorCounts, setDoctorCounts] = useState<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
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
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<SelectedDoctor[]>([]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  // Load clinics on component mount
  useEffect(() => {
    void loadClinicsRef.current();
    void loadDoctorsRef.current();
    setIsModalOpen(false);
    assignmentRequestRef.current += 1;
    return () => {
      listRequestRef.current += 1;
      doctorsRequestRef.current += 1;
      assignmentRequestRef.current += 1;
    };
  }, [sessionKey]);

  // Filter doctors based on search term
  useEffect(() => {
    if (doctorSearchTerm.trim()) {
      const filtered = doctors.filter(doctor =>
        doctor.name.toLowerCase().includes(doctorSearchTerm.trim().toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(doctorSearchTerm.trim().toLowerCase())
      );
      setFilteredDoctors(filtered);
      setShowDoctorDropdown(true);
    } else {
      setFilteredDoctors([]);
      setShowDoctorDropdown(false);
    }
  }, [doctorSearchTerm, doctors]);

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
    
    setDoctorSearchTerm('');
    setShowDoctorDropdown(false);
    setFieldErrors(previous => ({ ...previous, doctorIds: undefined }));
  };

  const handleRemoveDoctor = (doctorId: number) => {
    if (savingRef.current || assignmentsLoadingRef.current || isEditMode && !assignmentsReadyRef.current) return;
    setSelectedDoctors(prev => prev.filter(doctor => doctor.doctorId !== doctorId));
    setFieldErrors(previous => ({ ...previous, doctorIds: previous.doctorIds && selectedDoctors.length <= 1 ? 'At least one doctor must be assigned to the clinic.' : undefined }));
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
    if (savingRef.current || assignmentsLoadingRef.current) return;
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
    setDoctorSearchTerm('');
    setError(null);
    setIsEditMode(false);
    setEditingClinic(null);
    setDoctorLookupFailed(false);
  };

  const closeModal = () => {
    if (savingRef.current) return;
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
        <PageContent>
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
              <select 
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
              </select>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredClinics.map(clinic => (
              <ClinicCard 
                key={`${clinic.id}-${refreshTrigger}`}
                clinic={clinic} 
                doctorCount={doctorCounts[clinic.id] ?? 0}
                onEdit={handleEdit}
                onDelete={(clinic) => setClinicToDelete(clinic)}
              />
            ))}
          </div>

          {/* Empty State */}
          {!isLoading && !listError && filteredClinics.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clinics found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'All Status' 
                  ? 'Try adjusting your search criteria' 
                  : 'Get started by scheduling your first mobile clinic'}
              </p>
              {!searchTerm && statusFilter === 'All Status' && (
                <button 
                  onClick={openCreate}
                  className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors"
                >
                  Schedule Clinic
                </button>
              )}
            </div>
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

              <form onSubmit={handleSubmit} noValidate aria-busy={saving || assignmentsLoading} className="space-y-4">
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
                    <select
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
                    </select>
                    {fieldError('province')}
                  </div>

                  <div>
                    <label htmlFor="clinic-district" className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <select
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
                    </select>
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
                    <input
                      {...fieldProps('scheduledDate')}
                      type="date"
                      name="scheduledDate"
                      value={formData.scheduledDate}
                      onChange={handleInputChange}
                      min={isEditMode ? undefined : localDateString()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      required
                    />
                    {fieldError('scheduledDate')}
                  </div>

                  <div>
                    <label htmlFor="clinic-scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Time *
                    </label>
                    <input
                      {...fieldProps('scheduledTime')}
                      type="time"
                      step={1}
                      name="scheduledTime"
                      value={formData.scheduledTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
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
                    <select
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
                    </select>
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
                    <div className="relative mb-3">
                      <input
                        {...fieldProps('doctorIds')}
                        type="text"
                        disabled={saving || assignmentsLoading || doctorLookupFailed || doctorsLoading || !!doctorsError}
                        value={doctorSearchTerm}
                        onChange={e => { if (!savingRef.current) setDoctorSearchTerm(e.target.value); }}
                        placeholder="Search doctors by name or specialization..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      />
                      
                      {/* Doctor Dropdown */}
                      {showDoctorDropdown && !doctorsLoading && !doctorsError && !doctorLookupFailed && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                          {filteredDoctors.length > 0 ? (
                            filteredDoctors.map(doctor => (
                              <button
                                key={doctor.doctorId}
                                type="button"
                                disabled={saving || doctorsLoading || doctorLookupFailed}
                                onClick={() => handleDoctorSelect(doctor)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              >
                                <div className="font-medium">{doctor.name}</div>
                                <div className="text-sm text-gray-600">{doctor.specialization}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500">No doctors found</div>
                          )}
                        </div>
                      )}
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
                                onClick={() => handleRemoveDoctor(doctor.doctorId)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <XIcon className="w-4 h-4" />
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

// Clinic Card Component
function ClinicCard({ 
  clinic, 
  doctorCount,
  onEdit, 
  onDelete 
}: { 
  clinic: Clinic; 
  doctorCount: number;
  onEdit: (clinic: Clinic) => void;
  onDelete: (clinic: Clinic) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-600';
      case 'IN_PROGRESS':
        return 'bg-[#38A3A5] bg-opacity-20 text-[#38A3A5]';
      case 'COMPLETED':
        return 'bg-green-100 text-green-600';
      case 'CANCELLED':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {clinic.clinicName}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPinIcon className="w-4 h-4" />
            <span>{clinic.district}</span>
            {clinic.province && <span>• {clinic.province}</span>}
          </div>
          {clinic.location && (
            <p className="text-sm text-gray-500 mt-1">{clinic.location}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(clinic.status)}`}>
          {clinic.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-600">Date & Time</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(clinic.scheduledDate)}
            </p>
            <p className="text-xs text-gray-600">{formatTime(clinic.scheduledTime)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-600">Assigned Doctors</p>
            <p className="text-sm font-medium text-gray-900">
              {doctorCount} {doctorCount === 1 ? 'Doctor' : 'Doctors'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onEdit(clinic)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-[#38A3A5] text-[#38A3A5] rounded-lg font-medium hover:bg-[#38A3A5] hover:text-white transition-colors"
        >
          <EditIcon className="w-4 h-4" />
          Edit
        </button>
        <button 
          onClick={() => onDelete(clinic)}
          className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-500 hover:text-white transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
