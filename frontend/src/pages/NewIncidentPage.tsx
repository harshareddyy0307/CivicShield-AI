import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Upload, Sparkles, AlertCircle, CheckCircle, Navigation
} from 'lucide-react';
import { incidentApi } from '../api/services';
import { IncidentCategory, IncidentPriority } from '../types';

export const NewIncidentPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('pothole');
  const [priority, setPriority] = useState<IncidentPriority>('MEDIUM');
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [locationDesc, setLocationDesc] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Central Sector');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Categorization Assistant
  const [predictedCat, setPredictedCat] = useState<string>('');
  const [predictReason, setPredictReason] = useState<string>('');

  useEffect(() => {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('pothole') || text.includes('crater') || text.includes('hole in road')) {
      setPredictedCat('pothole');
      setPredictReason('Matched keyword rules for pothole road depression.');
    } else if (text.includes('drain') || text.includes('culvert') || text.includes('gutter') || text.includes('sewer')) {
      setPredictedCat('blocked_drain');
      setPredictReason('Matched keyword rules for drainage obstruction.');
    } else if (text.includes('waterlog') || text.includes('standing water') || text.includes('submerged') || text.includes('flooding')) {
      setPredictedCat('waterlogging');
      setPredictReason('Matched keyword rules for road water accumulation.');
    } else if (text.includes('crack') || text.includes('pavement') || text.includes('broken road')) {
      setPredictedCat('damaged_road');
      setPredictReason('Matched keyword rules for surface pavement damage.');
    } else if (text.includes('light') || text.includes('lamp')) {
      setPredictedCat('broken_streetlight');
      setPredictReason('Matched keyword rules for street lighting.');
    } else if (text.includes('garbage') || text.includes('trash') || text.includes('waste')) {
      setPredictedCat('garbage_accumulation');
      setPredictReason('Matched keyword rules for solid waste accumulation.');
    } else {
      setPredictedCat('');
      setPredictReason('');
    }
  }, [title, description]);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(5)));
          setLongitude(Number(pos.coords.longitude.toFixed(5)));
        },
        (err) => {
          alert(`Location permission denied or unavailable: ${err.message}`);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError('Please provide both incident title and a detailed description.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await incidentApi.create({
        title,
        description,
        category,
        priority,
        latitude,
        longitude,
        location_description: locationDesc,
        is_demo: false
      });

      if (photo) {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('caption', 'Initial citizen submission photo');
        await incidentApi.uploadEvidence(created.id, formData);
      }

      navigate(`/incidents/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 text-xs text-slate-500">
        <Link to="/incidents" className="hover:text-blue-600 flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Complaints</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-700">New Report</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Report Civic Infrastructure Problem</h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit a verified complaint to responsible municipal departments. Our intelligence engine analyzes physical proximity, hazards, and duplicates.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Incident Headline / Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Deep pothole on 4th Main Road near City Hospital"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="pothole">Pothole</option>
                <option value="damaged_road">Damaged Road / Cracking</option>
                <option value="blocked_drain">Blocked Drain / Culvert</option>
                <option value="waterlogging">Waterlogging / Street Flooding</option>
                <option value="water_leakage">Pipeline Water Leakage</option>
                <option value="garbage_accumulation">Garbage Accumulation</option>
                <option value="broken_streetlight">Broken Streetlight</option>
                <option value="road_obstruction">Road Obstruction / Debris</option>
                <option value="damaged_public_infrastructure">Damaged Public Infrastructure</option>
                <option value="other">Other Civic Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Urgency / Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as IncidentPriority)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="LOW">Low - Cosmetic or non-urgent</option>
                <option value="MEDIUM">Medium - Normal public inconvenience</option>
                <option value="HIGH">High - Traffic hazard / pedestrian risk</option>
                <option value="CRITICAL">Critical - Immediate safety danger</option>
              </select>
            </div>
          </div>

          {/* Live Categorization Suggestion */}
          {predictedCat && predictedCat !== category && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-semibold">AI Assistant: </span>
                  <span>Detected keywords for category <b>{predictedCat.replace(/_/g, ' ')}</b>.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCategory(predictedCat as IncidentCategory)}
                className="px-2.5 py-1 bg-blue-600 text-white rounded font-semibold text-[11px] hover:bg-blue-700"
              >
                Apply Category
              </button>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the issue in detail: size, severity, whether vehicles can pass, and any safety hazards..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Location & Coordinates */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Geographic Location</span>
              </span>
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Navigation className="w-3 h-3" />
                <span>Use Browser Geolocation</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Landmark / Location Description</label>
              <input
                type="text"
                placeholder="e.g. Opposite Metro Pillar 114, 4th Main Road"
                value={locationDesc}
                onChange={(e) => setLocationDesc(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Photograph Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Photograph (Optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-[10px] text-slate-400 mt-1">JPEG, PNG, or WEBP up to 10MB. File signatures are verified on backend.</p>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Ingesting Complaint into Platform...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
