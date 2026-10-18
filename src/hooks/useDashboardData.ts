import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useUserProfile } from './useUserProfile';
import { labTestAPI } from '../services/labTestService';
import { isPositiveId } from '../utils/clinicalValidation';
import {
  assignedClinics, loadConsultationPreview, loadDashboardAssignments, loadDashboardClinics,
  loadRememberedQueues, loadReportPreview, loadWaitingQueue,
} from '../utils/dashboard';

type DashboardRole = 'admin' | 'doctor' | 'technician' | 'patient';

interface DashboardRequest<T> {
  identity: string;
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useDashboardRequest<T>(identity: string, enabled: boolean, load: (isCurrent: () => boolean) => Promise<T>) {
  const [state, setState] = useState<DashboardRequest<T>>({ identity: '', data: null, loading: enabled, error: null });
  const [attempt, setAttempt] = useState(0);
  const loaderRef = useRef(load);
  const identityRef = useRef(identity);
  loaderRef.current = load;
  identityRef.current = identity;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const isCurrent = () => !cancelled && identityRef.current === identity;
    setState({ identity, data: null, loading: true, error: null });
    void Promise.resolve().then(() => isCurrent() ? loaderRef.current(isCurrent) : undefined).then(data => {
      if (isCurrent() && data !== undefined) setState({ identity, data, loading: false, error: null });
    }).catch((cause: unknown) => {
      if (isCurrent()) setState({ identity, data: null, loading: false, error: cause instanceof Error ? cause.message : 'This information could not be loaded. Please try again.' });
    });
    return () => { cancelled = true; };
  }, [identity, enabled, attempt]);

  const reload = useCallback(() => setAttempt(value => value + 1), []);
  const current = enabled && state.identity === identity ? state : { data: null, loading: enabled, error: null };
  return { ...current, reload };
}

export function useDashboardData({ role, clinicId, worklistPage = 1 }: { role: DashboardRole; clinicId?: number | null; worklistPage?: number }) {
  const { user, sessionKey } = useAuth();
  const { profile, status: profileStatus, error: profileError, refetchProfile: retryProfile } = useUserProfile();
  const signedIn = isPositiveId(user?.id) && user?.userRole.roleName.trim().toLowerCase() === role;
  const userId = signedIn && user ? user.id : 0;
  const profileId = profileStatus === 'ready' && profile?.user?.id === userId && isPositiveId(profile?.id) ? profile.id : null;
  const identity = [sessionKey, userId, role].join(':');

  const clinics = useDashboardRequest(identity + ':clinics', signedIn && role !== 'technician', loadDashboardClinics);
  const assignments = useDashboardRequest(identity + ':assignments', signedIn && (role === 'admin' || role === 'doctor' && profileId !== null), loadDashboardAssignments);
  const myClinics = useMemo(() => role === 'doctor' && profileId !== null && clinics.data && assignments.data
    ? assignedClinics(clinics.data, assignments.data, profileId) : [], [role, profileId, clinics.data, assignments.data]);
  const consultations = useDashboardRequest(identity + ':consultations', signedIn && (role === 'doctor' || role === 'patient'),
    () => loadConsultationPreview(role === 'doctor' ? 'doctor' : 'patient', userId));
  const reports = useDashboardRequest(identity + ':reports:' + (role === 'technician' ? profileId : userId), signedIn && (role === 'patient' || role === 'technician' && profileId !== null),
    () => loadReportPreview(role === 'patient' ? 'patient' : 'technician', role === 'patient' ? userId : profileId ?? 0));
  const labTests = useDashboardRequest(identity + ':lab-tests:' + worklistPage, signedIn && role === 'technician',
    () => labTestAPI.list({ page: Math.max(0, worklistPage - 1), size: 5 }));
  const waitingQueue = useDashboardRequest(identity + ':queue:' + clinicId, signedIn && role === 'doctor' && !!clinicId && myClinics.some(clinic => clinic.id === clinicId),
    () => loadWaitingQueue(clinicId ?? 0));
  const patientQueues = useDashboardRequest(identity + ':patient-queues', signedIn && role === 'patient',
    isCurrent => loadRememberedQueues(userId, isCurrent));

  return { clinics, assignments, myClinics, consultations, reports, labTests, waitingQueue, patientQueues, profileId, profileStatus, profileError, retryProfile, sessionKey };
}
