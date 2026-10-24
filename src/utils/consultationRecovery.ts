import type { Consultation } from '../services/consultationService';

export function findConsultationForToken(
  consultations: readonly Consultation[],
  match: { tokenId: number; patientId: number; doctorId: number; clinicId: number },
): Consultation | null {
  const candidates = consultations.filter(item => item.queueTokenId === match.tokenId
    && item.patientId === match.patientId
    && item.doctorId === match.doctorId
    && item.clinicId === match.clinicId
    && item.status !== 'CANCELLED');
  if (!candidates.length) return null;
  return candidates.reduce((latest, item) => (item.id > latest.id ? item : latest));
}

export function progressForStatus(status: Consultation['status']): { started: boolean; completed: boolean } {
  return { started: status === 'IN_PROGRESS' || status === 'COMPLETED', completed: status === 'COMPLETED' };
}

const normalizeTestName = (name: string) => name.trim().toLowerCase();

export function isLabOrderSaved(existing: readonly { testName: string }[], orders: readonly { testName: string }[], index: number): boolean {
  const target = normalizeTestName(orders[index]?.testName ?? '');
  if (!target) return false;
  const required = orders.slice(0, index + 1).filter(order => normalizeTestName(order.testName) === target).length;
  return existing.filter(test => normalizeTestName(test.testName) === target).length >= required;
}
