import { isPositiveId } from './clinicalValidation';

const servingTokenStorageKey = (doctorId: number, clinicId: number) => `doctorQueue:servingTokenId:${doctorId}:${clinicId}`;
const legacyServingTokenStorageKey = (clinicId: number) => `doctorQueue:servingTokenId:${clinicId}`;

export const getStoredServingTokenId = (doctorId: number, clinicId: number): number | null => {
  const key = servingTokenStorageKey(doctorId, clinicId);
  try {
    sessionStorage.removeItem(legacyServingTokenStorageKey(clinicId));
    let raw = localStorage.getItem(key);
    if (raw === null) {
      raw = sessionStorage.getItem(key);
      if (raw !== null && isPositiveId(raw)) localStorage.setItem(key, raw);
    }
    if (raw === null) return null;
    if (!isPositiveId(raw)) {
      clearStoredServingTokenId(doctorId, clinicId);
      return null;
    }
    return Number(raw);
  } catch {
    return null;
  }
};

export const setStoredServingTokenId = (doctorId: number, clinicId: number, tokenId: number) => {
  try {
    localStorage.setItem(servingTokenStorageKey(doctorId, clinicId), String(tokenId));
  } catch {
    return;
  }
};

export const clearStoredServingTokenId = (doctorId: number, clinicId: number) => {
  try {
    localStorage.removeItem(servingTokenStorageKey(doctorId, clinicId));
    sessionStorage.removeItem(servingTokenStorageKey(doctorId, clinicId));
  } catch {
    return;
  }
};
