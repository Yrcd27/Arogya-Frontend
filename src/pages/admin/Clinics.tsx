import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { SearchIcon, PlusIcon, MapPinIcon, CalendarIcon, UsersIcon, EditIcon, TrashIcon, XIcon, CheckIcon } from 'lucide-react';
import { clinicAPI, clinicDoctorAPI, doctorAPI } from '../../services/api';
import { Clinic, Doctor, SelectedDoctor, PROVINCES_DISTRICTS } from '../../types/clinic';
import { 
  validateClinicForm,
  formatTimeForAPI,
  filterClinics,
  sortClinics
} from '../../utils/clinic';

export function Clinics() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    loadClinics();
  }, []);

  // Load doctors for search
  useEffect(() => {
    loadDoctors();
  }, []);

  // Filter doctors based on search term
  useEffect(() => {
    if (doctorSearchTerm.trim()) {
      const filtered = doctors.filter(doctor =>
        doctor.name.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(doctorSearchTerm.toLowerCase())
      );
      setFilteredDoctors(filtered);
      setShowDoctorDropdown(true);
    } else {
      setFilteredDoctors([]);
      setShowDoctorDropdown(false);
    }
  }, [doctorSearchTerm, doctors]);

  const loadClinics = async () => {
    try {
      setIsLoading(true);
      const data = await clinicAPI.getAllClinics();
      setClinics(data || []);
    } catch (error) {
      console.error('Failed to load clinics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load clinics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const data = await doctorAPI.getAllDoctors();
      setDoctors(data || []);
    } catch (error) {
      console.error('Failed to load doctors:', error);
      // The doctorAPI now handles fallback data internally
      setDoctors([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'province' && { district: '' }) // Reset district when province changes
    }));
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    // Check if doctor is already selected
    const isAlreadySelected = selectedDoctors.some(selected => selected.doctorId === doctor.doctorId);
    
    if (!isAlreadySelected) {
      setSelectedDoctors(prev => [...prev, {
        doctorId: doctor.doctorId,
        name: doctor.name,
        specialization: doctor.specialization
      }]);
    }
    
    setDoctorSearchTerm('');
    setShowDoctorDropdown(false);
  };

  const handleRemoveDoctor = (doctorId: number) => {
    setSelectedDoctors(prev => prev.filter(doctor => doctor.doctorId !== doctorId));
  };

  const validateForm = () => {
    const validationError = validateClinicForm(formData, selectedDoctors);
    if (validationError) {
      setError(validationError);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

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

      // Success
      setIsModalOpen(false);
      resetForm();
      loadClinics();
      setRefreshTrigger(prev => prev + 1); // Trigger refresh of clinic cards
      alert(isEditMode ? 'Clinic updated successfully!' : 'Clinic scheduled successfully!');
    } catch (error) {
      console.error('Failed to create/update clinic:', error);
      setError(error instanceof Error ? error.message : 'Failed to save clinic');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
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
  };

  const handleEdit = async (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormData({
      clinicName: clinic.clinicName,
      province: clinic.province,
      district: clinic.district,
      location: clinic.location || '',
      scheduledDate: clinic.scheduledDate,
      scheduledTime: clinic.scheduledTime.substring(0, 5), // Remove seconds
      status: clinic.status
    });
    
    setIsEditMode(true);
    setIsModalOpen(true);
    
    // Load currently assigned doctors
    setIsLoading(true);
    try {
      const assignedDoctors = await clinicDoctorAPI.getClinicDoctorsByClinicId(clinic.id);
      if (assignedDoctors) {
        const selectedDoctorsForEdit = assignedDoctors.map((cd: any) => ({
          doctorId: cd.doctorRefId,
          name: cd.doctorName,
          specialization: cd.specialization
        }));
        setSelectedDoctors(selectedDoctorsForEdit);
      } else {
        setSelectedDoctors([]);
      }
    } catch (error) {
      console.error('Failed to load assigned doctors:', error);
      setSelectedDoctors([]);
      setError('Warning: Could not load currently assigned doctors. You can still update the clinic and reassign doctors.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (clinic: Clinic) => {
    if (confirm(`Are you sure you want to delete "${clinic.clinicName}"?`)) {
      try {
        await clinicAPI.deleteClinic(clinic.id);
        loadClinics();
        setRefreshTrigger(prev => prev + 1); // Trigger refresh of clinic cards
        alert('Clinic deleted successfully!');
      } catch (error) {
        console.error('Failed to delete clinic:', error);
        alert('Failed to delete clinic. Please try again.');
      }
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
  ).filter(clinic => {
    // Additional location-based search for admin
    const locationMatch = clinic.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (clinic.location && clinic.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return searchTerm === '' || locationMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-sm mb-2">Dashboard / Clinics</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Mobile Clinics
              </h1>
            </div>
            <button 
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Schedule Clinic
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by clinic name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
          {error && !isModalOpen && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Clinics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredClinics.map(clinic => (
              <ClinicCard 
                key={`${clinic.id}-${refreshTrigger}`}
                clinic={clinic} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Empty State */}
          {!isLoading && filteredClinics.length === 0 && (
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
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors"
                >
                  Schedule Clinic
                </button>
              )}
            </div>
          )}
        </main>
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
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Clinic Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinic Name *
                  </label>
                  <input
                    type="text"
                    name="clinicName"
                    value={formData.clinicName}
                    onChange={handleInputChange}
                    placeholder="e.g., Galle Mobile Clinic"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    required
                  />
                </div>

                {/* Province and District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province *
                    </label>
                    <select
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      required
                      disabled={!formData.province}
                    >
                      <option value="">Select District</option>
                      {formData.province && PROVINCES_DISTRICTS[formData.province as keyof typeof PROVINCES_DISTRICTS].map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specific Location (Optional)
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Town Center, Near Hospital"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Date *
                    </label>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={formData.scheduledDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Time *
                    </label>
                    <input
                      type="time"
                      name="scheduledTime"
                      value={formData.scheduledTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Status (only in edit mode) */}
                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
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
                  </div>
                )}

                {/* Doctor Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEditMode ? 'Update Assigned Doctors' : 'Assign Doctors'} *
                  </label>

                  {/* Loading state for edit mode */}
                  {isEditMode && isLoading && (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#38A3A5]"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading assigned doctors...</p>
                    </div>
                  )}
                    
                  {/* Only show doctor selection when not loading */}
                  {!(isEditMode && isLoading) && (
                    <>
                    {/* Doctor Search */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        value={doctorSearchTerm}
                        onChange={(e) => setDoctorSearchTerm(e.target.value)}
                        placeholder="Search doctors by name or specialization..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      />
                      
                      {/* Doctor Dropdown */}
                      {showDoctorDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                          {filteredDoctors.length > 0 ? (
                            filteredDoctors.map(doctor => (
                              <button
                                key={doctor.doctorId}
                                type="button"
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
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : (isEditMode ? 'Update Clinic' : 'Schedule Clinic')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Clinic Card Component
function ClinicCard({ 
  clinic, 
  onEdit, 
  onDelete 
}: { 
  clinic: Clinic; 
  onEdit: (clinic: Clinic) => void;
  onDelete: (clinic: Clinic) => void;
}) {
  const [doctorCount, setDoctorCount] = useState<number>(0);

  useEffect(() => {
    loadDoctorCount();
  }, [clinic.id]);

  const loadDoctorCount = async () => {
    try {
      const doctors = await clinicDoctorAPI.getClinicDoctorsByClinicId(clinic.id);
      setDoctorCount(doctors?.length || 0);
    } catch (error) {
      console.error('Failed to load doctor count:', error);
    }
  };

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