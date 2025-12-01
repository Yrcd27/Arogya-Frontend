// Clinic-related type definitions

export interface Clinic {
  id: number;
  clinicName: string;
  province: string;
  district: string;
  location?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface ClinicDoctor {
  id: number;
  doctorRefId: number;
  doctorName: string;
  specialization: string;
  clinic?: Clinic;
}

export interface Doctor {
  doctorId: number;
  name: string;
  specialization: string;
  email: string;
  licenseNumber?: string;
  qualification?: string;
  experienceYears?: number;
}

export interface SelectedDoctor {
  doctorId: number;
  name: string;
  specialization: string;
}

export interface CreateClinicRequest {
  clinicName: string;
  province: string;
  district: string;
  location?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
}

export interface UpdateClinicRequest extends CreateClinicRequest {
  id: number;
}

export interface CreateClinicDoctorRequest {
  clinicId: number;
  doctorRefId: number;
  doctorName: string;
  specialization: string;
}

export interface ClinicFilters {
  searchTerm: string;
  province: string;
  district: string;
  dateRange: {
    start: string;
    end: string;
  };
  status: string;
  sortBy: 'date' | 'name' | 'province';
}

// Sri Lankan provinces and districts mapping
export const PROVINCES_DISTRICTS = {
  'Western': ['Colombo District', 'Gampaha District', 'Kalutara District'],
  'Southern': ['Galle District', 'Matara District', 'Hambantota District'],
  'Central': ['Kandy District', 'Matale District', 'Nuwara Eliya District'],
  'Northern': ['Jaffna District', 'Kilinochchi District', 'Mannar District', 'Mullaitivu District', 'Vavuniya District'],
  'Eastern': ['Ampara District', 'Batticaloa District', 'Trincomalee District'],
  'North Western': ['Kurunegala District', 'Puttalam District'],
  'North Central': ['Anuradhapura District', 'Polonnaruwa District'],
  'Uva': ['Badulla District', 'Monaragala District'],
  'Sabaragamuwa': ['Ratnapura District', 'Kegalle District']
} as const;

export type Province = keyof typeof PROVINCES_DISTRICTS;
export type District = typeof PROVINCES_DISTRICTS[Province][number];