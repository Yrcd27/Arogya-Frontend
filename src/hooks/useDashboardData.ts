import { useState, useEffect, useCallback } from 'react';
import { profileAPI } from '../services/userService';
import { clinicAPI } from '../services/clinicService';
import { consultationAPI } from '../services/consultationService';
import { labTestAPI } from '../services/labTestService';
import { medicalRecordsAPI } from '../services/medicalRecordsService';

interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalAdmins: number;
  totalTechnicians: number;
  totalClinics: number;
  scheduledClinics: number;
  completedClinics: number;
  totalConsultations: number;
  totalLabTests: number;
  totalTestResults: number;
}

const EMPTY_STATS: DashboardStats = {
  totalPatients: 0,
  totalDoctors: 0,
  totalAdmins: 0,
  totalTechnicians: 0,
  totalClinics: 0,
  scheduledClinics: 0,
  completedClinics: 0,
  totalConsultations: 0,
  totalLabTests: 0,
  totalTestResults: 0,
};

const EMPTY_FAILED: Record<keyof DashboardStats, boolean> = {
  totalPatients: false,
  totalDoctors: false,
  totalAdmins: false,
  totalTechnicians: false,
  totalClinics: false,
  scheduledClinics: false,
  completedClinics: false,
  totalConsultations: false,
  totalLabTests: false,
  totalTestResults: false,
};

export const useDashboardData = (options: { role?: string; doctorId?: number; patientId?: number; includeTestResults?: boolean } = {}) => {
  const { role = 'admin', doctorId, patientId, includeTestResults = false } = options;
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [failedFields, setFailedFields] = useState<Record<keyof DashboardStats, boolean>>(EMPTY_FAILED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const timeout = 10000;
      const withTimeout = <T,>(promise: Promise<T>) =>
        Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))]);

      // Only administrators require system-wide profile enumeration
      const fetchPatients = role === 'admin' ? withTimeout(profileAPI.getAllPatients()) : Promise.resolve([]);
      const fetchDoctors = role === 'admin' ? withTimeout(profileAPI.getAllDoctors()) : Promise.resolve([]);
      const fetchAdmins = role === 'admin' ? withTimeout(profileAPI.getAllAdmins()) : Promise.resolve([]);
      const fetchTechnicians = role === 'admin' ? withTimeout(profileAPI.getAllTechnicians()) : Promise.resolve([]);

      const consultationQuery = doctorId
        ? { doctorId, size: 1 }
        : patientId
        ? { patientId, size: 1 }
        : { size: 1 };

      const [patients, doctors, admins, technicians, clinics, consultations, labTests, testResults] = await Promise.allSettled([
        fetchPatients,
        fetchDoctors,
        fetchAdmins,
        fetchTechnicians,
        withTimeout(clinicAPI.getAllClinics()),
        withTimeout(consultationAPI.list(consultationQuery)),
        withTimeout(labTestAPI.list({ size: 1 })),
        includeTestResults ? withTimeout(medicalRecordsAPI.list({ size: 1 })) : Promise.resolve({ items: [], total: 0 }),
      ]);

      const clinicsList = clinics.status === 'fulfilled' && Array.isArray(clinics.value) ? clinics.value : [];

      setStats({
        totalPatients: patients.status === 'fulfilled' && Array.isArray(patients.value) ? patients.value.length : 0,
        totalDoctors: doctors.status === 'fulfilled' && Array.isArray(doctors.value) ? doctors.value.length : 0,
        totalAdmins: admins.status === 'fulfilled' && Array.isArray(admins.value) ? admins.value.length : 0,
        totalTechnicians: technicians.status === 'fulfilled' && Array.isArray(technicians.value) ? technicians.value.length : 0,
        totalClinics: clinicsList.length,
        scheduledClinics: clinicsList.filter(c => c.status === 'SCHEDULED').length,
        completedClinics: clinicsList.filter(c => c.status === 'COMPLETED').length,
        totalConsultations: consultations.status === 'fulfilled' ? consultations.value.total : 0,
        totalLabTests: labTests.status === 'fulfilled' ? labTests.value.total : 0,
        totalTestResults: testResults.status === 'fulfilled' ? testResults.value.total : 0,
      });

      const failed: Record<keyof DashboardStats, boolean> = {
        totalPatients: patients.status === 'rejected',
        totalDoctors: doctors.status === 'rejected',
        totalAdmins: admins.status === 'rejected',
        totalTechnicians: technicians.status === 'rejected',
        totalClinics: clinics.status === 'rejected',
        scheduledClinics: clinics.status === 'rejected',
        completedClinics: clinics.status === 'rejected',
        totalConsultations: consultations.status === 'rejected',
        totalLabTests: labTests.status === 'rejected',
        totalTestResults: testResults.status === 'rejected',
      };
      setFailedFields(failed);
      if (Object.values(failed).some(Boolean)) {
        setError('Some dashboard figures could not be loaded and are shown as unavailable.');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [role, doctorId, patientId, includeTestResults]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    failedFields,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};
