import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { SearchIcon, MapPinIcon, CalendarIcon, ClockIcon, UsersIcon, XIcon, HospitalIcon } from 'lucide-react';
import { clinicAPI, clinicDoctorAPI, queueAPI, profileAPI, userAPI } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';
import { Clinic, ClinicDoctor, PROVINCES_DISTRICTS } from '../../types/clinic';
import { 
  formatDate, 
  formatTime, 
  getDaysUntilClinic,
  getAvailableClinics,
  filterClinics,
  sortClinics
} from '../../utils/clinic';

export function Clinics() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<ClinicDoctor[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [queueTokens, setQueueTokens] = useState<import('../../services/queueService').QueueTokenResponse[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientFetchError, setPatientFetchError] = useState<string | null>(null);
  const [nameHydrationFailed, setNameHydrationFailed] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'province'>('date');

  // Load clinics on component mount
  useEffect(() => {
    loadClinics();
  }, []);

  // Auto-detect logged-in patient profile
  useEffect(() => {
    (async () => {
      try {
        const user = getCurrentUser();
        if (!user) return;
        const profile = await profileAPI.getPatient(user.id);
        // Always use user.id as patientId (backend validates against user ID)
        setPatientId(String(user.id));
        const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
        if (name) setPatientName(name);
      } catch (e) {
        const user = getCurrentUser();
        setPatientFetchError(e instanceof Error ? e.message : 'Failed to fetch patient profile');
        // Fallback: still enable queue actions using the user's id
        if (user?.id) setPatientId(String(user.id));
      }
    })();
  }, []);

  const loadClinics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await clinicAPI.getAllClinics();
      
      // Filter to only show scheduled clinics and future dates
      const availableClinics = getAvailableClinics(data || []);
      setClinics(availableClinics);
    } catch (error) {
      console.error('Failed to load clinics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load clinics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClinicDoctors = async (clinicId: number) => {
    try {
      const doctors = await clinicDoctorAPI.getClinicDoctorsByClinicId(clinicId);
      setClinicDoctors(doctors || []);
    } catch (error) {
      console.error('Failed to load clinic doctors:', error);
      setClinicDoctors([]);
    }
  };

  const handleViewDetails = async (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setIsDetailsModalOpen(true);
    await loadClinicDoctors(clinic.id);
    // Clear previous queue state
    setQueueTokens([]);
    setQueueError(null);
    setJoinError(null);
    setJoinSuccess(null);
  };

  // Quick Join button: open modal focused on queue actions and preload current queue
  const handleQuickJoinOpen = async (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setIsDetailsModalOpen(true);
    await loadClinicDoctors(clinic.id);
    setQueueError(null);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      setQueueLoading(true);
      const tokens = await queueAPI.getClinicQueue(String(clinic.id));
      setQueueTokens(tokens || []);
      await hydratePatientNames(tokens || []);
    } catch (error) {
      console.error('Failed to load queue:', error);
      setQueueTokens([]);
      setQueueError(error instanceof Error ? error.message : 'Failed to load queue');
    } finally {
      setQueueLoading(false);
    }
  };

  // Resolve and cache patient display names for a list of tokens
  const hydratePatientNames = async (
    tokens: import('../../services/queueService').QueueTokenResponse[]
  ) => {
    const ids = Array.from(new Set(tokens.map(t => String(t.patientId)).filter(Boolean)));
    const missing = ids.filter(id => !nameById[id]);
    if (missing.length === 0) return;
    try {
      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            const prof = await profileAPI.getPatient(Number(id));
            const name = [prof?.firstName, prof?.lastName].filter(Boolean).join(' ');
            if (name) return { id, name };
          } catch {
            setNameHydrationFailed(true);
          }
          try {
            const user = await userAPI.getUser(Number(id));
            const name = user?.username || `User #${id}`;
            return { id, name };
          } catch {
            setNameHydrationFailed(true);
            return { id, name: `User #${id}` };
          }
        })
      );
      const map: Record<string, string> = {};
      results.forEach(r => { map[r.id] = r.name; });
      setNameById(prev => ({ ...prev, ...map }));
    } catch (e) {
      setNameHydrationFailed(true);
    }
  };

  const joinQueueForClinic = async (clinic: Clinic) => {
    setJoinSuccess(null);
    setJoinError(null);
    if (!patientId) {
      setJoinError('Patient ID not found. Please ensure you are logged in with a patient profile.');
      return;
    }
    try {
      setJoinLoading(true);
      const res = await queueAPI.createToken({
        clinicId: String(clinic.id),
        patientId: patientId,
        // Placeholder: use clinic id as consultation id until consultation linkage is available
        consultationId: String(clinic.id),
      });
      setJoinSuccess(`Token #${res.tokenNumber} created. Position: ${res.position}`);
      // Refresh queue for selected clinic if modal open on same clinic
      if (selectedClinic && selectedClinic.id === clinic.id) {
        await handleViewQueue();
      }
    } catch (error) {
      console.error('Failed to join queue:', error);
      setJoinError(error instanceof Error ? error.message : 'Failed to join queue');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleViewQueue = async () => {
    if (!selectedClinic) return;
    try {
      setQueueLoading(true);
      setQueueError(null);
      const tokens = await queueAPI.getClinicQueue(String(selectedClinic.id));
      setQueueTokens(tokens || []);
      await hydratePatientNames(tokens || []);
    } catch (error) {
      console.error('Failed to load queue:', error);
      setQueueTokens([]);
      setQueueError(error instanceof Error ? error.message : 'Failed to load queue');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    if (!selectedClinic) return;
    await joinQueueForClinic(selectedClinic);
  };

  // Filter and sort clinics
  const filteredAndSortedClinics = sortClinics(
    filterClinics(clinics, {
      searchTerm,
      province: selectedProvince,
      district: selectedDistrict,
      dateRange,
      status: 'SCHEDULED', // Patients only see scheduled clinics
      sortBy
    }),
    sortBy
  );

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

  const getDaysUntilClinic = (dateStr: string) => {
    const clinicDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = clinicDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard / Mobile Clinics</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Available Mobile Clinics
            </h1>
            <p className="text-gray-600 mt-2">
              Find and explore mobile clinics scheduled near your area
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clinics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                />
              </div>

              {/* Province Filter */}
              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedDistrict(''); // Reset district when province changes
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              >
                <option value="">All Provinces</option>
                {Object.keys(PROVINCES_DISTRICTS).map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>

              {/* District Filter */}
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                disabled={!selectedProvince}
              >
                <option value="">All Districts</option>
                {selectedProvince && PROVINCES_DISTRICTS[selectedProvince as keyof typeof PROVINCES_DISTRICTS].map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'province')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="province">Sort by Province</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  min={dateRange.start || new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#38A3A5]"></div>
              <p className="mt-2 text-gray-600">Loading clinics...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Clinics Grid */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedClinics.map(clinic => (
                <ClinicCard 
                  key={clinic.id} 
                  clinic={clinic} 
                  onViewDetails={handleViewDetails}
                  onJoinQueue={handleQuickJoinOpen}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredAndSortedClinics.length === 0 && (
            <div className="text-center py-12">
              <HospitalIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {clinics.length === 0 ? 'No clinics scheduled' : 'No clinics match your filters'}
              </h3>
              <p className="text-gray-600 mb-4">
                {clinics.length === 0 
                  ? 'There are no mobile clinics scheduled at the moment. Please check back later.'
                  : 'Try adjusting your search criteria or filters to find more clinics.'
                }
              </p>
              {searchTerm || selectedProvince || selectedDistrict || dateRange.start || dateRange.end ? (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedProvince('');
                    setSelectedDistrict('');
                    setDateRange({ start: '', end: '' });
                  }}
                  className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors"
                >
                  Clear Filters
                </button>
              ) : null}
            </div>
          )}
        </main>
      </div>

      {/* Clinic Details Modal */}
      {isDetailsModalOpen && selectedClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Clinic Details</h2>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Clinic Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedClinic.clinicName}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Location</p>
                        <p className="text-gray-600">{selectedClinic.province}</p>
                        <p className="text-gray-600">{selectedClinic.district}</p>
                        {selectedClinic.location && (
                          <p className="text-gray-600">{selectedClinic.location}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CalendarIcon className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Date & Time</p>
                        <p className="text-gray-600">{formatDate(selectedClinic.scheduledDate)}</p>
                        <p className="text-gray-600">{formatTime(selectedClinic.scheduledTime)}</p>
                        {getDaysUntilClinic(selectedClinic.scheduledDate) && (
                          <p className="text-[#38A3A5] font-medium text-sm mt-1">
                            {getDaysUntilClinic(selectedClinic.scheduledDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assigned Doctors */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <UsersIcon className="w-5 h-5 text-[#38A3A5]" />
                    <h4 className="font-semibold text-gray-900">
                      Available Doctors ({clinicDoctors.length})
                    </h4>
                  </div>

                  {clinicDoctors.length > 0 ? (
                    <div className="space-y-3">
                      {clinicDoctors.map(doctor => (
                        <div key={doctor.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{doctor.doctorName}</p>
                              <p className="text-[#38A3A5] font-medium">{doctor.specialization}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Loading doctor information...</p>
                  )}
                </div>

                {/* Action Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    💡 <strong>Planning to visit?</strong> Note down the location and time details. 
                    Mobile clinics provide convenient healthcare services in your community.
                  </p>
                </div>

                {/* Queue Actions (auto-detected patient & clinic) */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold text-gray-900">Queue Actions</h4>
                  <div className="text-sm text-gray-700">
                    {patientFetchError ? (
                      <span className="text-red-700">{patientFetchError}</span>
                    ) : patientId ? (
                      <span>
                        Joining as <span className="font-medium">{patientName || `Patient #${patientId}`}</span>
                      </span>
                    ) : (
                      <span>Detecting your patient profile...</span>
                    )}
                  </div>
                  {joinError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">{joinError}</div>
                  )}
                  {joinSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded">{joinSuccess}</div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleJoinQueue}
                      disabled={joinLoading || !!patientFetchError}
                      className={`px-4 py-2 bg-[#38A3A5] text-white rounded-lg transition-colors ${patientFetchError ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2d8284]'} ${joinLoading ? 'opacity-60' : ''}`}
                    >
                      {joinLoading ? 'Joining...' : 'Join Queue'}
                    </button>
                    <button
                      onClick={handleViewQueue}
                      disabled={queueLoading}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-60"
                    >
                      {queueLoading ? 'Loading Queue...' : 'View Queue'}
                    </button>
                  </div>
                  {patientFetchError && (
                    <p className="text-xs text-red-500 mt-1">Cannot join queue — your patient profile could not be verified.</p>
                  )}
                </div>

                {/* Queue List */}
                {queueError && (
                  <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">{queueError}</div>
                )}
                {queueTokens.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-semibold text-gray-900 mb-2">Current Queue</h5>
                    <div className="space-y-2">
                      {queueTokens.map(token => {
                        const isMine = patientId && String(token.patientId) === String(patientId);
                        const name = nameById[String(token.patientId)];
                        return (
                          <div
                            key={token.id}
                            className={`flex items-center justify-between p-3 rounded border ${
                              isMine ? 'bg-[#e6f6f6] border-[#38A3A5]' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="text-sm text-gray-800">
                              <span className="font-medium">Token #{token.tokenNumber}</span>
                              <span className="ml-2">• Position: {token.position}</span>
                              {name && <span className="ml-2 text-gray-600">• {name}</span>}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              token.status === 'SERVING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : token.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : token.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-200 text-gray-800'
                            }`}>
                              {token.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {nameHydrationFailed && (
                      <p className="text-xs text-gray-400 mt-2">Some patient names could not be loaded. IDs are shown instead.</p>
                    )}
                  </div>
                )}

                {/* Done Persons (Completed) */}
                {queueTokens.filter(t => t.status === 'COMPLETED').length > 0 && (
                  <div className="mt-6">
                    <h5 className="font-semibold text-gray-900 mb-2">Done Persons</h5>
                    <div className="space-y-2">
                      {queueTokens.filter(t => t.status === 'COMPLETED').map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded bg-green-50 border border-green-200">
                          <div className="text-sm text-gray-800">
                            <span className="font-medium">Token #{t.tokenNumber}</span>
                            {nameById[String(t.patientId)] && (
                              <span className="ml-2 text-gray-700">• {nameById[String(t.patientId)]}</span>
                            )}
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">COMPLETED</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="w-full px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors"
                >
                  Close
                </button>
              </div>
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
  onViewDetails,
  onJoinQueue,
}: { 
  clinic: Clinic; 
  onViewDetails: (clinic: Clinic) => void;
  onJoinQueue: (clinic: Clinic) => void;
}) {
  const daysUntil = getDaysUntilClinic(clinic.scheduledDate);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <HospitalIcon className="w-5 h-5 text-[#38A3A5]" />
          <h3 className="font-bold text-gray-900">{clinic.clinicName}</h3>
        </div>
        {daysUntil && (
          <span className="bg-[#38A3A5] text-white text-xs px-2 py-1 rounded-full">
            {daysUntil}
          </span>
        )}
      </div>

      {/* Date and Time */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarIcon className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600 text-sm">{formatDate(clinic.scheduledDate)}</span>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <ClockIcon className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600 text-sm">{formatTime(clinic.scheduledTime)}</span>
      </div>

      {/* Location */}
      <div className="flex items-start gap-2 mb-4">
        <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5" />
        <div className="text-sm text-gray-600">
          {clinic.location && <p className="font-medium">{clinic.location}</p>}
          <p>{clinic.district}</p>
          <p>{clinic.province}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onViewDetails(clinic)}
          className="w-full px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors text-sm font-medium"
        >
          View Details
        </button>
        <button
          onClick={() => onJoinQueue(clinic)}
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
        >
          Quick Join
        </button>
      </div>
    </div>
  );
}