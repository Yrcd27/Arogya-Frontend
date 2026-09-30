import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { User, getCurrentUser, removeCurrentUser, getToken, isTokenExpired, decodeJwtPayload } from '../utils/auth';
import { AUTH_EXPIRED_EVENT } from '../services/httpClient';
import { AuthContext } from './AuthContextType';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    removeCurrentUser();
    setUser(null);
  }, []);

  const login = useCallback((userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  // Load any existing session on app start, but only if the token hasn't
  // already expired (tokens last 1 hour).
  useEffect(() => {
    const savedUser = getCurrentUser();
    const token = getToken();
    if (savedUser && !isTokenExpired(token)) {
      setUser(savedUser);
    } else if (savedUser) {
      removeCurrentUser();
    }
    setIsLoading(false);
  }, []);

  // Any API call that comes back 401/403 dispatches this — log out and let
  // ProtectedRoute bounce the user to /login.
  useEffect(() => {
    const handleAuthExpired = () => logout();
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [logout]);

  // Proactively log out right when the token expires, instead of waiting
  // for the next failed request.
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    const payload = token ? decodeJwtPayload(token) : null;
    if (!payload?.exp) return;
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      logout();
      return;
    }
    const timer = window.setTimeout(logout, msUntilExpiry);
    return () => window.clearTimeout(timer);
  }, [user, logout]);

  const value = {
    user,
    isAuthenticated: !!user && !isTokenExpired(getToken()),
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
