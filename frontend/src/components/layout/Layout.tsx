import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

// Components
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationCenter from './NotificationCenter';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Hooks
import { useAuth } from '@/hooks/useAuth';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Desktop Sidebar - Always visible on large screens */}
      <div className="hidden lg:block">
        <ErrorBoundary context="sidebar" fallback={
          <div className="w-64 h-full bg-gray-800 flex items-center justify-center">
            <p className="text-white text-sm">Sidebar unavailable</p>
          </div>
        }>
          <Sidebar 
            isOpen={true} 
            onClose={() => {}} 
          />
        </ErrorBoundary>
      </div>
      
      {/* Mobile Sidebar - Toggle with button */}
      {sidebarOpen && (
        <div className="lg:hidden">
          <ErrorBoundary context="mobile sidebar" fallback={
            <div className="w-64 h-full bg-gray-800 flex items-center justify-center">
              <p className="text-white text-sm">Sidebar unavailable</p>
            </div>
          }>
            <Sidebar 
              isOpen={sidebarOpen} 
              onClose={() => setSidebarOpen(false)} 
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <ErrorBoundary context="header" fallback={
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Header unavailable</p>
          </div>
        }>
          <Header
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            onNotificationsClick={() => setNotificationsOpen(!notificationsOpen)}
          />
        </ErrorBoundary>

        {/* Main content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8"
            >
              <ErrorBoundary context="page content">
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </div>
        </main>
      </div>

      {/* Notification Center */}
      <ErrorBoundary context="notifications" showReload={false}>
        <NotificationCenter
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      </ErrorBoundary>
    </div>
  );
};

export default Layout;
