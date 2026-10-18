import { consultationAPI, type Consultation } from '../services/consultationService';
import { labTestAPI } from '../services/labTestService';
import { ApiError } from '../services/httpClient';
import type { Clinic, ClinicDoctor } from '../types/clinic';
import type { LabTest } from '../types/labTest';
import { assignedClinics, availableClinics, dashboardDate, loadDashboardAssignments, loadDashboardClinics } from './dashboard';

export type SearchRole = 'patient' | 'doctor' | 'technician' | 'admin';

export interface SearchResult {
  key: string;
  group: string;
  label: string;
  detail: string;
  to: string;
}

export interface SearchData {
  clinics: Clinic[];
  consultations: Consultation[];
  labTests: LabTest[];
  assignments: ClinicDoctor[];
  unavailable: string[];
}

export const SEARCH_PLACEHOLDERS: Record<SearchRole, string> = {
  patient: 'Search clinics, prescriptions, pages...',
  doctor: 'Search clinics, consultations, pages...',
  technician: 'Search lab tests, pages...',
  admin: 'Search clinics, doctors, pages...',
};

const CACHE_TTL_MS = 60_000;
const MAX_PER_GROUP = 5;
const MAX_LINKED_SEARCH_LENGTH = 100;
const cache = new Map<string, { at: number; data: Promise<SearchData> }>();

export function clearSearchCache(): void {
  cache.clear();
}

export function parseSearchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesTerms(haystack: string, terms: readonly string[]): boolean {
  const text = haystack.toLowerCase();
  return terms.every(term => text.includes(term));
}

export function linkedSearchPath(path: string, search: string): string {
  const value = search.trim().slice(0, MAX_LINKED_SEARCH_LENGTH);
  return value ? `${path}?search=${encodeURIComponent(value)}` : path;
}

async function settle<T>(source: string, task: () => Promise<T>, unavailable: string[]): Promise<T | undefined> {
  try {
    return await task();
  } catch {
    unavailable.push(source);
    return undefined;
  }
}

async function loadOwnConsultations(field: 'patientId' | 'doctorId', userId: number): Promise<Consultation[]> {
  try {
    const page = await consultationAPI.list({ [field]: userId, page: 0, size: 100 });
    return page.items.filter(item => item[field] === userId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 400 && error.bodyEmpty) return [];
    throw error;
  }
}

async function fetchSearchData(role: SearchRole, userId: number, profileId?: number): Promise<SearchData> {
  const unavailable: string[] = [];
  const data: SearchData = { clinics: [], consultations: [], labTests: [], assignments: [], unavailable };

  if (role === 'patient') {
    const [clinics, consultations] = await Promise.all([
      settle('clinics', async () => availableClinics(await loadDashboardClinics()), unavailable),
      settle('prescriptions', () => loadOwnConsultations('patientId', userId), unavailable),
    ]);
    data.clinics = clinics ?? [];
    data.consultations = consultations ?? [];
  } else if (role === 'doctor') {
    const [clinics, consultations] = await Promise.all([
      profileId === undefined
        ? Promise.resolve<Clinic[]>([])
        : settle('clinics', async () => {
          const [allClinics, assignments] = await Promise.all([loadDashboardClinics(), loadDashboardAssignments()]);
          return assignedClinics(allClinics, assignments, profileId);
        }, unavailable),
      settle('consultations', () => loadOwnConsultations('doctorId', userId), unavailable),
    ]);
    data.clinics = clinics ?? [];
    data.consultations = consultations ?? [];
  } else if (role === 'technician') {
    const labTests = await settle('lab tests', async () => (await labTestAPI.list({ page: 0, size: 200 })).items, unavailable);
    data.labTests = labTests ?? [];
  } else {
    const [clinics, assignments] = await Promise.all([
      settle('clinics', loadDashboardClinics, unavailable),
      settle('doctors', loadDashboardAssignments, unavailable),
    ]);
    data.clinics = clinics ?? [];
    data.assignments = assignments ?? [];
  }
  return data;
}

