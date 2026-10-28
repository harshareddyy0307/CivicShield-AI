import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Clock, Eye, ShieldAlert,
  ArrowRight, Activity, MapPin, Sparkles, Filter
} from 'lucide-react';
import { analyticsApi, incidentApi, disasterApi } from '../api/services';
import { AnalyticsOverview, Incident, EmergencyCluster } from '../types';
import { PriorityBadge, StatusBadge, CategoryBadge, ClusterStatusBadge } from '../components/Badges';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [activeClusters, setActiveClusters] = useState<EmergencyCluster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, incidents, clusters] = await Promise.all([
        analyticsApi.getOverview(),
        incidentApi.list({ limit: 6 }),
        disasterApi.listClusters()
      ]);
      setData(overview);
      setRecentIncidents(incidents);
      setActiveClusters(clusters.filter(c => c.status !== 'RESOLVED' && c.status !== 'DISMISSED'));
    } catch (err: any) {
      setError(err.message || 'Failed to connect to CivicShield backend.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
        <p className="mt-4 text-xs font-medium text-slate-500">Querying real-time infrastructure intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Backend Connection Notice</h2>
          <p className="text-xs text-slate-600 mt-2">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { metrics, trends, category_distribution } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Active Potential Emergency Banner */}
      {activeClusters.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  Potential Emergency Detected
                </span>
                <span className="text-xs text-amber-800 font-semibold">{activeClusters[0].title}</span>
              </div>
              <p className="text-xs text-amber-950 mt-1">
                {activeClusters[0].evidence_summary}
              </p>
            </div>
          </div>
          <Link
            to={`/disaster/${activeClusters[0].id}`}
            className="shrink-0 text-xs font-semibold px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center space-x-1"
          >
            <span>Review Cluster</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Incidents</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total_incidents}</div>
          <div className="text-[10px] text-slate-400 mt-1">All time recorded</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Open Incidents</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.open_incidents}</div>
          <div className="text-[10px] text-slate-400 mt-1">Awaiting completion</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Awaiting Review</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{metrics.awaiting_review}</div>
          <div className="text-[10px] text-slate-400 mt-1">Submitted / triage</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">In Progress</div>
          <div className="text-2xl font-bold text-sky-600 mt-1">{metrics.in_progress}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active repair/field</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Resolved</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.resolved_incidents}</div>
          <div className="text-[10px] text-emerald-700 font-medium mt-1">{data.resolution_rate_percent}% resolution</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Emergency Clusters</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{metrics.active_emergency_clusters}</div>
          <div className="text-[10px] text-slate-400 mt-1">DisasterConnect</div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Activity Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">7-Day Incident Trend</h3>
              <p className="text-[11px] text-slate-500">Submitted complaints vs verified resolutions</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="submitted" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} name="Submitted" />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Category Distribution</h3>
              <p className="text-[11px] text-slate-500">Live breakdown across civic infrastructure complaints</p>
            </div>
            <Filter className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={category_distribution} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  dataKey="category"
                  type="category"
                  tick={{ fontSize: 10 }}
                  stroke="#64748b"
                  width={110}
                  tickFormatter={(val) => val.replace(/_/g, ' ')}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Infrastructure Complaints</h3>
            <p className="text-[11px] text-slate-500">Live stream of reports ingested into CivicShield intelligence pipeline</p>
          </div>
          <Link
            to="/incidents"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Title & Description</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Priority</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4">Reported</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentIncidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-900 truncate">{inc.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{inc.description}</div>
                  </td>
                  <td className="py-3 px-4">
                    <CategoryBadge category={inc.category} />
                  </td>
                  <td className="py-3 px-4">
                    <PriorityBadge priority={inc.priority} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center space-x-1 truncate max-w-[160px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{inc.location_description || `${inc.latitude.toFixed(3)}, ${inc.longitude.toFixed(3)}`}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(inc.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/incidents/${inc.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
