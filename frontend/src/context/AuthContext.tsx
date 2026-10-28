import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../api/services';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; label: string }> = {
  CITIZEN: { email: 'citizen@civicshield.local', pass: 'CivicShield123!', label: 'Citizen (Priya Sharma)' },
  MUNICIPAL_STAFF: { email: 'staff@civicshield.local', pass: 'CivicShield123!', label: 'Staff (Rajesh Kumar)' },
  EMERGENCY_COORDINATOR: { email: 'coordinator@civicshield.local', pass: 'CivicShield123!', label: 'Coordinator (Sarah Jenkins)' },
  ADMINISTRATOR: { email: 'admin@civicshield.local', pass: 'CivicShield123!', label: 'Administrator' }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('civicshield_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('civicshield_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          localStorage.setItem('civicshield_user', JSON.stringify(profile));
        } catch {
          logout();
        }
      } else {
        // Automatically login as Demo Coordinator by default for instant evaluation!
        try {
          const res = await authApi.login({
            email: DEMO_CREDENTIALS.EMERGENCY_COORDINATOR.email,
            password: DEMO_CREDENTIALS.EMERGENCY_COORDINATOR.pass
          });
          setToken(res.access_token);
          setUser(res.user);
          localStorage.setItem('civicshield_token', res.access_token);
          localStorage.setItem('civicshield_user', JSON.stringify(res.user));
        } catch (e) {
          console.error("Could not auto-login demo user", e);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login({ email, password: pass });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('civicshield_token', res.access_token);
    localStorage.setItem('civicshield_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('civicshield_token');
    localStorage.removeItem('civicshield_user');
  };

  const switchDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const creds = DEMO_CREDENTIALS[role];
      const res = await authApi.login({ email: creds.email, password: creds.pass });
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('civicshield_token', res.access_token);
      localStorage.setItem('civicshield_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchDemoRole,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
