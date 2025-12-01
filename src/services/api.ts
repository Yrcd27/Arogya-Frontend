// User Service API - Backend Integration with proxy support
const isDevelopment = import.meta.env.DEV;
// In development, use relative URLs to leverage Vite proxy
// The proxy is already configured for specific endpoints like /users, /doctor_profile, /clinics
const API_BASE_URL = isDevelopment ? '' : 'http://localhost:8081';
const CLINIC_API_BASE_URL = isDevelopment ? '' : 'http://localhost:8082';

// Generic API call helper with proxy support
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

// Get auth token from localStorage
// Note: Backend uses session-based auth, not JWT tokens
const getAuthToken = () => {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      // Backend doesn't return JWT tokens, it returns user object directly
      // For now, we'll work without token-based auth
      return null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  return null;
};

// Clinic API helper with proxy support
const clinicApiCall = async (endpoint: string, options: RequestInit = {}, requireAuth = true) => {
  const url = `${CLINIC_API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (requireAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No auth token found for authenticated request');
    }
  }

  console.log('Making Clinic API request to:', url);
  console.log('Request headers:', headers);
  console.log('Request body:', options.body);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.log('Error response data:', errorData);
      } catch (e) {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Success response data:', data);
    return data;
  } catch (error) {
    console.error('Clinic API call failed:', error);
    throw error;
  }
};

// Clinic APIs
export const clinicAPI = {
  // Get all clinics (public endpoint)
  getAllClinics: async () => {
    return clinicApiCall('/clinics/getAllClinics', {}, false);
  },

  // Get clinic by ID (public endpoint)
  getClinic: async (id: number) => {
    return clinicApiCall(`/clinics/getClinic/${id}`, {}, false);
  },

  // Create new clinic (admin only)
  createClinic: async (clinicData: {
    clinicName: string;
    province: string;
    district: string;
    location?: string;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
    doctorIds?: number[];
  }) => {
    // Backend expects LocalDate and LocalTime, not strings
    // Convert date string to proper format and add doctorIds
    const requestData = {
      clinicName: clinicData.clinicName,
      province: clinicData.province,
      district: clinicData.district,
      location: clinicData.location || '',
      scheduledDate: clinicData.scheduledDate, // Keep as string, Spring Boot will parse it
      scheduledTime: clinicData.scheduledTime, // Keep as string, Spring Boot will parse it
      status: clinicData.status,
      doctorIds: clinicData.doctorIds || [] // Include empty array if no doctors selected
    };
    
    console.log('Sending clinic data as JSON (matching @RequestBody ClinicRequest):', requestData);
    
    // Backend doesn't use JWT authentication, it's session-based
    return clinicApiCall('/clinics/createClinic', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }, false);
  },

  // Update clinic (admin only)
  updateClinic: async (clinicData: {
    id: number;
    clinicName: string;
    province: string;
    district: string;
    location?: string;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
    doctorIds?: number[];
  }) => {
    const requestData = {
      id: clinicData.id,
      clinicName: clinicData.clinicName,
      province: clinicData.province,
      district: clinicData.district,
      location: clinicData.location || '',
      scheduledDate: clinicData.scheduledDate,
      scheduledTime: clinicData.scheduledTime,
      status: clinicData.status,
      doctorIds: clinicData.doctorIds || []
    };
    
    return clinicApiCall('/clinics/updateClinic', {
      method: 'PUT',
      body: JSON.stringify(requestData),
    }, false); // No JWT auth
  },

  // Delete clinic (admin only)
  deleteClinic: async (id: number) => {
    return clinicApiCall(`/clinics/deleteClinic/${id}`, {
      method: 'DELETE',
    }, false); // No JWT auth
  },
};

// Clinic-Doctor mapping APIs
export const clinicDoctorAPI = {
  // Get clinic doctors by clinic ID (public endpoint)
  getClinicDoctorsByClinicId: async (clinicId: number) => {
    return clinicApiCall(`/clinic_doctors/getClinicDoctorsByClinicId/${clinicId}`, {}, false);
  },

  // Create clinic-doctor mapping (admin only)
  // Note: This endpoint may not exist in the current backend controller
  createClinicDoctor: async (mappingData: {
    clinicId: number;
    doctorRefId: number;
    doctorName: string;
    specialization: string;
  }) => {
    return clinicApiCall('/clinic_doctors/createClinicDoctor', {
      method: 'POST',
      body: JSON.stringify(mappingData),
    }, false); // No JWT auth
  },

  // Delete clinic-doctor mapping (admin only)
  // Note: This endpoint may not exist in the current backend controller
  deleteClinicDoctor: async (id: number) => {
    return clinicApiCall(`/clinic_doctors/deleteClinicDoctor/${id}`, {
      method: 'DELETE',
    }, false); // No JWT auth
  },
};

// Doctor search API - using the correct User service endpoint
export const doctorAPI = {
  // Get all doctors for search - using the actual doctor profile endpoint
  getAllDoctors: async () => {
    try {
      // Use the correct endpoint from user service
      const response = await apiCall('/doctor_profile/getAllDoctorProfiles');
      
      // Transform the response to match the expected format for the clinic system
      return response.map((profile: any) => ({
        doctorId: profile.id, // Use the profile ID as doctorId
        name: `Dr. ${profile.firstName} ${profile.lastName}`,
        specialization: profile.specialization,
        email: profile.user.email,
        licenseNumber: profile.licenseNumber,
        qualification: profile.qualification,
        experienceYears: profile.experienceYears,
        phoneNumber: profile.phoneNumber,
        userId: profile.user.id // Include user ID for reference
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