export function loadSearchData(role: SearchRole, userId: number, profileId?: number): Promise<SearchData> {
  const key = `${role}:${userId}:${profileId ?? ''}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const data = fetchSearchData(role, userId, profileId).then(result => {
    if (result.unavailable.length && cache.get(key)?.data === data) cache.delete(key);
    return result;
  });
  cache.set(key, { at: Date.now(), data });
  return data;
}

function rank(label: string, terms: readonly string[]): number {
  const text = label.toLowerCase();
  if (terms.some(term => text.startsWith(term))) return 0;
  return terms.some(term => text.includes(term)) ? 1 : 2;
}

function limit(results: SearchResult[], terms: readonly string[]): SearchResult[] {
  return [...results].sort((a, b) => rank(a.label, terms) - rank(b.label, terms)).slice(0, MAX_PER_GROUP);
}

function clinicText(clinic: Clinic): string {
  return [clinic.clinicName, clinic.location, clinic.district, clinic.province, clinic.status, dashboardDate(clinic.scheduledDate)].filter(Boolean).join(' ');
}

function clinicDetail(clinic: Clinic): string {
  return [clinic.district, dashboardDate(clinic.scheduledDate), clinic.status.replace('_', ' ').toLowerCase()].filter(Boolean).join(' · ');
}

export function searchRoleData(role: SearchRole, data: SearchData, terms: readonly string[]): SearchResult[] {
  if (!terms.length) return [];
  const results: SearchResult[] = [];

  if (role === 'patient') {
    results.push(...limit(data.clinics.filter(clinic => matchesTerms(clinicText(clinic), terms)).map(clinic => ({
      key: `clinic-${clinic.id}`, group: 'Mobile clinics', label: clinic.clinicName, detail: clinicDetail(clinic),
      to: linkedSearchPath('/patient/clinics', clinic.clinicName),
    })), terms));
    results.push(...limit(data.consultations.filter(item => matchesTerms(
      `${item.id} ${item.chiefComplaint ?? ''} ${item.recommendations ?? ''} ${item.status} ${dashboardDate(item.bookedAt)}`, terms,
    )).map(item => ({
      key: `consultation-${item.id}`, group: 'Prescriptions', label: item.chiefComplaint || `Consultation #${item.id}`,
      detail: `Consultation #${item.id} · ${dashboardDate(item.bookedAt || item.completedAt)} · ${item.status.replace('_', ' ').toLowerCase()}`,
      to: item.chiefComplaint ? linkedSearchPath('/patient/records', item.chiefComplaint) : '/patient/records',
    })), terms));
  } else if (role === 'doctor') {
    results.push(...limit(data.clinics.filter(clinic => matchesTerms(clinicText(clinic), terms)).map(clinic => ({
      key: `clinic-${clinic.id}`, group: 'My clinics', label: clinic.clinicName, detail: `${clinicDetail(clinic)} · open queue`,
      to: `/doctor/queue?clinicId=${clinic.id}`,
    })), terms));
    results.push(...limit(data.consultations.filter(item => matchesTerms(
      `${item.id} ${item.chiefComplaint ?? ''} ${item.recommendations ?? ''} ${item.status} patient ${item.patientId} ${dashboardDate(item.bookedAt)}`, terms,
    )).map(item => ({
      key: `consultation-${item.id}`, group: 'Consultations', label: item.chiefComplaint || `Consultation #${item.id}`,
      detail: `Consultation #${item.id} · Patient #${item.patientId} · ${dashboardDate(item.bookedAt || item.completedAt)}`,
      to: `/doctor/consultations?open=${item.id}`,
    })), terms));
  } else if (role === 'technician') {
    results.push(...limit(data.labTests.filter(test => matchesTerms(
      `${test.testName} ${test.id} ${test.consultationId} ${test.status} ${test.status.replace('_', ' ')}`, terms,
    )).map(test => ({
      key: `lab-test-${test.id}`, group: 'Lab tests', label: test.testName,
      detail: `Test #${test.id} · Consultation #${test.consultationId} · ${test.status.replace('_', ' ').toLowerCase()}`,
      to: linkedSearchPath('/technician/lab-tests', test.testName),
    })), terms));
  } else {
    results.push(...limit(data.clinics.filter(clinic => matchesTerms(clinicText(clinic), terms)).map(clinic => ({
      key: `clinic-${clinic.id}`, group: 'Clinics', label: clinic.clinicName, detail: clinicDetail(clinic),
      to: linkedSearchPath('/admin/clinics', clinic.clinicName),
    })), terms));
    results.push(...limit(data.assignments.filter(row => row.clinic && matchesTerms(
      `${row.doctorName} ${row.specialization} ${row.clinic.clinicName}`, terms,
    )).map(row => ({
      key: `assignment-${row.id}`, group: 'Doctors', label: row.doctorName,
      detail: `${row.specialization || 'Doctor'} · assigned to ${row.clinic?.clinicName ?? 'a clinic'}`,
      to: linkedSearchPath('/admin/clinics', row.clinic?.clinicName ?? ''),
    })), terms));
  }
  return results;
}
