// Medical Records Service API - routed through the API Gateway (see httpClient.ts)
import { apiFetch, apiFetchBlob, toQueryString } from './httpClient';
import { unwrapList, type Page } from '../types/api';

export interface TestResult {
  id: number;
  labTestId: number;
  patientId: number;
  technicianId: number;
  testResultDescription: string;
  technicianNotes?: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestResultRequest {
  labTestId: number;
  patientId: number;
  technicianId: number;
  testResultDescription: string;
  technicianNotes?: string;
  file?: File;
}

function toFormData(data: Partial<CreateTestResultRequest>): FormData {
  const formData = new FormData();
  if (data.labTestId !== undefined) formData.append('labTestId', String(data.labTestId));
  if (data.patientId !== undefined) formData.append('patientId', String(data.patientId));
  if (data.technicianId !== undefined) formData.append('technicianId', String(data.technicianId));
  formData.append('testResultDescription', data.testResultDescription || '');
  formData.append('technicianNotes', data.technicianNotes || '');
  if (data.file) formData.append('file', data.file);
  return formData;
}

export const medicalRecordsAPI = {
  async create(data: CreateTestResultRequest): Promise<TestResult> {
    return apiFetch<TestResult>('/test-results', { method: 'POST', body: toFormData(data) });
  },

  async getById(id: number): Promise<TestResult> {
    return apiFetch<TestResult>(`/test-results/${id}`);
  },

  /** Throws a 404 ApiError if no result has been submitted yet — callers
   *  treat that as "no result", it's expected, not an error state. */
  async getByLabTestId(labTestId: number): Promise<TestResult> {
    return apiFetch<TestResult>(`/test-results/lab-test/${labTestId}`);
  },

  async getByPatientId(patientId: number): Promise<TestResult[]> {
    return apiFetch<TestResult[]>(`/test-results/patient/${patientId}`);
  },

  async getByPatientIdPaged(patientId: number, params: { page?: number; size?: number } = {}): Promise<{ items: TestResult[]; total: number }> {
    const body = await apiFetch<Page<TestResult>>(`/test-results/patient/${patientId}/paged${toQueryString(params)}`);
    return unwrapList<TestResult>(body);
  },

  async list(params: { page?: number; size?: number; sortBy?: string; sortDir?: string } = {}): Promise<{ items: TestResult[]; total: number }> {
    const body = await apiFetch<Page<TestResult>>(`/test-results${toQueryString(params)}`);
    return unwrapList<TestResult>(body);
  },

  async downloadFile(id: number, fallbackName = 'test-result'): Promise<void> {
    const { blob, filename } = await apiFetchBlob(`/test-results/${id}/download`, fallbackName);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // The backend also exposes PUT /test-results/{id} and DELETE /test-results/{id},
  // but the POST variants below were added specifically to avoid a multipart
  // PUT/DELETE CORS-preflight issue, so the frontend uses those.
  async update(id: number, data: Partial<CreateTestResultRequest>): Promise<TestResult> {
    return apiFetch<TestResult>(`/test-results/${id}/update`, { method: 'POST', body: toFormData(data) });
  },

  async delete(id: number): Promise<void> {
    await apiFetch(`/test-results/${id}/delete`, { method: 'POST' });
  },
};
