import React, { useState, useEffect } from 'react';
import {
  Activity, Shield, CheckCircle, Database, Server,
  Building, History, AlertCircle, RefreshCw
} from 'lucide-react';
import { systemApi } from '../api/services';
import { useAuth } from '../context/AuthContext';

export const SystemHealthPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    setLoading(true);
    try {
      const [h, d] = await Promise.all([
        systemApi.getHealth(),
        systemApi.getDepartments()
      ]);
      setHealth(h);
      setDepartments(d);

      if (user?.role === 'ADMINISTRATOR') {
        const logs = await systemApi.getAuditLogs();
        setAuditLogs(logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Health & Municipal Administration</h1>
          <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800">
            Platform Operations
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Real-time service health, database connectivity status, department routing directory, and security audit logs.
        </p>
      </div>

      {/* Health Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Service Status</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{health?.service || 'CivicShield AI'}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{health?.status?.toUpperCase() || 'OPERATIONAL'}</span>
            </div>
          </div>
          <Server className="w-8 h-8 text-blue-600" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Relational Database</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">PostGIS / SQLite</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Connected ({health?.database})</span>
            </div>
          </div>
          <Database className="w-8 h-8 text-emerald-600" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Vision Subsystem</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">RoadWatch CV</div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{health?.vision_subsystem || 'Active'}</span>
            </div>
          </div>
          <Activity className="w-8 h-8 text-purple-600" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Engine Version</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">v{health?.version || '1.0.0'}</div>
            <div className="text-[11px] text-slate-500 mt-1">Production Release</div>
          </div>
          <Shield className="w-8 h-8 text-slate-400" />
        </div>
      </div>

      {/* Municipal Departments Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Configured Municipal Departments ({departments.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Jurisdictional departments responsible for complaint triage, field inspections, and equipment management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map((d) => (
            <div key={d.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{d.name}</span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                  {d.code}
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">{d.description}</p>
              <div className="text-[10px] text-slate-400 pt-1 font-mono">{d.contact_email}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Immutable Platform Audit Logs (Admin only) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-700" />
              <span>Security & Administrative Audit Logs</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable platform audit trail logging status changes, reviews, assignments, and user auth actions.
            </p>
          </div>
          <button
            onClick={loadSystemData}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {user?.role !== 'ADMINISTRATOR' ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Audit logs are restricted to Administrator accounts. Use the role switcher in the top bar to switch to <b>Administrator</b> persona to review platform audit entries.
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No audit events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold font-sans">
                  <th className="py-2.5 px-4">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                      {log.user_email}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-blue-700">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 uppercase text-[10px]">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-sans max-w-sm truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
