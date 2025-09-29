import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Notification, NotificationType } from '../../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');

  // Mock notifications data - in real app, this would come from API
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Mock data
      return [
        {
          id: '1',
          type: NotificationType.OPTIMIZATION_COMPLETE,
          title: 'Optimization Complete',
          message: 'Trainset TS-001 optimization completed with fitness score 8.7/10',
          isRead: false,
          createdAt: '2024-01-15T10:45:00Z',
          data: { trainsetId: 'TS-001', fitnessScore: 8.7 },
        },
        {
          id: '2',
          type: NotificationType.MAINTENANCE_DUE,
          title: 'Maintenance Due',
          message: 'Trainset TS-004 requires scheduled maintenance within 24 hours',
          isRead: false,
          createdAt: '2024-01-15T09:30:00Z',
          data: { trainsetId: 'TS-004' },
        },
        {
          id: '3',
          type: NotificationType.FITNESS_ALERT,
          title: 'Low Fitness Score Alert',
          message: 'Trainset TS-007 fitness score dropped to 4.2/10. Investigation recommended.',
          isRead: true,
          createdAt: '2024-01-14T16:20:00Z',
          data: { trainsetId: 'TS-007', fitnessScore: 4.2 },
        },
        {
          id: '4',
          type: NotificationType.SYSTEM_UPDATE,
          title: 'System Update',
          message: 'New optimization algorithms have been deployed to the AI service',
          isRead: true,
          createdAt: '2024-01-14T08:00:00Z',
          data: {},
        },
        {
          id: '5',
          type: NotificationType.SCHEDULE_CONFLICT,
          title: 'Schedule Conflict',
          message: 'Conflict detected in train schedule for Route A between 14:30-15:00',
          isRead: false,
          createdAt: '2024-01-13T14:25:00Z',
          data: { route: 'A', timeSlot: '14:30-15:00' },
        },
      ] as Notification[];
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // Mock API call
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // Mock API call
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Mock API call
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.OPTIMIZATION_COMPLETE:
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case NotificationType.MAINTENANCE_DUE:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case NotificationType.FITNESS_ALERT:
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case NotificationType.SCHEDULE_CONFLICT:
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case NotificationType.SYSTEM_UPDATE:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.OPTIMIZATION_COMPLETE:
        return 'border-green-200 bg-green-50';
      case NotificationType.MAINTENANCE_DUE:
        return 'border-yellow-200 bg-yellow-50';
      case NotificationType.FITNESS_ALERT:
        return 'border-red-200 bg-red-50';
      case NotificationType.SCHEDULE_CONFLICT:
        return 'border-orange-200 bg-orange-50';
      case NotificationType.SYSTEM_UPDATE:
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const filteredNotifications = notifications.filter(
    (notification) => filter === 'all' || notification.type === filter
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
            onClick={onClose}
          />

          {/* Notification Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 w-96 bg-white shadow-lg border-l border-gray-200 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as NotificationType | 'all')}
                className="text-sm border border-gray-300 rounded-md px-3 py-1"
              >
                <option value="all">All Types</option>
                <option value={NotificationType.OPTIMIZATION_COMPLETE}>Optimization</option>
                <option value={NotificationType.MAINTENANCE_DUE}>Maintenance</option>
                <option value={NotificationType.FITNESS_ALERT}>Fitness Alerts</option>
                <option value={NotificationType.SCHEDULE_CONFLICT}>Schedule</option>
                <option value={NotificationType.SYSTEM_UPDATE}>System Updates</option>
              </select>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  className="text-sm text-kmrl-600 hover:text-kmrl-700 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center p-8">
                  <BellIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-500">
                    {filter === 'all' 
                      ? "You're all caught up!" 
                      : `No ${filter.replace('_', ' ')} notifications found`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative p-4 rounded-lg border-l-4 ${getNotificationColor(
                        notification.type
                      )} ${!notification.isRead ? 'shadow-sm' : 'opacity-75'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {getNotificationIcon(notification.type)}
                            <h4 className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1 rounded text-gray-400 hover:text-gray-600"
                              title="Mark as read"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
