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

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; label: string; department?: string }> = {
  EMERGENCY_COORDINATOR: { 
    email: 'coordinator@civicshield.local', 
    pass: 'CivicShield123!', 
    label: 'Emergency Coordinator (Sarah Jenkins)',
    department: 'Emergency & Public Works'
  },
  MUNICIPAL_STAFF: { 
    email: 'staff@civicshield.local', 
    pass: 'CivicShield123!', 
    label: 'Municipal Staff (Rajesh Kumar)',
    department: 'Water & Sewerage'
  },
  CITIZEN: { 
    email: 'citizen@civicshield.local', 
    pass: 'CivicShield123!', 
    label: 'Citizen (Priya Sharma)',
    department: 'General Public'
  },
  ADMINISTRATOR: { 
    email: 'admin@civicshield.local', 
    pass: 'CivicShield123!', 
    label: 'System Administrator',
    department: 'Central Administration'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('civicshield_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('civicshield_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const attemptDemoLogin = async (role: UserRole = 'EMERGENCY_COORDINATOR'): Promise<boolean> => {
    try {
      const cred = DEMO_CREDENTIALS[role];
      const res = await authApi.login({ email: cred.email, password: cred.pass });
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('civicshield_token', res.access_token);
      localStorage.setItem('civicshield_user', JSON.stringify(res.user));
      return true;
    } catch (err) {
      console.warn(`Demo login failed for ${role}:`, err);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('civicshield_token');
      if (savedToken) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          setToken(savedToken);
          localStorage.setItem('civicshield_user', JSON.stringify(profile));
          setIsLoading(false);
          return;
        } catch {
          // Stored token was invalid or expired, clear it
          localStorage.removeItem('civicshield_token');
          localStorage.removeItem('civicshield_user');
          setToken(null);
          setUser(null);
        }
      }

      // Automatically auto-login as demo coordinator for immediate evaluation
      await attemptDemoLogin('EMERGENCY_COORDINATOR');
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
      const success = await attemptDemoLogin(role);
      if (!success) {
        throw new Error(`Failed to switch to role ${role}`);
      }
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
      {isLoading ? (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-semibold tracking-wide text-slate-200">
            Connecting to CivicShield AI Platform...
          </p>
          <p className="text-xs text-slate-400 mt-1">Authenticating demonstration session</p>
        </div>
      ) : (
        children
      )}
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
