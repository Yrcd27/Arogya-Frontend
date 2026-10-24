import { isPositiveId } from './clinicalValidation';
import { businessDateString } from './businessDate';

const STORAGE_PREFIX = 'doctor:selectedClinic:';
const storageKey = (doctorId: number) => `${STORAGE_PREFIX}${doctorId}`;

export function getStoredClinicId(doctorId: number | undefined, today = businessDateString()): number | null {
  if (typeof doctorId !== 'number' || !isPositiveId(doctorId)) return null;
  try {
    const raw = localStorage.getItem(storageKey(doctorId));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    const entry = parsed && typeof parsed === 'object' ? parsed as { doctorId?: unknown; clinicId?: unknown; day?: unknown } : null;
    if (entry && entry.doctorId === doctorId && entry.day === today && isPositiveId(entry.clinicId)) return Number(entry.clinicId);
    localStorage.removeItem(storageKey(doctorId));
  } catch {
    return null;
  }
  return null;
}

export function storeClinicId(doctorId: number | undefined, clinicId: number, today = businessDateString()): void {
  if (typeof doctorId !== 'number' || !isPositiveId(doctorId) || !isPositiveId(clinicId)) return;
  try {
    localStorage.setItem(storageKey(doctorId), JSON.stringify({ doctorId, clinicId, day: today }));
  } catch {
    return;
  }
}

export function clearStoredClinicId(doctorId: number | undefined): void {
  if (typeof doctorId !== 'number' || !isPositiveId(doctorId)) return;
  try {
    localStorage.removeItem(storageKey(doctorId));
  } catch {
    return;
  }
}

export function clearStoredClinicSelections(doctorId?: number): void {
  try {
    if (typeof doctorId === 'number' && isPositiveId(doctorId)) {
      localStorage.removeItem(storageKey(doctorId));
      return;
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    return;
  }
}
