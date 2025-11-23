// User Service API - Backend Integration
const API_BASE_URL = ''; // Remove /api prefix to test direct endpoints

// Generic API call helper
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('Making API request to:', url);
  console.log('Request options:', options);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.log('Error response data:', errorData);
      } catch (e) {
        console.log('Could not parse error response as JSON');
        try {
          const errorText = await response.text();
          console.log('Error response text:', errorText);
          if (errorText) {
            errorMessage = errorText;
          }
        } catch (textError) {
          console.log('Could not read error response text:', textError);
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Success response data:', data);
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please make sure the backend is running on http://localhost:8081');
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

  // Legacy API methods (for backwards compatibility)
  createPatientProfile: async (profileData: Record<string, unknown>) => {
    return apiCall('/patient_profile/createPatientProfile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getPatientProfileByUserId: async (userId: string) => {
    return apiCall(`/patient_profile/getPatientProfileByUserId/${userId}`);
  },

  updatePatientProfile: async (profileData: Record<string, unknown>) => {
    return apiCall('/patient_profile/updatePatientProfile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  createDoctorProfile: async (profileData: Record<string, unknown>) => {
    return apiCall('/doctor_profile/createDoctorProfile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getDoctorProfileByUserId: async (userId: string) => {
    return apiCall(`/doctor_profile/getDoctorProfileByUserId/${userId}`);
  },

  updateDoctorProfile: async (profileData: Record<string, unknown>) => {
    return apiCall('/doctor_profile/updateDoctorProfile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  createAdminProfile: async (profileData: Record<string, unknown>) => {
    return apiCall('/admin_profile/createAdminProfile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getAdminProfileByUserId: async (userId: string) => {
    return apiCall(`/admin_profile/getAdminProfileByUserId/${userId}`);
  },

  updateAdminProfile: async (profileData: Record<string, unknown>) => {
    return apiCall('/admin_profile/updateAdminProfile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  createTechnicianProfile: async (profileData: Record<string, unknown>) => {
    return apiCall('/technician_profile/createTechnicianProfile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  getTechnicianProfileByUserId: async (userId: string) => {
    return apiCall(`/technician_profile/getTechnicianProfileByUserId/${userId}`);
  },

  updateTechnicianProfile: async (profileData: Record<string, unknown>) => {
    return apiCall('/technician_profile/updateTechnicianProfile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};