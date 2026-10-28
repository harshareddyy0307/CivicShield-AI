import React from 'react';
import { IncidentPriority, IncidentStatus, ClusterStatus } from '../types';

export const PriorityBadge: React.FC<{ priority: IncidentPriority | string }> = ({ priority }) => {
  const styles: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-700 border-slate-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
    CRITICAL: 'bg-red-50 text-red-700 border-red-200 font-bold animate-pulse',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${styles[priority] || styles.MEDIUM}`}>
      {priority}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: IncidentStatus | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    SUBMITTED: 'bg-slate-100 text-slate-700 border-slate-200',
    UNDER_REVIEW: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    INSPECTION_REQUIRED: 'bg-amber-50 text-amber-700 border-amber-200',
    ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-sky-50 text-sky-700 border-sky-200',
    RESOLVED_PENDING_VERIFICATION: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-gray-100 text-gray-600 border-gray-200',
    REOPENED: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  const label = status.replace(/_/g, ' ').toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border capitalize ${styles[status] || styles.SUBMITTED}`}>
      {label}
    </span>
  );
};

export const ClusterStatusBadge: React.FC<{ status: ClusterStatus | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    DETECTED: 'bg-amber-100 text-amber-800 border-amber-300',
    AWAITING_VERIFICATION: 'bg-orange-100 text-orange-800 border-orange-300',
    VERIFIED: 'bg-red-100 text-red-800 border-red-300 font-bold',
    RESPONSE_PLANNING: 'bg-blue-100 text-blue-800 border-blue-300',
    RESPONSE_IN_PROGRESS: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    DISMISSED: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wider ${styles[status] || styles.DETECTED}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {category.replace(/_/g, ' ')}
    </span>
  );
};
