import { Select } from '../../components/Select';
import { PageContent } from '../../components/PageContent';
import { EmptyState } from '../../components/EmptyState';
import { useState, useEffect, useRef } from 'react';
import { useLinkedSearch } from '../../hooks/useLinkedSearch';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { SearchIcon, MapPinIcon, CalendarIcon, UsersIcon, XIcon, HospitalIcon } from 'lucide-react';
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

    if (!isPositiveId(clinic.id) || !clinics.some(item => item.id === clinic.id) || clinic.status !== 'SCHEDULED'
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

  const closeQueueModal = () => {
    if (joinRequestRef.current) return;
    queueRequestRef.current += 1;
    setQueueStatusReady(false);
    setIsQueueModalOpen(false);
  };

  const closeDetailsModal = () => {
    if (joinRequestRef.current) return;
    queueRequestRef.current += 1;
    setQueueStatusReady(false);
    setIsDetailsModalOpen(false);
  };

  const activeQueueToken = queueTokens.find(
    token => patientId && String(token.patientId) === String(patientId) && (token.status === 'PENDING' || token.status === 'SERVING')
  );
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
    status: 'SCHEDULED', // Patients only see scheduled clinics
    sortBy: 'date'
  };
  const filterErrors = validateClinicFilters(clinicFilters);
  const filtersValid = Object.keys(filterErrors).length === 0;
  const filteredAndSortedClinics = filtersValid ? sortClinics(filterClinics(clinics, clinicFilters), 'date') : [];

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
              {filteredAndSortedClinics.map(clinic => {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Clinic Details</h2>
                <button
                  onClick={closeDetailsModal}
                  disabled={joinLoading}
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
                      Available Doctors{!clinicDoctorsLoading && !clinicDoctorsError && ` (${clinicDoctors.length})`}
                    </h4>
                  </div>

                  {clinicDoctorsLoading ? (
                    <p role="status" className="py-4 text-center text-sm text-gray-600">Loading assigned doctors...</p>
                  ) : clinicDoctors.length > 0 ? (
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
                  ) : clinicDoctorsError ? (
                    <p className="text-red-500 italic">Couldn't load doctor information for this clinic. Please try again.</p>
                  ) : (
                    <EmptyState icon={<UsersIcon />} title="No doctors assigned" description="No doctors have been assigned to this clinic yet." headingLevel={5} />
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
                    {!hasCompletedPatientProfile ? (
                      <span className={patientProfileStatus === 'error' ? 'text-red-700' : 'text-amber-700'}>{patientProfileJoinMessage}</span>
                    ) : patientFetchError ? (
                      <span className="text-red-700">Please complete your profile first, then try again.</span>
                    ) : patientId ? (
                      <span>
                        Joining as <span className="font-medium">{patientName || `Patient #${patientId}`}</span>
                      </span>
                    ) : (
                      <span>Detecting your patient profile...</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleJoinQueue}
                      disabled={joinLoading || queueLoading || !queueStatusReady || !!patientFetchError || !patientId || !!activeQueueToken || !hasCompletedPatientProfile}
                      className={`px-4 py-2 bg-[#38A3A5] text-white rounded-lg transition-colors ${patientFetchError || activeQueueToken || !queueStatusReady || !hasCompletedPatientProfile ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2d8284]'} ${joinLoading ? 'opacity-60' : ''}`}
                    >
                      {joinLoading ? 'Joining...' : !queueStatusReady ? 'Checking Queue...' : activeQueueToken ? `In Queue: #${activeQueueToken.tokenNumber}` : profileJoinButtonLabel}
                    </button>
                    <button
                      onClick={handleViewQueue}
                      disabled={joinLoading || queueLoading}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      View Queue
                    </button>
                  </div>
                  {patientFetchError && (
                    <p className="text-xs text-red-500 mt-1">Cannot join queue — please complete your profile first, then try again.</p>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={closeDetailsModal}
                  disabled={joinLoading}
                  className="w-full px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isQueueModalOpen && selectedClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Clinic Queue</h2>
                  <p className="text-sm text-gray-600">{selectedClinic.clinicName}</p>
                </div>
                <button
                  onClick={closeQueueModal}
                  disabled={joinLoading}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {joinSuccess && (
                <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">{joinSuccess}</div>
              )}
              {joinError && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">{joinError}</div>
              )}
              {queueError && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">{queueError}</div>
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
                        className={`flex items-center justify-between p-3 rounded border ${
                          isMine ? 'bg-[#e6f6f6] border-[#38A3A5]' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-sm text-gray-800">
                          <span className="font-medium">Token #{token.tokenNumber}</span>
                          <span className="ml-2">• Position: {token.position}</span>
                          {name && <span className="ml-2 text-gray-600">• {name}</span>}
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
                      <div key={t.id} className="flex items-center justify-between p-3 rounded bg-green-50 border border-green-200">
                        <div className="text-sm text-gray-800">
                          <span className="font-medium">Token #{t.tokenNumber}</span>
                          {nameById[String(t.patientId)] && (
                            <span className="ml-2 text-gray-700">• {nameById[String(t.patientId)]}</span>
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

              <div className="mt-6 pt-4 border-t flex gap-3">
                <button
                  onClick={() => joinQueueForClinic(selectedClinic)}
                  disabled={joinLoading || queueLoading || !queueStatusReady || !!patientFetchError || !patientId || !!activeQueueToken || !hasCompletedPatientProfile}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                    joinLoading || !queueStatusReady || patientFetchError || activeQueueToken || !hasCompletedPatientProfile ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#38A3A5] hover:bg-[#2d8284]'
                  }`}
                >
                  {joinLoading ? 'Joining...' : !queueStatusReady ? 'Checking Queue...' : activeQueueToken ? `In Queue: #${activeQueueToken.tokenNumber}` : profileJoinButtonLabel}
                </button>
                <button
                  onClick={closeQueueModal}
                  disabled={joinLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
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

