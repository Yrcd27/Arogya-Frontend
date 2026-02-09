import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { consultationAPI, Consultation } from "../../services/consultationService";
import { userAPI } from "../../services/userService";
import { clinicAPI } from "../../services/api";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Record<number, PatientInfo>>({});
  const [clinics, setClinics] = useState<Record<number, ClinicInfo>>({});
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

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
      const data = await consultationAPI.list({ page: 0, size: 100 });
      setConsultations(data);
      
      // Fetch patient and clinic info
      const patientIds = Array.from(new Set(data.map((c: Consultation) => c.patientId)));
      const clinicIds = Array.from(new Set(data.map((c: Consultation) => c.clinicId)));
      
      const [patientResults, clinicResults] = await Promise.all([
        Promise.all(
          patientIds.map(async (id) => {
            try {
              const user = await userAPI.getUser(id);
              return { id, name: user.name || user.username || `Patient #${id}` };
            } catch {
              return { id, name: `Patient #${id}` };
            }
          })
        ),
        Promise.all(
          clinicIds.map(async (id) => {
            try {
              const clinic = await clinicAPI.getClinic(id);
              return { id, clinicName: clinic.clinicName || `Clinic #${id}` };
            } catch {
              return { id, clinicName: `Clinic #${id}` };
            }
          })
        )
      ]);
      
      const patientMap: Record<number, PatientInfo> = {};
      patientResults.forEach(p => { patientMap[p.id] = p; });
      setPatients(patientMap);
      
      const clinicMap: Record<number, ClinicInfo> = {};
      clinicResults.forEach(c => { clinicMap[c.id] = c; });
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
    } catch (err) {
      alert("Failed to complete consultation");
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await consultationAPI.cancel(id);
      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "CANCELLED" } : c))
      );
    } catch (err) {
      alert("Failed to cancel consultation");
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
                    {consultations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No consultations found
                        </td>
                      </tr>
                    ) : (
                      consultations.map((c) => (
                        <tr 
                          key={c.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedConsultation(c)}
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
                      ))
                    )}
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
