import { clinicAPI, clinicDoctorAPI } from '../services/clinicService';
import { consultationAPI, type Consultation } from '../services/consultationService';
import { medicalRecordsAPI } from '../services/medicalRecordsService';
import { queueAPI, type QueueTokenResponse } from '../services/queueService';
import { ApiError } from '../services/httpClient';
import type { Clinic, ClinicDoctor } from '../types/clinic';
import { isPositiveId } from './clinicalValidation';
import { getAvailableClinics, isValidClinicDate } from './clinic';
import { localDateString } from './profileValidation';

export interface DashboardPage<T> { items: T[]; total: number }
export interface RememberedQueues { tokens: QueueTokenResponse[]; unverified: number }

export function operationalClinics(clinics: Clinic[], today = localDateString()): Clinic[] {
  return clinics.filter(clinic => clinic.status === 'IN_PROGRESS'
    || clinic.status === 'SCHEDULED' && isValidClinicDate(clinic.scheduledDate) && clinic.scheduledDate >= today)
    .sort((a, b) => Number(b.status === 'IN_PROGRESS') - Number(a.status === 'IN_PROGRESS')
      || `${a.scheduledDate}T${a.scheduledTime}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime}`));
}

export function availableClinics(clinics: Clinic[]): Clinic[] {
  return operationalClinics(getAvailableClinics(clinics));
}

export function assignedClinics(clinics: Clinic[], assignments: ClinicDoctor[], profileId: number): Clinic[] {
  const ids = new Set(assignments.filter(row => row.doctorRefId === profileId).map(row => row.clinic?.id));
  return clinics.filter(clinic => ids.has(clinic.id));
}

export function dashboardDate(value?: string, includeTime = false): string {
  if (!value) return 'Date not provided';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } as const : {}),
  });
}

export async function loadDashboardClinics(): Promise<Clinic[]> {
  const clinics = await clinicAPI.getAllClinics();
  if (!Array.isArray(clinics)) throw new Error('Clinic schedules could not be verified. Please try again.');
  return clinics;
}

export async function loadDashboardAssignments(): Promise<ClinicDoctor[]> {
  const assignments = await clinicDoctorAPI.getAllClinicDoctors();
  if (!Array.isArray(assignments) || assignments.some(row => !isPositiveId(row.clinic?.id) || !isPositiveId(row.doctorRefId))) {
    throw new Error('Doctor assignments could not be verified. Please try again.');
  }
  return assignments;
}

export async function loadConsultationPreview(role: 'doctor' | 'patient', userId: number): Promise<DashboardPage<Consultation>> {
  if (!isPositiveId(userId)) throw new Error('The signed-in account could not be verified.');
  const ownerField = role === 'doctor' ? 'doctorId' : 'patientId';
  try {
    const page = await consultationAPI.list({ [ownerField]: userId, page: 0, size: 5 });
    if (page.items.some(item => item[ownerField] !== userId)) throw new Error('The returned consultations do not match your account.');
    return page;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400 && error.bodyEmpty) return { items: [], total: 0 };
    throw error;
  }
}

export async function loadReportPreview(role: 'patient' | 'technician', ownerId: number) {
  if (!isPositiveId(ownerId)) throw new Error('The report owner could not be verified.');
  const page = role === 'patient'
    ? await medicalRecordsAPI.getByPatientIdPaged(ownerId, { page: 0, size: 5 })
    : await medicalRecordsAPI.getByTechnicianIdPaged(ownerId, { page: 0, size: 5 });
  const ownerField = role === 'patient' ? 'patientId' : 'technicianId';
  if (page.items.some(item => item[ownerField] !== ownerId)) throw new Error('The returned reports do not match your account.');
  return page;
}

export async function loadWaitingQueue(clinicId: number): Promise<QueueTokenResponse[]> {
  const tokens = await queueAPI.getClinicQueue(String(clinicId));
  if (!Array.isArray(tokens) || tokens.some(token => Number(token.clinicId) !== clinicId)) {
    throw new Error('The returned queue does not match the selected clinic.');
  }
  return tokens.filter(token => token.status === 'PENDING');
}

export async function loadRememberedQueues(userId: number, isCurrent = () => true): Promise<RememberedQueues> {
  const prefix = `patientQueue:token:${userId}:`;
  const remembered: { clinicId: number; tokenId: number }[] = [];
  let unverified = 0;
  try {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const value = sessionStorage.getItem(key);
      const clinicId = Number(key.slice(prefix.length));
      if (!isPositiveId(clinicId) || !isPositiveId(value)) { unverified += 1; continue; }
      remembered.push({ clinicId, tokenId: Number(value) });
    }
  } catch {
    throw new Error('Your previous queue participation could not be checked. Open Mobile Clinics to check your queue.');
  }
  const tokens: QueueTokenResponse[] = [];
  for (let index = 0; index < remembered.length; index += 2) {
    if (!isCurrent()) break;
    const batch = await Promise.all(remembered.slice(index, index + 2).map(async ({ clinicId, tokenId }) => {
      try {
        const token = await queueAPI.getToken(tokenId);
        if (token.id !== tokenId || Number(token.patientId) !== userId || Number(token.clinicId) !== clinicId) throw new Error('Queue identity mismatch');
        if (token.status === 'PENDING' || token.status === 'SERVING') return token;
        if (token.status !== 'COMPLETED' && token.status !== 'CANCELLED') unverified += 1;
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) unverified += 1;
      }
      return null;
    }));
    tokens.push(...batch.filter((token): token is QueueTokenResponse => token !== null));
  }
  return { tokens, unverified };
}
