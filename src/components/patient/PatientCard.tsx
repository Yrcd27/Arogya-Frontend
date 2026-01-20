import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { profileAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface PatientProfile {
  firstName: string;
  lastName: string;
  nicNumber: string;
  dateOfBirth: string;
  bloodGroup: string;
}

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Helper function to get initials from name
const getInitials = (firstName: string, lastName: string): string => {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  return `${firstInitial}${lastInitial}` || 'NA';
};

export function PatientCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const patientProfile = await profileAPI.getPatient(user.id);
        setProfile({
          firstName: patientProfile.firstName || '',
          lastName: patientProfile.lastName || '',
          nicNumber: patientProfile.nicNumber || '',
          dateOfBirth: patientProfile.dateOfBirth || '',
          bloodGroup: patientProfile.bloodGroup || '',
        });
      } catch (err) {
        console.error('Failed to fetch patient profile:', err);
        setError('Unable to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientProfile();
  }, [user]);

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Loading...';
  const initials = profile ? getInitials(profile.firstName, profile.lastName) : '...';
  const age = profile?.dateOfBirth ? calculateAge(profile.dateOfBirth) : '-';
  const nic = profile?.nicNumber || '-';
  const bloodType = profile?.bloodGroup || '-';

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-6 animate-pulse">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full flex-shrink-0"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-48 mb-3"></div>
            <div className="flex flex-wrap gap-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-28"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#38a3a5] rounded-full flex items-center justify-center text-white text-lg sm:text-2xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
            {error ? 'Unable to load profile' : fullName}
          </h2>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-gray-600 text-sm sm:text-base">
            <div>
              <span className="font-medium">NIC:</span> {nic}
            </div>
            <div>
              <span className="font-medium">Age:</span> {age}
            </div>
            <div>
              <span className="font-medium">Blood Type:</span> {bloodType}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button 
            onClick={() => navigate('/patient/profile')}
            className="px-4 sm:px-6 py-2 sm:py-3 text-[#38a3a5] border-2 border-[#38a3a5] rounded-lg font-medium hover:bg-[#38a3a5] hover:text-white transition-colors text-sm sm:text-base"
          >
            Update Info
          </button>
          <button 
            onClick={() => navigate('/patient/clinics')}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-[#38a3a5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors text-sm sm:text-base"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
}