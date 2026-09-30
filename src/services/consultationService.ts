// Consultation Service API - routed through the API Gateway (see httpClient.ts)
import { apiFetch, toQueryString } from './httpClient';
import { unwrapList, type Page } from '../types/api';
import type { LabTest } from '../types/labTest';

export type ConsultationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Consultation {
  id: number;
  patientId: number;
  doctorId: number;
  clinicId: number;
  queueTokenId?: number;
  chiefComplaint: string;
  presentIllness?: string;
  pastMedicalHistory?: string;
  recommendations?: string;
  sessionNumber?: number;
  bookedAt?: string;
  status: ConsultationStatus;
  completedAt?: string;
  updatedAt?: string;
}

export interface ConsultationWithTests extends Consultation {
  labTests: LabTest[];
}

// The create endpoint has no `status` field — new consultations always
// start SCHEDULED on the backend.
export interface ConsultationCreate {
  patientId: number;
  doctorId: number;
  clinicId: number;
  queueTokenId?: number;
  chiefComplaint: string;
  presentIllness?: string;
  pastMedicalHistory?: string;
  recommendations?: string;
  sessionNumber?: number;
  bookedAt?: string;
}

export interface ConsultationUpdate {
  chiefComplaint?: string;
  presentIllness?: string;
  pastMedicalHistory?: string;
  recommendations?: string;
  status?: ConsultationStatus;
}

export const consultationAPI = {
  /** Returns the page items plus the real total (from Page.totalElements). */
  async list(params: Record<string, unknown> = {}): Promise<{ items: Consultation[]; total: number }> {
    const body = await apiFetch<Page<Consultation> | Consultation[]>(`/consultations${toQueryString(params)}`);
    return unwrapList<Consultation>(body);
  },
  async get(id: number): Promise<Consultation> {
    return apiFetch<Consultation>(`/consultations/${id}`);
  },
  async getWithTests(id: number): Promise<ConsultationWithTests> {
    return apiFetch<ConsultationWithTests>(`/consultations/${id}/with-tests`);
  },
  async create(payload: ConsultationCreate): Promise<Consultation> {
    return apiFetch<Consultation>('/consultations', { method: 'POST', body: payload });
  },
  async update(id: number, data: ConsultationUpdate): Promise<Consultation> {
    return apiFetch<Consultation>(`/consultations/${id}`, { method: 'PUT', body: data });
  },
  async complete(id: number): Promise<Consultation> {
    return apiFetch<Consultation>(`/consultations/${id}/complete`, { method: 'POST' });
  },
  async cancel(id: number): Promise<Consultation> {
    return apiFetch<Consultation>(`/consultations/${id}/cancel`, { method: 'POST' });
  },
  async remove(id: number): Promise<void> {
    await apiFetch(`/consultations/${id}`, { method: 'DELETE' });
  },
  async removeMany(ids: number[]): Promise<void> {
    await apiFetch('/consultations/bulk-delete', { method: 'POST', body: ids });
  },
};
