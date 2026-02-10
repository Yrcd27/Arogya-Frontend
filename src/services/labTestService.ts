// Lab Test Service API client
import { LabTest, CreateLabTestRequest, UpdateLabTestRequest } from '../types/labTest';

const isDevelopment = import.meta.env.DEV;
const envBase = (import.meta.env as any).VITE_API_BASE_URL;
const API_BASE_URL = typeof envBase === 'string' && envBase.length > 0 ? envBase : (isDevelopment ? '' : 'http://localhost:8086');

export const labTestAPI = {
  /**
   * Get all lab tests (with optional filters)
   */
  async list(params: Record<string, any> = {}): Promise<LabTest[]> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    const res = await fetch(`${API_BASE_URL}/lab-tests${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (!res.ok) throw new Error(`Failed to list lab tests (${res.status})`);
    const body = await res.json();
    if (body && Array.isArray(body.content)) return body.content as LabTest[];
    if (Array.isArray(body)) return body as LabTest[];
    return [];
  },

  /**
   * Get lab tests for a specific consultation
   */
  async getByConsultation(consultationId: number): Promise<LabTest[]> {
    const res = await fetch(`${API_BASE_URL}/lab-tests/consultation/${consultationId}`);
    if (!res.ok) throw new Error(`Failed to get lab tests for consultation ${consultationId} (${res.status})`);
    const body = await res.json();
    if (Array.isArray(body)) return body as LabTest[];
    return [];
  },

  /**
   * Get a single lab test by ID
   */
  async get(id: number): Promise<LabTest> {
    const res = await fetch(`${API_BASE_URL}/lab-tests/${id}`);
    if (!res.ok) throw new Error(`Failed to get lab test ${id} (${res.status})`);
    return (await res.json()) as LabTest;
  },

  /**
   * Create a new lab test request
   */
  async create(data: CreateLabTestRequest): Promise<LabTest> {
    const res = await fetch(`${API_BASE_URL}/lab-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create lab test (${res.status})`);
    return (await res.json()) as LabTest;
  },

  /**
   * Update a lab test (typically used by technicians to add results)
   */
  async update(id: number, data: UpdateLabTestRequest): Promise<LabTest> {
    const res = await fetch(`${API_BASE_URL}/lab-tests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update lab test ${id} (${res.status})`);
    return (await res.json()) as LabTest;
  },

  /**
   * Delete a lab test
   */
  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/lab-tests/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete lab test ${id} (${res.status})`);
  },

  /**
   * Get lab tests assigned to a specific technician
   */
  async getByTechnician(technicianId: number): Promise<LabTest[]> {
    const res = await fetch(`${API_BASE_URL}/lab-tests/technician/${technicianId}`);
    if (!res.ok) throw new Error(`Failed to get lab tests for technician ${technicianId} (${res.status})`);
    const body = await res.json();
    if (Array.isArray(body)) return body as LabTest[];
    return [];
  },

  /**
   * Get pending lab tests (status = PENDING)
   */
  async getPending(): Promise<LabTest[]> {
    return this.list({ status: 'PENDING' });
  },
};
