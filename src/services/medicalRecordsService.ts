const API_BASE_URL = 'http://localhost:8080';

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

export const medicalRecordsAPI = {
  async create(data: CreateTestResultRequest): Promise<TestResult> {
    const formData = new FormData();
    formData.append('labTestId', data.labTestId.toString());
    formData.append('patientId', data.patientId.toString());
    formData.append('technicianId', data.technicianId.toString());
    formData.append('testResultDescription', data.testResultDescription);
    if (data.technicianNotes) formData.append('technicianNotes', data.technicianNotes);
    if (data.file) formData.append('file', data.file);

    const res = await fetch(`${API_BASE_URL}/test-results`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error(`Failed to create test result (${res.status})`);
    return await res.json();
  },

  async getById(id: number): Promise<TestResult> {
    const res = await fetch(`${API_BASE_URL}/test-results/${id}`);
    if (!res.ok) throw new Error(`Failed to get test result ${id} (${res.status})`);
    return await res.json();
  },

  async getByLabTestId(labTestId: number): Promise<TestResult> {
    const res = await fetch(`${API_BASE_URL}/test-results/lab-test/${labTestId}`);
    if (!res.ok) throw new Error(`Failed to get test result for lab test ${labTestId} (${res.status})`);
    return await res.json();
  },

  async getByPatientId(patientId: number): Promise<TestResult[]> {
    const res = await fetch(`${API_BASE_URL}/test-results/patient/${patientId}`);
    if (!res.ok) throw new Error(`Failed to get test results for patient ${patientId} (${res.status})`);
    return await res.json();
  },

  async downloadFile(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/test-results/${id}/download`);
    if (!res.ok) throw new Error(`Failed to download file (${res.status})`);
    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = 'test-result';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match) filename = match[1];
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async update(id: number, data: Partial<CreateTestResultRequest>): Promise<TestResult> {
    const formData = new FormData();
    // Always send testResultDescription as it's required
    formData.append('testResultDescription', data.testResultDescription || '');
    // Send technicianNotes even if empty
    formData.append('technicianNotes', data.technicianNotes || '');
    if (data.file) formData.append('file', data.file);

    const res = await fetch(`${API_BASE_URL}/test-results/${id}/update`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to update test result ${id} (${res.status})`);
    }
    return await res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/test-results/${id}/delete`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`Failed to delete test result ${id} (${res.status})`);
  }
};
