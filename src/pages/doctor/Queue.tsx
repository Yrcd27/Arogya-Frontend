import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { SearchIcon } from 'lucide-react';
import { clinicAPI, queueAPI, profileAPI, userAPI } from '../../services/api';

export function Queue() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [clinics, setClinics] = useState<Array<{ id: number; clinicName: string }>>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [queueTokens, setQueueTokens] = useState<import('../../services/queueService').QueueTokenResponse[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await clinicAPI.getAllClinics();
        setClinics((all || []).map((c: any) => ({ id: c.id, clinicName: c.clinicName })));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load clinics');
      }
    })();
  }, []);

  useEffect(() => {
    // Handle returning from consultation creation - reload queue
    if (location.state?.consultationCreated && selectedClinicId) {
      loadQueue(selectedClinicId);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadQueue = async (clinicId: number) => {
    try {
      setLoading(true);
      setError(null);
      const tokens = await queueAPI.getClinicQueue(String(clinicId));
      setQueueTokens(tokens || []);
      await hydratePatientNames(tokens || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue');
      setQueueTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const hydratePatientNames = async (
    tokens: import('../../services/queueService').QueueTokenResponse[]
  ) => {
    const ids = Array.from(new Set(tokens.map(t => String(t.patientId)).filter(Boolean)));
    const missing = ids.filter(id => !nameById[id]);
    if (missing.length === 0) return;
    const results = await Promise.all(
      missing.map(async (id) => {
        try {
          const prof = await profileAPI.getPatient(Number(id));
          const name = [prof?.firstName, prof?.lastName].filter(Boolean).join(' ');
          if (name) return { id, name };
        } catch {}
        try {
          const user = await userAPI.getUser(Number(id));
          const name = user?.username || `User #${id}`;
          return { id, name };
        } catch {
          return { id, name: `User #${id}` };
        }
      })
    );
    const map: Record<string, string> = {};
    results.forEach(r => { map[r.id] = r.name; });
    setNameById(prev => ({ ...prev, ...map }));
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
          <div className="mb-4">
            <p className="text-gray-600 text-sm mb-1">Dashboard / Patient Queue</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Patient Queue</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Clinic</label>
                <select
                  value={selectedClinicId ?? ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedClinicId(id);
                    if (id) loadQueue(id);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                >
                  <option value="">Choose clinic...</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.clinicName}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <div className="flex-1 relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by patient name..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    disabled
                  />
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">{error}</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Queue #</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Issued</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {queueTokens.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 bg-[#38A3A5] text-white rounded-full flex items-center justify-center font-semibold">
                          {t.tokenNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{nameById[String(t.patientId)] || `User #${t.patientId}`}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          t.status === 'SERVING' ? 'bg-yellow-100 text-yellow-800' :
                          t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          t.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{new Date(t.issuedAt).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        {t.status === 'COMPLETED' ? (
                          <span className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed inline-block">
                            Completed
                          </span>
                        ) : (
                          <button
                            className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg text-sm font-medium hover:bg-[#2d8284] transition-colors"
                            onClick={() => {
                              navigate('/doctor/queue/create-consultation', {
                                state: {
                                  token: t,
                                  patientName: nameById[String(t.patientId)],
                                  clinicId: selectedClinicId
                                }
                              });
                            }}
                          >
                            Consult
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {selectedClinicId && !loading && queueTokens.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No patients in queue</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Done Persons (Completed) */}
          {queueTokens.filter(t => t.status === 'COMPLETED').length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Done Persons</h3>
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
        </main>
      </div>
    </div>
  );
}