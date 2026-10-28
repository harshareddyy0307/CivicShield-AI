import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Clock, AlertTriangle,
  CheckCircle, FileText, Upload, RefreshCw, Sparkles, User, Shield, Info
} from 'lucide-react';
import { incidentApi } from '../api/services';
import { Incident } from '../types';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/Badges';
import { useAuth } from '../context/AuthContext';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status update modal / form state
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Evidence upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [isResolutionEvidence, setIsResolutionEvidence] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    if (id) fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await incidentApi.get(id!);
      setIncident(data);
      setNewStatus(data.status);
    } catch (e: any) {
      setError(e.message || 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !newStatus || newStatus === incident.status) return;

    setUpdatingStatus(true);
    try {
      const updated = await incidentApi.update(incident.id, {
        status: newStatus,
        notes: statusNotes
      });
      setIncident(updated);
      setStatusNotes('');
      await fetchIncident(); // Refresh full details & history
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEvidenceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !incident) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadCaption) formData.append('caption', uploadCaption);
      if (isResolutionEvidence) formData.append('is_resolution', 'true');

      await incidentApi.uploadEvidence(incident.id, formData);
      setUploadFile(null);
      setUploadCaption('');
      setIsResolutionEvidence(false);
      await fetchIncident();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-xs text-slate-500">Retrieving incident record...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Incident Not Available</h2>
        <p className="text-xs text-slate-600 mt-2">{error}</p>
        <Link
          to="/incidents"
          className="mt-4 inline-block px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
        >
          Return to Complaints
        </Link>
      </div>
    );
  }

  // Permitted status transitions logic
  const isCitizen = user?.role === 'CITIZEN';
  const isReporter = user?.id === incident.reporter_id;
  const isStaffOrAdmin = user?.role === 'MUNICIPAL_STAFF' || user?.role === 'EMERGENCY_COORDINATOR' || user?.role === 'ADMINISTRATOR';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link to="/incidents" className="hover:text-blue-600 flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Complaints</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-700">#{incident.id.slice(0, 8)}</span>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={incident.category} />
              <PriorityBadge priority={incident.priority} />
              <StatusBadge status={incident.status} />
              {incident.is_demo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  DEMONSTRATION RECORD
                </span>
              )}
            </div>

            <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
              {incident.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{incident.location_description || 'Coordinates provided'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Reported {new Date(incident.created_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                <span>Lat: {incident.latitude.toFixed(4)}, Lon: {incident.longitude.toFixed(4)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-right shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Department</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {incident.assigned_department_name || incident.assigned_department_id?.replace(/_/g, ' ').toUpperCase() || 'Pending Assignment'}
            </div>
            {incident.assigned_user_name && (
              <div className="text-[11px] text-slate-500 mt-1">Staff: {incident.assigned_user_name}</div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Citizen Statement</h3>
          <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50/60 p-3 rounded-lg border border-slate-100">
            {incident.description}
          </p>
        </div>
      </div>

      {/* AI Intelligence & Duplicate Detection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Categorization Explainability */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Categorization Explainability</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Predicted Category:</span>
              <span className="font-semibold text-slate-900">{incident.predicted_category || incident.category}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Classification Method:</span>
              <span className="font-mono text-[11px] text-slate-800">{incident.classification_method || 'deterministic_keyword_rules'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Confidence Score:</span>
              <span className="text-slate-700">
                {incident.classification_confidence != null
                  ? `${Math.round(incident.classification_confidence * 100)}%`
                  : 'N/A (Rule-based: no fabricated confidence)'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Human Verification Required:</span>
              <span className="font-semibold text-amber-700">Yes (Public Personnel Review)</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
            <span className="font-bold">Reasoning: </span>
            {incident.classification_reasons || 'Deterministic keyword rules matched against standard civic infrastructure terms.'}
          </div>
        </div>

        {/* Duplicate Candidates */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Info className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Potential Duplicate Analysis</h3>
          </div>

          {!incident.potential_duplicates || incident.potential_duplicates.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No duplicate complaints detected in physical proximity (within 250m & 72 hours).
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                The intelligence engine detected {incident.potential_duplicates.length} nearby candidate(s). Records are not merged automatically.
              </p>
              {incident.potential_duplicates.map((dup: any) => (
                <div key={dup.id} className="p-2.5 rounded border border-amber-200 bg-amber-50/50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{dup.title}</span>
                    <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {Math.round(dup.score * 100)}% Match
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Distance: {dup.distance_meters}m • Status: {dup.status}
                  </div>
                  <div className="text-[10px] text-slate-500 italic">{dup.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Evidence Gallery & Upload */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Photographic Evidence</h3>
            <p className="text-[11px] text-slate-500">Citizen uploads and verified resolution evidence</p>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {incident.evidence?.length || 0} Files
          </span>
        </div>

        {/* Evidence Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(!incident.evidence || incident.evidence.length === 0) ? (
            <div className="col-span-full p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No photographs attached to this complaint yet.
            </div>
          ) : (
            incident.evidence.map((ev) => (
              <div key={ev.id} className="group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                <div className="aspect-video w-full bg-slate-200 flex items-center justify-center overflow-hidden">
                  <img
                    src={`http://127.0.0.1:8000/${ev.file_path}`}
                    alt={ev.caption || 'Evidence'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-2 text-[11px]">
                  <div className="font-semibold text-slate-800 truncate">{ev.file_name}</div>
                  {ev.caption && <div className="text-slate-500 truncate">{ev.caption}</div>}
                  {ev.is_resolution_evidence && (
                    <span className="mt-1 inline-block text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                      Resolution Proof
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Form */}
        {(isReporter || isStaffOrAdmin) && (
          <form onSubmit={handleEvidenceUpload} className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg flex-1"
            />
            {isStaffOrAdmin && (
              <label className="flex items-center space-x-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={isResolutionEvidence}
                  onChange={(e) => setIsResolutionEvidence(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Resolution Proof</span>
              </label>
            )}
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          </form>
        )}
      </div>

      {/* Status Transition & History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Transition Control Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Status Lifecycle Controls</h3>
          </div>

          <form onSubmit={handleStatusChange} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Update Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={isCitizen && incident.status !== 'RESOLVED_PENDING_VERIFICATION' && incident.status !== 'CLOSED'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isCitizen ? (
                  <>
                    <option value={incident.status}>Current: {incident.status}</option>
                    <option value="REOPENED">Reopen Complaint for Review</option>
                  </>
                ) : (
                  <>
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="INSPECTION_REQUIRED">INSPECTION_REQUIRED</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED_PENDING_VERIFICATION">RESOLVED_PENDING_VERIFICATION</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="REOPENED">REOPENED</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Action Notes / Verification Statement</label>
              <textarea
                rows={2}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Enter field observation notes or verification reasoning..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={updatingStatus || newStatus === incident.status}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {updatingStatus ? 'Updating Status...' : 'Apply Status Transition'}
            </button>
          </form>
        </div>

        {/* Immutable Status History Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Immutable Verification History</h3>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
            {!incident.history || incident.history.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">No status events recorded.</div>
            ) : (
              incident.history.map((h, i) => (
                <div key={h.id || i} className="text-xs relative pl-4 border-l-2 border-blue-400 py-0.5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>
                  {h.notes && <div className="text-slate-600">{h.notes}</div>}
                  <div className="text-[10px] text-slate-400">Action: {h.action_type}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
