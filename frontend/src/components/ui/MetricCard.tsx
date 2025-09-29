import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'purple' | 'indigo' | 'yellow' | 'red';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  suffix?: string;
  loading?: boolean;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    bgLight: 'bg-blue-50',
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-green-600',
    bgLight: 'bg-green-50',
  },
  purple: {
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    bgLight: 'bg-purple-50',
  },
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-600',
    bgLight: 'bg-indigo-50',
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    bgLight: 'bg-yellow-50',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    bgLight: 'bg-red-50',
  },
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  suffix = '',
  loading = false,
}) => {
  const colors = colorClasses[color];

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="flex items-center">
            <div className={`p-3 rounded-md ${colors.bgLight}`}>
              <div className="h-6 w-6 bg-gray-300 rounded"></div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="mt-2 h-8 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-md ${colors.bgLight}`}>
          <Icon className={`h-6 w-6 ${colors.text}`} />
        </div>
      </div>
      
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="mt-2 flex items-baseline">
          <p className="text-2xl font-semibold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix && <span className="text-lg text-gray-500 ml-1">{suffix}</span>}
          </p>
          
          {trend && (
            <div
              className={`ml-2 flex items-center text-sm ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.direction === 'up' ? (
                <ArrowUpIcon className="h-4 w-4" />
              ) : (
                <ArrowDownIcon className="h-4 w-4" />
              )}
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MetricCard;
