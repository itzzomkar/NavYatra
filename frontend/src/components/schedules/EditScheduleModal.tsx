import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { schedulesApi, metroCarsApi } from '../../services/api';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: any;
}

const EditScheduleModal: React.FC<EditScheduleModalProps> = ({ isOpen, onClose, schedule }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    scheduleNumber: '',
    trainsetId: '',
    trainsetNumber: '',
    route: {
      from: '',
      to: '',
      routeName: ''
    },
    departureTime: '',
    arrivalTime: '',
    expectedDuration: 90,
    operationalDate: '',
    frequency: 'DAILY',
    status: 'SCHEDULED',
    crew: {
      driver: {
        name: '',
        employeeId: ''
      },
      coDriver: {
        name: '',
        employeeId: ''
      }
    },
    delay: 0,
    delayReason: '',
    notes: ''
  });

  // Initialize form data when schedule prop changes
  useEffect(() => {
    if (schedule && isOpen) {
      // Parse times from ISO string to time input format
      const depTime = new Date(schedule.departureTime);
      const arrTime = new Date(schedule.arrivalTime);
      const opDate = new Date(schedule.operationalDate);
      
      setFormData({
        scheduleNumber: schedule.scheduleNumber || '',
        trainsetId: schedule.trainsetId?._id || schedule.trainsetId || '',
        trainsetNumber: schedule.trainsetNumber || '',
        route: {
          from: schedule.route?.from || '',
          to: schedule.route?.to || '',
          routeName: schedule.route?.routeName || ''
        },
        departureTime: `${depTime.getHours().toString().padStart(2, '0')}:${depTime.getMinutes().toString().padStart(2, '0')}`,
        arrivalTime: `${arrTime.getHours().toString().padStart(2, '0')}:${arrTime.getMinutes().toString().padStart(2, '0')}`,
        expectedDuration: schedule.expectedDuration || 90,
        operationalDate: opDate.toISOString().split('T')[0],
        frequency: schedule.frequency || 'DAILY',
        status: schedule.status || 'SCHEDULED',
        crew: {
          driver: {
            name: schedule.crew?.driver?.name || '',
            employeeId: schedule.crew?.driver?.employeeId || ''
          },
          coDriver: {
            name: schedule.crew?.coDriver?.name || '',
            employeeId: schedule.crew?.coDriver?.employeeId || ''
          }
        },
        delay: schedule.delay || 0,
        delayReason: schedule.delayReason || '',
        notes: schedule.notes || ''
      });
    }
  }, [schedule, isOpen]);

  // Fetch available trainsets
  const { data: trainsetsData } = useQuery({
    queryKey: ['trainsets', 'all'],
    queryFn: async () => {
      const response = await metroCarsApi.getAll();
      return response;
    },
    enabled: isOpen
  });

  let allTrainsets: any[] = [];
  if (trainsetsData) {
    const data: any = trainsetsData;
    if (Array.isArray(data)) {
      allTrainsets = data;
    } else if (data.data && Array.isArray(data.data)) {
      allTrainsets = data.data;
    }
  }

  // Include both available trainsets and the currently assigned one
  const trainsets = allTrainsets.filter((t: any) => {
    const status = (t.status || '').toUpperCase();
    // Show available trainsets OR the currently assigned trainset
    return status === 'AVAILABLE' || status === 'IN_SERVICE' || t._id === formData.trainsetId;
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      return schedulesApi.update(schedule._id || schedule.id, data);
    },
    onSuccess: () => {
      toast.success('Schedule updated successfully');
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update schedule';
      toast.error(errorMessage);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate and set stations
    const stations = [
      {
        name: formData.route.from,
        scheduledArrival: new Date(`${formData.operationalDate}T${formData.departureTime}`).toISOString(),
        scheduledDeparture: new Date(`${formData.operationalDate}T${formData.departureTime}`).toISOString(),
        platform: '1'
      },
      {
        name: formData.route.to,
        scheduledArrival: new Date(`${formData.operationalDate}T${formData.arrivalTime}`).toISOString(),
        scheduledDeparture: new Date(`${formData.operationalDate}T${formData.arrivalTime}`).toISOString(),
        platform: '2'
      }
    ];

    const submitData = {
      ...formData,
      departureTime: new Date(`${formData.operationalDate}T${formData.departureTime}`).toISOString(),
      arrivalTime: new Date(`${formData.operationalDate}T${formData.arrivalTime}`).toISOString(),
      operationalDate: new Date(formData.operationalDate).toISOString(),
      stations,
      delay: parseInt(formData.delay.toString()),
      expectedDuration: parseInt(formData.expectedDuration.toString())
    };

    updateMutation.mutate(submitData);
  };

  const handleTrainsetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const trainsetId = e.target.value;
    const trainset = trainsets.find((t: any) => t._id === trainsetId);
    setFormData({
      ...formData,
      trainsetId,
      trainsetNumber: trainset?.trainsetNumber || ''
    });
  };

  const handleRouteChange = (field: 'from' | 'to') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      route: {
        ...formData.route,
        [field]: value,
        routeName: field === 'from' 
          ? `${value} - ${formData.route.to}` 
          : `${formData.route.from} - ${value}`
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Edit Schedule</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Number *
                </label>
                <input
                  type="text"
                  value={formData.scheduleNumber}
                  onChange={(e) => setFormData({ ...formData, scheduleNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  required
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trainset *
                </label>
                <select
                  value={formData.trainsetId}
                  onChange={handleTrainsetChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Trainset</option>
                  {trainsets.map((trainset: any) => (
                    <option key={trainset._id} value={trainset._id}>
                      {trainset.trainsetNumber} - {trainset.manufacturer} {trainset.model}
                      {trainset._id === formData.trainsetId && ' (Current)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Route Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Station *
                </label>
                <input
                  type="text"
                  value={formData.route.from}
                  onChange={handleRouteChange('from')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Station *
                </label>
                <input
                  type="text"
                  value={formData.route.to}
                  onChange={handleRouteChange('to')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Time Information */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operational Date *
                </label>
                <input
                  type="date"
                  value={formData.operationalDate}
                  onChange={(e) => setFormData({ ...formData, operationalDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departure Time *
                </label>
                <input
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arrival Time *
                </label>
                <input
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={formData.expectedDuration}
                  onChange={(e) => setFormData({ ...formData, expectedDuration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>

            {/* Delay Information */}
            {formData.status === 'DELAYED' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.delay}
                    onChange={(e) => setFormData({ ...formData, delay: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay Reason
                  </label>
                  <input
                    type="text"
                    value={formData.delayReason}
                    onChange={(e) => setFormData({ ...formData, delayReason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                    placeholder="Technical issue, weather, etc."
                  />
                </div>
              </div>
            )}

            {/* Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKDAYS">Weekdays</option>
                  <option value="WEEKENDS">Weekends</option>
                  <option value="MONDAY">Monday</option>
                  <option value="TUESDAY">Tuesday</option>
                  <option value="WEDNESDAY">Wednesday</option>
                  <option value="THURSDAY">Thursday</option>
                  <option value="FRIDAY">Friday</option>
                  <option value="SATURDAY">Saturday</option>
                  <option value="SUNDAY">Sunday</option>
                  <option value="ONE_TIME">One Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* Crew Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Crew Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    value={formData.crew.driver.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      crew: {
                        ...formData.crew,
                        driver: { ...formData.crew.driver, name: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Employee ID *
                  </label>
                  <input
                    type="text"
                    value={formData.crew.driver.employeeId}
                    onChange={(e) => setFormData({
                      ...formData,
                      crew: {
                        ...formData.crew,
                        driver: { ...formData.crew.driver, employeeId: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Co-Driver Name
                  </label>
                  <input
                    type="text"
                    value={formData.crew.coDriver.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      crew: {
                        ...formData.crew,
                        coDriver: { ...formData.crew.coDriver, name: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Co-Driver Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.crew.coDriver.employeeId}
                    onChange={(e) => setFormData({
                      ...formData,
                      crew: {
                        ...formData.crew,
                        coDriver: { ...formData.crew.coDriver, employeeId: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-kmrl-600 text-white rounded-lg hover:bg-kmrl-700 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditScheduleModal;