import { apiFetch, toQueryString } from './httpClient';
import { unwrapList, type Page } from '../types/api';
import { LabTest, CreateLabTestRequest } from '../types/labTest';

export const labTestAPI = {
  async list(params: Record<string, unknown> = {}): Promise<{ items: LabTest[]; total: number }> {
    const body = await apiFetch<Page<LabTest> | LabTest[]>(`/lab-tests${toQueryString(params)}`);
    return unwrapList<LabTest>(body);
  },

  async create(data: CreateLabTestRequest): Promise<LabTest> {
    return apiFetch<LabTest>('/lab-tests', { method: 'POST', body: data });
  },

  async assign(id: number, technicianId: number): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}/assign${toQueryString({ technicianId })}`, { method: 'POST' });
  },

  async start(id: number): Promise<LabTest> {
    return apiFetch<LabTest>(`/lab-tests/${id}/start`, { method: 'POST' });
  },
};
