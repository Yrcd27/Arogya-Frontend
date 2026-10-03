import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '../services/httpClient';
import { profileAPI } from '../services/userService';
import type { RoleProfile } from '../types/user';
import { useAuth } from '../hooks/useAuth';
import { UserProfileContext, type ProfileStatus } from './UserProfileContextType';

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, sessionKey } = useAuth();
  const [profile, setProfile] = useState<RoleProfile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refreshProfile = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const role = user?.userRole?.roleName.trim().toLowerCase();
    if (!user?.id || !role) {
      setProfile(null);
      setStatus('ready');
      setError(null);
      return;
    }

    setProfile(null);
    setStatus('loading');
    setError(null);
    try {
      let nextProfile: RoleProfile;
      switch (role) {
        case 'doctor':
          nextProfile = await profileAPI.getDoctor(user.id);
          break;
        case 'patient':
          nextProfile = await profileAPI.getPatient(user.id);
          break;
        case 'admin':
          nextProfile = await profileAPI.getAdmin(user.id);
          break;
        case 'technician':
          nextProfile = await profileAPI.getTechnician(user.id);
          break;
        default:
          throw new Error('Unknown user role');
      }
      if (requestId === requestIdRef.current) {
        setProfile(nextProfile);
        setStatus('ready');
      }
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setProfile(null);
      if (cause instanceof ApiError && cause.status === 404) {
        setStatus('not-found');
        return;
      }
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Failed to fetch profile');
    }
  }, [user?.id, user?.userRole?.roleName]);

  useLayoutEffect(() => {
    void refreshProfile();
  }, [refreshProfile, sessionKey]);

  const replaceProfile = useCallback((nextProfile: RoleProfile) => {
    requestIdRef.current += 1;
    setProfile(nextProfile);
    setStatus('ready');
    setError(null);
  }, []);

  return (
    <UserProfileContext.Provider value={{ profile, status, error, refreshProfile, replaceProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}
