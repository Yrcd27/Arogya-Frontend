// Main API exports - central hub for all API services.
// Every page should import from here rather than from the individual
// service files directly, so the barrel stays the single source of truth.

export { userAPI, profileAPI, doctorAPI } from './userService';
export { clinicAPI, clinicDoctorAPI } from './clinicService';
export { queueAPI } from './queueService';
export { consultationAPI } from './consultationService';
export { labTestAPI } from './labTestService';
export { medicalRecordsAPI } from './medicalRecordsService';
export { ApiError } from './httpClient';

export type { QueueTokenStatus, QueueTokenResponse } from './queueService';
export type { Consultation, ConsultationStatus, ConsultationCreate, ConsultationUpdate, ConsultationWithTests } from './consultationService';
export type { TestResult, CreateTestResultRequest } from './medicalRecordsService';
