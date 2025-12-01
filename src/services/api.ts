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
const getAuthToken = () => {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      // Try different token field names that might be returned by the backend
      return userData.token || userData.jwt || userData.accessToken || userData.authToken;
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
    }
  }

  console.log('Making Clinic API request to:', url);
  console.log('Request options:', { ...options, headers });
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        const errorText = await response.text();
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
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // This is typically a CORS or network connectivity issue
      if (isDevelopment) {
        throw new Error('CORS_ERROR: Unable to connect to clinic service. Please ensure the backend is running on http://localhost:8082 and check the proxy configuration.');
      } else {
        throw new Error('CORS_ERROR: The clinic service is not accessible due to CORS policy. Please configure CORS headers on the backend service at http://localhost:8082');
      }
    }
    
    throw error;
  }
};

// Clinic APIs
export const clinicAPI = {
  // Get all clinics (public endpoint)
  getAllClinics: async () => {
    try {
      return clinicApiCall('/clinics/getAllClinics', {}, false);
    } catch (error: any) {
      console.log('Error caught in getAllClinics:', error.message);
      if (error.message && (error.message.includes('CORS_ERROR') || error.message.includes('CORS policy') || error.message.includes('Failed to fetch'))) {
        console.warn('CORS blocking clinic service, using mock data for development');
        // Return mock clinic data when CORS blocks the service
        return [
          {
            id: 1,
            clinicName: 'Galle Mobile Clinic',
            province: 'Southern',
            district: 'Galle District',
            location: 'Galle Town Center',
            scheduledDate: '2025-12-15',
            scheduledTime: '09:00:00',
            status: 'SCHEDULED'
          },
          {
            id: 2,
            clinicName: 'Colombo Mobile Clinic',
            province: 'Western',
            district: 'Colombo District',
            location: 'Pettah',
            scheduledDate: '2025-12-20',
            scheduledTime: '10:00:00',
            status: 'SCHEDULED'
          },
          {
            id: 3,
            clinicName: 'Kandy Mobile Clinic',
            province: 'Central',
            district: 'Kandy District',
            location: 'Kandy Town',
            scheduledDate: '2025-12-25',
            scheduledTime: '08:30:00',
            status: 'SCHEDULED'
          }
        ];
      }
      throw error;
    }
  },

  // Get clinic by ID (public endpoint)
  getClinic: async (id: number) => {
    try {
      return clinicApiCall(`/clinics/getClinic/${id}`, {}, false);
    } catch (error: any) {
      console.log('Error caught in getClinic:', error.message);
      if (error.message && (error.message.includes('CORS_ERROR') || error.message.includes('CORS policy') || error.message.includes('Failed to fetch'))) {
        console.warn('CORS blocking clinic service, returning mock clinic data');
        return {
          id,
          clinicName: `Mock Clinic ${id}`,
          province: 'Western',
          district: 'Colombo District',
          location: 'Mock Location',
          scheduledDate: '2025-12-15',
          scheduledTime: '09:00:00',
          status: 'SCHEDULED'
        };
      }
      throw error;
    }
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
  }) => {
    try {
      return clinicApiCall('/clinics/createClinic', {
        method: 'POST',
        body: JSON.stringify(clinicData),
      });
    } catch (error: any) {
      console.log('Error caught in createClinic:', error.message);
      if (error.message && (error.message.includes('CORS_ERROR') || error.message.includes('CORS policy') || error.message.includes('Failed to fetch'))) {
        console.warn('CORS blocking clinic service, simulating clinic creation');
        // Return mock success response when CORS blocks the service
        return {
          id: Math.floor(Math.random() * 1000) + 100,
          ...clinicData,
          message: 'Clinic created successfully (simulated due to CORS)'
        };
      }
      throw error;
    }
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
  }) => {
    return clinicApiCall('/clinics/updateClinic', {
      method: 'PUT',
      body: JSON.stringify(clinicData),
    });
  },

  // Delete clinic (admin only)
  deleteClinic: async (id: number) => {
    return clinicApiCall(`/clinics/deleteClinic/${id}`, {
      method: 'DELETE',
    });
  },
};

// Clinic-Doctor mapping APIs
export const clinicDoctorAPI = {
  // Get clinic doctors by clinic ID (public endpoint)
  getClinicDoctorsByClinicId: async (clinicId: number) => {
    return clinicApiCall(`/clinic_doctors/getClinicDoctorsByClinicId/${clinicId}`, {}, false);
  },

  // Create clinic-doctor mapping (admin only)
  createClinicDoctor: async (mappingData: {
    clinicId: number;
    doctorRefId: number;
    doctorName: string;
    specialization: string;
  }) => {
    return clinicApiCall('/clinic_doctors/createClinicDoctor', {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  },

  // Delete clinic-doctor mapping (admin only)
  deleteClinicDoctor: async (id: number) => {
    return clinicApiCall(`/clinic_doctors/deleteClinicDoctor/${id}`, {
      method: 'DELETE',
    });
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