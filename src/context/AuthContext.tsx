import React, { useState, useEffect, ReactNode } from 'react';
import { User, getCurrentUser, removeCurrentUser } from '../utils/auth';
import { AuthContext } from './AuthContextType';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication on app load
    const initializeAuth = () => {
      const savedUser = getCurrentUser();
      
      if (savedUser) {
        setUser(savedUser);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    removeCurrentUser();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};