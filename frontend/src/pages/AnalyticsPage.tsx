import React, { useState, useEffect } from 'react';
import {
  BarChart3, Download, Calendar, Filter, Activity,
  FileText, CheckCircle2, TrendingUp, AlertTriangle
} from 'lucide-react';
import { analyticsApi, reportsApi } from '../api/services';
import { AnalyticsOverview } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getOverview();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await reportsApi.getIncidentReport(departmentFilter || undefined);
      setReportData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingReport(false);
    }
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  if (loading || !data) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-xs text-slate-500">Calculating infrastructure analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Analytics & Operational Reports</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
              Intelligence Metrics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calculated from live database records. No fabricated statistics or invented values.
          </p>
        </div>

        {/* CSV Export Links */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="http://127.0.0.1:8000/api/v1/reports/export/incidents.csv"
            download
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export Complaints CSV</span>
          </a>

          <a
            href="http://127.0.0.1:8000/api/v1/reports/export/roadwatch.csv"
            download
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span>Export Road Damage CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Incidents</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{data.metrics.total_incidents}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Database verified records</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Resolution Rate</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{data.resolution_rate_percent}%</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">{data.metrics.resolved_incidents} resolved or verified</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Road Damage Detections</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{data.metrics.road_observations_total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">RoadWatch visual observations</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Average Resolution Time</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {data.avg_resolution_time_hours ? `${data.avg_resolution_time_hours} hrs` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Submission to verification</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">7-Day Incident Trend</h3>
            <span className="text-[11px] text-slate-400">Ingested vs Resolved</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends}>
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

        {/* Road Damage Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Road Distress Classification</h3>
            <span className="text-[11px] text-slate-400">RoadWatch observations</span>
          </div>

          <div className="h-64 w-full">
            {data.road_damage_breakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No visual damage observations recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.road_damage_breakdown} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="damage_class"
                    tick={{ fontSize: 10 }}
                    stroke="#94a3b8"
                    tickFormatter={(val) => val.replace(/_/g, ' ')}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Detections" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Structured Report Generation Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Generate Formal Municipal Summary</h2>
            <p className="text-xs text-slate-500">Produces audited metrics with embedded legal limitations and jurisdictional scope.</p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="">All Municipal Departments</option>
              <option value="roads_bridges">Roads & Bridges Department</option>
              <option value="water_sewerage">Water Supply & Sewerage Board</option>
              <option value="sanitation">Sanitation & Waste Management</option>
            </select>

            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              {generatingReport ? 'Generating...' : 'Compile Report'}
            </button>
          </div>
        </div>

        {reportData && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 text-sm">{reportData.report_name}</span>
              <span className="text-slate-500 text-[10px]">Generated: {reportData.generated_at}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
              <div><b>Source:</b> {reportData.data_source}</div>
              <div><b>Total Ingested:</b> {reportData.summary_statistics.total_incidents}</div>
              <div><b>Resolution Rate:</b> {reportData.summary_statistics.resolution_rate_percent}%</div>
            </div>

            <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-900 font-sans">
              <b>Platform Limitations:</b> {reportData.limitations}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
