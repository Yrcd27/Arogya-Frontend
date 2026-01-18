// Consultation Service API client (uses fetch, typed responses)
const isDevelopment = import.meta.env.DEV;
const envBase = (import.meta.env as any).VITE_API_BASE_URL;
const API_BASE_URL = typeof envBase === 'string' && envBase.length > 0 ? envBase : (isDevelopment ? '' : 'http://localhost:8086');

export interface Consultation {
  id: number;
  patientId: number;
  doctorId: number;
  clinicId: number;
  queueTokenId: number;
  chiefComplaint: string;
  presentIllness?: string;
  pastMedicalHistory?: string;
  recommendations?: string;
  sessionNumber?: number;
  bookedAt?: string;
  status: string;
  completedAt?: string;
}

export interface ConsultationUpdate {
  chiefComplaint?: string;
  presentIllness?: string;
  recommendations?: string;
  status?: string;
}

export const consultationAPI = {
  async list(params: Record<string, any> = {}): Promise<Consultation[]> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    });
    const res = await fetch(`${API_BASE_URL}/consultations${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (!res.ok) throw new Error(`Failed to list consultations (${res.status})`);
    const body = await res.json();
    // backend returns a Page<T> with `content` — unwrap if present
    if (body && Array.isArray(body.content)) return body.content as Consultation[];
    if (Array.isArray(body)) return body as Consultation[];
    return [];
  },
  async get(id: number): Promise<Consultation> {
    const res = await fetch(`${API_BASE_URL}/consultations/${id}`);
    if (!res.ok) throw new Error(`Failed to get consultation ${id} (${res.status})`);
    return (await res.json()) as Consultation;
  },
  async update(id: number, data: ConsultationUpdate): Promise<Consultation> {
    const res = await fetch(`${API_BASE_URL}/consultations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update consultation ${id} (${res.status})`);
    return (await res.json()) as Consultation;
  },
  async complete(id: number): Promise<Consultation> {
    const res = await fetch(`${API_BASE_URL}/consultations/${id}/complete`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to complete consultation ${id} (${res.status})`);
    return (await res.json()) as Consultation;
  },
  async cancel(id: number): Promise<Consultation> {
    const res = await fetch(`${API_BASE_URL}/consultations/${id}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to cancel consultation ${id} (${res.status})`);
    return (await res.json()) as Consultation;
  },
  async create(payload: Partial<Consultation> & { patientId: number; doctorId: number; clinicId: number; queueTokenId?: number; }): Promise<Consultation> {
    const res = await fetch(`${API_BASE_URL}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to create consultation (${res.status})`);
    return (await res.json()) as Consultation;
  },
};
