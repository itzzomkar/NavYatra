import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Components
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AdminRoute from '@/components/layout/AdminRoute';
import SafeWebSocketProvider from '@/components/providers/SafeWebSocketProvider';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Pages
import ModernLoginPage from './pages/ModernLoginPage';
import RegisterPage from '@/pages/RegisterPage';
import EnhancedDashboard from './pages/EnhancedDashboard';
import NotFoundPage from './pages/NotFoundPage';
import MetroCarsPage from '@/pages/MetroCarsPage';
import SchedulesPage from '@/pages/SchedulesPage';
import OptimizationPage from '@/pages/OptimizationPage';
import FitnessPage from './pages/FitnessPage';
import JobCardsPage from './pages/JobCardsPage';
import OptimizationDashboard from './pages/OptimizationDashboard';
import WhatIfSimulatorEnhanced from './pages/WhatIfSimulatorEnhanced';
import DiagnosticPage from './pages/DiagnosticPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import UsersPage from '@/pages/UsersPage';
import SettingsPage from '@/pages/SettingsPage';
import AIInsightsPage from '@/pages/AIInsightsPage';

// Services
import { authService } from '@/services/auth';

// Styles
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  useEffect(() => {
    // Initialize authentication on app start
    authService.initializeAuth();
  }, []);

  return (
    <ErrorBoundary context="application">
      <QueryClientProvider client={queryClient}>
        <SafeWebSocketProvider enableRealTime={process.env.NODE_ENV !== 'test'}>
          <Router>
            <div className="min-h-screen bg-gray-50">
              {/* Global toast container */}
              <Toaster
          position="top-right"
          toastOptions={{
            duration: 2500,
            className: 'text-sm',
            style: {
              background: '#fff',
              color: '#374151',
              fontSize: '14px',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              duration: 2000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              duration: 3000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />

        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<ModernLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Enhanced Dashboard as default */}
            <Route index element={<EnhancedDashboard />} />
            
            {/* Dashboard */}
            <Route path="dashboard" element={<EnhancedDashboard />} />
            
            {/* Metro Cars */}
            <Route path="metro-cars" element={<MetroCarsPage />} />
            
            {/* Schedules */}
            <Route path="schedules" element={<SchedulesPage />} />
            
            {/* AI Optimization */}
            <Route path="optimization" element={<OptimizationPage />} />
            <Route path="optimization-dashboard" element={<OptimizationDashboard />} />
            
            {/* Fitness Certificates */}
            <Route path="fitness" element={<FitnessPage />} />
            
            {/* Job Cards */}
            <Route path="job-cards" element={<JobCardsPage />} />
            
            {/* What-If Simulator */}
            <Route path="whatif" element={<WhatIfSimulatorEnhanced />} />
            
            {/* Diagnostic */}
            <Route path="diagnostic" element={<DiagnosticPage />} />
            
            {/* Analytics */}
            <Route path="analytics" element={<AnalyticsPage />} />
            
            {/* AI Insights */}
            <Route path="ai-insights" element={<AIInsightsPage />} />
            
            {/* Users - Admin Only */}
            <Route path="users" element={
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            } />
            
            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>

            {/* 404 Page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </SafeWebSocketProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
