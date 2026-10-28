import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { NewIncidentPage } from './pages/NewIncidentPage';
import { RoadWatchPage } from './pages/RoadWatchPage';
import { DisasterPage } from './pages/DisasterPage';
import { MapPage } from './pages/MapPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AISettingsPage } from './pages/AISettingsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={<AppLayout><DashboardPage /></AppLayout>} />
            <Route path="/incidents" element={<AppLayout><IncidentsPage /></AppLayout>} />
            <Route path="/incidents/new" element={<AppLayout><NewIncidentPage /></AppLayout>} />
            <Route path="/incidents/:id" element={<AppLayout><IncidentDetailPage /></AppLayout>} />
            <Route path="/roadwatch" element={<AppLayout><RoadWatchPage /></AppLayout>} />
            <Route path="/disaster" element={<AppLayout><DisasterPage /></AppLayout>} />
            <Route path="/disaster/:id" element={<AppLayout><DisasterPage /></AppLayout>} />
            <Route path="/map" element={<AppLayout><MapPage /></AppLayout>} />
            <Route path="/resources" element={<AppLayout><ResourcesPage /></AppLayout>} />
            <Route path="/analytics" element={<AppLayout><AnalyticsPage /></AppLayout>} />
            <Route path="/settings/ai" element={<AppLayout><AISettingsPage /></AppLayout>} />
            <Route path="/system/health" element={<AppLayout><SystemHealthPage /></AppLayout>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
