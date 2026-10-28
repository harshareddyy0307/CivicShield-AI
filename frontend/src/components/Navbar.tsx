import React, { useState, useEffect } from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';
import { Shield, Bell, CheckCircle, UserCheck, ChevronDown, LogOut, Check } from 'lucide-react';
import { systemApi } from '../api/services';

export const Navbar: React.FC = () => {
  const { user, switchDemoRole, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    if (user) {
      systemApi.getNotifications()
        .then(data => setNotifications(data))
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EMERGENCY_COORDINATOR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MUNICIPAL_STAFF':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 tracking-tight text-lg">CivicShield AI</span>
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none">
              Infrastructure Intelligence & Emergency Coordination
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-1.5 pl-4 border-l border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-slate-600 font-medium">Core Engine Active</span>
        </div>
      </div>

      {/* Role Switcher, Notifications & Profile */}
      <div className="flex items-center space-x-3">
        {/* Quick Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
            title="Switch demo persona to test role permissions"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Switch Role: {user?.role.replace('_', ' ')}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Demonstration Personas
              </div>
              {(Object.keys(DEMO_CREDENTIALS) as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchDemoRole(r);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    user?.role === r ? 'font-semibold text-blue-700 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-medium">{DEMO_CREDENTIALS[r].label}</div>
                    <div className="text-[10px] text-slate-500">{DEMO_CREDENTIALS[r].email}</div>
                  </div>
                  {user?.role === r && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full"></span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">In-App Notifications</span>
                <span className="text-[10px] text-slate-500">{unreadCount} unread</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 text-xs hover:bg-slate-50 ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                      <div className="font-semibold text-slate-800">{n.title}</div>
                      <div className="text-slate-600 mt-0.5 text-[11px]">{n.message}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 leading-tight">{user?.full_name}</div>
            <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded border font-semibold tracking-wider mt-0.5 ${getRoleBadgeColor(user?.role)}`}>
              {user?.role.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
