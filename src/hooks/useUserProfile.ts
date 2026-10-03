import { useContext } from 'react';
import { UserProfileContext } from '../context/UserProfileContextType';
import { useAuth } from './useAuth';

export const useUserProfile = () => {
  const { user } = useAuth();
  const context = useContext(UserProfileContext);
  if (!context) throw new Error('useUserProfile must be used within UserProfileProvider');
  const { profile, status, error, refreshProfile, replaceProfile } = context;

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
    loading: status === 'loading',
    error,
    notFound: status === 'not-found',
    status,
    refetchProfile: refreshProfile,
    replaceProfile,
    getUserDisplayName,
    getUserInitials,
  };
};
