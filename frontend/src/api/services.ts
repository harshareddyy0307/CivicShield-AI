import { apiRequest } from './client';
import {
  User, Incident, RoadObservation, EmergencyCluster, Resource, ResourceAssignment,
  AnalyticsOverview, AIStatus
} from '../types';

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiRequest<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { email: string; password: string; full_name: string; role?: string; department_id?: string }) =>
    apiRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => apiRequest<User>('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
};

export const incidentApi = {
  list: (params?: { category?: string; status?: string; priority?: string; department_id?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.status) q.append('status', params.status);
    if (params?.priority) q.append('priority', params.priority);
    if (params?.department_id) q.append('department_id', params.department_id);
    if (params?.search) q.append('search', params.search);
    if (params?.limit) q.append('limit', params.limit.toString());
    return apiRequest<Incident[]>(`/incidents?${q.toString()}`);
  },
  get: (id: string) => apiRequest<Incident>(`/incidents/${id}`),
  create: (data: {
    title: string;
    description: string;
    category: string;
    latitude: number;
    longitude: number;
    location_description?: string;
    priority?: string;
    is_demo?: boolean;
  }) =>
    apiRequest<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { status?: string; priority?: string; notes?: string; assigned_department_id?: string }) =>
    apiRequest<Incident>(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadEvidence: (incidentId: string, formData: FormData) =>
    apiRequest(`/incidents/${incidentId}/evidence`, {
      method: 'POST',
      body: formData,
    }),
  getHistory: (id: string) => apiRequest<any[]>(`/incidents/${id}/history`),
};

export const roadwatchApi = {
  list: (params?: { review_status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.review_status) q.append('review_status', params.review_status);
    if (params?.limit) q.append('limit', params.limit.toString());
    return apiRequest<RoadObservation[]>(`/roadwatch/observations?${q.toString()}`);
  },
  get: (id: string) => apiRequest<RoadObservation>(`/roadwatch/observations/${id}`),
  analyze: (formData: FormData) =>
    apiRequest<RoadObservation>('/roadwatch/analyze', {
      method: 'POST',
      body: formData,
    }),
  review: (id: string, data: { review_status: string; reviewer_notes?: string; corrected_classes?: string[]; link_incident_id?: string }) =>
    apiRequest<RoadObservation>(`/roadwatch/observations/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getModelStatus: () => apiRequest<any>('/roadwatch/model-status'),
};

export const disasterApi = {
  listClusters: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return apiRequest<EmergencyCluster[]>(`/disaster/clusters${q}`);
  },
  getCluster: (id: string) => apiRequest<EmergencyCluster>(`/disaster/clusters/${id}`),
  reviewCluster: (id: string, data: { status: string; notes?: string; coordinator_id?: string }) =>
    apiRequest<EmergencyCluster>(`/disaster/clusters/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listAlerts: () => apiRequest<any[]>('/disaster/alerts'),
};

export const resourceApi = {
  list: (params?: { resource_type?: string; status_filter?: string }) => {
    const q = new URLSearchParams();
    if (params?.resource_type) q.append('resource_type', params.resource_type);
    if (params?.status_filter) q.append('status_filter', params.status_filter);
    return apiRequest<Resource[]>(`/resources?${q.toString()}`);
  },
  create: (data: any) =>
    apiRequest<Resource>('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listAssignments: (status?: string) => {
    const q = status ? `?assignment_status=${status}` : '';
    return apiRequest<ResourceAssignment[]>(`/resources/assignments${q}`);
  },
  createAssignment: (data: { resource_id: string; instructions: string; target_latitude: number; target_longitude: number; priority?: string; incident_id?: string; cluster_id?: string }) =>
    apiRequest<ResourceAssignment>('/resources/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAssignment: (id: string, data: { assignment_status: string; notes?: string }) =>
    apiRequest<ResourceAssignment>(`/resources/assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export const mapApi = {
  getIncidents: (params?: { category?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.status) q.append('status', params.status);
    return apiRequest<any[]>(`/map/incidents?${q.toString()}`);
  },
  getClusters: () => apiRequest<any[]>('/map/clusters'),
  getRoadObservations: () => apiRequest<any[]>('/map/road-observations'),
  getAlerts: () => apiRequest<any[]>('/map/external-alerts'),
};

export const analyticsApi = {
  getOverview: () => apiRequest<AnalyticsOverview>('/analytics/overview'),
};

export const aiApi = {
  getStatus: () => apiRequest<AIStatus>('/ai/status'),
  analyzeIncident: (incidentId: string) =>
    apiRequest<any>('/ai/analyze-incident', {
      method: 'POST',
      body: JSON.stringify({ incident_id: incidentId, use_llm_if_available: true }),
    }),
  correlateIncidents: (params?: { radius_meters?: number; time_window_hours?: number }) =>
    apiRequest<any>('/ai/correlate-incidents', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    }),
  getTools: () => apiRequest<any>('/ai/tools'),
};

export const systemApi = {
  getHealth: () => apiRequest<any>('/health'),
  getDepartments: () => apiRequest<any[]>('/system/departments'),
  getAuditLogs: () => apiRequest<any[]>('/system/audit-logs'),
  getNotifications: () => apiRequest<any[]>('/system/notifications'),
  markNotificationRead: (id: string) =>
    apiRequest(`/system/notifications/${id}/read`, { method: 'PATCH' }),
};

export const reportsApi = {
  getIncidentReport: (departmentId?: string) => {
    const q = departmentId ? `?department_id=${departmentId}` : '';
    return apiRequest<any>(`/reports/incidents${q}`);
  },
  getIncidentsCsvUrl: () => 'http://127.0.0.1:8000/api/v1/reports/export/incidents.csv',
  getRoadwatchCsvUrl: () => 'http://127.0.0.1:8000/api/v1/reports/export/roadwatch.csv',
};
