import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { PatientProfileModal } from '../../components/doctor/PatientProfileModal';
import { StatusBadge } from '../../components/StatusBadge';
import { SearchIcon, PhoneCallIcon, XIcon } from 'lucide-react';
import { clinicAPI, clinicDoctorAPI, queueAPI, profileAPI, userAPI } from '../../services/api';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth } from '../../hooks/useAuth';
import type { QueueTokenResponse } from '../../services/queueService';
import { ApiError } from '../../services/httpClient';

const servingTokenStorageKey = (doctorId: number, clinicId: number) => `doctorQueue:servingTokenId:${doctorId}:${clinicId}`;
const legacyServingTokenStorageKey = (clinicId: number) => `doctorQueue:servingTokenId:${clinicId}`;

const getStoredServingTokenId = (doctorId: number, clinicId: number): number | null => {
  try {
    sessionStorage.removeItem(legacyServingTokenStorageKey(clinicId));
    const raw = sessionStorage.getItem(servingTokenStorageKey(doctorId, clinicId));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
};

const setStoredServingTokenId = (doctorId: number, clinicId: number, tokenId: number) => {
  try {
    sessionStorage.setItem(servingTokenStorageKey(doctorId, clinicId), String(tokenId));
  } catch {
    return;
  }
};

const clearStoredServingTokenId = (doctorId: number, clinicId: number) => {
  try {
    sessionStorage.removeItem(servingTokenStorageKey(doctorId, clinicId));
  } catch {
    return;
  }
};

export function Queue() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, status: profileStatus } = useUserProfile();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  const [clinics, setClinics] = useState<Array<{ id: number; clinicName: string }>>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const clinicIdParam = searchParams.get('clinicId');
  const selectedClinicId = clinicIdParam ? Number(clinicIdParam) : null;

  const [queueTokens, setQueueTokens] = useState<QueueTokenResponse[]>([]);
  const [servingToken, setServingToken] = useState<QueueTokenResponse | null>(null);
  const [servingState, setServingState] = useState<'checking' | 'none' | 'serving' | 'error'>('none');
  const [servingVerificationError, setServingVerificationError] = useState<string | null>(null);
  const [servingRetryKey, setServingRetryKey] = useState(0);
  const [recentlyDone, setRecentlyDone] = useState<QueueTokenResponse[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const loadQueueRef = useRef<(clinicId: number) => Promise<void>>(async () => undefined);
  const queueRequestRef = useRef(0);

  // Only clinics this doctor is actually assigned to.
  useEffect(() => {
    if (profileStatus === 'loading') {
      setClinicsLoading(true);
      return;
    }

    if (!profile?.id) {
      setClinics([]);
      setClinicsLoading(false);
      setError(profileStatus === 'not-found' ? 'Please complete your profile first, then try again.' : null);
      return;
    }

    (async () => {
      try {
        setClinicsLoading(true);
        setError(null);
        const [allClinicDoctors, allClinics] = await Promise.all([
          clinicDoctorAPI.getAllClinicDoctors(),
          clinicAPI.getAllClinics(),
        ]);
        const myClinicIds = new Set(
          allClinicDoctors.filter(cd => cd.doctorRefId === profile.id).map(cd => cd.clinic?.id).filter((id): id is number => typeof id === 'number')
        );
        const mine = allClinics.filter(c => myClinicIds.has(c.id)).map(c => ({ id: c.id, clinicName: c.clinicName }));
        setClinics(mine);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load your clinics');
      } finally {
        setClinicsLoading(false);
      }
    })();
  }, [profile?.id, profileStatus]);

  // Restore the queue for the clinic in the URL once the clinic list is known.
  useEffect(() => {
    if (selectedClinicId && clinics.some(c => c.id === selectedClinicId)) {
      void loadQueueRef.current(selectedClinicId);
    }
  }, [selectedClinicId, clinics]);

  useEffect(() => {
    if (location.state?.consultationCreated && servingToken) {
      setRecentlyDone(prev => [{ ...servingToken, status: 'COMPLETED' }, ...prev]);
      setServingToken(null);
      setServingState('none');
      if (selectedClinicId && user?.id) clearStoredServingTokenId(user.id, selectedClinicId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, selectedClinicId, servingToken, user?.id]);

  useEffect(() => {
    if (!selectedClinicId || !user?.id) {
      setServingToken(null);
      setServingState('none');
      setServingVerificationError(null);
      return;
    }
    const storedId = getStoredServingTokenId(user.id, selectedClinicId);
    if (!storedId) {
      setServingToken(null);
      setServingState('none');
      setServingVerificationError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setServingState('checking');
      setServingVerificationError(null);
      try {
        const existing = await queueAPI.getToken(storedId);
        if (cancelled) return;
        if (existing.status === 'SERVING') {
          setServingToken(existing);
          setServingState('serving');
          void (async () => {
            const patientId = Number(existing.patientId);
            const profile = await profileAPI.getPatient(patientId).catch(() => null);
            let name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
            if (!name) {
              const patient = await userAPI.getUser(patientId).catch(() => null);
              name = patient?.username || '';
            }
            if (!cancelled) {
              setNameById(previous => ({ ...previous, [String(existing.patientId)]: name || `User #${patientId}` }));
            }
          })();
        } else {
          clearStoredServingTokenId(user.id, selectedClinicId);
          setServingToken(null);
          setServingState('none');
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          clearStoredServingTokenId(user.id, selectedClinicId);
          setServingToken(null);
          setServingState('none');
          return;
        }
        setServingState('error');
        setServingVerificationError(error instanceof Error ? error.message : 'Unable to verify the current patient. Retry before calling another patient.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClinicId, servingRetryKey, user?.id]);

  const loadQueue = async (clinicId: number) => {
    const requestId = ++queueRequestRef.current;
    try {
      setLoading(true);
      setError(null);
      const tokens = await queueAPI.getClinicQueue(String(clinicId));
      if (requestId !== queueRequestRef.current) return;
      setQueueTokens(tokens || []);
      await hydratePatientNames(tokens || []);
    } catch (e) {
      if (requestId !== queueRequestRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load queue');
      setQueueTokens([]);
    } finally {
      if (requestId === queueRequestRef.current) setLoading(false);
    }
  };

  loadQueueRef.current = loadQueue;

  const hydratePatientNames = async (tokens: QueueTokenResponse[]) => {
    const ids = Array.from(new Set(tokens.map(t => String(t.patientId)).filter(Boolean)));
    const missing = ids.filter(id => !nameById[id]);
    if (missing.length === 0) return;
    const results = await Promise.all(
      missing.map(async (id) => {
        try {
          const prof = await profileAPI.getPatient(Number(id));
          const name = [prof?.firstName, prof?.lastName].filter(Boolean).join(' ');
          if (name) return { id, name };
        } catch {
          // fall through to user lookup below
        }
        try {
          const user = await userAPI.getUser(Number(id));
          return { id, name: user?.username || `User #${id}` };
        } catch {
          return { id, name: `User #${id}` };
        }
      })
    );
    const map: Record<string, string> = {};
    results.forEach(r => { map[r.id] = r.name; });
    setNameById(prev => ({ ...prev, ...map }));
  };

  const selectClinic = (id: number | null) => {
    queueRequestRef.current += 1;
    setQueueTokens([]);
    setRecentlyDone([]);
    setSearchParams(id ? { clinicId: String(id) } : {});
  };

  // The backend's clinic-queue endpoint only ever returns PENDING tokens, so
  // once a token moves to SERVING/CANCELLED it's tracked locally instead of
  // relying on a refetch to still include it.
  const callNext = async (token: QueueTokenResponse) => {
    if (servingState !== 'none' || actionLoadingId !== null || !selectedClinicId) return;
    setActionLoadingId(token.id);
    try {
      const updated = await queueAPI.updateStatus(token.id, 'SERVING');
      setQueueTokens(prev => prev.filter(t => t.id !== token.id));
      setServingToken(updated);
      setServingState('serving');
      if (user?.id) setStoredServingTokenId(user.id, selectedClinicId, updated.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to call patient');
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelToken = async (token: QueueTokenResponse) => {
    if (actionLoadingId !== null) return;
    setActionLoadingId(token.id);
    try {
      await queueAPI.updateStatus(token.id, 'CANCELLED');
      setQueueTokens(prev => prev.filter(t => t.id !== token.id));
      if (servingToken?.id === token.id) {
        setServingToken(null);
        setServingState('none');
        if (selectedClinicId && user?.id) clearStoredServingTokenId(user.id, selectedClinicId);
      }
      toast.success(`Token #${token.tokenNumber} cancelled`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel token');
    } finally {
      setActionLoadingId(null);
    }
  };

  const goToConsultation = (token: QueueTokenResponse) => {
    navigate('/doctor/queue/create-consultation', {
      state: {
        token,
        patientName: nameById[String(token.patientId)],
        clinicId: selectedClinicId,
      },
    });
  };

  const filteredTokens = searchTerm.trim()
    ? queueTokens.filter(t => {
        const term = searchTerm.trim().toLowerCase();
        const name = nameById[String(t.patientId)] || '';
        return name.toLowerCase().includes(term) || String(t.tokenNumber).includes(term);
      })
    : queueTokens;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
                  onChange={(e) => selectClinic(e.target.value ? Number(e.target.value) : null)}
                  disabled={clinicsLoading || clinics.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent disabled:opacity-60"
                >
                  <option value="">
                    {clinicsLoading
                      ? 'Loading your clinics...'
                      : clinics.length === 0
                        ? 'You are not assigned to any clinics yet.'
                        : 'Choose clinic...'}
                  </option>
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
                    placeholder="Search by patient name or token number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={!selectedClinicId}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-3 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">{error}</div>
            )}
            {servingState === 'error' && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                <span>{servingVerificationError || 'Unable to verify the current patient. Retry before calling another patient.'}</span>
                <button
                  type="button"
                  onClick={() => setServingRetryKey(key => key + 1)}
                  className="rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
                >
                  Retry verification
                </button>
              </div>
            )}
          </div>

          {/* Now serving */}
          {servingToken && (
            <div className="bg-[#e6f6f6] border border-[#38A3A5] rounded-xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#38A3A5] text-white rounded-full flex items-center justify-center font-semibold">
                  {servingToken.tokenNumber}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Now serving</p>
                  {nameById[String(servingToken.patientId)] ? (
                    <p className="font-medium text-gray-900">{nameById[String(servingToken.patientId)]}</p>
                  ) : (
                    <span className="inline-block h-5 w-28 bg-gray-200 rounded animate-pulse" />
                  )}
                </div>
              </div>
              <button
                className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg text-sm font-medium hover:bg-[#2d8284] transition-colors"
                onClick={() => goToConsultation(servingToken)}
              >
                Start Consultation
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38A3A5] mb-4"></div>
              <p className="text-gray-600">Loading queue...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Queue #</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Issued</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {filteredTokens.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 bg-[#38A3A5] text-white rounded-full flex items-center justify-center font-semibold">
                          {t.tokenNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {nameById[String(t.patientId)] ? (
                          <div className="text-sm font-medium text-gray-900">{nameById[String(t.patientId)]}</div>
                        ) : (
                          <span className="inline-block h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{new Date(t.issuedAt).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="px-3 py-2 text-gray-500 hover:text-[#2d8284] hover:bg-[#38A3A5]/10 rounded-lg transition-colors text-sm"
                            onClick={() => {
                              setSelectedPatientId(t.patientId);
                              setIsProfileModalOpen(true);
                            }}
                          >
                            Profile
                          </button>
                          <button
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#38A3A5] text-white rounded-lg text-sm font-medium hover:bg-[#2d8284] transition-colors disabled:opacity-50"
                            onClick={() => callNext(t)}
                            disabled={actionLoadingId !== null || servingState !== 'none'}
                            title={servingState === 'error' || servingState === 'checking' ? 'Verify the current patient before calling another patient' : servingToken ? 'Finish the current consultation first' : 'Call this patient'}
                          >
                            <PhoneCallIcon className="w-3.5 h-3.5" />
                            Call
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            onClick={() => cancelToken(t)}
                            disabled={actionLoadingId !== null}
                            title="Cancel this token"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                    {selectedClinicId && filteredTokens.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          {queueTokens.length === 0 ? 'No patients waiting in queue' : 'No patients match your search'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {recentlyDone.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Completed this session</h3>
              <div className="space-y-2">
                {recentlyDone.map(t => (
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

      {isProfileModalOpen && selectedPatientId && (
        <PatientProfileModal
          patientId={Number(selectedPatientId)}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedPatientId(null);
          }}
        />
      )}
    </div>
  );
}
