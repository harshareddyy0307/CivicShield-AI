import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertCircle, Eye, ShieldAlert,
  Map, Truck, BarChart3, Cpu, Activity, PlusCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/incidents', label: 'Civic Complaints', icon: AlertCircle, badge: 'CivicFix' },
    { to: '/roadwatch', label: 'RoadWatch AI', icon: Eye, badge: 'Vision' },
    { to: '/disaster', label: 'Disaster Response', icon: ShieldAlert, badge: 'Clusters' },
    { to: '/map', label: 'Incident GIS Map', icon: Map },
    { to: '/resources', label: 'Resource Fleet', icon: Truck },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/settings/ai', label: 'AI & Agent Controls', icon: Cpu },
    { to: '/system/health', label: 'System Health', icon: Activity },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      <div className="p-4 border-b border-slate-800/80">
        <NavLink
          to="/incidents/new"
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all text-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Incident</span>
        </NavLink>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Intelligence Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Role Notice at Bottom */}
      <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-200">Active Role Scope:</div>
        <div className="text-[10px] text-slate-400 mt-0.5">
          {user?.role === 'CITIZEN' && 'Public citizen reporting & personal status tracking.'}
          {user?.role === 'MUNICIPAL_STAFF' && 'Department incident review & repair management.'}
          {user?.role === 'EMERGENCY_COORDINATOR' && 'Multi-hazard correlation & resource authorization.'}
          {user?.role === 'ADMINISTRATOR' && 'Full platform administration & audit authority.'}
        </div>
      </div>
    </aside>
  );
};
