import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ChartBarIcon,
  CogIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const ModernLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const features = [
    {
      icon: ChartBarIcon,
      title: 'Real-time Analytics',
      description: 'Monitor fleet performance with live dashboards'
    },
    {
      icon: SparklesIcon,
      title: 'AI Optimization',
      description: 'Intelligent scheduling powered by machine learning'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Reliable',
      description: '99.9% uptime with enterprise-grade security'
    },
    {
      icon: BoltIcon,
      title: 'Lightning Fast',
      description: 'Optimize 25 trains in under 2 seconds'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      await login({ 
        email: formData.email, 
        password: formData.password 
      });
      
      // Navigation is handled by the useEffect above
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4"
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-2">Sign in to KMRL Train Induction System</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="operator@kmrl.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.remember}
                  onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Forgot password?
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* SSO Options */}
            <div className="flex justify-center">
              <button
                type="button"
                className="flex items-center justify-center px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full max-w-xs"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-2" alt="Google" />
                Continue with Google
              </button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-800">
                Request Access
              </Link>
            </p>
          </form>

          {/* Demo Credentials */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200"
          >
            <div className="flex items-center mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <p className="text-sm text-blue-800 font-medium">Demo Mode Active</p>
            </div>
            <p className="text-xs text-blue-600 mb-1">Backend offline - using demo authentication with full UI functionality</p>
            <p className="text-xs text-green-600 mb-3">✨ New users can also register and login with any email!</p>
            <p className="text-sm text-blue-800 font-medium mb-3">Click any demo account to auto-fill:</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'admin@kmrl.com', password: 'admin123' })}
                  className="p-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-800 transition-colors text-left"
                >
                  <p className="font-medium">👑 Omkar Kadam</p>
                  <p className="text-blue-600 text-xs">System Administrator</p>
                  <p className="text-blue-500 text-xs">admin@kmrl.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'operator@kmrl.com', password: 'demo123' })}
                  className="p-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-800 transition-colors text-left"
                >
                  <p className="font-medium">🚇 Sukanya Jhadav</p>
                  <p className="text-blue-600 text-xs">Train Operator</p>
                  <p className="text-blue-500 text-xs">operator@kmrl.com</p>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'supervisor@kmrl.com', password: 'super123' })}
                  className="p-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-800 transition-colors text-left"
                >
                  <p className="font-medium">👨‍💼 Girishma Shinde</p>
                  <p className="text-blue-600 text-xs">Operations Supervisor</p>
                  <p className="text-blue-500 text-xs">supervisor@kmrl.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, email: 'maintenance@kmrl.com', password: 'maint123' })}
                  className="p-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-800 transition-colors text-left"
                >
                  <p className="font-medium">🔧 Sushila Nair</p>
                  <p className="text-blue-600 text-xs">Maintenance Engineer</p>
                  <p className="text-blue-500 text-xs">maintenance@kmrl.com</p>
                </button>
              </div>
            </div>
            
            {/* Debug Button for Development */}
            <div className="mt-4 pt-2 border-t border-blue-200">
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full px-3 py-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
              >
                🔧 Clear Storage & Reload (Debug)
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel - Features Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-12 text-white">
        <div className="w-full max-w-lg mx-auto flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Transform Your Train Operations
            </h2>
            <p className="text-lg mb-8 text-blue-100">
              Experience the future of metro rail management with our AI-powered scheduling and optimization platform.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-4 hover:bg-opacity-20 transition-all"
                >
                  <feature.icon className="h-8 w-8 mb-3" />
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-blue-100">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-3 gap-4"
            >
              <div className="text-center">
                <div className="text-3xl font-bold">25</div>
                <div className="text-sm text-blue-200">Active Trains</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">99.5%</div>
                <div className="text-sm text-blue-200">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">2s</div>
                <div className="text-sm text-blue-200">Optimization</div>
              </div>
            </motion.div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-12 p-6 bg-white bg-opacity-10 backdrop-blur-lg rounded-xl"
            >
              <p className="text-sm italic mb-3">
                "This system has revolutionized our operations. What used to take 2 hours of manual planning now happens in seconds with better results."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full mr-3"></div>
                <div>
                  <p className="font-semibold text-sm">Omkar Kadam</p>
                  <p className="text-xs text-blue-200">System Administrator, KMRL</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ModernLoginPage;