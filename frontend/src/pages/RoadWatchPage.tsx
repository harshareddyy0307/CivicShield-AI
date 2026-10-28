import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, Upload, AlertTriangle, CheckCircle, Shield,
  Layers, MapPin, Clock, Edit3, Link2, ExternalLink
} from 'lucide-react';
import { roadwatchApi, incidentApi } from '../api/services';
import { RoadObservation, Incident } from '../types';
import { useAuth } from '../context/AuthContext';

export const RoadWatchPage: React.FC = () => {
  const { user } = useAuth();
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [observations, setObservations] = useState<RoadObservation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Upload Form
  const [file, setFile] = useState<File | null>(null);
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [locationDesc, setLocationDesc] = useState<string>('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Review Dialog Modal
  const [reviewingObs, setReviewingObs] = useState<RoadObservation | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('VERIFIED');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [correctedClass, setCorrectedClass] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mStatus, obsList, incList] = await Promise.all([
        roadwatchApi.getModelStatus(),
        roadwatchApi.list(),
        incidentApi.list({ limit: 30 })
      ]);
      setModelStatus(mStatus);
      setObservations(obsList);
      setIncidents(incList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a road damage photograph.');
      return;
    }

    setAnalyzing(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (latitude) formData.append('latitude', latitude.toString());
      if (longitude) formData.append('longitude', longitude.toString());
      if (locationDesc) formData.append('location_description', locationDesc);
      if (selectedIncidentId) formData.append('incident_id', selectedIncidentId);

      const created = await roadwatchApi.analyze(formData);
      setFile(null);
      setLocationDesc('');
      setSelectedIncidentId('');
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || 'Image analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingObs) return;

    setSubmittingReview(true);
    try {
      const correctedList = correctedClass ? [correctedClass] : undefined;
      await roadwatchApi.review(reviewingObs.id, {
        review_status: reviewStatus,
        reviewer_notes: reviewerNotes,
        corrected_classes: correctedList
      });
      setReviewingObs(null);
      setReviewerNotes('');
      setCorrectedClass('');
      await loadData();
    } catch (err: any) {
      alert(`Review submission failed: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const isStaffOrAdmin = user?.role === 'MUNICIPAL_STAFF' || user?.role === 'EMERGENCY_COORDINATOR' || user?.role === 'ADMINISTRATOR';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">RoadWatch AI - Computer Vision Screening</h1>
          <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
            Module B
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Computer vision screening of pavement distress, potholes, longitudinal/transverse cracks, and surface erosion.
        </p>
      </div>

      {/* Model Status & Disclaimer Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${modelStatus?.weights_configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <div>
              <div className="text-xs font-bold text-slate-900">
                Model: {modelStatus?.model_name || 'roadwatch-cv-baseline'}
                <span className="ml-2 font-mono font-normal text-slate-500">v{modelStatus?.model_version || '1.0'}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {modelStatus?.message || 'Model service active.'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Classes:</span>
            {modelStatus?.supported_classes?.map((cls: string) => (
              <span key={cls} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                {cls.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <b>Standard Engineering Disclaimer:</b> Computer vision screening assists visual triage. It does not replace certified civil engineering structural assessment.
          </span>
        </div>
      </div>

      {/* Upload and Analyze Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Analyze New Road Image</h2>
          <p className="text-xs text-slate-500">
            Upload roadway imagery for automated distress classification and bounding box localization.
          </p>
        </div>

        {uploadError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {uploadError}
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Road Image File (JPEG, PNG, WEBP) *
              </label>
              <input
                type="file"
                required
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-[10px] text-slate-400 mt-1">Verified magic byte signatures. Max 10MB.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link to Existing Civic Complaint (Optional)
              </label>
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="">-- No Linked Incident --</option>
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    #{inc.id.slice(0, 8)} - {inc.title} ({inc.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Location Landmark</label>
              <input
                type="text"
                placeholder="e.g. 4th Main near Pillar 114"
                value={locationDesc}
                onChange={(e) => setLocationDesc(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={analyzing || !file}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 transition-colors"
          >
            {analyzing ? 'Screening Image with RoadWatch...' : 'Execute Vision Analysis'}
          </button>
        </form>
      </div>

      {/* Observations Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Road Observations ({observations.length})
          </h2>
          <span className="text-xs text-slate-500">Live observational feed</span>
        </div>

        {observations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            No road damage observations recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {observations.map((obs) => (
              <div key={obs.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="aspect-video w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    <img
                      src={`http://127.0.0.1:8000/${obs.original_image_path}`}
                      alt="Observation"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border uppercase ${
                        obs.review_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        obs.review_status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-300' :
                        obs.review_status === 'CORRECTED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {obs.review_status}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">#{obs.id.slice(0, 8)}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(obs.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Detected Classes */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-700">Detections:</div>
                      {obs.detection_classes.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">No automated distress classes detected</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {obs.detection_classes.map((cls) => (
                            <span key={cls} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {cls.replace(/_/g, ' ')}
                              {obs.model_scores[cls] && ` (${Math.round(obs.model_scores[cls] * 100)}%)`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {obs.location_description && (
                      <div className="flex items-center space-x-1 text-[11px] text-slate-600 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{obs.location_description}</span>
                      </div>
                    )}

                    {obs.reviewer_notes && (
                      <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-600 border border-slate-100">
                        <span className="font-semibold text-slate-800">Reviewer Note: </span>
                        {obs.reviewer_notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  {obs.related_incident_id ? (
                    <Link
                      to={`/incidents/${obs.related_incident_id}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Linked Incident</span>
                    </Link>
                  ) : (
                    <span className="text-[11px] text-slate-400">Independent Screening</span>
                  )}

                  {isStaffOrAdmin && (
                    <button
                      onClick={() => {
                        setReviewingObs(obs);
                        setReviewStatus(obs.review_status);
                        setReviewerNotes(obs.reviewer_notes || '');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700"
                    >
                      Verify / Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification / Review Modal */}
      {reviewingObs && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Review Observation #{reviewingObs.id.slice(0, 8)}
            </h3>

            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Review Outcome</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="VERIFIED">VERIFIED - Model prediction confirmed</option>
                  <option value="CORRECTED">CORRECTED - Staff override / additional class</option>
                  <option value="REJECTED">REJECTED - False positive / non-damage</option>
                </select>
              </div>

              {reviewStatus === 'CORRECTED' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Corrected Distress Class</label>
                  <select
                    value={correctedClass}
                    onChange={(e) => setCorrectedClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- Select Valid Class --</option>
                    <option value="pothole">Pothole</option>
                    <option value="longitudinal_crack">Longitudinal Crack</option>
                    <option value="transverse_crack">Transverse Crack</option>
                    <option value="alligator_cracking">Alligator Cracking</option>
                    <option value="rutting">Rutting</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Notes</label>
                <textarea
                  rows={3}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Record verification details, asphalt condition, or reasons for correction..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingObs(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                >
                  {submittingReview ? 'Saving...' : 'Submit Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
