// Authentication utility functions for User Service Backend
import { userAPI } from '../services/userService';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  nicNumber: string;
  phoneNumber: string;
  dateOfBirth: string;
  address?: string;
  gender?: string;
  bloodGroup?: string;
  // Role-specific fields
  secretKey?: string;
  // Doctor fields
  licenseNumber?: string;
  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  // Patient fields
  allergies?: string;
  chronicDiseases?: string;
  emergencyContact?: string;
  // Technician fields
  technicianField?: string;
  certification?: string;
  assignedEquipment?: string;
}

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

// Local storage keys
export const AUTH_USER_KEY = 'user';
export const AUTH_TOKEN_KEY = 'authToken';

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(AUTH_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

export const removeCurrentUser = (): void => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const getToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/** Decodes a JWT's payload without verifying the signature (verification
 *  happens server-side) — only used client-side to read the expiry. */
export const decodeJwtPayload = (token: string): { exp?: number; sub?: string; role?: string } | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
};

export const isAuthenticated = (): boolean => {
  return !!getCurrentUser() && !isTokenExpired(getToken());
};

// Authentication API calls
export const loginAPI = async (credentials: LoginCredentials): Promise<User> => {
  const response = await userAPI.login(credentials.email, credentials.password);
  localStorage.setItem(AUTH_TOKEN_KEY, response.token);
  return {
    id: response.id,
    username: response.username,
    email: response.email,
    userRole: { id: 0, roleName: response.role },
  };
};

// Role-based route helpers
const KNOWN_DASHBOARD_ROLES = ['admin', 'doctor', 'technician', 'patient'] as const;

export const getDashboardRoute = (roleName: string | undefined | null): string => {
  const roleNameLower = (roleName || '').toLowerCase();
  switch (roleNameLower) {
    case 'admin':
      return '/admin/dashboard';
    case 'doctor':
      return '/doctor/dashboard';
    case 'technician':
      return '/technician/dashboard';
    case 'patient':
      return '/patient/dashboard';
    default:
      return '/login';
  }
};

export const isKnownDashboardRole = (roleName: string | undefined | null): boolean => {
  return KNOWN_DASHBOARD_ROLES.includes((roleName || '').toLowerCase() as (typeof KNOWN_DASHBOARD_ROLES)[number]);
};
