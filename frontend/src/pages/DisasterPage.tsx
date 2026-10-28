import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, AlertTriangle, CheckCircle, RefreshCw,
  Users, MapPin, Clock, ArrowRight, Activity, Sparkles, Filter
} from 'lucide-react';
import { disasterApi, aiApi } from '../api/services';
import { EmergencyCluster, ExternalAlert } from '../types';
import { ClusterStatusBadge } from '../components/Badges';
import { useAuth } from '../context/AuthContext';

export const DisasterPage: React.FC = () => {
  const { user } = useAuth();
  const [clusters, setClusters] = useState<EmergencyCluster[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [correlating, setCorrelating] = useState<boolean>(false);
  const [selectedCluster, setSelectedCluster] = useState<EmergencyCluster | null>(null);

  // Review state
  const [reviewStatus, setReviewStatus] = useState<string>('VERIFIED');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clusterList, alertList] = await Promise.all([
        disasterApi.listClusters(),
        disasterApi.listAlerts()
      ]);
      setClusters(clusterList);
      setAlerts(alertList);
      if (clusterList.length > 0 && !selectedCluster) {
        // Load detailed first cluster
        const detailed = await disasterApi.getCluster(clusterList[0].id);
        setSelectedCluster(detailed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCluster = async (c: EmergencyCluster) => {
    try {
      const detailed = await disasterApi.getCluster(c.id);
      setSelectedCluster(detailed);
      setReviewStatus(detailed.status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerCorrelation = async () => {
    setCorrelating(true);
    try {
      const res = await aiApi.correlateIncidents();
      alert(`Correlation Complete: Evaluated ${res.evaluated_incidents_count} reports. Created ${res.new_clusters_created} new cluster(s).`);
      await loadData();
    } catch (e: any) {
      alert(`Correlation failed: ${e.message}`);
    } finally {
      setCorrelating(false);
    }
  };

  const handleReviewCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCluster) return;

    setSubmittingReview(true);
    try {
      const updated = await disasterApi.reviewCluster(selectedCluster.id, {
        status: reviewStatus,
        notes: reviewNotes
      });
      alert(`Cluster status updated to ${updated.status}`);
      await loadData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const isCoordinatorOrAdmin = user?.role === 'EMERGENCY_COORDINATOR' || user?.role === 'ADMINISTRATOR';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">DisasterConnect AI - Incident Intelligence</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-800">
              Module C
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detects cascading infrastructure hazards, waterlogging overflow, and multi-point road failures.
          </p>
        </div>

        {isCoordinatorOrAdmin && (
          <button
            onClick={handleTriggerCorrelation}
            disabled={correlating}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{correlating ? 'Analyzing Cascades...' : 'Run Correlation Engine'}</span>
          </button>
        )}
      </div>

      {/* Active External Alerts Row */}
      {alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-300 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-900 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                Active External Warning: {alerts[0].alert_type.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-500">Source: {alerts[0].source}</span>
            </div>
            <div className="text-xs font-bold text-slate-900">{alerts[0].headline}</div>
            <p className="text-xs text-slate-600">{alerts[0].description}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Clusters List & Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Clusters List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Emergency Clusters ({clusters.length})
            </h2>
            <span className="text-[11px] text-slate-400">Multi-incident zones</span>
          </div>

          <div className="space-y-2.5">
            {clusters.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCluster(c)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedCluster?.id === c.id
                    ? 'bg-blue-50/70 border-blue-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {c.hazard_type.replace(/_/g, ' ')}
                  </span>
                  <ClusterStatusBadge status={c.status} />
                </div>

                <div className="text-xs font-bold text-slate-900 line-clamp-1">{c.title}</div>
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{c.evidence_summary}</div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>{c.member_count || (c.members?.length || 0)} Associated reports</span>
                  <span>{new Date(c.first_observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Selected Cluster In-Depth View */}
        <div className="lg:col-span-2 space-y-5">
          {!selectedCluster ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Select an emergency cluster on the left to inspect multi-hazard correlation evidence.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Cluster Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#{selectedCluster.id.slice(0, 8)}</span>
                    <ClusterStatusBadge status={selectedCluster.status} />
                    {selectedCluster.is_demo && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300">
                        SIMULATED SCENARIO
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-1">{selectedCluster.title}</h2>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Center: {selectedCluster.center_latitude.toFixed(4)}, {selectedCluster.center_longitude.toFixed(4)} (Radius: {selectedCluster.radius_meters}m)</span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Severity Level</div>
                  <div className="font-bold text-red-600 mt-0.5">{selectedCluster.severity} EMERGENCY</div>
                </div>
              </div>

              {/* Evidence Synthesis Box */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Evidence Synthesis & Association Justification
                </h3>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
                  {selectedCluster.evidence_summary}
                </div>
              </div>

              {/* Associated Incident Members */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Associated Reports & Observations ({selectedCluster.members?.length || 0})
                </h3>
                <div className="space-y-2">
                  {selectedCluster.members?.map((m) => (
                    <div key={m.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-start justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">
                          {m.title || `Component #${m.id.slice(0, 8)}`}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          <span className="font-semibold text-blue-700">Contribution: </span>
                          {m.contribution_reason}
                        </div>
                        {m.distance_from_center_meters != null && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {Math.round(m.distance_from_center_meters)}m from cluster center
                          </div>
                        )}
                      </div>

                      {m.incident_id && (
                        <Link
                          to={`/incidents/${m.incident_id}`}
                          className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 ml-3"
                        >
                          View Report
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Next Steps */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recommended Response & Verification Actions
                </h3>
                <div className="bg-blue-50/50 rounded-lg border border-blue-200 p-3.5 space-y-1.5">
                  {selectedCluster.recommended_actions?.map((act, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs text-blue-950">
                      <span className="font-bold text-blue-600 shrink-0">•</span>
                      <span>{act}</span>
                    </div>
                  ))}
                  <div className="text-[10px] text-blue-800/80 pt-1 font-medium italic">
                    Note: Recommendations must be distinguished from confirmed facts. Human coordinator approval is required before field dispatch.
                  </div>
                </div>
              </div>

              {/* Limitations & Missing Evidence */}
              {selectedCluster.missing_evidence && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 text-[11px] uppercase">Missing or Unverified Telemetry:</div>
                  <div className="text-[11px]">{selectedCluster.missing_evidence}</div>
                </div>
              )}

              {/* Coordinator Authorization & Review Form */}
              {isCoordinatorOrAdmin && (
                <form onSubmit={handleReviewCluster} className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Coordinator Verification & Authorization
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Set Cluster State</label>
                      <select
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="AWAITING_VERIFICATION">AWAITING_VERIFICATION</option>
                        <option value="VERIFIED">VERIFIED - Emergency Confirmed</option>
                        <option value="RESPONSE_PLANNING">RESPONSE_PLANNING</option>
                        <option value="RESPONSE_IN_PROGRESS">RESPONSE_IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED - Cascade Mitigated</option>
                        <option value="DISMISSED">DISMISSED - Isolated Reports</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Verification Statement / Notes</label>
                      <input
                        type="text"
                        placeholder="Coordinator on-site verification notes..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    {submittingReview ? 'Recording Verification...' : 'Submit Coordinator Authorization'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
