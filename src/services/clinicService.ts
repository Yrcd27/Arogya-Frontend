// Clinic Service API - Backend Integration
const isDevelopment = import.meta.env.DEV;
const CLINIC_API_BASE_URL = isDevelopment ? '' : 'http://localhost:8082';

// Clinic API helper
const clinicApiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${CLINIC_API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
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
      throw new Error('Unable to connect to the clinic service. Please make sure the backend is running on http://localhost:8082');
    }
    throw error;
  }
};

// Clinic APIs
export const clinicAPI = {
  // Get all clinics
  getAllClinics: async () => {
    return clinicApiCall('/clinics/getAllClinics');
  },

  // Get clinic by ID
  getClinic: async (id: number) => {
    return clinicApiCall(`/clinics/getClinic/${id}`);
  },

  // Create new clinic
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
    const requestData = {
      clinicName: clinicData.clinicName,
      province: clinicData.province,
      district: clinicData.district,
      location: clinicData.location || '',
      scheduledDate: clinicData.scheduledDate,
      scheduledTime: clinicData.scheduledTime,
      status: clinicData.status,
      doctorIds: clinicData.doctorIds || []
    };
    
    return clinicApiCall('/clinics/createClinic', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  // Update clinic
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
    });
  },

  // Delete clinic
  deleteClinic: async (id: number) => {
    return clinicApiCall(`/clinics/deleteClinic/${id}`, {
      method: 'DELETE',
    });
  },
};

// Clinic-Doctor mapping APIs
export const clinicDoctorAPI = {
  // Get clinic doctors by clinic ID
  getClinicDoctorsByClinicId: async (clinicId: number) => {
    return clinicApiCall(`/clinic_doctors/getClinicDoctorsByClinicId/${clinicId}`);
  },

  // Create clinic-doctor mapping
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

  // Delete clinic-doctor mapping
  deleteClinicDoctor: async (id: number) => {
    return clinicApiCall(`/clinic_doctors/deleteClinicDoctor/${id}`, {
      method: 'DELETE',
    });
  },
};