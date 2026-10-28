import React, { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, Clock, MapPin, AlertCircle,
  Plus, ArrowRight, Shield, Activity, User, Phone
} from 'lucide-react';
import { resourceApi, incidentApi, disasterApi } from '../api/services';
import { Resource, ResourceAssignment, Incident, EmergencyCluster } from '../types';
import { useAuth } from '../context/AuthContext';

export const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [clusters, setClusters] = useState<EmergencyCluster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tabs: 'fleet' or 'assignments'
  const [activeTab, setActiveTab] = useState<'fleet' | 'assignments'>('fleet');

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedClusterId, setSelectedClusterId] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [priority, setPriority] = useState<string>('HIGH');
  const [submittingAssign, setSubmittingAssign] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resList, asgList, incList, clsList] = await Promise.all([
        resourceApi.list(),
        resourceApi.listAssignments(),
        incidentApi.list({ limit: 30 }),
        disasterApi.listClusters()
      ]);
      setResources(resList);
      setAssignments(asgList);
      setIncidents(incList);
      setClusters(clsList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId || !instructions) return;

    let targetLat = 12.9716;
    let targetLon = 77.5946;

    if (selectedIncidentId) {
      const inc = incidents.find(i => i.id === selectedIncidentId);
      if (inc) {
        targetLat = inc.latitude;
        targetLon = inc.longitude;
      }
    } else if (selectedClusterId) {
      const cls = clusters.find(c => c.id === selectedClusterId);
      if (cls) {
        targetLat = cls.center_latitude;
        targetLon = cls.center_longitude;
      }
    }

    setSubmittingAssign(true);
    try {
      await resourceApi.createAssignment({
        resource_id: selectedResourceId,
        instructions,
        target_latitude: targetLat,
        target_longitude: targetLon,
        priority,
        incident_id: selectedIncidentId || undefined,
        cluster_id: selectedClusterId || undefined
      });
      setShowAssignModal(false);
      setInstructions('');
      setSelectedResourceId('');
      setSelectedIncidentId('');
      setSelectedClusterId('');
      await loadData();
      setActiveTab('assignments');
    } catch (err: any) {
      alert(`Assignment proposal failed: ${err.message}`);
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await resourceApi.updateAssignment(id, { assignment_status: newStatus });
      await loadData();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const isCoordinatorOrAdmin = user?.role === 'EMERGENCY_COORDINATOR' || user?.role === 'ADMINISTRATOR';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Resource Coordination & Field Dispatch</h1>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
              Fleet Management
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track inspection teams, heavy road maintenance units, de-watering pumps, and authorized dispatch assignments.
          </p>
        </div>

        {isCoordinatorOrAdmin && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Propose Resource Assignment</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'fleet'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Resource Inventory ({resources.length})
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'assignments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dispatch Assignments ({assignments.length})
        </button>
      </div>

      {/* TAB 1: FLEET INVENTORY */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => (
            <div key={res.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {res.resource_type.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    res.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                    res.status === 'DEPLOYED' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {res.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2">{res.name}</h3>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Dept: {res.department_name || res.department_id || 'Public Works'} • Capacity: {res.capacity}
                </div>

                {/* Capabilities */}
                <div className="mt-3 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capabilities:</div>
                  <div className="flex flex-wrap gap-1">
                    {res.capabilities.map((cap) => (
                      <span key={cap} className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {cap.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                {res.contact_person && (
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{res.contact_person} ({res.phone_number})</span>
                  </div>
                )}
                {res.current_latitude && res.current_longitude && (
                  <div className="flex items-center space-x-1.5 font-mono text-[10px] text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location: {res.current_latitude.toFixed(4)}, {res.current_longitude.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Resource & Type</th>
                  <th className="py-2.5 px-4">Target / Instructions</th>
                  <th className="py-2.5 px-4">Estimated Road Detour</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Proposed By</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{asg.resource_name || 'Resource'}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-normal">{asg.resource_type?.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-slate-800 font-medium truncate">{asg.instructions}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Target: {asg.target_latitude.toFixed(4)}, {asg.target_longitude.toFixed(4)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-700">{asg.estimated_distance_km ? `${asg.estimated_distance_km} km` : 'Local Area'}</div>
                      <div className="text-[9px] text-slate-400">1.28x urban detour model</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        asg.assignment_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        asg.assignment_status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                        asg.assignment_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {asg.assignment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {asg.proposed_by || 'SharedIntelligenceEngine'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {isCoordinatorOrAdmin && asg.assignment_status === 'PROPOSED' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(asg.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(asg.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {asg.assignment_status === 'APPROVED' && (
                        <button
                          onClick={() => handleUpdateStatus(asg.id, 'COMPLETED')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                        >
                          Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Propose Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Propose Field Resource Deployment
            </h3>
            <p className="text-xs text-slate-500">
              Proposals are logged with estimated road detour distances and require authorized coordinator approval.
            </p>

            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Resource Team *</label>
                <select
                  required
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- Choose Available Resource --</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.resource_type.replace(/_/g, ' ')}) - {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Target Incident (Optional)</label>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => {
                    setSelectedIncidentId(e.target.value);
                    if (e.target.value) setSelectedClusterId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- None --</option>
                  {incidents.map((i) => (
                    <option key={i.id} value={i.id}>
                      #{i.id.slice(0, 8)} - {i.title} ({i.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Emergency Cluster (Optional)</label>
                <select
                  value={selectedClusterId}
                  onChange={(e) => {
                    setSelectedClusterId(e.target.value);
                    if (e.target.value) setSelectedIncidentId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- None --</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id.slice(0, 8)} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatch Instructions *</label>
                <textarea
                  required
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Specific tasks: e.g. Clear silt blockage in culvert, position de-watering pump unit..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign || !selectedResourceId || !instructions}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {submittingAssign ? 'Proposing...' : 'Submit Proposed Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
