// Lab Test Service API - routed through the API Gateway (see httpClient.ts)
import { apiFetch, toQueryString } from './httpClient';
import { unwrapList, type Page } from '../types/api';
import { LabTest, CreateLabTestRequest, UpdateLabTestRequest } from '../types/labTest';

export const labTestAPI = {
  async list(params: Record<string, unknown> = {}): Promise<{ items: LabTest[]; total: number }> {
    const body = await apiFetch<Page<LabTest> | LabTest[]>(`/lab-tests${toQueryString(params)}`);
    return unwrapList<LabTest>(body);
  },

  async getByConsultation(consultationId: number): Promise<LabTest[]> {
    const body = await apiFetch<LabTest[]>(`/lab-tests/consultation/${consultationId}`);
    return Array.isArray(body) ? body : [];
  },

  async get(id: number): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}`);
  },

  async create(data: CreateLabTestRequest): Promise<LabTest> {
    return apiFetch<LabTest>('/lab-tests', { method: 'POST', body: data });
  },

  async update(id: number, data: UpdateLabTestRequest): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}`, { method: 'PUT', body: data });
  },

  async delete(id: number): Promise<void> {
    await apiFetch(`/lab-tests/${id}`, { method: 'DELETE' });
  },

  /** Lab tests assigned to a given technician — there's no dedicated backend
   *  path for this, so it's a filtered list() call. */
  async getByTechnician(technicianId: number): Promise<LabTest[]> {
    const { items } = await this.list({ technicianId });
    return items;
  },

  async getPending(): Promise<LabTest[]> {
    const { items } = await this.list({ status: 'PENDING' });
    return items;
  },

  /** Assigns a technician to a test (does not change status). */
  async assign(id: number, technicianId: number): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}/assign${toQueryString({ technicianId })}`, { method: 'POST' });
  },

  /** Moves a PENDING (or previously COMPLETED) test to IN_PROGRESS. */
  async start(id: number): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}/start`, { method: 'POST' });
  },

  /** Marks an IN_PROGRESS test COMPLETED. Only reachable from IN_PROGRESS. */
  async completeTest(id: number, data?: { testResults?: string; technicianNotes?: string }): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}/complete`, { method: 'POST', body: data ?? null });
  },

  async cancelTest(id: number): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}/cancel`, { method: 'POST' });
  },

  /** Combined status + notes update, used by the technician worklist. */
  async updateStatus(id: number, data: UpdateLabTestRequest): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}/technician-update`, { method: 'PUT', body: data });
  },
};
