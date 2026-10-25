import { PageContent } from '../../components/PageContent';
import { useState, useEffect, useRef } from 'react';
import { useLinkedSearch } from '../../hooks/useLinkedSearch';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { EmptyState } from '../../components/EmptyState';
import { PaginationFooter } from '../../components/PaginationFooter';
import { FileText, XIcon } from 'lucide-react';
import { consultationAPI, Consultation } from '../../services/consultationService';
import { profileAPI, clinicAPI, userAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { isPositiveId } from '../../utils/clinicalValidation';
import { StatusBadge } from '../../components/StatusBadge';
import { DETAIL_LABEL, DETAIL_VALUE, BUTTON_SECONDARY, MODAL_CLOSE, MODAL_OVERLAY, MODAL_TEXT_BLOCK, MODAL_TITLE, MODAL_PANEL_FLEX, MODAL_HEAD_FIXED, MODAL_BODY, MODAL_FOOT_FIXED } from '../../components/dialogs/modalStyles';
import { ViewAction } from '../../components/ViewAction';
import { noTranslateProps } from '../../utils/noTranslate';

interface MedicalRecord extends Consultation {
  doctorName?: string;
  clinicName?: string;
}

export function Records() {
  const { user: currentUser, sessionKey } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  useLinkedSearch(setSearchTerm);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [loadError, setLoadError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const loadRecordsRef = useRef<() => Promise<void>>(async () => undefined);
  const requestRef = useRef(0);
  const currentSessionRef = useRef(sessionKey);
  currentSessionRef.current = sessionKey;

  useEffect(() => {
    currentSessionRef.current = sessionKey;
    setRecords([]);
    setFilteredRecords([]);
    setSelectedRecord(null);
    setCurrentPage(1);
    void loadRecordsRef.current();
    return () => { requestRef.current += 1; currentSessionRef.current = -1; };
  }, [currentUser?.id, sessionKey]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRecords(records);
    } else {
      const term = searchTerm.trim().toLowerCase();
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  const loadRecords = async () => {
    const requestId = ++requestRef.current;
    const requestSession = sessionKey;
    const isCurrent = () => requestId === requestRef.current && currentSessionRef.current === requestSession;
    if (!currentUser || !isPositiveId(currentUser.id)) {
      setLoading(false);
      setLoadError('The signed-in patient could not be verified. Sign in again before loading prescriptions.');
      return;
    }
    
    try {
      setLoading(true);
      setLoadError('');
      const pageSize = 200;
      let page = 0;
      let consultations: Consultation[] = [];
      for (;;) {
        const { items, total } = await consultationAPI.list({ patientId: currentUser.id, page, size: pageSize });
        if (!isCurrent()) return;
        if (items.some(item => item.patientId !== currentUser.id)) throw new Error('The returned prescriptions do not match the signed-in patient. Please try again.');
        consultations = consultations.concat(items);
        if (items.length === 0 || consultations.length >= total) break;
        page += 1;
      }

      // Look up each unique doctor/clinic only once, instead of once per row.
      // Caching the in-flight promise (not just the resolved value) avoids a
      // race where two rows for the same doctor both miss the cache before
      // the first lookup resolves.
      const doctorNameCache = new Map<number, Promise<string>>();
      const clinicNameCache = new Map<number, Promise<string>>();

      const getDoctorName = (doctorId: number): Promise<string> => {
        if (!isCurrent()) return Promise.resolve('');
        let promise = doctorNameCache.get(doctorId);
        if (!promise) {
          promise = (async () => {
            try {
              const doctorProfile = await profileAPI.getDoctor(doctorId);
              const fullName = `${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''}`.trim();
              return fullName ? `Dr. ${fullName}` : `Doctor #${doctorId}`;
            } catch {
              if (!isCurrent()) return '';
              try {
                const user = await userAPI.getUser(doctorId);
                return `Dr. ${user?.username || doctorId}`;
              } catch {
                return `Doctor #${doctorId}`;
              }
            }
          })();
          doctorNameCache.set(doctorId, promise);
        }
        return promise;
      };

      const getClinicName = (clinicId: number): Promise<string> => {
        if (!isCurrent()) return Promise.resolve('');
        let promise = clinicNameCache.get(clinicId);
        if (!promise) {
          promise = clinicAPI
            .getClinic(clinicId)
            .then(clinic => clinic?.clinicName || `Clinic #${clinicId}`)
            .catch(() => `Clinic #${clinicId}`);
          clinicNameCache.set(clinicId, promise);
        }
        return promise;
      };

      const enrichedRecords = await Promise.all(
        consultations.map(async (consultation) => ({
          ...consultation,
          doctorName: await getDoctorName(consultation.doctorId),
          clinicName: await getClinicName(consultation.clinicId),
        }))
      );

      if (!isCurrent()) return;
      setRecords(enrichedRecords);
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Failed to load prescriptions:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load prescriptions. Please try again.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  loadRecordsRef.current = loadRecords;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex min-h-screen flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent fill={!loading && !loadError && records.length === 0}>
          <div>
            <p className="text-gray-600 text-sm mb-1">Dashboard / Prescriptions</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Prescriptions
            </h1>
          </div>

          {loadError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {loadError}
            </div>
          )}

          <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${!loading && !loadError && records.length === 0 ? 'flex min-h-min flex-1 flex-col' : ''}`}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  aria-label="Search prescriptions"
                  placeholder="Search prescriptions..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="min-w-0 w-full flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38A3A5] mx-auto"></div>
                <p className="mt-4">Loading prescriptions...</p>
              </div>
            ) : loadError ? null : filteredRecords.length === 0 ? (
              <EmptyState variant={records.length === 0 ? 'page' : 'section'} surface={false} icon={<FileText />}
                title={records.length === 0 ? 'No prescriptions yet' : 'No matching prescriptions'}
                description={records.length === 0 ? 'Your prescriptions will appear here when available.' : 'Try adjusting your search.'} />
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
                    {paginatedRecords.map(record => <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(record.bookedAt)}
                        </td>
                        <td {...noTranslateProps('px-6 py-4 text-sm text-gray-900', !!record.chiefComplaint)}>
                          {record.chiefComplaint || 'General Checkup'}
                        </td>
                        <td {...noTranslateProps('px-6 py-4 text-sm text-gray-900')}>
                          {record.doctorName}
                        </td>
                        <td {...noTranslateProps('px-6 py-4 text-sm text-gray-600')}>
                          {record.clinicName}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <ViewAction label="View details" onClick={() => setSelectedRecord(record)} />
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && !loadError && filteredRecords.length > 0 && (
              <PaginationFooter
                currentPage={safePage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredRecords.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
              />
            )}
          </div>
        </PageContent>
      </div>

      {/* View Record Modal */}
      {selectedRecord && (
        <div className={`${MODAL_OVERLAY} z-50`}>
          <div role="dialog" aria-modal="true" aria-label="Prescription details" className={`${MODAL_PANEL_FLEX} max-w-3xl`}>
            <div className={MODAL_HEAD_FIXED}>
              <h2 className={MODAL_TITLE}>Prescription Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                aria-label="Close prescription details"
                className={MODAL_CLOSE}>
                <XIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            
            <div className={`${MODAL_BODY} space-y-5`}>
              {/* Basic Information */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <p className={DETAIL_LABEL}>Status</p>
                  <StatusBadge status={selectedRecord.status} />
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Date</p>
                  <p className={DETAIL_VALUE}>{formatDate(selectedRecord.bookedAt)}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Doctor</p>
                  <p {...noTranslateProps(DETAIL_VALUE)}>{selectedRecord.doctorName}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Clinic</p>
                  <p {...noTranslateProps(DETAIL_VALUE)}>{selectedRecord.clinicName}</p>
                </div>
              </div>

              {/* Consultation Details */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-base font-semibold text-gray-900">Consultation Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className={DETAIL_LABEL}>Chief Complaint</p>
                    <p className={`${MODAL_TEXT_BLOCK} mt-2`}>
                      {selectedRecord.chiefComplaint || 'Not specified'}
                    </p>
                  </div>

                  {selectedRecord.presentIllness && (
                    <div>
                      <p className={DETAIL_LABEL}>Present Illness</p>
                      <p className={`${MODAL_TEXT_BLOCK} mt-2`}>
                        {selectedRecord.presentIllness}
                      </p>
                    </div>
                  )}

                  {selectedRecord.pastMedicalHistory && (
                    <div>
                      <p className={DETAIL_LABEL}>Past Medical History</p>
                      <p className={`${MODAL_TEXT_BLOCK} mt-2`}>
                        {selectedRecord.pastMedicalHistory}
                      </p>
                    </div>
                  )}

                  {selectedRecord.recommendations && (
                    <div>
                      <p className={DETAIL_LABEL}>Recommendations</p>
                      <p className={`${MODAL_TEXT_BLOCK} mt-2`}>
                        {selectedRecord.recommendations}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {(selectedRecord.bookedAt || selectedRecord.completedAt) && (
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="mb-3 text-base font-semibold text-gray-900">Timeline</h3>
                  <div className="space-y-2">
                    {selectedRecord.bookedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Booked At</span>
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

            <div className={MODAL_FOOT_FIXED}>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className={BUTTON_SECONDARY}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>;
}
