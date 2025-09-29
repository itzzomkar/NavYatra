import React, { useState, useEffect } from 'react';

const DiagnosticDashboard: React.FC = () => {
  const [renderCount, setRenderCount] = useState(0);
  const [lastRender, setLastRender] = useState<Date>(new Date());

  // Count renders
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    setLastRender(new Date());
    console.log('DiagnosticDashboard rendered at:', new Date().toLocaleTimeString());
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard Diagnostic</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Render Counter */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Render Information</h2>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                Render Count: {renderCount}
              </div>
              <div className="text-sm text-gray-600">
                Last Render: {lastRender.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Static Chart Replacement */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Static Content Test</h2>
            <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">92.5%</div>
                <div className="text-sm text-gray-600">Fleet Availability</div>
                <div className="mt-2 text-xs text-gray-500">
                  This should NOT move or refresh
                </div>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">System Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>User Agent:</strong><br />
                {navigator.userAgent.split(' ')[0]}
              </div>
              <div>
                <strong>Viewport:</strong><br />
                {window.innerWidth} x {window.innerHeight}
              </div>
              <div>
                <strong>Memory:</strong><br />
                {(performance as any).memory?.usedJSHeapSize 
                  ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` 
                  : 'N/A'}
              </div>
              <div>
                <strong>Connection:</strong><br />
                {(navigator as any).connection?.effectiveType || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 md:col-span-2">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Diagnostic Instructions
            </h3>
            <div className="text-yellow-700 text-sm space-y-2">
              <p>1. <strong>Check Render Count:</strong> If this number keeps increasing rapidly, the component is re-rendering continuously.</p>
              <p>2. <strong>Watch Static Content:</strong> The blue gradient box should remain completely still. If it moves, there's a deeper issue.</p>
              <p>3. <strong>Check Browser Console:</strong> Look for render logs and any error messages.</p>
              <p>4. <strong>Check Performance:</strong> High memory usage might indicate memory leaks.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticDashboard;