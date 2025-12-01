// Authentication utility functions for User Service Backend

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
  experienceYears?: number; // Changed to number
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

// Utility functions for user management
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(AUTH_USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const setCurrentUser = (user: User): void => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const removeCurrentUser = (): void => {
  localStorage.removeItem(AUTH_USER_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!getCurrentUser();
};

// Authentication API calls
export const loginAPI = async (credentials: LoginCredentials): Promise<User> => {
  const { userAPI } = await import('../services/api');
  const user = await userAPI.login(credentials.email, credentials.password);
  return user;
};

export const registerAPI = async (userData: RegisterData, roleId: number, roleName: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { userAPI, profileAPI } = await import('../services/api');
    
    // Prepare user registration data
    const userRegistrationData = {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      userRole: { id: roleId, roleName: roleName },
      ...(userData.secretKey && { secretKey: userData.secretKey }),
    };

    // Create user account
    const newUser = await userAPI.register(userRegistrationData);

    // Create role-specific profile
    const profileData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      dateOfBirth: userData.dateOfBirth,
      phoneNumber: userData.phoneNumber,
      nicNumber: userData.nicNumber,
      user: { id: newUser.id || newUser.userId },
    };

    // Add role-specific fields and create profile
    switch (roleName.toLowerCase()) {
      case 'patient':
        await profileAPI.createPatient({
          ...profileData,
          address: userData.address || '',
          gender: userData.gender || '',
          bloodGroup: userData.bloodGroup || '',
          allergies: userData.allergies || '',
          chronicDiseases: userData.chronicDiseases || '',
          emergencyContact: userData.emergencyContact || '',
        });
        break;
      case 'doctor':
        await profileAPI.createDoctor({
          ...profileData,
          licenseNumber: userData.licenseNumber || '',
          specialization: userData.specialization || '',
          qualification: userData.qualification || '',
          experienceYears: userData.experienceYears || 0,
        });
        break;
      case 'admin':
        await profileAPI.createAdmin(profileData);
        break;
      case 'technician':
        await profileAPI.createTechnician({
          ...profileData,
          technicianField: userData.technicianField || '',
          licenseNumber: userData.licenseNumber || '',
          certification: userData.certification || '',
          assignedEquipment: userData.assignedEquipment || '',
        });
        break;
    }

    return { success: true, message: 'Registration successful!' };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Registration failed');
  }
};

export const logoutAPI = async (): Promise<void> => {
  removeCurrentUser();
};

// Role-based route helpers
export const getDashboardRoute = (roleName: string): string => {
  const roleNameLower = roleName.toLowerCase();
  switch (roleNameLower) {
    case 'admin':
      return '/admin/dashboard';
    case 'doctor':
      return '/doctor/dashboard';
    case 'technician':
      return '/technician/dashboard';
    case 'patient':
    default:
      return '/patient/dashboard';
  }
};