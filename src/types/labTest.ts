// Lab Test Type Definitions
export interface LabTest {
  id: number;
  consultationId: number;
  testName: string;
  testDescription?: string;
  testInstructions?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTechnicianId?: number;
  testResults?: string;
  technicianNotes?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface CreateLabTestRequest {
  consultationId: number;
  testName: string;
  testDescription?: string;
  testInstructions?: string;
}

export interface UpdateLabTestRequest {
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTechnicianId?: number;
  testResults?: string;
  technicianNotes?: string;
}

// Form data for creating a lab test (before consultation is created)
export interface LabTestFormData {
  testName: string;
  testDescription: string;
  testInstructions: string;
}
