import { Select } from '../../components/Select';
import { PaginationFooter } from '../../components/PaginationFooter';
import { PageContent } from '../../components/PageContent';
import { EmptyState } from '../../components/EmptyState';
import { useState, useEffect, useRef } from 'react';
import { useLinkedSearch } from '../../hooks/useLinkedSearch';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { SearchIcon, MapPinIcon, CalendarIcon, UsersIcon, XIcon, HospitalIcon, InfoIcon, Loader2 } from 'lucide-react';
import { clinicAPI, clinicDoctorAPI, queueAPI, profileAPI, userAPI } from '../../services/api';
import { ApiError } from '../../services/httpClient';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { isPositiveId } from '../../utils/clinicalValidation';
import type { QueueTokenResponse } from '../../services/queueService';
import { Clinic, ClinicDoctor, PROVINCES_DISTRICTS, type ClinicFilters } from '../../types/clinic';
import { businessDateString } from '../../utils/businessDate';
import {
  getAvailableClinics,
  filterClinics,
  sortClinics,
  validateClinicFilters,
  getDistrictOptions
} from '../../utils/clinic';
import { ClinicCard } from '../../components/clinic/ClinicCard';
import { DatePicker } from '../../components/DatePicker';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { BUTTON_DANGER, BUTTON_PRIMARY, BUTTON_SECONDARY, MODAL_ALERT, MODAL_CLOSE, MODAL_OVERLAY, MODAL_PANEL, MODAL_TITLE } from '../../components/dialogs/modalStyles';
import { noTranslateProps } from '../../utils/noTranslate';

const patientQueueKey = (patientId: string, clinicId: number) => `patientQueue:token:${patientId}:${clinicId}`;
const rememberedQueueTokens = new Map<string, string>();
const readQueueToken = (key: string): string | null => {
  try { return rememberedQueueTokens.get(key) ?? sessionStorage.getItem(key) ?? null; }
  catch { return rememberedQueueTokens.get(key) ?? null; }
};
const rememberQueueToken = (key: string, value: string | null) => {
  if (value === null) rememberedQueueTokens.delete(key);
  else rememberedQueueTokens.set(key, value);
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch { return; }
};

const findActiveQueueToken = async (tokens: QueueTokenResponse[], clinicId: number, ownerId: string) => {
  const key = patientQueueKey(ownerId, clinicId);
  const existing = tokens.find(token => String(token.patientId) === ownerId && Number(token.clinicId) === clinicId
    && (token.status === 'PENDING' || token.status === 'SERVING'));
  if (existing) {
    rememberQueueToken(key, String(existing.id));
    return existing;
  }
  const remembered = readQueueToken(key);
  if (remembered === null) return undefined;
  if (!isPositiveId(remembered)) throw new Error('A previous queue join has an unconfirmed outcome. Check the queue with clinic staff before trying again.');
  try {
    const token = await queueAPI.getToken(Number(remembered));
    if (token.id !== Number(remembered) || Number(token.clinicId) !== clinicId || String(token.patientId) !== ownerId) throw new Error('The saved queue token does not match this patient and clinic.');
    if (token.status === 'PENDING' || token.status === 'SERVING') return token;
    if (token.status !== 'COMPLETED' && token.status !== 'CANCELLED') throw new Error('The previous queue token could not be verified.');
    rememberQueueToken(key, null);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) rememberQueueToken(key, null);
    else throw error;
  }
  return undefined;
};

