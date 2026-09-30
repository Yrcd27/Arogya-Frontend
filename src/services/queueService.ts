// Queue Service API - routed through the API Gateway (see httpClient.ts)
import { apiFetch } from './httpClient';

export type QueueTokenStatus = 'PENDING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';

export interface QueueTokenResponse {
  id: number;
  tokenNumber: number;
  clinicId: string;
  patientId: string;
  consultationId: string;
  status: QueueTokenStatus;
  position: number;
  issuedAt: string;
  updatedAt: string;
}

export const queueAPI = {
  createToken: async (payload: { clinicId: string; patientId: string; consultationId: string }): Promise<QueueTokenResponse> => {
    return apiFetch<QueueTokenResponse>('/queue/tokens', { method: 'POST', body: payload });
  },

  // Only PENDING tokens, ordered by position.
  getClinicQueue: async (clinicId: string): Promise<QueueTokenResponse[]> => {
    return apiFetch<QueueTokenResponse[]>(`/queue/clinics/${clinicId}/tokens`);
  },

  getToken: async (id: number): Promise<QueueTokenResponse> => {
    return apiFetch<QueueTokenResponse>(`/queue/tokens/${id}`);
  },

  updateStatus: async (id: number, status: QueueTokenStatus): Promise<QueueTokenResponse> => {
    return apiFetch<QueueTokenResponse>(`/queue/tokens/${id}/status`, { method: 'PATCH', body: { status } });
  },
};
