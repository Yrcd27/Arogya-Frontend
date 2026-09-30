import { createContext } from 'react';
import type { RoleProfile } from '../types/user';

export type ProfileStatus = 'loading' | 'ready' | 'not-found' | 'error';

export interface UserProfileContextType {
  profile: RoleProfile | null;
  status: ProfileStatus;
  error: string | null;
  refreshProfile: () => Promise<void>;
  replaceProfile: (profile: RoleProfile) => void;
}

export const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);
