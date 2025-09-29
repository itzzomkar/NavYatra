import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  TruckIcon,
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  DocumentTextIcon,
  XMarkIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  ChartPieIcon,
  WrenchScrewdriverIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Metro Cars',
    href: '/metro-cars',
    icon: TruckIcon,
    permission: 'trainsets:read',
  },
  {
    name: 'Operations',
    href: '/schedules',
    icon: CalendarIcon,
    permission: 'schedules:read',
  },
  {
    name: 'Optimization',
    href: '/optimization',
    icon: ChartBarIcon,
    permission: 'optimization:read',
  },
  {
    name: 'Fitness',
    href: '/fitness',
    icon: ShieldCheckIcon,
    permission: 'fitness:read',
  },
  {
    name: 'Job Cards',
    href: '/job-cards',
    icon: WrenchScrewdriverIcon,
    permission: 'jobcards:read',
  },
  {
    name: 'What-If Simulator',
    href: '/whatif',
    icon: BeakerIcon,
    permission: 'whatif:read',
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartPieIcon,
    permission: 'analytics:read',
  },
  {
    name: 'AI Insights',
    href: '/ai-insights',
    icon: CpuChipIcon,
    permission: 'analytics:read',
  },
  {
    name: 'Users',
    href: '/users',
    icon: UserGroupIcon,
    permission: 'admin:users', // Admin-only permission
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    permission: 'settings:read',
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Filter navigation items based on permissions
  const visibleItems = navigationItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  // Handle logout with confirmation
  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to sign out?');
    if (!confirmed) return;

    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Successfully signed out', {
        duration: 2000,
      });
    } catch (error) {
      toast.error('Error signing out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const backdropVariants = {
    open: {
      opacity: 1,
      visibility: 'visible' as const,
    },
    closed: {
      opacity: 0,
      visibility: 'hidden' as const,
    },
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={backdropVariants}
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:translate-x-0 lg:static lg:inset-0"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  src="/kmrl-logo.svg" 
                  alt="KMRL Metro Logo" 
                  className="h-10 w-auto"
                />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">KMRL Metro</h1>
                <p className="text-xs text-gray-500">Train Induction System</p>
              </div>
            </div>

            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {visibleItems.map((item, index) => {
              const isActive = location.pathname === item.href;
              
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-kmrl-100 text-kmrl-700 border-r-2 border-kmrl-600'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </motion.div>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.firstName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-3 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;
