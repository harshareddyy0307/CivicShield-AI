import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchDemoRole } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setLoading(true);
    try {
      await switchDemoRole(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Quick demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-lg">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">CivicShield AI</h1>
        <p className="text-xs text-slate-400">
          Unified AI Platform for Civic Infrastructure Intelligence & Emergency Response
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-800/10 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@civicshield.local"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Platform'}
            </button>
          </form>

          {/* Quick Demo Login Grid */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
              1-Click Evaluation Personas
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('CITIZEN')}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
              >
                <div className="text-[11px] font-bold text-slate-900">Citizen</div>
                <div className="text-[10px] text-slate-500">Priya Sharma</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('MUNICIPAL_STAFF')}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <div className="text-[11px] font-bold text-slate-900">Staff</div>
                <div className="text-[10px] text-slate-500">Rajesh Kumar</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('EMERGENCY_COORDINATOR')}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-colors"
              >
                <div className="text-[11px] font-bold text-slate-900">Coordinator</div>
                <div className="text-[10px] text-slate-500">Sarah Jenkins</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ADMINISTRATOR')}
                className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
              >
                <div className="text-[11px] font-bold text-slate-900">Admin</div>
                <div className="text-[10px] text-slate-500">Full Access</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
