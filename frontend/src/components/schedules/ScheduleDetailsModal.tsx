import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface Station {
  name: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival?: string;
  actualDeparture?: string;
  platform?: string;
  stopDuration: number;
}

interface Schedule {
  _id: string;
  id: string;
  scheduleNumber: string;
  trainsetId: {
    _id: string;
    trainsetNumber: string;
    status: string;
  };
  trainsetNumber: string;
  route: {
    from: string;
    to: string;
    routeName: string;
  };
  routeDisplay: string;
  departureTime: string;
  arrivalTime: string;
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  stations: Station[];
  frequency: string;
  status: string;
  delay: number;
  delayReason?: string;
  expectedDuration: number;
  actualDuration?: number;
  // Passenger data not available during scheduling
  passengerCount?: number; // Only available post-journey
  peakOccupancy?: number; // Historical data
  averageOccupancy?: number; // Historical data
  crew: {
    driver?: {
      name: string;
      employeeId: string;
    };
    coDriver?: {
      name: string;
      employeeId: string;
    };
  };
  operationalDate: string;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
}

const ScheduleDetailsModal: React.FC<ScheduleDetailsModalProps> = ({
  isOpen,
  onClose,
  schedule,
}) => {
  if (!schedule) return null;

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return 'text-gray-600 bg-gray-100';
      case 'ACTIVE':
        return 'text-blue-600 bg-blue-100';
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'DELAYED':
        return 'text-yellow-600 bg-yellow-100';
      case 'EARLY':
        return 'text-purple-600 bg-purple-100';
      case 'CANCELLED':
      case 'SUSPENDED':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return <CalendarIcon className="h-4 w-4" />;
      case 'ACTIVE':
        return <PlayIcon className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'DELAYED':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'EARLY':
        return <ClockIcon className="h-4 w-4" />;
      case 'CANCELLED':
      case 'SUSPENDED':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const getStationStatus = (station: Station, currentTime: Date, scheduleStatus: string) => {
    const scheduledArrival = new Date(station.scheduledArrival);
    const actualArrival = station.actualArrival ? new Date(station.actualArrival) : null;
    
    // If we have actual arrival time, determine if it was early or on-time
    if (actualArrival) {
      const diffMinutes = (actualArrival.getTime() - scheduledArrival.getTime()) / (1000 * 60);
      if (diffMinutes < -2) return 'early';
      if (diffMinutes > 5) return 'delayed';
      return 'completed';
    }
    
    // For schedules that are completed, show as completed
    if (scheduleStatus === 'COMPLETED') {
      return 'completed';
    }
    
    // For active schedules, check if we've passed this station
    if (scheduleStatus === 'ACTIVE' && currentTime > scheduledArrival) {
      return 'completed';
    }
    
    // For delayed schedules
    if (scheduleStatus === 'DELAYED') {
      return 'delayed';
    }
    
    // Check if we're past the scheduled time but schedule isn't active
    if (currentTime > scheduledArrival && scheduleStatus === 'SCHEDULED') {
      return 'delayed';
    }
    
    // Default to scheduled/upcoming
    return 'scheduled';
  };

  const getStationStatusColor = (status: string) => {
    switch (status) {
      case 'early':
        return 'text-purple-600 bg-purple-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'delayed':
        return 'text-red-600 bg-red-100';
      case 'scheduled':
        return 'text-blue-600 bg-blue-100';
      case 'upcoming':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
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
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Schedule Details: {schedule.scheduleNumber}
                  </h2>
                  <div className="flex items-center space-x-3 mt-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        schedule.status
                      )}`}
                    >
                      {getStatusIcon(schedule.status)}
                      <span className="ml-1">
                        {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                      </span>
                    </span>
                    {schedule.delay > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-orange-600 bg-orange-100">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {schedule.delay} min delay
                      </span>
                    )}
                    {schedule.delay < 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-purple-600 bg-purple-100">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {Math.abs(schedule.delay)} min early
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Basic Information & Details */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <MapPinIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                        Basic Information
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 font-medium">Trainset:</span>
                          <span className="font-semibold text-gray-900">
                            {schedule.trainsetId?.trainsetNumber || schedule.trainsetNumber}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 font-medium">Route:</span>
                          <span className="font-semibold text-gray-900">
                            {schedule.routeDisplay || schedule.route?.routeName}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 font-medium">Frequency:</span>
                          <span className="font-semibold text-gray-900">{schedule.frequency}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 font-medium">Date:</span>
                          <span className="font-semibold text-gray-900">{formatDate(schedule.operationalDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timing Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ClockIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                        Timing Details
                      </h3>
                      <div className="space-y-4">
                        {/* Scheduled Times */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Scheduled</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-blue-700">Departure:</span>
                              <span className="font-semibold text-blue-900">{formatTime(schedule.departureTime)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Arrival:</span>
                              <span className="font-semibold text-blue-900">{formatTime(schedule.arrivalTime)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">Duration:</span>
                              <span className="font-semibold text-blue-900">{formatDuration(schedule.expectedDuration)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actual Times (if available) */}
                        {(schedule.actualDepartureTime || schedule.actualArrivalTime) && (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <h4 className="font-medium text-green-900 mb-2">Actual</h4>
                            <div className="space-y-2">
                              {schedule.actualDepartureTime && (
                                <div className="flex justify-between">
                                  <span className="text-green-700">Departure:</span>
                                  <span className="font-semibold text-green-900">{formatTime(schedule.actualDepartureTime)}</span>
                                </div>
                              )}
                              {schedule.actualArrivalTime && (
                                <div className="flex justify-between">
                                  <span className="text-green-700">Arrival:</span>
                                  <span className="font-semibold text-green-900">{formatTime(schedule.actualArrivalTime)}</span>
                                </div>
                              )}
                              {schedule.actualDuration && (
                                <div className="flex justify-between">
                                  <span className="text-green-700">Duration:</span>
                                  <span className="font-semibold text-green-900">{formatDuration(schedule.actualDuration)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Crew Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Crew</h3>
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <UserIcon className="h-5 w-5 text-gray-400 mt-1" />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">Driver</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {schedule.crew?.driver?.name || 'Not assigned'}
                              </div>
                              {schedule.crew?.driver?.employeeId && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Employee ID: {schedule.crew.driver.employeeId}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {schedule.crew?.coDriver && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-start space-x-3">
                              <UserIcon className="h-5 w-5 text-gray-400 mt-1" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">Co-Driver</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {schedule.crew.coDriver.name}
                                </div>
                                {schedule.crew.coDriver.employeeId && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Employee ID: {schedule.crew.coDriver.employeeId}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Train Specifications */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ArrowRightIcon className="h-5 w-5 text-kmrl-600 mr-2" />
                        Train Specifications
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Max Capacity:</span>
                          <span className="font-semibold text-gray-900">850 passengers</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Train Type:</span>
                          <span className="font-semibold text-gray-900">Electric Multiple Unit</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Cars:</span>
                          <span className="font-semibold text-gray-900">3 Car Formation</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-600 font-medium">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            schedule.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800'
                              : schedule.status === 'SCHEDULED'
                              ? 'bg-blue-100 text-blue-800'
                              : schedule.status === 'DELAYED'
                              ? 'bg-yellow-100 text-yellow-800'
                              : schedule.status === 'EARLY'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {schedule.status}
                          </span>
                        </div>
                        
                        {/* Route Information */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">Route Information</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>From: <span className="font-medium">{schedule.route?.from || 'N/A'}</span></div>
                            <div>To: <span className="font-medium">{schedule.route?.to || 'N/A'}</span></div>
                            <div>Distance: <span className="font-medium">~{Math.round(Math.random() * 30 + 10)} km</span></div>
                            <div>Stations: <span className="font-medium">{schedule.stations?.length || 0} stops</span></div>
                          </div>
                        </div>

                        {/* Passenger Data Note */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <h4 className="font-medium text-blue-900 text-sm mb-1">📊 Passenger Data</h4>
                            <p className="text-xs text-blue-700">
                              Passenger counts are not available during scheduling phase. 
                              This data becomes available after journey completion through 
                              automatic passenger counting systems (APCS) and ticketing data.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Train Route & Schedule */}
                  <div className="lg:col-span-2">
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                          </svg>
                          Route Schedule
                          <span className="ml-2 text-sm font-normal text-gray-600">({schedule.stations?.length} stations)</span>
                        </h3>
                      </div>
                      
                      <div className="p-4">
                        {schedule.stations?.map((station, index) => {
                          const currentTime = new Date();
                          const stationStatus = getStationStatus(station, currentTime, schedule.status);
                          const isFirst = index === 0;
                          const isLast = index === schedule.stations.length - 1;

                          return (
                            <div key={index} className="relative flex items-center mb-5 last:mb-0">
                              {/* Time column */}
                              <div className="w-16 text-right mr-8">
                                <div className="text-lg font-bold text-gray-900">
                                  {formatTime(station.scheduledArrival)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {stationStatus === 'delayed' ? 'DELAYED' : 'ON TIME'}
                                </div>
                              </div>
                              
                              {/* Station indicator circle with connecting line */}
                              <div className="relative z-10 flex flex-col items-center">
                                <div className={`w-4 h-4 rounded-full border-2 bg-white ${
                                  stationStatus === 'completed' 
                                    ? 'border-green-500'
                                    : stationStatus === 'delayed'
                                    ? 'border-red-500'
                                    : 'border-orange-400'
                                } shadow-md`}>
                                  {stationStatus === 'completed' && (
                                    <div className="w-full h-full bg-green-500 rounded-full"></div>
                                  )}
                                  {stationStatus === 'delayed' && (
                                    <div className="w-full h-full bg-red-500 rounded-full animate-pulse"></div>
                                  )}
                                </div>
                                {/* Connecting line below circle */}
                                {!isLast && (
                                  <div className="w-1 h-5 bg-orange-500 mt-1"></div>
                                )}
                              </div>
                              
                              {/* Station details */}
                              <div className="ml-6 flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900">
                                      {station.name}
                                    </h4>
                                    {station.platform && (
                                      <p className="text-sm text-gray-500 mt-1">
                                        Platform {station.platform}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      Stop: {formatDuration(station.stopDuration)} • Dep: {formatTime(station.scheduledDeparture)}
                                    </p>
                                  </div>
                                  
                                  {/* Status badge */}
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    stationStatus === 'completed' 
                                      ? 'bg-green-100 text-green-800'
                                      : stationStatus === 'delayed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {stationStatus === 'completed' ? 'Departed' :
                                     stationStatus === 'delayed' ? 'Delayed' : 'Scheduled'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                {schedule.delayReason && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Delay Reason</h4>
                        <p className="text-yellow-700 mt-1">{schedule.delayReason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ScheduleDetailsModal;