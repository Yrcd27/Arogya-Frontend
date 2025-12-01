// User Service API - Backend Integration
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment ? '' : 'http://localhost:8081';

// Generic API call helper for user service
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch (textError) {
          // Silent fallback
        }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (isDevelopment) {
        throw new Error('Unable to connect to the user service. Please make sure the backend is running on http://localhost:8081 and the proxy is configured correctly.');
      } else {
        throw new Error('Unable to connect to the server. Please make sure the backend is running on http://localhost:8081');
      }
    }
    throw error;
  }
};

// User APIs
export const userAPI = {
  // Login user
  login: async (email: string, password: string) => {
    return apiCall('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Register new user
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    secretKey?: string;
    userRole: { id: number; roleName: string };
  }) => {
    return apiCall('/users/addUser', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Get all users
  getAllUsers: async () => {
    return apiCall('/users/getAllUsers');
  },

  // Get user by ID
  getUser: async (id: number) => {
    return apiCall(`/users/getUser/${id}`);
  },

  // Get user by email
  getUserByEmail: async (email: string) => {
    return apiCall(`/users/getUserByEmail/${email}`);
  },
};

// Role APIs
export const roleAPI = {
  // Get all roles
  getAllRoles: async () => {
    return apiCall('/roles/getAllUserRoles');
  },

  // Get role by ID
  getRole: async (id: number) => {
    return apiCall(`/roles/getUserRole/${id}`);
  },

  // Get role by name
  getRoleByName: async (roleName: string) => {
    return apiCall(`/roles/getUserRoleByName/${roleName}`);
  },
};

// Profile APIs
export const profileAPI = {
  // Patient Profile APIs
  createPatient: async (profileData: Record<string, unknown>) => {
    return apiCall('/patient_profile/createPatientProfile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getPatient: async (userId: number) => {
    return apiCall(`/patient_profile/getPatientProfileByUserId/${userId}`);
  },

  updatePatient: async (_userId: number, profileData: Record<string, unknown>) => {
    return apiCall('/patient_profile/updatePatientProfile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Doctor Profile APIs
  createDoctor: async (profileData: Record<string, unknown>) => {
    return apiCall('/doctor_profile/createDoctorProfile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getDoctor: async (userId: number) => {
    return apiCall(`/doctor_profile/getDoctorProfileByUserId/${userId}`);
  },

  updateDoctor: async (_userId: number, profileData: Record<string, unknown>) => {
    return apiCall('/doctor_profile/updateDoctorProfile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Admin Profile APIs
  createAdmin: async (profileData: Record<string, unknown>) => {
    return apiCall('/admin_profile/createAdminProfile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getAdmin: async (userId: number) => {
    return apiCall(`/admin_profile/getAdminProfileByUserId/${userId}`);
  },

  updateAdmin: async (_userId: number, profileData: Record<string, unknown>) => {
    return apiCall('/admin_profile/updateAdminProfile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Technician Profile APIs
  createTechnician: async (profileData: Record<string, unknown>) => {
    return apiCall('/technician_profile/createTechnicianProfile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getTechnician: async (userId: number) => {
    return apiCall(`/technician_profile/getTechnicianProfileByUserId/${userId}`);
  },

  updateTechnician: async (_userId: number, profileData: Record<string, unknown>) => {
    return apiCall('/technician_profile/updateTechnicianProfile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Get all profiles by type for dashboard stats
  getAllPatients: async () => {
    return apiCall('/patient_profile/getAllPatientProfiles');
  },

  getAllDoctors: async () => {
    return apiCall('/doctor_profile/getAllDoctorProfiles');
  },

  getAllAdmins: async () => {
    return apiCall('/admin_profile/getAllAdminProfiles');
  },

  getAllTechnicians: async () => {
    return apiCall('/technician_profile/getAllTechnicianProfiles');
  },
};

// Doctor search API
export const doctorAPI = {
  // Get all doctors for search
  getAllDoctors: async () => {
    try {
      const response = await apiCall('/doctor_profile/getAllDoctorProfiles');
      
      // Transform the response to match the expected format for the clinic system
      return response.map((profile: { id: number; firstName: string; lastName: string; specialization: string; user: { email: string; id: number }; licenseNumber: string; qualification: string; experienceYears: number; phoneNumber: string }) => ({
        doctorId: profile.id,
        name: `Dr. ${profile.firstName} ${profile.lastName}`,
        specialization: profile.specialization,
        email: profile.user.email,
        licenseNumber: profile.licenseNumber,
        qualification: profile.qualification,
        experienceYears: profile.experienceYears,
        phoneNumber: profile.phoneNumber,
        userId: profile.user.id
      }));
    } catch (error) {
      console.warn('Failed to fetch doctor profiles, using mock data:', error);
      // Return mock data as fallback
      return [
        { doctorId: 1, name: 'Dr. Gayan Perera', specialization: 'ENT Surgeon', email: 'gayan@example.com' },
        { doctorId: 2, name: 'Dr. Ruwan Silva', specialization: 'Cardiologist', email: 'ruwan@example.com' },
        { doctorId: 3, name: 'Dr. Priya Fernando', specialization: 'General Physician', email: 'priya@example.com' },
        { doctorId: 4, name: 'Dr. Nimal Rajapaksa', specialization: 'Pediatrician', email: 'nimal@example.com' },
        { doctorId: 5, name: 'Dr. Samanthi Wickrama', specialization: 'Dermatologist', email: 'samanthi@example.com' },
        { doctorId: 6, name: 'Dr. Kamal Gunasekara', specialization: 'Orthopedic Surgeon', email: 'kamal@example.com' }
      ];
    }
  },
};