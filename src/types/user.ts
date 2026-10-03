export interface UserRole {
  id: number;
  roleName: string;
  roleDescription?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  userRole: UserRole;
}

/** Response from POST /users/login. */
export interface AuthResponse {
  id: number;
  token: string;
  username: string;
  email: string;
  /** Flat role name, e.g. "DOCTOR" — not the full UserRole object. */
  role: string;
}

interface ProfileBase {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  nicNumber: string;
  user: User;
}

export type ProfileUserReference = Pick<User, 'id'>;

interface ProfileInputBase {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  nicNumber: string;
  user: ProfileUserReference;
}

export interface PatientProfile extends ProfileBase {
  address?: string;
  gender?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicDiseases?: string;
  emergencyContact?: string;
}

export interface CreatePatientProfileInput extends ProfileInputBase {
  address: string;
  gender: string;
  bloodGroup: string;
  allergies: string;
  chronicDiseases: string;
  emergencyContact: string;
}

export type UpdatePatientProfileInput = CreatePatientProfileInput & Pick<PatientProfile, 'id'>;

export interface DoctorProfile extends ProfileBase {
  licenseNumber?: string;
  specialization: string;
  qualification?: string;
  experienceYears?: number;
}

export interface CreateDoctorProfileInput extends ProfileInputBase {
  licenseNumber: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
}

export type UpdateDoctorProfileInput = CreateDoctorProfileInput & Pick<DoctorProfile, 'id'>;

export type AdminProfile = ProfileBase;

export type CreateAdminProfileInput = ProfileInputBase;
export type UpdateAdminProfileInput = CreateAdminProfileInput & Pick<AdminProfile, 'id'>;

export interface TechnicianProfile extends ProfileBase {
  technicianField?: string;
  licenseNumber?: string;
  certification?: string;
  assignedEquipment?: string;
}

export interface CreateTechnicianProfileInput extends ProfileInputBase {
  technicianField: string;
  licenseNumber: string;
  certification: string;
  assignedEquipment: string;
}

export type UpdateTechnicianProfileInput = CreateTechnicianProfileInput & Pick<TechnicianProfile, 'id'>;

export type RoleProfile = PatientProfile | DoctorProfile | AdminProfile | TechnicianProfile;

export interface DoctorSearchResult {
  doctorId: number;
  name: string;
  specialization: string;
  email: string;
  licenseNumber?: string;
  qualification?: string;
  experienceYears?: number;
  phoneNumber?: string;
  userId: number;
}
