// Clinic Service API - routed through the API Gateway (see httpClient.ts)
import { apiFetch } from './httpClient';
import type { Clinic, ClinicDoctor, CreateClinicRequest, UpdateClinicRequest } from '../types/clinic';

export const clinicAPI = {
  getAllClinics: async (): Promise<Clinic[]> => {
    return apiFetch<Clinic[]>('/clinics/getAllClinics');
  },

  getClinic: async (id: number): Promise<Clinic> => {
    return apiFetch<Clinic>(`/clinics/getClinic/${id}`);
  },

  createClinic: async (clinicData: CreateClinicRequest): Promise<Clinic> => {
    const requestData = {
      clinicName: clinicData.clinicName,
      province: clinicData.province,
      district: clinicData.district,
      location: clinicData.location || '',
      scheduledDate: clinicData.scheduledDate,
      scheduledTime: clinicData.scheduledTime,
      status: clinicData.status,
      doctorIds: clinicData.doctorIds || [],
    };
    return apiFetch<Clinic>('/clinics/createClinic', { method: 'POST', body: requestData });
  },

  updateClinic: async (clinicData: UpdateClinicRequest): Promise<Clinic> => {
    const requestData = {
      id: clinicData.id,
      clinicName: clinicData.clinicName,
      province: clinicData.province,
      district: clinicData.district,
      location: clinicData.location || '',
      scheduledDate: clinicData.scheduledDate,
      scheduledTime: clinicData.scheduledTime,
      status: clinicData.status,
      doctorIds: clinicData.doctorIds || [],
    };
    return apiFetch<Clinic>('/clinics/updateClinic', { method: 'PUT', body: requestData });
  },

  deleteClinic: async (id: number): Promise<void> => {
    await apiFetch(`/clinics/deleteClinic/${id}`, { method: 'DELETE' });
  },
};

export const clinicDoctorAPI = {
  getClinicDoctorsByClinicId: async (clinicId: number): Promise<ClinicDoctor[]> => {
    return apiFetch<ClinicDoctor[]>(`/clinic_doctors/getClinicDoctorsByClinicId/${clinicId}`);
  },

  getAllClinicDoctors: async (): Promise<ClinicDoctor[]> => {
    return apiFetch<ClinicDoctor[]>('/clinic_doctors/getAllClinicDoctors');
  },
};
