import type { LabTestFormData } from '../types/labTest';
import type { FieldErrors } from './formValidation';

export const CONSULTATION_FIELDS = ['chiefComplaint', 'presentIllness', 'pastMedicalHistory', 'recommendations'] as const;
export type ConsultationField = (typeof CONSULTATION_FIELDS)[number];
export type ConsultationErrors = FieldErrors<ConsultationField | 'sessionNumber'>;
export const MAX_SESSION_NUMBER = 2147483647;

export function isPositiveId(value: unknown): boolean {
  return (typeof value === 'number' || typeof value === 'string' && /^[0-9]+$/.test(value))
    && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

export function getSessionNumberError(value: string): string | undefined {
  return /^[0-9]+$/.test(value.trim()) && isPositiveId(value.trim()) && Number(value.trim()) <= MAX_SESSION_NUMBER
    ? undefined : `Enter a whole session number from 1 to ${MAX_SESSION_NUMBER}.`;
}

export function validateConsultation(values: Partial<Record<ConsultationField, string>>, sessionNumber?: string): ConsultationErrors {
  const errors: ConsultationErrors = {};
  if (!values.chiefComplaint?.trim()) errors.chiefComplaint = 'Chief complaint is required.';
  if (!values.recommendations?.trim()) errors.recommendations = 'Recommendations are required.';
  if (sessionNumber !== undefined) {
    const message = getSessionNumberError(sessionNumber);
    if (message) errors.sessionNumber = message;
  }
  return errors;
}

export function normalizeConsultation(values: Partial<Record<ConsultationField, string>>) {
  return {
    chiefComplaint: values.chiefComplaint?.trim() ?? '',
    presentIllness: values.presentIllness?.trim() ?? '',
    pastMedicalHistory: values.pastMedicalHistory?.trim() ?? '',
    recommendations: values.recommendations?.trim() ?? '',
  };
}

export function validateLabOrders(enabled: boolean, tests: LabTestFormData[]): FieldErrors<keyof LabTestFormData>[] {
  return enabled ? tests.map(test => test.testName.trim() ? {} : { testName: 'Test name is required. Complete or remove this order.' }) : [];
}
