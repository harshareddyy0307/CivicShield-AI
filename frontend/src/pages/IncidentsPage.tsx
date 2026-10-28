import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Plus, MapPin, Calendar, Clock,
  AlertCircle, ShieldCheck, ChevronRight
} from 'lucide-react';
import { incidentApi } from '../api/services';
import { Incident } from '../types';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/Badges';
import { useAuth } from '../context/AuthContext';

export const IncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    fetchIncidents();
  }, [categoryFilter, statusFilter, priorityFilter]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentApi.list({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined
      });
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setSearch('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Civic Complaints (CivicFix AI)</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
              {incidents.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {user?.role === 'CITIZEN'
              ? 'Showing civic complaints submitted by your account. Private citizen reports are protected by backend role policies.'
              : 'Managing municipal infrastructure reports, evidence verification, and department task routing.'}
          </p>
        </div>

        <Link
          to="/incidents/new"
          className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Complaint</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search complaint title, description, or landmark..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="pothole">Potholes</option>
              <option value="damaged_road">Damaged Roads</option>
              <option value="blocked_drain">Blocked Drains</option>
              <option value="waterlogging">Waterlogging</option>
              <option value="water_leakage">Water Leakage</option>
              <option value="garbage_accumulation">Garbage</option>
              <option value="broken_streetlight">Streetlights</option>
              <option value="road_obstruction">Obstructions</option>
              <option value="damaged_public_infrastructure">Public Infrastructure</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="INSPECTION_REQUIRED">Inspection Required</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED_PENDING_VERIFICATION">Resolved (Pending Verification)</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Incidents Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-xs text-slate-500">Loading civic complaints...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Complaints Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No complaints match the selected filter criteria.
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <CategoryBadge category={inc.category} />
                  <PriorityBadge priority={inc.priority} />
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                  {inc.title}
                </h3>

                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {inc.description}
                </p>

                {inc.is_duplicate && (
                  <div className="mt-3 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 flex items-center space-x-1">
                    <span>Potential Duplicate Flagged ({Math.round((inc.duplicate_score || 0) * 100)}% match)</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1 truncate max-w-[170px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{inc.location_description || `${inc.latitude.toFixed(3)}, ${inc.longitude.toFixed(3)}`}</span>
                  </div>
                  <StatusBadge status={inc.status} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    #{inc.id.slice(0, 8)} • {new Date(inc.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/incidents/${inc.id}`}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-0.5"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
