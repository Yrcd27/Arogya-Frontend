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

export const useDashboardData = (options: { doctorId?: number } = {}) => {
  const { doctorId } = options;
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

      const [patients, doctors, admins, technicians, clinics, consultations, labTests, testResults] = await Promise.allSettled([
        withTimeout(profileAPI.getAllPatients()),
        withTimeout(profileAPI.getAllDoctors()),
        withTimeout(profileAPI.getAllAdmins()),
        withTimeout(profileAPI.getAllTechnicians()),
        withTimeout(clinicAPI.getAllClinics()),
        withTimeout(consultationAPI.list(doctorId ? { doctorId, size: 1 } : { size: 1 })),
        withTimeout(labTestAPI.list({ size: 1 })),
        withTimeout(medicalRecordsAPI.list({ size: 1 })),
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
  }, [doctorId]);

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
