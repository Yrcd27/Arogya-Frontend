import { useState, useEffect, useCallback } from 'react';
import { profileAPI } from '../services/userService';
import { useAuth } from './useAuth';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  nicNumber: string;
  // Role-specific fields
  specialization?: string;
  licenseNumber?: string;
  qualification?: string;
  experienceYears?: number;
  technicianField?: string;
  certification?: string;
  assignedEquipment?: string;
  address?: string;
  gender?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicDiseases?: string;
  emergencyContact?: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id || !user?.userRole?.roleName) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let profileData;
      const roleName = user.userRole.roleName.toLowerCase();
      
      switch (roleName) {
        case 'doctor':
          profileData = await profileAPI.getDoctor(user.id);
          break;
        case 'patient':
          profileData = await profileAPI.getPatient(user.id);
          break;
        case 'admin':
          try {
            profileData = await profileAPI.getAdmin(user.id);
          } catch (adminError) {
            // Admin profile might not exist in the database yet
            console.warn('Admin profile not found, using basic user data');
            profileData = null;
          }
          break;
        case 'technician':
          profileData = await profileAPI.getTechnician(user.id);
          break;
        default:
          throw new Error('Unknown user role');
      }
      
      setProfile(profileData);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.userRole?.roleName]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const getUserDisplayName = () => {
    if (profile) {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      return fullName || user?.username || 'User';
    }
    return user?.username || 'User';
  };

  const getUserInitials = () => {
    if (profile && profile.firstName && profile.lastName) {
      return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.username) {
      const parts = user.username.split(/[\s_-]+/);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return user.username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return {
    profile,
    loading,
    error,
    refetchProfile: fetchProfile,
    getUserDisplayName,
    getUserInitials,
  };
};