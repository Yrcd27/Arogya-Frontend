// Clinic Service API - routed through the API Gateway (see httpClient.ts)
import { apiFetch } from './httpClient';
import type { Clinic, ClinicDoctor, CreateClinicRequest, UpdateClinicRequest, CreateClinicDoctorRequest } from '../types/clinic';

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
  /** Returns [] instead of throwing when the clinic has no doctors assigned
   *  (the backend returns a 500 for that case instead of an empty list). */
  getClinicDoctorsByClinicId: async (clinicId: number): Promise<ClinicDoctor[]> => {
    try {
      return await apiFetch<ClinicDoctor[]>(`/clinic_doctors/getClinicDoctorsByClinicId/${clinicId}`);
    } catch {
      return [];
    }
  },

  getAllClinicDoctors: async (): Promise<ClinicDoctor[]> => {
    return apiFetch<ClinicDoctor[]>('/clinic_doctors/getAllClinicDoctors');
  },

  // NOTE: the backend's ClinicDoctorsController only exposes GET endpoints today.
  // These are kept typed for when create/delete are added server-side, but are
  // not called from the UI.
  createClinicDoctor: async (mappingData: CreateClinicDoctorRequest): Promise<ClinicDoctor> => {
    return apiFetch<ClinicDoctor>('/clinic_doctors/createClinicDoctor', { method: 'POST', body: mappingData });
  },

  deleteClinicDoctor: async (id: number): Promise<void> => {
    await apiFetch(`/clinic_doctors/deleteClinicDoctor/${id}`, { method: 'DELETE' });
  },
};
