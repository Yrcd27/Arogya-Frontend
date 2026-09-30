// User Service API - routed through the API Gateway (see httpClient.ts)
import { apiFetch } from './httpClient';
import type { User, UserRole, AuthResponse, PatientProfile, DoctorProfile, AdminProfile, TechnicianProfile, DoctorSearchResult } from '../types/user';

export const userAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>('/users/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    secretKey?: string;
    userRole: { id: number; roleName: string };
  }) => {
    return apiFetch('/users/addUser', {
      method: 'POST',
      body: userData,
      skipAuth: true,
    });
  },

  getAllUsers: async (): Promise<User[]> => {
    return apiFetch<User[]>('/users/getAllUsers');
  },

  getUser: async (id: number): Promise<User> => {
    return apiFetch<User>(`/users/getUser/${id}`);
  },

  getUserByEmail: async (email: string): Promise<User> => {
    return apiFetch<User>(`/users/getUserByEmail/${encodeURIComponent(email)}`);
  },
};

// Role APIs (need a token; only usable once logged in)
export const roleAPI = {
  getAllRoles: async (): Promise<UserRole[]> => {
    return apiFetch<UserRole[]>('/roles/getAllUserRoles');
  },

  getRole: async (id: number): Promise<UserRole> => {
    return apiFetch<UserRole>(`/roles/getUserRole/${id}`);
  },

  getRoleByName: async (roleName: string): Promise<UserRole> => {
    return apiFetch<UserRole>(`/roles/getUserRoleByName/${encodeURIComponent(roleName)}`);
  },
};

// Profile APIs
export const profileAPI = {
  // Patient
  createPatient: async (profileData: Record<string, unknown>): Promise<PatientProfile> => {
    return apiFetch<PatientProfile>('/patient_profile/createPatientProfile', { method: 'POST', body: profileData });
  },
  getPatient: async (userId: number): Promise<PatientProfile> => {
    return apiFetch<PatientProfile>(`/patient_profile/getPatientProfileByUserId/${userId}`);
  },
  updatePatient: async (profileData: Record<string, unknown>): Promise<PatientProfile> => {
    return apiFetch<PatientProfile>('/patient_profile/updatePatientProfile', { method: 'PUT', body: profileData });
  },

  // Doctor
  createDoctor: async (profileData: Record<string, unknown>): Promise<DoctorProfile> => {
    return apiFetch<DoctorProfile>('/doctor_profile/createDoctorProfile', { method: 'POST', body: profileData });
  },
  getDoctor: async (userId: number): Promise<DoctorProfile> => {
    return apiFetch<DoctorProfile>(`/doctor_profile/getDoctorProfileByUserId/${userId}`);
  },
  updateDoctor: async (profileData: Record<string, unknown>): Promise<DoctorProfile> => {
    return apiFetch<DoctorProfile>('/doctor_profile/updateDoctorProfile', { method: 'PUT', body: profileData });
  },

  // Admin
  createAdmin: async (profileData: Record<string, unknown>): Promise<AdminProfile> => {
    return apiFetch<AdminProfile>('/admin_profile/createAdminProfile', { method: 'POST', body: profileData });
  },
  getAdmin: async (userId: number): Promise<AdminProfile> => {
    return apiFetch<AdminProfile>(`/admin_profile/getAdminProfileByUserId/${userId}`);
  },
  updateAdmin: async (profileData: Record<string, unknown>): Promise<AdminProfile> => {
    return apiFetch<AdminProfile>('/admin_profile/updateAdminProfile', { method: 'PUT', body: profileData });
  },

  // Technician
  createTechnician: async (profileData: Record<string, unknown>): Promise<TechnicianProfile> => {
    return apiFetch<TechnicianProfile>('/technician_profile/createTechnicianProfile', { method: 'POST', body: profileData });
  },
  getTechnician: async (userId: number): Promise<TechnicianProfile> => {
    return apiFetch<TechnicianProfile>(`/technician_profile/getTechnicianProfileByUserId/${userId}`);
  },
  updateTechnician: async (profileData: Record<string, unknown>): Promise<TechnicianProfile> => {
    return apiFetch<TechnicianProfile>('/technician_profile/updateTechnicianProfile', { method: 'PUT', body: profileData });
  },

  // Lists, for dashboards / doctor search
  getAllPatients: async (): Promise<PatientProfile[]> => apiFetch<PatientProfile[]>('/patient_profile/getAllPatientProfiles'),
  getAllDoctors: async (): Promise<DoctorProfile[]> => apiFetch<DoctorProfile[]>('/doctor_profile/getAllDoctorProfiles'),
  getAllAdmins: async (): Promise<AdminProfile[]> => apiFetch<AdminProfile[]>('/admin_profile/getAllAdminProfiles'),
  getAllTechnicians: async (): Promise<TechnicianProfile[]> => apiFetch<TechnicianProfile[]>('/technician_profile/getAllTechnicianProfiles'),
};

// Doctor search/lookup, shaped for the clinic-scheduling UI
export const doctorAPI = {
  getAllDoctors: async (): Promise<DoctorSearchResult[]> => {
    try {
      const profiles = await profileAPI.getAllDoctors();
      return profiles.map(profile => ({
        doctorId: profile.id,
        name: `Dr. ${profile.firstName} ${profile.lastName}`,
        specialization: profile.specialization,
        email: profile.user.email,
        licenseNumber: profile.licenseNumber,
        qualification: profile.qualification,
        experienceYears: profile.experienceYears,
        phoneNumber: profile.phoneNumber,
        userId: profile.user.id,
      }));
    } catch (error) {
      console.error('Failed to fetch doctor profiles:', error);
      return [];
    }
  },
};
