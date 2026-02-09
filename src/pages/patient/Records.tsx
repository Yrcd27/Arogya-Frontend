import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { EyeIcon, XIcon } from 'lucide-react';
import { consultationAPI, Consultation } from '../../services/consultationService';
import { profileAPI, clinicAPI, userAPI } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';

interface MedicalRecord extends Consultation {
  doctorName?: string;
  clinicName?: string;
}

export function Records() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRecords(records);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = records.filter(record => 
        record.chiefComplaint?.toLowerCase().includes(term) ||
        record.doctorName?.toLowerCase().includes(term) ||
        record.clinicName?.toLowerCase().includes(term) ||
        record.status?.toLowerCase().includes(term) ||
        record.recommendations?.toLowerCase().includes(term)
      );
      setFilteredRecords(filtered);
    }
  }, [searchTerm, records]);

  const loadRecords = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      // Fetch consultations for current patient
      const consultations = await consultationAPI.list({ patientId: currentUser.id });
      
      console.log('Raw consultations from API:', consultations);
      
      // Remove duplicates by consultation ID - keep only the first occurrence
      const seenIds = new Set();
      const uniqueConsultations = consultations.filter((consultation) => {
        if (seenIds.has(consultation.id)) {
          console.log('Duplicate found, skipping:', consultation.id);
          return false;
        }
        seenIds.add(consultation.id);
        return true;
      });
      
      console.log('Unique consultations after deduplication:', uniqueConsultations);
      
      // Fetch doctor and clinic names
      const enrichedRecords = await Promise.all(
        uniqueConsultations.map(async (consultation) => {
          let doctorName = 'Unknown Doctor';
          let clinicName = 'Unknown Clinic';
          
          // Fetch doctor name (try profile first, then user as fallback)
          try {
            const doctorProfile = await profileAPI.getDoctor(consultation.doctorId);
            const firstName = doctorProfile.firstName || '';
            const lastName = doctorProfile.lastName || '';
            doctorName = `Dr. ${firstName} ${lastName}`.trim();
            if (doctorName === 'Dr.' || !firstName || !lastName) {
              // Profile exists but no names, try user
              const user = await userAPI.getUser(consultation.doctorId);
              doctorName = `Dr. ${user?.username || consultation.doctorId}`;
            }
          } catch (docErr) {
            // Profile doesn't exist, use user info as fallback
            try {
              const user = await userAPI.getUser(consultation.doctorId);
              doctorName = `Dr. ${user?.username || consultation.doctorId}`;
            } catch (userErr) {
              console.error('Failed to fetch doctor info:', docErr, userErr);
              doctorName = `Doctor #${consultation.doctorId}`;
            }
          }
          
          // Fetch clinic name
          try {
            const clinic = await clinicAPI.getClinic(consultation.clinicId);
            clinicName = clinic?.clinicName || 'Unknown Clinic';
          } catch (clinicErr) {
            console.error('Failed to fetch clinic:', clinicErr);
            clinicName = `Clinic #${consultation.clinicId}`;
          }
          
          return {
            ...consultation,
            doctorName,
            clinicName
          };
        })
      );
      
      console.log('Final enriched records:', enrichedRecords);
      setRecords(enrichedRecords);
      setFilteredRecords(enrichedRecords);
    } catch (error) {
      console.error('Failed to load medical records:', error);
      alert('Failed to load medical records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-[#57CC99] bg-opacity-20 text-[#57CC99]';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard / My Records</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Medical Records
            </h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="Search records..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                />
                <button 
                  onClick={loadRecords}
                  disabled={loading}
                  className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors disabled:opacity-50">
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38A3A5] mx-auto"></div>
                <p className="mt-4">Loading medical records...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg">No medical records found</p>
                {searchTerm && <p className="text-sm mt-2">Try adjusting your search</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Doctor
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Clinic
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRecords.map(record => <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(record.bookedAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.chiefComplaint || 'General Checkup'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.doctorName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {record.clinicName}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedRecord(record)}
                              className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors"
                              title="View details">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* View Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Medical Record Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Record ID</p>
                  <p className="font-medium">#{selectedRecord.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRecord.status)}`}>
                    {selectedRecord.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="font-medium">{formatDate(selectedRecord.bookedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Session Number</p>
                  <p className="font-medium">{selectedRecord.sessionNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Doctor</p>
                  <p className="font-medium">{selectedRecord.doctorName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Clinic</p>
                  <p className="font-medium">{selectedRecord.clinicName}</p>
                </div>
              </div>

              {/* Consultation Details */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Consultation Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Chief Complaint</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {selectedRecord.chiefComplaint || 'Not specified'}
                    </p>
                  </div>

                  {selectedRecord.presentIllness && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Present Illness</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                        {selectedRecord.presentIllness}
                      </p>
                    </div>
                  )}

                  {selectedRecord.pastMedicalHistory && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Past Medical History</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                        {selectedRecord.pastMedicalHistory}
                      </p>
                    </div>
                  )}

                  {selectedRecord.recommendations && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Recommendations</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                        {selectedRecord.recommendations}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {(selectedRecord.bookedAt || selectedRecord.completedAt) && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                  <div className="space-y-2">
                    {selectedRecord.bookedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Booked At:</span>
                        <span className="font-medium">{new Date(selectedRecord.bookedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedRecord.completedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completed At:</span>
                        <span className="font-medium">{new Date(selectedRecord.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedRecord.updatedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium">{new Date(selectedRecord.updatedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>;
}