export function Clinics() {
  const { user, sessionKey } = useAuth();
  const { profile: currentPatientProfile, status: patientProfileStatus } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<ClinicDoctor[]>([]);
  const [clinicDoctorsError, setClinicDoctorsError] = useState(false);
  const [clinicDoctorsLoading, setClinicDoctorsLoading] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [queueTokens, setQueueTokens] = useState<import('../../services/queueService').QueueTokenResponse[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueStatusReady, setQueueStatusReady] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientFetchError, setPatientFetchError] = useState<string | null>(null);
  const [nameHydrationFailed, setNameHydrationFailed] = useState(false);
  const [joinedClinicIds, setJoinedClinicIds] = useState<Set<number>>(new Set());
  const [queueMembershipLoading, setQueueMembershipLoading] = useState<Set<number>>(new Set());
  const [queueMembershipUnavailable, setQueueMembershipUnavailable] = useState<Set<number>>(new Set());
  const joinRequestRef = useRef(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const selectedClinicRef = useRef<number | null>(null);
  const queueRequestRef = useRef(0);
  const queueMembershipRequestRef = useRef(0);
  const currentSessionRef = useRef(sessionKey);
  currentSessionRef.current = sessionKey;

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  useLinkedSearch(setSearchTerm);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load clinics on component mount
  useEffect(() => {
    loadClinics();
  }, []);

  // Auto-detect logged-in patient profile
  useEffect(() => {
    let cancelled = false;
    setPatientId(null);
    setPatientName(null);
    setPatientFetchError(null);
    setJoinedClinicIds(new Set());
    setQueueMembershipLoading(new Set());
    setQueueMembershipUnavailable(new Set());
    setQueueTokens([]);
    setQueueStatusReady(false);
    setNameById({});
    setSelectedClinic(null);
    selectedClinicRef.current = null;
    queueRequestRef.current += 1;
    setIsQueueModalOpen(false);
    setIsDetailsModalOpen(false);
    (async () => {
      try {
        if (!user) return;
        const profile = await profileAPI.getPatient(user.id);
        if (cancelled) return;
        // Always use user.id as patientId (backend validates against user ID)
        setPatientId(String(user.id));
        const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
        if (name) setPatientName(name);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          // Empty profile state: fallback to user account info gracefully without showing error banner (D-19)
          if (user?.id) setPatientId(String(user.id));
          if (user?.username) setPatientName(user.username);
          setPatientFetchError(null);
          return;
        }
        setPatientFetchError(e instanceof Error ? e.message : 'Failed to fetch patient profile');
      }
    })();
    return () => { cancelled = true; };
  }, [user, sessionKey]);

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

  useEffect(() => {
    const requestId = ++queueMembershipRequestRef.current;
    const requestSession = currentSessionRef.current;
    const isCurrent = () => requestId === queueMembershipRequestRef.current && currentSessionRef.current === requestSession;

    if (!patientId || clinics.length === 0) {
      setQueueMembershipLoading(new Set());
      setQueueMembershipUnavailable(new Set());
      return;
    }

    const clinicIds = clinics.map(clinic => clinic.id);
    setQueueMembershipLoading(new Set(clinicIds));
    setQueueMembershipUnavailable(new Set());

    void Promise.all(clinics.map(async clinic => {
      try {
        const tokens = await queueAPI.getClinicQueue(String(clinic.id));
        const activeToken = await findActiveQueueToken(tokens || [], clinic.id, patientId);
        return { clinicId: clinic.id, active: Boolean(activeToken), unavailable: false };
      } catch (error) {
        console.error(`Failed to verify queue membership for clinic ${clinic.id}:`, error);
        return { clinicId: clinic.id, active: false, unavailable: true };
      }
    })).then(memberships => {
      if (!isCurrent()) return;
      setJoinedClinicIds(new Set(memberships.filter(membership => membership.active).map(membership => membership.clinicId)));
      setQueueMembershipUnavailable(new Set(memberships.filter(membership => membership.unavailable).map(membership => membership.clinicId)));
      setQueueMembershipLoading(new Set());
    });

    return () => {
      queueMembershipRequestRef.current += 1;
    };
  }, [clinics, patientId, sessionKey]);

  const loadClinicDoctors = async (clinicId: number) => {
    const requestSession = currentSessionRef.current;
    setClinicDoctorsLoading(true);
    setClinicDoctorsError(false);
    try {
      const doctors = await clinicDoctorAPI.getClinicDoctorsByClinicId(clinicId);
      if (selectedClinicRef.current !== clinicId || currentSessionRef.current !== requestSession) return;
      setClinicDoctors(doctors || []);
      setClinicDoctorsError(false);
    } catch (error) {
      if (selectedClinicRef.current !== clinicId || currentSessionRef.current !== requestSession) return;
      console.error('Failed to load clinic doctors:', error);
      setClinicDoctors([]);
      setClinicDoctorsError(true);
    } finally {
      if (selectedClinicRef.current === clinicId && currentSessionRef.current === requestSession) setClinicDoctorsLoading(false);
    }
  };

  const handleViewDetails = async (clinic: Clinic) => {
    if (joinRequestRef.current) return;
    selectedClinicRef.current = clinic.id;
    setQueueStatusReady(false);
    setQueueLoading(true);
    setQueueTokens([]);
    setClinicDoctors([]);
    setSelectedClinic(clinic);
    setIsDetailsModalOpen(true);
    setQueueError(null);
    setJoinError(null);
    setJoinSuccess(null);
    await Promise.all([
      loadClinicDoctors(clinic.id),
      loadQueueForClinic(clinic),
    ]);
  };

  const loadQueueForClinic = async (clinic: Clinic) => {
    const requestId = ++queueRequestRef.current;
    const requestSession = currentSessionRef.current;
    const isCurrent = () => requestId === queueRequestRef.current && selectedClinicRef.current === clinic.id && currentSessionRef.current === requestSession;
    try {
      setQueueLoading(true);
      setQueueStatusReady(false);
      setQueueError(null);
      setQueueTokens([]);
      const tokens = await queueAPI.getClinicQueue(String(clinic.id));
      if (!isCurrent()) return;
      setQueueTokens(tokens || []);
      const ownToken = isPositiveId(user?.id) ? await findActiveQueueToken(tokens, clinic.id, String(user?.id)) : undefined;
      if (!isCurrent()) return;
      if (ownToken && !tokens.some(token => token.id === ownToken.id)) setQueueTokens([...tokens, ownToken]);
      await hydratePatientNames(tokens || [], isCurrent);
      if (!isCurrent()) return;
      setJoinedClinicIds(prev => {
        const next = new Set(prev);
        if (ownToken) next.add(clinic.id);
        else next.delete(clinic.id);
        return next;
      });
      setQueueMembershipUnavailable(prev => {
        const next = new Set(prev);
        next.delete(clinic.id);
        return next;
      });
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Failed to load queue:', error);
      setQueueTokens([]);
      setQueueError(error instanceof Error ? error.message : 'Failed to load queue');
    } finally {
      if (isCurrent()) {
        setQueueLoading(false);
        setQueueStatusReady(true);
      }
    }
  };

  const openQueueModal = async (clinic: Clinic) => {
    selectedClinicRef.current = clinic.id;
    setQueueStatusReady(false);
    setQueueLoading(true);
    setQueueTokens([]);
    setSelectedClinic(clinic);
    setIsQueueModalOpen(true);
    await loadQueueForClinic(clinic);
  };

  // Resolve and cache patient display names for a list of tokens
  const hydratePatientNames = async (
    tokens: import('../../services/queueService').QueueTokenResponse[],
    isCurrent: () => boolean,
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
            if (isCurrent()) setNameHydrationFailed(true);
          }
          try {
            const user = await userAPI.getUser(Number(id));
            const name = user?.username || `User #${id}`;
            return { id, name };
          } catch {
            if (isCurrent()) setNameHydrationFailed(true);
            return { id, name: `User #${id}` };
          }
        })
      );
      const map: Record<string, string> = {};
      results.forEach(r => { map[r.id] = r.name; });
      if (isCurrent()) setNameById(prev => ({ ...prev, ...map }));
    } catch (e) {
      if (isCurrent()) setNameHydrationFailed(true);
    }
  };

  const joinQueueForClinic = async (clinic: Clinic) => {
    if (joinRequestRef.current) return;
    setJoinSuccess(null);
    setJoinError(null);
    selectedClinicRef.current = clinic.id;
    setSelectedClinic(clinic);

    if (!hasCompletedPatientProfile) {
      setJoinError(patientProfileJoinMessage);
      setIsQueueModalOpen(true);
      return;
    }

    if (!isPositiveId(clinic.id) || !clinics.some(item => item.id === clinic.id) || clinic.status !== 'SCHEDULED' && clinic.status !== 'IN_PROGRESS'
      || !isPositiveId(user?.id) || patientId !== String(user?.id) || patientFetchError) {
      setJoinError('Patient ID not found. Please ensure you are logged in with a patient profile.');
      setIsQueueModalOpen(true);
      return;
    }

    joinRequestRef.current = true;
    setJoinLoading(true);
    const requestSession = sessionKey;
    const isCurrent = () => currentSessionRef.current === requestSession && selectedClinicRef.current === clinic.id;
    const key = patientQueueKey(patientId, clinic.id);
    let writePending = false;
    try {
      const currentQueue = await queueAPI.getClinicQueue(String(clinic.id));
      if (!isCurrent()) return;
      const existingToken = await findActiveQueueToken(currentQueue, clinic.id, patientId);
      if (!isCurrent()) return;

      if (existingToken) {
        rememberQueueToken(key, String(existingToken.id));
        setJoinedClinicIds(previous => new Set(previous).add(clinic.id));
        setJoinError(`You are already in this clinic queue. Your token is #${existingToken.tokenNumber}.`);
      } else {
        // No consultation exists yet at this point — the doctor creates one
        // when they call this patient in, and links it via queueTokenId.
        writePending = true;
        const res = await queueAPI.createToken({
          clinicId: String(clinic.id),
          patientId: patientId,
          consultationId: '',
        });
        if (!isPositiveId(res.id) || Number(res.clinicId) !== clinic.id || String(res.patientId) !== patientId) throw new Error('The queue service returned an unexpected token. Check the queue before trying again.');
        rememberQueueToken(key, String(res.id));
        writePending = false;
        if (!isCurrent()) return;
        setJoinedClinicIds(previous => new Set(previous).add(clinic.id));
        setJoinSuccess(`Token #${res.tokenNumber} created. Position: ${res.position}`);
      }
    } catch (error) {
      if (writePending && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500)) rememberQueueToken(key, 'unconfirmed');
      if (!isCurrent()) return;
      console.error('Failed to join queue:', error);
      setJoinError(error instanceof Error ? error.message : 'Failed to join queue');
    } finally {
      if (isCurrent()) await openQueueModal(clinic);
      joinRequestRef.current = false;
      setJoinLoading(false);
    }
  };

  const handleViewQueue = async () => {
    if (!selectedClinic || joinRequestRef.current) return;
    await openQueueModal(selectedClinic);
  };

  const handleJoinQueue = async () => {
    if (!selectedClinic) return;
    await joinQueueForClinic(selectedClinic);
  };

  const cancelMyToken = async () => {
    if (!selectedClinic || !activeQueueToken || !patientId || joinRequestRef.current) return;
    const clinic = selectedClinic;
    const target = activeQueueToken;
    joinRequestRef.current = true;
    try {
      const latest = await queueAPI.getToken(target.id);
      if (latest.id !== target.id || Number(latest.clinicId) !== clinic.id || String(latest.patientId) !== patientId) {
        throw new Error('This token does not belong to you for this clinic.');
      }
      if (latest.status !== 'PENDING') {
        await loadQueueForClinic(clinic);
        throw new Error(latest.status === 'SERVING' ? 'You are already being served, so this token can no longer be cancelled here.' : 'This token is no longer active.');
      }
      await queueAPI.updateStatus(target.id, 'CANCELLED');
      rememberQueueToken(patientQueueKey(patientId, clinic.id), null);
      setJoinError(null);
      setJoinSuccess(`Token #${target.tokenNumber} was cancelled.`);
      setConfirmingCancel(false);
    } finally {
      joinRequestRef.current = false;
    }
    await loadQueueForClinic(clinic);
  };

  const closeQueueModal = () => {
    if (joinRequestRef.current) return;
    setIsQueueModalOpen(false);
  };

  const closeDetailsModal = () => {
    if (joinRequestRef.current) return;
    queueRequestRef.current += 1;
    setQueueLoading(false);
    setQueueStatusReady(false);
    setIsDetailsModalOpen(false);
  };

  const retryQueueCheck = () => {
    if (!selectedClinic || queueLoading || joinRequestRef.current) return;
    void loadQueueForClinic(selectedClinic);
  };

  const activeQueueToken = queueTokens.find(
    token => patientId && String(token.patientId) === String(patientId) && (token.status === 'PENDING' || token.status === 'SERVING')
  );
  const queueChecking = queueLoading || !queueStatusReady;
  const queueCheckFailed = !queueChecking && !!queueError;
  const hasCompletedPatientProfile = patientProfileStatus === 'ready'
    && isPositiveId(currentPatientProfile?.id)
    && currentPatientProfile?.user?.id === user?.id;
  const patientProfileNeedsCompletion = patientProfileStatus === 'not-found'
    || patientProfileStatus === 'ready' && !hasCompletedPatientProfile;
  const patientProfileJoinMessage = patientProfileStatus === 'loading'
    ? 'Your patient profile is still being checked. Please wait before joining a queue.'
    : patientProfileNeedsCompletion
      ? 'Complete your patient profile before joining a clinic queue.'
      : 'Your patient profile could not be verified. Please try again later.';
  const profileJoinButtonLabel = patientProfileStatus === 'loading'
    ? 'Checking Profile...'
    : patientProfileNeedsCompletion
      ? 'Complete Profile to Join'
      : patientProfileStatus === 'error'
        ? 'Profile Unavailable'
        : 'Join Queue';

  const clinicFilters: ClinicFilters = {
    searchTerm,
    province: selectedProvince,
    district: selectedDistrict,
    dateRange,
    status: 'All Status',
    sortBy: 'date'
  };
  const filterErrors = validateClinicFilters(clinicFilters);
  const filtersValid = Object.keys(filterErrors).length === 0;
  const filteredAndSortedClinics = filtersValid ? sortClinics(filterClinics(clinics, clinicFilters), 'recent') : [];
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedClinics.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageClinics = filteredAndSortedClinics.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProvince, selectedDistrict, dateRange.start, dateRange.end, pageSize]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedProvince('');
    setSelectedDistrict('');
    setDateRange({ start: '', end: '' });
  };

  const filterProps = (field: keyof typeof filterErrors) => ({
    id: `clinic-filter-${field}`,
    'aria-invalid': !!filterErrors[field],
    'aria-describedby': filterErrors[field] ? `clinic-filter-${field}-error` : undefined,
  });

  const filterError = (field: keyof typeof filterErrors) => filterErrors[field]
    ? <p id={`clinic-filter-${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{filterErrors[field]}</p> : null;

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
        <PageContent fill={!isLoading && !error && filtersValid && filteredAndSortedClinics.length === 0}>
          {/* Header */}
          <div>
            <p className="text-gray-600 text-sm mb-1">Dashboard / Mobile Clinics</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Available Mobile Clinics
            </h1>
            <p className="text-gray-600 mt-1">
              Find and explore mobile clinics scheduled near your area
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                aria-label="Search clinics"
                placeholder="Search clinics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex h-full flex-col justify-end">
                <label htmlFor="clinic-filter-province" className="sr-only">Filter by province</label>
                <Select
                  {...filterProps('province')}
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedDistrict('');
                  }}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                >
                  <option value="">All Provinces</option>
                  {Object.keys(PROVINCES_DISTRICTS).map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </Select>
                {filterError('province')}
              </div>

              <div className="flex h-full flex-col justify-end">
                <label htmlFor="clinic-filter-district" className="sr-only">Filter by district</label>
                <Select
                  {...filterProps('district')}
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  disabled={!selectedProvince}
                >
                  <option value="">All Districts</option>
                  {getDistrictOptions(selectedProvince).map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </Select>
                {filterError('district')}
              </div>

              <div>
                <label htmlFor="clinic-filter-start" className="sr-only">From Date</label>
                <DatePicker
                  {...filterProps('start')}
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  min={businessDateString()}
                  placeholder="From Date"
                  size="compact"
                  showToday
                />
                {filterError('start')}
              </div>

              <div>
                <label htmlFor="clinic-filter-end" className="sr-only">To Date</label>
                <DatePicker
                  {...filterProps('end')}
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  min={filterErrors.start ? businessDateString() : dateRange.start || businessDateString()}
                  placeholder="To Date"
                  size="compact"
                  showToday
                />
                {filterError('end')}
              </div>
            </div>
            {!filtersValid && <p className="mt-3 text-sm text-gray-700">Correct the filters to display clinics, or <button type="button" onClick={clearFilters} className="text-[#2d8284] underline">clear filters</button>.</p>}
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
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Clinics Grid */}
          {!isLoading && !error && filtersValid && filteredAndSortedClinics.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {pageClinics.map(clinic => {
                const alreadyJoined = joinedClinicIds.has(clinic.id);
                const membershipLoading = queueMembershipLoading.has(clinic.id);
                const membershipUnavailable = queueMembershipUnavailable.has(clinic.id);
                const queueButtonLabel = alreadyJoined
                  ? 'Already in Queue'
                  : membershipLoading
                    ? 'Checking Queue...'
                    : membershipUnavailable
                      ? 'Queue Status Unavailable'
                      : profileJoinButtonLabel;

                return (
                  <ClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    footer={
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(clinic)}
                          disabled={joinLoading}
                          className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => joinQueueForClinic(clinic)}
                          disabled={alreadyJoined || membershipLoading || membershipUnavailable || joinLoading || !hasCompletedPatientProfile}
                          title={membershipUnavailable ? 'Unable to verify your queue status. Please try again later.' : !hasCompletedPatientProfile ? patientProfileJoinMessage : undefined}
                          className="min-h-10 rounded-lg bg-[#38A3A5] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d8284] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          {queueButtonLabel}
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
          {!isLoading && !error && filtersValid && filteredAndSortedClinics.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <PaginationFooter
                currentPage={safePage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredAndSortedClinics.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filtersValid && filteredAndSortedClinics.length === 0 && (
            <EmptyState variant="page" surface icon={<HospitalIcon />}
              title={clinics.length === 0 ? 'No clinics scheduled' : 'No clinics match your filters'}
              description={clinics.length === 0 ? 'There are no mobile clinics scheduled at the moment. Please check back later.' : 'Try adjusting your search criteria or filters to find more clinics.'}
              action={searchTerm || selectedProvince || selectedDistrict || dateRange.start || dateRange.end ? { label: 'Clear Filters', onClick: clearFilters } : undefined} />
          )}
        </PageContent>
      </div>

      {/* Clinic Details Modal */}
      {isDetailsModalOpen && selectedClinic && (
        <div className={`${MODAL_OVERLAY} z-50`}>
          <div role="dialog" aria-modal="true" aria-labelledby="clinic-details-title" className={`${MODAL_PANEL} flex max-h-[90vh] max-w-2xl flex-col overflow-hidden`}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
              <h2 id="clinic-details-title" className={MODAL_TITLE}>Clinic Details</h2>
              <button
                type="button"
                onClick={closeDetailsModal}
                disabled={joinLoading}
                aria-label="Close clinic details"
                className={MODAL_CLOSE}
              >
                <XIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              {/* Clinic Information */}
              <div className="space-y-5">
                <div>
                  <h3 translate="no" className="notranslate text-lg font-semibold text-gray-900 mb-3">
                    {selectedClinic.clinicName}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Location</p>
                        <p translate="no" className="notranslate text-gray-600">{selectedClinic.province}</p>
                        <p translate="no" className="notranslate text-gray-600">{selectedClinic.district}</p>
                        {selectedClinic.location && (
                          <p translate="no" className="notranslate text-gray-600">{selectedClinic.location}</p>
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
                      {`Available Doctors${!clinicDoctorsLoading && !clinicDoctorsError ? ` (${clinicDoctors.length})` : ''}`}
                    </h4>
                  </div>

                  {clinicDoctorsLoading ? (
                    <p role="status" className="py-4 text-center text-sm text-gray-600">Loading assigned doctors...</p>
                  ) : clinicDoctors.length > 0 ? (
                    <ul aria-label="Available doctors" className="max-h-[15.5rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
                      {clinicDoctors.map(doctor => (
                        <li key={doctor.id} className="flex h-14 flex-col justify-center rounded-lg border border-gray-200 bg-gray-50 px-3.5">
                          <p translate="no" className="notranslate truncate text-sm font-medium leading-5 text-gray-900">{doctor.doctorName}</p>
                          <p translate="no" className="notranslate truncate text-xs font-medium leading-4 text-[#2d8284]">{doctor.specialization}</p>
                        </li>
                      ))}
                    </ul>
                  ) : clinicDoctorsError ? (
                    <p className="text-red-500 italic">Couldn't load doctor information for this clinic. Please try again.</p>
                  ) : (
                    <EmptyState icon={<UsersIcon />} title="No doctors assigned" description="No doctors have been assigned to this clinic yet." headingLevel={5} />
                  )}
                </div>

                <div role="note" className="flex items-start gap-2 rounded-lg border border-[#bde6e7] bg-[#e6f6f6] px-3 py-2.5 text-sm text-[#2d8284]">
                  <InfoIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <p><strong>Planning to visit?</strong> Note down the location and time details. Mobile clinics provide convenient healthcare services in your community.</p>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <h4 className="font-semibold text-gray-900">Queue Actions</h4>
                  <div role="status" aria-live="polite" className="text-sm text-gray-700">
                    {!hasCompletedPatientProfile ? (
                      <span key="profile" className={patientProfileStatus === 'error' ? 'text-red-700' : 'text-amber-700'}>{patientProfileJoinMessage}</span>
                    ) : patientFetchError ? (
                      <span key="fetch-error" className="text-red-700">Please complete your profile first, then try again.</span>
                    ) : !patientId ? (
                      <span key="detecting">Detecting your patient profile...</span>
                    ) : queueChecking ? (
                      <span key="checking" className="inline-flex items-center gap-2 text-gray-600">
                        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-[#38A3A5] motion-reduce:animate-none" />
                        Checking your queue status...
                      </span>
                    ) : queueCheckFailed ? (
                      <span key="check-failed" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-red-700">
                        <span>Couldn't check your queue status. {queueError}</span>
                        <button type="button" onClick={retryQueueCheck} className="rounded font-medium text-[#2d8284] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A3A5]">Retry</button>
                      </span>
                    ) : activeQueueToken ? (
                      <span key="in-queue">You're in this queue. Your token is <span className="font-medium">#{activeQueueToken.tokenNumber}</span>.</span>
                    ) : (
                      <span key="joining">Joining as <span {...noTranslateProps('font-medium', !!patientName)}>{patientName || `Patient #${patientId}`}</span></span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-3">
                    {!activeQueueToken && (
                      <button
                        type="button"
                        onClick={handleJoinQueue}
                        disabled={joinLoading || queueChecking || queueCheckFailed || !!patientFetchError || !patientId || !hasCompletedPatientProfile}
                        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A3A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-[#38A3A5] text-white hover:bg-[#2d8284]"
                      >
                        {(joinLoading || queueChecking) && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
                        <span>{joinLoading ? 'Joining...' : queueChecking ? 'Checking Queue...' : queueCheckFailed ? 'Queue Unavailable' : profileJoinButtonLabel}</span>
                      </button>
                    )}
                    {activeQueueToken?.status === 'PENDING' && (
                      <button type="button" onClick={() => setConfirmingCancel(true)} disabled={joinLoading || queueLoading} className={`${BUTTON_DANGER} h-10`}>Cancel My Token</button>
                    )}
                    <button
                      type="button"
                      onClick={handleViewQueue}
                      disabled={joinLoading || queueLoading}
                      className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A3A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${activeQueueToken ? 'bg-[#38A3A5] text-white hover:bg-[#2d8284]' : 'border border-[#38A3A5] bg-white text-[#2d8284] hover:bg-[#38A3A5]/10'}`}
                    >
                      View Queue
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={closeDetailsModal}
                disabled={joinLoading}
                className={BUTTON_SECONDARY}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isQueueModalOpen && selectedClinic && (
        <div className={`${MODAL_OVERLAY} z-[60]`}>
          <div role="dialog" aria-modal="true" aria-labelledby="clinic-queue-title" className={`${MODAL_PANEL} flex max-h-[85vh] max-w-lg flex-col overflow-hidden`}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id="clinic-queue-title" className={MODAL_TITLE}>Clinic Queue</h2>
                <p translate="no" className="notranslate truncate text-sm text-gray-600">{selectedClinic.clinicName}</p>
              </div>
              <button
                type="button"
                onClick={closeQueueModal}
                disabled={joinLoading}
                aria-label="Close clinic queue"
                className={MODAL_CLOSE}
              >
                <XIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              {joinSuccess && (
                <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">{joinSuccess}</div>
              )}
              {joinError && (
                <div role="alert" className={`mb-4 ${MODAL_ALERT}`}>{joinError}</div>
              )}
              {queueError && (
                <div role="alert" className={`mb-4 flex items-center justify-between gap-3 ${MODAL_ALERT}`}>
                  <span>{queueError}</span>
                  <button type="button" onClick={retryQueueCheck} disabled={queueLoading} className="shrink-0 rounded px-2 py-1 font-medium text-red-800 hover:bg-red-100 disabled:opacity-50">Retry</button>
                </div>
              )}

              {queueLoading ? (
                <div className="text-center py-8 text-gray-500">Loading queue...</div>
              ) : queueError ? null : queueTokens.filter(t => t.status !== 'COMPLETED').length === 0 ? (
                <EmptyState title="No patients waiting" description="No one is waiting in this queue yet." />
              ) : (
                <div className="space-y-2">
                  {queueTokens.filter(t => t.status !== 'COMPLETED').map(token => {
                    const isMine = patientId && String(token.patientId) === String(patientId);
                    const name = nameById[String(token.patientId)];
                    return (
                      <div
                        key={token.id}
                        className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                          isMine ? 'border-[#38A3A5] bg-[#e6f6f6]' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="text-sm text-gray-800">
                          <span className="font-medium">Token #{token.tokenNumber}</span>
                          <span className="ml-2">• Position: {token.position}</span>
                          {name && <span translate="no" className="notranslate ml-2 text-gray-600">• {name}</span>}
                        </div>
                        <StatusBadge status={token.status} className="shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}

              {queueTokens.filter(t => t.status === 'COMPLETED').length > 0 && (
                <div className="mt-6">
                  <h5 className="font-semibold text-gray-900 mb-2 text-sm">Done</h5>
                  <div className="space-y-2">
                    {queueTokens.filter(t => t.status === 'COMPLETED').map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-sm text-gray-800">
                          <span className="font-medium">Token #{t.tokenNumber}</span>
                          {nameById[String(t.patientId)] && (
                            <span translate="no" className="notranslate ml-2 text-gray-700">• {nameById[String(t.patientId)]}</span>
                          )}
                        </div>
                        <StatusBadge status="COMPLETED" className="shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {nameHydrationFailed && (
                <p className="text-xs text-gray-400 mt-3">Some patient names could not be loaded. IDs are shown instead.</p>
              )}

            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3 sm:px-6">
                {activeQueueToken?.status === 'PENDING' && (
                  <button type="button" onClick={() => setConfirmingCancel(true)} disabled={joinLoading || queueLoading} className={BUTTON_DANGER}>Cancel My Token</button>
                )}
                <button
                  type="button"
                  onClick={() => joinQueueForClinic(selectedClinic)}
                  disabled={joinLoading || queueChecking || queueCheckFailed || !!patientFetchError || !patientId || !!activeQueueToken || !hasCompletedPatientProfile}
                  className={BUTTON_PRIMARY}
                >
                  {joinLoading ? 'Joining...' : queueChecking ? 'Checking Queue...' : queueCheckFailed ? 'Queue Unavailable' : activeQueueToken ? `In Queue: #${activeQueueToken.tokenNumber}` : profileJoinButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={closeQueueModal}
                  disabled={joinLoading}
                  className={BUTTON_SECONDARY}
                >
                  Close
                </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmingCancel && !!activeQueueToken}
        title="Cancel Your Queue Token?"
        message={`Your token #${activeQueueToken?.tokenNumber ?? ''} will be cancelled and you will lose your place in this queue. You can join the queue again later.`}
        cancelLabel="Keep Token"
        confirmLabel="Cancel Token"
        onCancel={() => setConfirmingCancel(false)}
        onConfirm={cancelMyToken}
      />
    </div>
  );
}

