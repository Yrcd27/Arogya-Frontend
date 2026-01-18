// Queue Service API - Backend Integration
const isDevelopment = import.meta.env.DEV;
const QUEUE_API_BASE_URL = isDevelopment ? '' : 'http://localhost:8085';

// Generic API call helper for queue service
const queueApiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${QUEUE_API_BASE_URL}${endpoint}`;
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
      } catch {
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch {}
      }
      throw new Error(errorMessage);
    }

    // Some PATCH endpoints may return no content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return null;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Unable to connect to the queue service. Please ensure backend is running on http://localhost:8085'
      );
    }
    throw error;
  }
};

export type QueueTokenStatus = 'PENDING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';

export interface QueueTokenResponse {
  id: number;
  tokenNumber: number;
  clinicId: string;
  patientId: string;
  consultationId: string;
  status: QueueTokenStatus;
  position: number;
  issuedAt: string;
  updatedAt: string;
}

export const queueAPI = {
  // Create a queue token
  createToken: async (payload: { clinicId: string; patientId: string; consultationId: string }) => {
    return queueApiCall('/queue/tokens', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<QueueTokenResponse>;
  },

  // Get all tokens for a clinic (queue list)
  getClinicQueue: async (clinicId: string) => {
    return queueApiCall(`/queue/clinics/${clinicId}/tokens`) as Promise<QueueTokenResponse[]>;
  },

  // Get a token by ID
  getToken: async (id: number) => {
    return queueApiCall(`/queue/tokens/${id}`) as Promise<QueueTokenResponse>;
  },

  // Update token status
  updateStatus: async (id: number, status: QueueTokenStatus) => {
    return queueApiCall(`/queue/tokens/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }) as Promise<QueueTokenResponse>;
  },
};
