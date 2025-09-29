import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const DiagnosticPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  
  const routes = [
    { name: 'Dashboard', path: '/dashboard', permission: null },
    { name: 'Trainsets', path: '/trainsets', permission: 'trainsets:read' },
    { name: 'Schedules', path: '/schedules', permission: 'schedules:read' },
    { name: 'Optimization', path: '/optimization', permission: 'optimization:read' },
    { name: 'Fitness', path: '/fitness', permission: 'fitness:read' },
    { name: 'Job Cards', path: '/job-cards', permission: 'jobcards:read' },
    { name: 'What-If Simulator', path: '/whatif', permission: 'whatif:read' },
    { name: 'Analytics', path: '/analytics', permission: 'analytics:read' },
    { name: 'Settings', path: '/settings', permission: 'settings:read' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Navigation Diagnostic</h1>
      
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Current User</h2>
        <p>Name: {user ? `${user.firstName} ${user.lastName}` : 'Not logged in'}</p>
        <p>Email: {user?.email || 'N/A'}</p>
        <p>Role: {user?.role || 'N/A'}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Routes</h2>
        <div className="grid grid-cols-3 gap-4">
          {routes.map((route) => {
            const hasAccess = !route.permission || hasPermission(route.permission);
            return (
              <div
                key={route.path}
                className={`p-4 rounded-lg border-2 ${
                  hasAccess 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <h3 className="font-semibold">{route.name}</h3>
                <p className="text-sm text-gray-600">{route.path}</p>
                <p className="text-xs mt-2">
                  Permission: {route.permission || 'None'}
                </p>
                <p className="text-xs">
                  Access: {hasAccess ? '✅ Granted' : '❌ Denied'}
                </p>
                {hasAccess && (
                  <Link
                    to={route.path}
                    className="mt-2 inline-block px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Go to {route.name}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-8 p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {routes.map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              {route.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Debug Info</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({ user, routes }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DiagnosticPage;
