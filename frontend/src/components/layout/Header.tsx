import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onMenuClick: () => void;
  onNotificationsClick: () => void;
  unreadNotifications?: number;
}

const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onNotificationsClick,
  unreadNotifications = 0,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get page title from current route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/metro-cars':
        return 'Metro Cars';
      case '/schedules':
        return 'Operations';
      case '/optimization':
        return 'AI Optimization';
      case '/analytics':
        return 'Metro Analytics';
      case '/ai-insights':
        return 'AI Insights';
      case '/users':
        return 'User Management';
      case '/settings':
        return 'System Settings';
      default:
        return 'KMRL Metro System';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Search query:', searchQuery);
  };

  const handleLogout = () => {
    if (isLoggingOut) return; // Prevent double-clicks
    
    setIsLoggingOut(true);
    setShowUserMenu(false);
    
    // Perform logout immediately without confirmation to reduce complexity
    performLogout();
  };

  const performLogout = () => {
    try {
      console.log('🔄 Starting logout process...');
      
      // Step 1: Show loading toast
      const loadingToast = toast.loading('Signing out...', {
        duration: 3000,
      });
      
      // Step 2: Clear all storage immediately
      try {
        localStorage.removeItem('kmrl_token');
        localStorage.removeItem('kmrl_refresh_token');
        localStorage.removeItem('kmrl_user');
        sessionStorage.clear();
        console.log('✅ Storage cleared');
      } catch (storageError) {
        console.warn('Storage clear error (non-critical):', storageError);
      }
      
      // Step 3: Call auth logout (don't wait for it)
      logout().catch(error => {
        console.warn('Auth logout error (non-critical):', error);
      });
      
      // Step 4: Update toast to success
      toast.success('Successfully signed out!', {
        id: loadingToast,
        duration: 1500,
      });
      
      // Step 5: Navigate after brief delay
      setTimeout(() => {
        try {
          console.log('🔄 Navigating to login...');
          
          // Method 1: Try React Router navigation first
          if (navigate) {
            navigate('/login', { replace: true });
            console.log('✅ React Router navigation initiated');
            
            // Fallback: Force page reload after navigation
            setTimeout(() => {
              if (window.location.pathname !== '/login') {
                console.log('🔄 Fallback: Forcing page reload...');
                window.location.href = '/login';
              }
            }, 500);
          } else {
            // Method 2: Direct navigation
            console.log('🔄 Direct navigation to login...');
            window.location.href = '/login';
          }
          
        } catch (navError) {
          console.error('Navigation error, using fallback:', navError);
          // Method 3: Ultimate fallback
          window.location.replace('/login');
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Critical logout error:', error);
      
      // Ultimate fallback - force everything and redirect
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      
      toast.error('Logout error, redirecting...', { duration: 2000 });
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } finally {
      // Reset loading state
      setTimeout(() => {
        setIsLoggingOut(false);
      }, 2000);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 lg:pl-64">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side - Menu button and title */}
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Page title */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-4 lg:ml-0"
          >
            <h1 className="text-xl font-semibold text-gray-900">
              {getPageTitle()}
            </h1>
          </motion.div>
        </div>

        {/* Center - Search bar (hidden on mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search metro cars, operations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
              />
            </div>
          </form>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center space-x-4">
          {/* Mobile search button */}
          <button className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
            <MagnifyingGlassIcon className="h-6 w-6" />
          </button>

          {/* Notifications button */}
          <button
            onClick={onNotificationsClick}
            className="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <BellIcon className="h-6 w-6" />
            {unreadNotifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
              >
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </motion.span>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <div className="h-8 w-8 bg-kmrl-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-kmrl-700">
                  {user?.firstName?.charAt(0).toUpperCase() || user?.lastName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium">
                {user ? `${user.firstName} ${user.lastName}`.trim() : ''}
              </span>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {user ? `${user.firstName} ${user.lastName}`.trim() : ''}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                  <UserCircleIcon className="h-4 w-4 mr-2" />
                  Profile
                </button>
                
                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                  <Cog6ToothIcon className="h-4 w-4 mr-2" />
                  Settings
                </button>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar (slides down when search button is clicked) */}
      <div className="md:hidden border-t border-gray-200 px-4 py-2">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
        </form>
      </div>
    </header>
  );
};

export default Header;
