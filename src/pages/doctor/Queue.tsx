import { Select } from '../../components/Select';
import { PageContent } from '../../components/PageContent';
import { EmptyState } from '../../components/EmptyState';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { PatientProfileModal } from '../../components/doctor/PatientProfileModal';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { ClipboardCheck, ClipboardList, SearchIcon, PhoneCallIcon, XCircle, Loader2, RefreshCw, UsersRound } from 'lucide-react';
import { clinicAPI, clinicDoctorAPI, queueAPI, profileAPI, userAPI } from '../../services/api';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth } from '../../hooks/useAuth';
import type { QueueTokenResponse } from '../../services/queueService';
import { ApiError } from '../../services/httpClient';
import { isPositiveId } from '../../utils/clinicalValidation';

const servingTokenStorageKey = (doctorId: number, clinicId: number) => `doctorQueue:servingTokenId:${doctorId}:${clinicId}`;
const legacyServingTokenStorageKey = (clinicId: number) => `doctorQueue:servingTokenId:${clinicId}`;

const getStoredServingTokenId = (doctorId: number, clinicId: number): number | null => {
  try {
    sessionStorage.removeItem(legacyServingTokenStorageKey(clinicId));
    const raw = sessionStorage.getItem(servingTokenStorageKey(doctorId, clinicId));
    if (raw === null) return null;
    if (!isPositiveId(raw)) {
      sessionStorage.removeItem(servingTokenStorageKey(doctorId, clinicId));
      return null;
    }
    return Number(raw);
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
  const { user, sessionKey } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  const [clinics, setClinics] = useState<Array<{ id: number; clinicName: string }>>([]);
  const [clinicsLoading, setClinicsLoading] = useState(true);
  const clinicIdParam = searchParams.get('clinicId');
  const selectedClinicId = isPositiveId(clinicIdParam) ? Number(clinicIdParam) : null;

  const [queueTokens, setQueueTokens] = useState<QueueTokenResponse[]>([]);
  const [servingToken, setServingToken] = useState<QueueTokenResponse | null>(null);
  const [servingState, setServingState] = useState<'checking' | 'none' | 'serving' | 'error'>('none');
  const [servingVerificationError, setServingVerificationError] = useState<string | null>(null);
  const [servingRetryKey, setServingRetryKey] = useState(0);
  const [recentlyDone, setRecentlyDone] = useState<QueueTokenResponse[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [queueContext, setQueueContext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [tokenToCancel, setTokenToCancel] = useState<{ token: QueueTokenResponse; context: string } | null>(null);
  const loadQueueRef = useRef<(clinicId: number) => Promise<void>>(async () => undefined);
  const queueRequestRef = useRef(0);
  const actionRef = useRef(false);
  const contextKey = `${sessionKey}:${selectedClinicId}`;
  const currentContextRef = useRef(contextKey);
  currentContextRef.current = contextKey;
  const verifiedContextRef = useRef<string | null>(null);
  const validClinic = !clinicsLoading && profileStatus === 'ready' && clinics.some(clinic => clinic.id === selectedClinicId);

  // Only clinics this doctor is actually assigned to.
  useEffect(() => {
    let cancelled = false;
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
        if (!cancelled) setClinics(mine);
      } catch (e) {
        if (!cancelled) {
          setClinics([]);
          setError(e instanceof Error ? e.message : 'Failed to load your clinics');
        }
      } finally {
        if (!cancelled) setClinicsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id, profileStatus, sessionKey]);

  // Restore the queue for the clinic in the URL once the clinic list is known.
  useEffect(() => {
    queueRequestRef.current += 1;
    setQueueTokens([]);
    setRecentlyDone([]);
    setNameById({});
    setLoading(false);
    setQueueContext(null);
    setTokenToCancel(null);
    setIsProfileModalOpen(false);
    setSelectedPatientId(null);
    if (selectedClinicId && validClinic) {
      void loadQueueRef.current(selectedClinicId);
    }
    return () => { queueRequestRef.current += 1; };
  }, [selectedClinicId, validClinic, sessionKey]);

  useEffect(() => {
    if (location.state?.consultationCreated && servingToken && location.state.tokenId === servingToken.id && Number(servingToken.clinicId) === selectedClinicId) {
      setRecentlyDone(prev => [{ ...servingToken, status: 'COMPLETED' }, ...prev]);
      setServingToken(null);
      setServingState('none');
      if (selectedClinicId && user?.id) clearStoredServingTokenId(user.id, selectedClinicId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, selectedClinicId, servingToken, user?.id]);

  useEffect(() => {
    verifiedContextRef.current = null;
    setServingToken(null);
    if (!selectedClinicId || !user?.id || !validClinic) {
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
      verifiedContextRef.current = contextKey;
      return;
    }
    let cancelled = false;
    (async () => {
      setServingState('checking');
      setServingVerificationError(null);
      try {
        const existing = await queueAPI.getToken(storedId);
        if (cancelled) return;
        if (existing.id !== storedId || Number(existing.clinicId) !== selectedClinicId || !isPositiveId(existing.patientId)) {
          throw new Error('The saved queue token does not match this clinic. Verify the queue before continuing.');
        }
        if (existing.status === 'SERVING') {
          setServingToken(existing);
          setServingState('serving');
          verifiedContextRef.current = contextKey;
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
          verifiedContextRef.current = contextKey;
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          clearStoredServingTokenId(user.id, selectedClinicId);
          setServingToken(null);
          setServingState('none');
          verifiedContextRef.current = contextKey;
          return;
        }
        setServingState('error');
        setServingVerificationError(error instanceof Error ? error.message : 'Unable to verify the current patient. Retry before calling another patient.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClinicId, servingRetryKey, user?.id, validClinic, contextKey]);

  const loadQueue = async (clinicId: number) => {
    if (!isPositiveId(clinicId) || !validClinic || selectedClinicId !== clinicId) return;
    const requestId = ++queueRequestRef.current;
    const requestContext = currentContextRef.current;
    try {
      setLoading(true);
      setError(null);
      const tokens = await queueAPI.getClinicQueue(String(clinicId));
      if (requestId !== queueRequestRef.current || currentContextRef.current !== requestContext) return;
      setQueueTokens(tokens || []);
      await hydratePatientNames(tokens || [], requestContext);
    } catch (e) {
      if (requestId !== queueRequestRef.current || currentContextRef.current !== requestContext) return;
      setError(e instanceof Error ? e.message : 'Failed to load queue');
      setQueueTokens([]);
    } finally {
      if (requestId === queueRequestRef.current && currentContextRef.current === requestContext) {
        setLoading(false);
        setQueueContext(requestContext);
      }
    }
  };

  loadQueueRef.current = loadQueue;

  const hydratePatientNames = async (tokens: QueueTokenResponse[], requestContext: string) => {
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
    if (currentContextRef.current === requestContext) setNameById(prev => ({ ...prev, ...map }));
  };

  const selectClinic = (id: number | null) => {
    if (actionRef.current) return;
    if (id !== null && (!isPositiveId(id) || !clinics.some(clinic => clinic.id === id))) {
      setError('Select one of your assigned clinics.');
      return;
    }
    verifiedContextRef.current = null;
    setServingToken(null);
    setServingState('checking');
    queueRequestRef.current += 1;
    setQueueTokens([]);
    setRecentlyDone([]);
    setSearchParams(id ? { clinicId: String(id) } : {});
  };

  // The backend's clinic-queue endpoint only ever returns PENDING tokens, so
  // once a token moves to SERVING/CANCELLED it's tracked locally instead of
  // relying on a refetch to still include it.
  const callNext = async (token: QueueTokenResponse) => {
    if (actionRef.current || servingState !== 'none' || !selectedClinicId || !user?.id || !validClinic
      || verifiedContextRef.current !== contextKey) return;
    if (!isPositiveId(token.id) || !isPositiveId(token.patientId) || Number(token.clinicId) !== selectedClinicId
      || token.status !== 'PENDING' || !queueTokens.some(item => item.id === token.id)) {
      toast.error('This token is not waiting in the selected clinic. Reload the queue.');
      return;
    }
    const requestContext = contextKey;
    const doctorId = user.id;
    actionRef.current = true;
    setActionLoadingId(token.id);
    setStoredServingTokenId(doctorId, selectedClinicId, token.id);
    try {
      const current = await queueAPI.getToken(token.id);
      if (currentContextRef.current !== requestContext) return;
      if (current.id !== token.id || current.status !== 'PENDING' || Number(current.clinicId) !== selectedClinicId || String(current.patientId) !== String(token.patientId)) {
        throw new Error('This patient is no longer waiting in the selected clinic. Retry verification and reload the queue.');
      }
      const updated = await queueAPI.updateStatus(token.id, 'SERVING');
      if (updated.id !== token.id || Number(updated.clinicId) !== selectedClinicId || String(updated.patientId) !== String(token.patientId) || updated.status !== 'SERVING') {
        throw new Error('The server did not confirm this patient as serving. Retry verification before calling another patient.');
      }
      if (currentContextRef.current !== requestContext) return;
      setQueueTokens(prev => prev.filter(t => t.id !== token.id));
      setServingToken(updated);
      setServingState('serving');
      if (user?.id) setStoredServingTokenId(user.id, selectedClinicId, updated.id);
    } catch (e) {
      if (currentContextRef.current !== requestContext) return;
      verifiedContextRef.current = null;
      setServingState('error');
      const message = e instanceof ApiError && e.status === 403 ? 'You do not have permission to call this patient. Verify your clinic assignment with an administrator.' : e instanceof Error ? e.message : 'Failed to call patient';
      setServingVerificationError(message);
      toast.error(message);
    } finally {
      actionRef.current = false;
      setActionLoadingId(null);
    }
  };

  const cancelToken = async (token: QueueTokenResponse) => {
    if (actionRef.current || !selectedClinicId || !validClinic || !isPositiveId(token.id)
      || Number(token.clinicId) !== selectedClinicId || token.status !== 'PENDING'
      || !queueTokens.some(item => item.id === token.id)) return;
    const requestContext = contextKey;
    actionRef.current = true;
    setActionLoadingId(token.id);
    try {
      const current = await queueAPI.getToken(token.id);
      if (currentContextRef.current !== requestContext) return;
      if (current.id !== token.id || current.status !== 'PENDING' || Number(current.clinicId) !== selectedClinicId || String(current.patientId) !== String(token.patientId)) {
        throw new Error('This token is no longer waiting in the selected clinic. Reload the queue before cancelling.');
      }
      const updated = await queueAPI.updateStatus(token.id, 'CANCELLED');
      if (updated.id !== token.id || Number(updated.clinicId) !== selectedClinicId
        || String(updated.patientId) !== String(token.patientId) || updated.status !== 'CANCELLED') {
        throw new Error('Cancellation was not confirmed. Reload the queue to check the token before trying again.');
      }
      if (currentContextRef.current !== requestContext) return;
      setQueueTokens(prev => prev.filter(t => t.id !== token.id));
      if (servingToken?.id === token.id) {
        setServingToken(null);
        setServingState('none');
        if (selectedClinicId && user?.id) clearStoredServingTokenId(user.id, selectedClinicId);
      }
      toast.success(`Token #${token.tokenNumber} cancelled`);
      setTokenToCancel(null);
    } catch (e) {
      if (currentContextRef.current !== requestContext) return;
      toast.error(e instanceof Error ? e.message : 'Failed to cancel token');
      throw e;
    } finally {
      actionRef.current = false;
      setActionLoadingId(null);
    }
  };

  const goToConsultation = (token: QueueTokenResponse) => {
    if (actionRef.current || !validClinic || servingState !== 'serving' || verifiedContextRef.current !== contextKey
      || servingToken?.id !== token.id || Number(token.clinicId) !== selectedClinicId) return;
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

  const queueIsLoading = loading || queueContext !== contextKey;
  const waitingCount = queueTokens.filter(token => token.status === 'PENDING').length;
  const verifiedServingToken = validClinic && verifiedContextRef.current === contextKey && servingState === 'serving' ? servingToken : null;
  const waitingMetric = !queueIsLoading && !error ? waitingCount : null;
  const calledMetric = verifiedContextRef.current === contextKey && servingState !== 'checking' && servingState !== 'error'
    ? (verifiedServingToken ? 1 : 0)
    : null;
  const hasEmptyQueueState = validClinic && !queueIsLoading && !error && filteredTokens.length === 0;
  const shouldFillAvailableSpace = !selectedClinicId || hasEmptyQueueState;
  const primaryActionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#38A3A5] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d8284] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={'flex min-h-screen flex-col transition-all duration-300 ' + (isSidebarOpen ? 'md:ml-64' : 'md:ml-0')}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent fill={shouldFillAvailableSpace} className="flex flex-col">
          <div>
            <p className="text-gray-600 text-sm mb-1">Dashboard / Patient Queue</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Patient Queue</h1>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="min-w-0">
                <label htmlFor="doctor-queue-clinic" className="mb-2 block text-sm font-medium text-gray-700">Select Clinic</label>
                <Select
                  id="doctor-queue-clinic"
                  value={selectedClinicId ?? ''}
                  onChange={(e) => selectClinic(e.target.value ? Number(e.target.value) : null)}
                  disabled={clinicsLoading || clinics.length === 0 || actionLoadingId !== null}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:opacity-60"
                >
                  <option value="">
                    {clinicsLoading
                      ? 'Loading your clinics...'
                      : clinics.length === 0
                        ? 'You are not assigned to any clinics yet.'
                        : 'Choose clinic...'}
                  </option>
                  {clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>{clinic.clinicName}</option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0 lg:col-span-2">
                <label htmlFor="doctor-queue-search" className="mb-2 block text-sm font-medium text-gray-700">Search patients</label>
                <div className="relative">
                  <SearchIcon aria-hidden="true" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="doctor-queue-search"
                    type="search"
                    placeholder="Search by patient name or token number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={!validClinic}
                    className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-3 text-sm disabled:bg-gray-50 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
            {error && !validClinic && (
              <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            {validClinic && servingState === 'checking' && (
              <p role="status" className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                Checking your current patient before enabling Call Patient...
              </p>
            )}
            {validClinic && servingState === 'error' && (
              <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span>{servingVerificationError || 'Unable to verify the current patient. Retry before calling another patient.'}</span>
                <button
                  type="button"
                  onClick={() => setServingRetryKey(key => key + 1)}
                  disabled={actionLoadingId !== null}
                  className="min-h-10 rounded-lg px-3 py-2 font-medium underline underline-offset-2 disabled:opacity-50"
                >
                  Retry verification
                </button>
              </div>
            )}
          </div>

          {validClinic && (
            <section aria-label="Queue overview" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex min-h-24 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f6f6] text-[#2d8284]">
                  <UsersRound aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-600">Waiting</p>
                  <p className="mt-0.5 text-2xl font-semibold leading-none text-gray-900">{waitingMetric ?? '—'}</p>
                  <p className="mt-1 text-xs text-gray-500">Current clinic queue</p>
                </div>
              </div>
              <div className="flex min-h-24 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f6f6] text-[#2d8284]">
                  <PhoneCallIcon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-600">Called</p>
                  <p className="mt-0.5 text-2xl font-semibold leading-none text-gray-900">{calledMetric ?? '—'}</p>
                  <p className="mt-1 text-xs text-gray-500">Currently serving</p>
                </div>
              </div>
              <div className="flex min-h-24 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f6f6] text-[#2d8284]">
                  <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="mt-0.5 text-2xl font-semibold leading-none text-gray-900">{recentlyDone.length}</p>
                  <p className="mt-1 text-xs text-gray-500">This session</p>
                </div>
              </div>
            </section>
          )}

          {validClinic && verifiedServingToken && (
            <section aria-label="Now serving" className="flex flex-col gap-3 rounded-xl border border-[#38A3A5]/40 bg-[#e6f6f6] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-label={'Token ' + verifiedServingToken.tokenNumber} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#38A3A5] text-sm font-semibold text-white">
                  {verifiedServingToken.tokenNumber}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#2d8284]">Now serving</p>
                  <p className="break-words font-semibold text-gray-900">{nameById[String(verifiedServingToken.patientId)] || 'Patient #' + verifiedServingToken.patientId}</p>
                </div>
              </div>
              <button
                type="button"
                className={primaryActionClass + ' shrink-0'}
                disabled={actionLoadingId !== null}
                onClick={() => goToConsultation(verifiedServingToken)}
              >
                Start Consultation
              </button>
            </section>
          )}

          {!selectedClinicId ? (
            <EmptyState variant="page" icon={<ClipboardList />} title="Select a Clinic to View Patient Queue"
              description="Choose a clinic above to view waiting patients and manage consultations." />
          ) : !validClinic ? (
            <div role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
              {clinicsLoading ? 'Loading your assigned clinics...' : 'Choose an available clinic from your assignments above.'}
            </div>
          ) : (
            <section aria-labelledby="waiting-queue-title" aria-busy={queueIsLoading} className={`min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm${hasEmptyQueueState ? ' flex min-h-0 flex-1 flex-col' : ''}`}>
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
                <h2 id="waiting-queue-title" className="text-base font-semibold text-gray-900">Waiting patients</h2>
                <button
                  type="button"
                  onClick={() => void loadQueue(selectedClinicId)}
                  disabled={queueIsLoading || actionLoadingId !== null}
                  aria-label="Refresh patient queue"
                  title="Refresh patient queue"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#2d8284] disabled:opacity-40"
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              {queueIsLoading ? (
                <div role="status" className="flex items-center justify-center gap-2 p-8 text-sm text-gray-600">
                  <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-[#38A3A5] motion-reduce:animate-none" />
                  Loading patient queue...
                </div>
              ) : error ? (
                <div role="alert" className="p-6 text-center">
                  <p className="font-medium text-gray-900">Unable to load the patient queue</p>
                  <p className="mt-1 break-words text-sm text-red-700">{error}</p>
                  <button type="button" onClick={() => void loadQueue(selectedClinicId)} disabled={actionLoadingId !== null} className={primaryActionClass + ' mt-4'}>Try again</button>
                </div>
              ) : filteredTokens.length === 0 ? (
                <EmptyState variant="page" surface={false} headingLevel={3} icon={<ClipboardList />} title={queueTokens.length === 0 ? 'No patients waiting' : 'No matching patients'}
                  description={queueTokens.length === 0 ? 'New waiting patients will appear here. Refresh to check for updates.' : 'Try another patient name or token number.'}
                  action={queueTokens.length > 0 ? { label: 'Clear search', onClick: () => setSearchTerm('') } : undefined} />
              ) : (
                <div role="region" aria-label="Patient queue table" tabIndex={0} className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#38A3A5]">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <caption className="sr-only">Waiting patient queue for {clinics.find(clinic => clinic.id === selectedClinicId)?.clinicName}</caption>
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium sm:px-5">Queue Token</th>
                        <th scope="col" className="px-4 py-3 font-medium">Patient</th>
                        <th scope="col" className="px-4 py-3 font-medium">Status</th>
                        <th scope="col" className="px-4 py-3 font-medium">Issued Time</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium sm:px-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTokens.map(token => (
                        <tr key={token.id} className="hover:bg-gray-50/70">
                          <td className="px-4 py-3 sm:px-5">
                            <span aria-label={'Token ' + token.tokenNumber} className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#e6f6f6] px-2 text-sm font-semibold text-[#2d8284]">{token.tokenNumber}</span>
                          </td>
                          <td className="max-w-52 break-words px-4 py-3 font-medium text-gray-900">{nameById[String(token.patientId)] || 'Patient #' + token.patientId}</td>
                          <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={token.status} /></td>
                          <td className="px-4 py-3 text-gray-600">
                            <time dateTime={token.issuedAt} className="whitespace-nowrap">{new Date(token.issuedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                            <span className="mt-0.5 block whitespace-nowrap text-xs text-gray-500">{new Date(token.issuedAt).toLocaleDateString()}</span>
                          </td>
                          <td className="px-4 py-3 sm:px-5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-[#2d8284]"
                                aria-label={'View profile for ' + (nameById[String(token.patientId)] || 'patient #' + token.patientId)}
                                onClick={() => { setSelectedPatientId(token.patientId); setIsProfileModalOpen(true); }}
                              >Profile</button>
                              <button
                                type="button"
                                className={primaryActionClass + ' whitespace-nowrap'}
                                onClick={() => void callNext(token)}
                                disabled={actionLoadingId !== null || servingState !== 'none' || !validClinic || verifiedContextRef.current !== contextKey || token.status !== 'PENDING'}
                                title={servingState === 'error' || servingState === 'checking' ? 'Verify the current patient before calling another patient' : servingToken ? 'Finish the current consultation first' : 'Call this patient'}
                              >
                                {actionLoadingId === token.id && !tokenToCancel ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PhoneCallIcon aria-hidden="true" className="h-4 w-4" />}
                                {actionLoadingId === token.id && !tokenToCancel ? 'Calling...' : 'Call Patient'}
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => setTokenToCancel({ token, context: contextKey })}
                                disabled={actionLoadingId !== null || !validClinic || token.status !== 'PENDING'}
                                aria-label={'Cancel token #' + token.tokenNumber}
                                title="Cancel Token"
                              ><XCircle aria-hidden="true" className="h-5 w-5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

        </PageContent>
      </div>

      <ConfirmDialog
        isOpen={tokenToCancel !== null && tokenToCancel.context === contextKey}
        title="Cancel Queue Token?"
        message={'Are you sure you want to cancel token #' + (tokenToCancel?.token.tokenNumber ?? '') + ' for this patient? This action may affect their place in the queue.'}
        cancelLabel="Keep Token"
        confirmLabel="Cancel Token"
        loading={actionLoadingId !== null}
        onCancel={() => { if (!actionRef.current) setTokenToCancel(null); }}
        onConfirm={async () => {
          if (!tokenToCancel || tokenToCancel.context !== currentContextRef.current) return;
          await cancelToken(tokenToCancel.token);
        }}
      />

      {isProfileModalOpen && selectedPatientId && (
        <PatientProfileModal
          patientId={Number(selectedPatientId)}
          onClose={() => { setIsProfileModalOpen(false); setSelectedPatientId(null); }}
        />
      )}
    </div>
  );
}

