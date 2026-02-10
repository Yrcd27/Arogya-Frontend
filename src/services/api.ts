// Main API exports - Central hub for all API services
// Re-export all APIs from separate service files for clean organization

// User Service APIs (User management, profiles, roles)
export { 
  userAPI, 
  roleAPI, 
  profileAPI, 
  doctorAPI 
} from './userService';

// Clinic Service APIs (Clinic management, doctor-clinic mappings)
export { 
  clinicAPI, 
  clinicDoctorAPI 
} from './clinicService';

// Queue Service APIs (Queue tokens, status, clinic queues)
export {
  queueAPI
} from './queueService';

// Medical Records Service APIs (Test results, file uploads)
export {
  medicalRecordsAPI
} from './medicalRecordsService';