import { useState, useEffect } from 'react';
import { profileAPI } from '../services/userService';
import { clinicAPI } from '../services/clinicService';
import { consultationAPI } from '../services/consultationService';

interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalAdmins: number;
  totalTechnicians: number;
  totalClinics: number;
  scheduledClinics: number;
  completedClinics: number;
  activeDoctors: number;
  totalConsultations: number;
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalDoctors: 0,
    totalAdmins: 0,
    totalTechnicians: 0,
    totalClinics: 0,
    scheduledClinics: 0,
    completedClinics: 0,
    activeDoctors: 0,
    totalConsultations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel with timeout
      const timeout = 10000; // 10 seconds timeout
      const requests = [
        Promise.race([
          profileAPI.getAllPatients(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]),
        Promise.race([
          profileAPI.getAllDoctors(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]),
        Promise.race([
          profileAPI.getAllAdmins(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]),
        Promise.race([
          profileAPI.getAllTechnicians(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]),
        Promise.race([
          clinicAPI.getAllClinics(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]),
        Promise.race([
          consultationAPI.list(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ])
      ];

      const [
        patientsData,
        doctorsData,
        adminsData,
        techniciansData,
        clinicsData,
        consultationsData
      ] = await Promise.allSettled(requests);

      const newStats: DashboardStats = {
        totalPatients: patientsData.status === 'fulfilled' ? (Array.isArray(patientsData.value) ? patientsData.value.length : 0) : 0,
        totalDoctors: doctorsData.status === 'fulfilled' ? (Array.isArray(doctorsData.value) ? doctorsData.value.length : 0) : 0,
        totalAdmins: adminsData.status === 'fulfilled' ? (Array.isArray(adminsData.value) ? adminsData.value.length : 0) : 0,
        totalTechnicians: techniciansData.status === 'fulfilled' ? (Array.isArray(techniciansData.value) ? techniciansData.value.length : 0) : 0,
        totalClinics: clinicsData.status === 'fulfilled' ? (Array.isArray(clinicsData.value) ? clinicsData.value.length : 0) : 0,
        totalConsultations: consultationsData.status === 'fulfilled' ? (Array.isArray(consultationsData.value) ? consultationsData.value.length : 0) : 0,
        scheduledClinics: 0,
        completedClinics: 0,
        activeDoctors: 0,
      };

      // Calculate clinic statistics
      if (clinicsData.status === 'fulfilled' && Array.isArray(clinicsData.value)) {
        const clinics = clinicsData.value;
        newStats.scheduledClinics = clinics.filter((clinic: { status?: string }) => 
          clinic.status === 'SCHEDULED'
        ).length;
        newStats.completedClinics = clinics.filter((clinic: { status?: string }) => 
          clinic.status === 'COMPLETED'
        ).length;
      }

      // Active doctors (assuming all doctors are active for now)
      newStats.activeDoctors = newStats.totalDoctors;

      setStats(newStats);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      // Set default values on error
      setStats({
        totalPatients: 0,
        totalDoctors: 0,
        totalAdmins: 0,
        totalTechnicians: 0,
        totalClinics: 0,
        scheduledClinics: 0,
        completedClinics: 0,
        activeDoctors: 0,
        totalConsultations: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};