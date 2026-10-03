// Medical Records Service API - routed through the API Gateway (see httpClient.ts)
import { apiFetch, apiFetchBlob, toQueryString } from './httpClient';
import { unwrapList, type Page } from '../types/api';

export const MAX_TEST_RESULT_FILES = 5;

export interface TestResultFile {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface TestResult {
  id: number;
  labTestId: number;
  patientId: number;
  technicianId: number;
  testResultDescription: string;
  technicianNotes?: string;
  files: TestResultFile[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestResultRequest {
  labTestId: number;
  patientId: number;
  technicianId: number;
  testResultDescription: string;
  technicianNotes?: string;
  files?: File[];
}

export interface UpdateTestResultRequest {
  testResultDescription?: string;
  technicianNotes?: string;
  files?: File[];
  removeFileIds?: number[];
}

function toFormData(data: Partial<CreateTestResultRequest> & Partial<UpdateTestResultRequest>): FormData {
  const formData = new FormData();
  if (data.labTestId !== undefined) formData.append('labTestId', String(data.labTestId));
  if (data.patientId !== undefined) formData.append('patientId', String(data.patientId));
  if (data.technicianId !== undefined) formData.append('technicianId', String(data.technicianId));
  if (data.testResultDescription !== undefined) formData.append('testResultDescription', data.testResultDescription || '');
  if (data.technicianNotes !== undefined) formData.append('technicianNotes', data.technicianNotes || '');
  (data.files || []).forEach(file => formData.append('files', file));
  (data.removeFileIds || []).forEach(id => formData.append('removeFileIds', String(id)));
  return formData;
}

export const medicalRecordsAPI = {
  async create(data: CreateTestResultRequest): Promise<TestResult> {
    return apiFetch<TestResult>('/test-results', { method: 'POST', body: toFormData(data) });
  },

  /** Throws a 404 ApiError if no result has been submitted yet — callers
   *  treat that as "no result", it's expected, not an error state. */
  async getByLabTestId(labTestId: number): Promise<TestResult> {
    return apiFetch<TestResult>(`/test-results/lab-test/${labTestId}`);
  },

  async getByPatientIdPaged(patientId: number, params: { page?: number; size?: number } = {}): Promise<{ items: TestResult[]; total: number }> {
    const body = await apiFetch<Page<TestResult>>(`/test-results/patient/${patientId}/paged${toQueryString(params)}`);
    return unwrapList<TestResult>(body);
  },

  async getByTechnicianId(technicianId: number): Promise<TestResult[]> {
    return apiFetch<TestResult[]>(`/test-results/technician/${technicianId}`);
  },

  async getByTechnicianIdPaged(technicianId: number, params: { page?: number; size?: number } = {}): Promise<{ items: TestResult[]; total: number }> {
    const body = await apiFetch<Page<TestResult>>(`/test-results/technician/${technicianId}/paged${toQueryString(params)}`);
    return unwrapList<TestResult>(body);
  },

  async list(params: { page?: number; size?: number; sortBy?: string; sortDir?: string } = {}): Promise<{ items: TestResult[]; total: number }> {
    const body = await apiFetch<Page<TestResult>>(`/test-results${toQueryString(params)}`);
    return unwrapList<TestResult>(body);
  },

  async downloadFile(testResultId: number, fileId: number, fallbackName = 'test-result'): Promise<void> {
    const { blob, filename } = await apiFetchBlob(`/test-results/${testResultId}/files/${fileId}/download`, fallbackName);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async getFilePreviewUrl(testResultId: number, fileId: number, fallbackName = 'file'): Promise<{ url: string; blob: Blob }> {
    const { blob } = await apiFetchBlob(`/test-results/${testResultId}/files/${fileId}/download`, fallbackName);
    return { url: window.URL.createObjectURL(blob), blob };
  },

  // The backend also exposes PUT /test-results/{id} and DELETE /test-results/{id},
  // but the POST variants below were added specifically to avoid a multipart
  // PUT/DELETE CORS-preflight issue, so the frontend uses those.
  async update(id: number, data: UpdateTestResultRequest): Promise<TestResult> {
    return apiFetch<TestResult>(`/test-results/${id}/update`, { method: 'POST', body: toFormData(data) });
  },

  async delete(id: number): Promise<void> {
    await apiFetch(`/test-results/${id}/delete`, { method: 'POST' });
  },
};
