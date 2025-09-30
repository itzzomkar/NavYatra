import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  TruckIcon,
  CalendarIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  TruckIcon as TruckIconSolid,
  CalendarIcon as CalendarIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CogIcon as CogIconSolid
} from '@heroicons/react/24/solid';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Home',
    icon: HomeIcon,
    activeIcon: HomeIconSolid
  },
  {
    path: '/metro-cars',
    label: 'Trains',
    icon: TruckIcon,
    activeIcon: TruckIconSolid
  },
  {
    path: '/schedules',
    label: 'Schedule',
    icon: CalendarIcon,
    activeIcon: CalendarIconSolid
  },
  {
    path: '/optimization',
    label: 'AI',
    icon: ChartBarIcon,
    activeIcon: ChartBarIconSolid
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: CogIcon,
    activeIcon: CogIconSolid
  }
];

interface MobileBottomNavProps {
  className?: string;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 ${className}`}>
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around px-2 py-1 safe-area-padding-bottom">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const IconComponent = active ? item.activeIcon : item.icon;

            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center px-3 py-2 min-w-0 flex-1 relative ${
                  active 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                <IconComponent className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;