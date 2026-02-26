import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { EmptyState } from '../../components/EmptyState';
import { toast } from 'react-toastify';
import { consultationAPI, Consultation } from "../../services/consultationService";
import { labTestAPI } from "../../services/labTestService";
import { LabTest } from "../../types/labTest";
import { userAPI } from "../../services/userService";
import { clinicAPI } from "../../services/api";
import { FlaskConical } from 'lucide-react';

type PatientInfo = {
  id: number;
  name: string;
};

type ClinicInfo = {
  id: number;
  clinicName: string;
};

// Simple in-memory caches (module-scoped so they survive component unmounts)
const consultationsCache: { data?: Consultation[]; ts?: number } = {};
const labTestsCache = new Map<number, { data: LabTest[]; ts: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const usersCache: { data?: any[]; ts?: number } = {};
const clinicsCache: { data?: any[]; ts?: number } = {};

export default function Consultations() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Record<number, PatientInfo>>({});
  const [clinics, setClinics] = useState<Record<number, ClinicInfo>>({});
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [selectedConsultationLabTests, setSelectedConsultationLabTests] = useState<LabTest[]>([]);
  const [loadingLabTests, setLoadingLabTests] = useState(false);

  useEffect(() => {
    loadConsultations();
  }, []);

  useEffect(() => {
    // Reload when returning from consultation creation
    if (location.state?.consultationCreated) {
      setTimeout(() => {
        loadConsultations();
      }, 500);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadConsultations = async () => {
    setLoading(true);
    try {
      const now = Date.now();

      // Use cache if fresh
      if (consultationsCache.data && consultationsCache.ts && now - consultationsCache.ts < CACHE_TTL) {
        setConsultations(consultationsCache.data);

        // Check if we already have patient/clinic info for these consultations; if so skip additional fetch
        const missingPatientIds = Array.from(new Set(consultationsCache.data.map((c: Consultation) => c.patientId))).filter(id => !patients[id]);
        const missingClinicIds = Array.from(new Set(consultationsCache.data.map((c: Consultation) => c.clinicId))).filter(id => !clinics[id]);

        if (missingPatientIds.length === 0 && missingClinicIds.length === 0) {
          setLoading(false);
          return;
        }
      }

      // Fetch consultations, users and clinics in parallel (bulk) to reduce many small requests
      const nowFetch = Date.now();

      const useCachedUsers = usersCache.data && usersCache.ts && (Date.now() - usersCache.ts) < CACHE_TTL;
      const useCachedClinics = clinicsCache.data && clinicsCache.ts && (Date.now() - clinicsCache.ts) < CACHE_TTL;

      const [data, usersAll, clinicsAll] = await Promise.all([
        consultationAPI.list({ page: 0, size: 100 }),
        useCachedUsers ? Promise.resolve(usersCache.data) : userAPI.getAllUsers(),
        useCachedClinics ? Promise.resolve(clinicsCache.data) : clinicAPI.getAllClinics(),
      ] as const);

      setConsultations(data);
      // cache consultations
      consultationsCache.data = data;
      consultationsCache.ts = nowFetch;

      // cache users/clinics when fetched from network
      if (!useCachedUsers && usersAll) {
        usersCache.data = usersAll as any[];
        usersCache.ts = Date.now();
      }
      if (!useCachedClinics && clinicsAll) {
        clinicsCache.data = clinicsAll as any[];
        clinicsCache.ts = Date.now();
      }

      // Build maps from usersAll and clinicsAll
      const patientMap: Record<number, PatientInfo> = {};
      try {
        (usersAll || []).forEach((u: any) => {
          const id = u.id ?? u.userId ?? u.personId;
          if (typeof id === 'number') patientMap[id] = { id, name: u.name || u.username || `${u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : `User #${id}`}` };
        });
      } catch (e) {
        // fallback handled below
      }
      setPatients(patientMap);

      const clinicMap: Record<number, ClinicInfo> = {};
      try {
        (clinicsAll || []).forEach((c: any) => {
          const id = c.id ?? c.clinicId;
          if (typeof id === 'number') clinicMap[id] = { id, clinicName: c.clinicName || c.name || `Clinic #${id}` };
        });
      } catch (e) {
        // fallback handled below
      }
      setClinics(clinicMap);
    } catch (err) {
      setError("Failed to load consultations");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await consultationAPI.complete(id);
      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "COMPLETED", completedAt: new Date().toISOString() } : c))
      );
      toast.success('Consultation marked as complete');
    } catch (err) {
      toast.error('Failed to complete consultation');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await consultationAPI.cancel(id);
      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "CANCELLED" } : c))
      );
      toast.success('Consultation cancelled');
    } catch (err) {
      toast.error('Failed to cancel consultation');
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

  const loadLabTestsForConsultation = async (consultationId: number) => {
    setLoadingLabTests(true);
    try {
      const cached = labTestsCache.get(consultationId);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setSelectedConsultationLabTests(cached.data);
        setLoadingLabTests(false);
        return;
      }

      const tests = await labTestAPI.getByConsultation(consultationId);
      setSelectedConsultationLabTests(tests);
      labTestsCache.set(consultationId, { data: tests, ts: Date.now() });
    } catch (err) {
      console.error('Failed to load lab tests:', err);
      setSelectedConsultationLabTests([]);
    } finally {
      setLoadingLabTests(false);
    }
  };

  const handleConsultationClick = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    loadLabTestsForConsultation(consultation.id);
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
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Consultations</h1>
            </div>
            <button
              onClick={loadConsultations}
              disabled={loading}
              className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
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
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Clinic</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Chief Complaint</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Session #</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Booked At</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {consultations.map((c) => (
                        <tr 
                          key={c.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleConsultationClick(c)}
                        >
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
                        </tr>
                      ))}
                  </tbody>
                </table>
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
              ) : selectedConsultationLabTests.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  No lab tests requested for this consultation
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedConsultationLabTests.map((test) => (
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
            
            <div className="mt-6 flex justify-end">
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
    </div>
  );
}
