import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { mapApi } from '../api/services';
import { Filter, Layers, Info, MapPin, ExternalLink, ShieldAlert } from 'lucide-react';

export const MapPage: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const [incidents, setIncidents] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Toggles
  const [showIncidents, setShowIncidents] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showObservations, setShowObservations] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      const [inc, cls, obs, alt] = await Promise.all([
        mapApi.getIncidents(),
        mapApi.getClusters(),
        mapApi.getRoadObservations(),
        mapApi.getAlerts()
      ]);
      setIncidents(inc);
      setClusters(cls);
      setObservations(obs);
      setAlerts(alt);
    } catch (e) {
      console.error('Failed to load map data', e);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if Leaflet L is on window
    const L = (window as any).L;
    if (!L) {
      // Dynamically load leaflet script if not yet loaded
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.onload = () => initLeafletMap();
      document.head.appendChild(script);
    } else {
      initLeafletMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initLeafletMap = () => {
    const L = (window as any).L;
    if (!L || mapInstanceRef.current || !mapContainerRef.current) return;

    // Center on default neighborhood (12.9716, 77.5946)
    const map = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 14);
    mapInstanceRef.current = map;

    // OpenStreetMap Tile Layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    renderMarkers();
  };

  useEffect(() => {
    renderMarkers();
  }, [incidents, clusters, observations, alerts, showIncidents, showClusters, showObservations, selectedCategory]);

  const renderMarkers = () => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !layerGroupRef.current) return;

    layerGroupRef.current.clearLayers();

    // 1. Render Potential Emergency Clusters (Circular overlays)
    if (showClusters) {
      clusters.forEach((c) => {
        const circle = L.circle([c.center_latitude, c.center_longitude], {
          color: c.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b',
          fillColor: c.severity === 'CRITICAL' ? '#ef4444' : '#fbbf24',
          fillOpacity: 0.22,
          radius: c.radius_meters || 500,
          weight: 2,
          dashArray: '4, 4'
        });

        circle.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; max-width: 260px;">
            <div style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase;">
              ${c.severity} Emergency Cluster (${c.status})
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 3px;">
              ${c.title}
            </div>
            <p style="color: #475569; font-size: 11px; margin-top: 5px; line-height: 1.4;">
              ${c.evidence_summary}
            </p>
            <div style="margin-top: 8px; font-size: 11px;">
              <a href="/disaster/${c.id}" style="color: #2563eb; font-weight: 700; text-decoration: none;">
                Inspect Cluster &rarr;
              </a>
            </div>
          </div>
        `);
        layerGroupRef.current.addLayer(circle);
      });
    }

    // 2. Render Incident Markers
    if (showIncidents) {
      const filtered = selectedCategory
        ? incidents.filter(i => i.category === selectedCategory)
        : incidents;

      filtered.forEach((inc) => {
        // Marker color by category
        let color = '#2563eb'; // blue default
        if (inc.category === 'pothole' || inc.category === 'damaged_road') color = '#d97706'; // amber
        if (inc.category === 'blocked_drain' || inc.category === 'waterlogging') color = '#0284c7'; // cyan/water
        if (inc.priority === 'CRITICAL') color = '#dc2626'; // red
        if (inc.status === 'CLOSED') color = '#64748b'; // gray

        const marker = L.circleMarker([inc.latitude, inc.longitude], {
          radius: 8,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; max-width: 260px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b;">
                ${inc.category.replace(/_/g, ' ')}
              </span>
              <span style="font-size: 10px; font-weight: 700; color: ${color};">
                ${inc.status}
              </span>
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 4px;">
              ${inc.title}
            </div>
            <div style="color: #64748b; font-size: 11px; margin-top: 4px;">
              ${inc.location_description || `${inc.latitude.toFixed(3)}, ${inc.longitude.toFixed(3)}`}
            </div>
            <div style="margin-top: 8px;">
              <a href="/incidents/${inc.id}" style="color: #2563eb; font-weight: 700; text-decoration: none;">
                View Incident Details &rarr;
              </a>
            </div>
          </div>
        `);
        layerGroupRef.current.addLayer(marker);
      });
    }

    // 3. Render RoadWatch Observations
    if (showObservations) {
      observations.forEach((obs) => {
        if (!obs.latitude || !obs.longitude) return;

        const obsMarker = L.circleMarker([obs.latitude, obs.longitude], {
          radius: 6,
          fillColor: '#9333ea', // purple for CV detections
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.85
        });

        obsMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; max-width: 240px;">
            <div style="font-size: 10px; font-weight: 800; color: #7e22ce; text-transform: uppercase;">
              RoadWatch Visual Observation
            </div>
            <div style="font-weight: 700; font-size: 12px; color: #0f172a; margin-top: 3px;">
              Detections: ${obs.detection_classes.join(', ') || 'Manual observation'}
            </div>
            <div style="color: #64748b; font-size: 11px; margin-top: 3px;">
              Review Status: <b>${obs.review_status}</b>
            </div>
          </div>
        `);
        layerGroupRef.current.addLayer(obsMarker);
      });
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden">
      {/* Top Map Control Bar */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Interactive Infrastructure GIS</span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-slate-200 text-xs">
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showIncidents}
                onChange={(e) => setShowIncidents(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Complaints ({incidents.length})</span>
            </label>

            <label className="flex items-center space-x-1 cursor-pointer ml-3">
              <input
                type="checkbox"
                checked={showClusters}
                onChange={(e) => setShowClusters(e.target.checked)}
                className="rounded text-amber-600"
              />
              <span>Emergency Clusters ({clusters.length})</span>
            </label>

            <label className="flex items-center space-x-1 cursor-pointer ml-3">
              <input
                type="checkbox"
                checked={showObservations}
                onChange={(e) => setShowObservations(e.target.checked)}
                className="rounded text-purple-600"
              />
              <span>Road Observations ({observations.length})</span>
            </label>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="pothole">Potholes</option>
            <option value="damaged_road">Damaged Roads</option>
            <option value="blocked_drain">Blocked Drains</option>
            <option value="waterlogging">Waterlogging</option>
            <option value="broken_streetlight">Streetlights</option>
          </select>

          <button
            onClick={() => setShowLegend(!showLegend)}
            className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
          >
            {showLegend ? 'Hide Legend' : 'Show Legend'}
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="flex-1 w-full relative">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Legend Box */}
        {showLegend && (
          <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-lg text-xs space-y-2 z-20 max-w-xs">
            <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
              <span>GIS Layer Legend</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-700">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
                <span>Critical Incident / Active Emergency</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                <span>Pothole / Road Distress</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-sky-600 shrink-0"></span>
                <span>Blocked Drain / Waterlogging</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0"></span>
                <span>RoadWatch AI Vision Observation</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded border border-dashed border-amber-500 bg-amber-100 shrink-0"></span>
                <span>Potential Emergency Cascade Radius</span>
              </div>
            </div>

            <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-100">
              OpenStreetMap standard tiles. Click any marker for report details.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
