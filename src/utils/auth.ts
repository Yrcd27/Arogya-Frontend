// Authentication utility functions for User Service Backend
import { userAPI } from '../services/userService';
import type { User, UserRole } from '../types/user';

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

export type { User, UserRole };

// Local storage keys
export const AUTH_USER_KEY = 'user';
export const AUTH_TOKEN_KEY = 'authToken';

export const getCurrentUser = (): User | null => {
  let userStr: string | null;
  try {
    userStr = localStorage.getItem(AUTH_USER_KEY);
  } catch {
    return null;
  }
  if (!userStr) return null;
  try {
    const value: unknown = JSON.parse(userStr);
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<User>;
    if (
      typeof candidate.id !== 'number' ||
      candidate.id <= 0 ||
      typeof candidate.username !== 'string' ||
      typeof candidate.email !== 'string' ||
      !candidate.userRole ||
      typeof candidate.userRole.id !== 'number' ||
      !Number.isFinite(candidate.userRole.id) ||
      typeof candidate.userRole.roleName !== 'string' ||
      !candidate.userRole.roleName.trim()
    ) {
      return null;
    }
    return candidate as User;
  } catch {
    return null;
  }
};

export const removeCurrentUser = (): void => {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    return;
  }
};

export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
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
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
  } catch {
    throw new Error('Unable to persist the signed-in session.');
  }
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
