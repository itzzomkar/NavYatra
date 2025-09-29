import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { schedulesApi, metroCarsApi } from '@/services/api';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({ isOpen, onClose }) => {
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
    operationalDate: new Date().toISOString().split('T')[0],
    frequency: 'DAILY',
    crew: {
      driver: {
        name: '',
        employeeId: ''
      }
    }
  });

  // Fetch available trainsets
  const { data: trainsetsData, error: trainsetsError, isLoading: trainsetsLoading } = useQuery({
    queryKey: ['trainsets', 'available'],
    queryFn: async () => {
      console.log('Fetching trainsets...');
      try {
        const response = await metroCarsApi.getAll();
        console.log('Trainsets API raw response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching trainsets:', error);
        throw error;
      }
    },
    enabled: isOpen
  });

  // Debug and extract trainsets
  console.log('trainsetsData:', trainsetsData);
  console.log('trainsetsError:', trainsetsError);
  
  // Try different response structures
  let allTrainsets: any[] = [];
  if (trainsetsData) {
    const data: any = trainsetsData;
    if (Array.isArray(data)) {
      allTrainsets = data;
    } else if (data.data && Array.isArray(data.data)) {
      allTrainsets = data.data;
    } else if (data.trainsets && Array.isArray(data.trainsets)) {
      allTrainsets = data.trainsets;
    } else if (data.success && data.data) {
      allTrainsets = data.data;
    }
  }
  
  console.log('Extracted allTrainsets:', allTrainsets);
  console.log('Number of trainsets:', allTrainsets.length);
  
  if (isOpen && allTrainsets.length > 0) {
    console.log('First trainset:', allTrainsets[0]);
    console.log('First trainset status:', allTrainsets[0].status);
  }
  
  // Filter for AVAILABLE trainsets only (not in service or maintenance)
  const trainsets = allTrainsets.filter((t: any) => {
    const status = (t.status || '').toUpperCase();
    console.log(`Checking trainset ${t.trainsetNumber || t.id} with status: ${status}`);
    // Only show trainsets that are AVAILABLE for scheduling (not already in service)
    const isAvailable = status === 'AVAILABLE';
    console.log(`  Is available for scheduling: ${isAvailable}`);
    return isAvailable;
  });
  
  console.log('Filtered trainsets for dropdown:', trainsets);
  console.log('Number of filtered trainsets:', trainsets.length);

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Creating schedule with data:', data);
      return schedulesApi.create(data);
    },
    onSuccess: (response) => {
      console.log('Schedule created successfully:', response);
      toast.success('Schedule created successfully');
      // Invalidate and refetch schedules with all possible filter combinations
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.refetchQueries({ queryKey: ['schedules'], type: 'all' });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error creating schedule:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create schedule';
      toast.error(errorMessage);
    }
  });

  const resetForm = () => {
    setFormData({
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
      operationalDate: new Date().toISOString().split('T')[0],
      frequency: 'DAILY',
      crew: {
        driver: {
          name: '',
          employeeId: ''
        }
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.scheduleNumber || !formData.trainsetId || !formData.departureTime || !formData.arrivalTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Calculate and set stations (simplified version)
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
      status: 'SCHEDULED',
      delay: 0,
      isActive: true,
      passengerCount: 0
    };
    
    console.log('Submitting schedule data:', submitData);

    createMutation.mutate(submitData);
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
        
        <div className="relative bg-white rounded-lg max-w-2xl w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Create New Schedule</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Number *
                </label>
                <input
                  type="text"
                  value={formData.scheduleNumber}
                  onChange={(e) => setFormData({ ...formData, scheduleNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                  placeholder="SCH-XXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trainset * {trainsetsLoading && '(Loading...)'}
                </label>
                {trainsetsError ? (
                  <div className="text-red-600 text-sm">Error loading trainsets</div>
                ) : (
                  <select
                    value={formData.trainsetId}
                    onChange={handleTrainsetChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kmrl-500 focus:border-transparent"
                    required
                    disabled={trainsetsLoading || trainsets.length === 0}
                  >
                    <option value="">
                      {trainsetsLoading 
                        ? 'Loading trainsets...' 
                        : trainsets.length === 0 
                        ? 'No trainsets available' 
                        : 'Select Trainset'}
                    </option>
                    {trainsets.map((trainset: any) => (
                      <option key={trainset._id || trainset.id} value={trainset._id || trainset.id}>
                        {trainset.trainsetNumber || trainset.id} - {trainset.manufacturer || 'Unknown'} {trainset.model || ''}
                      </option>
                    ))}
                  </select>
                )}
                {trainsets.length === 0 && !trainsetsLoading && (
                  <p className="text-xs text-gray-500 mt-1">
                    No active trainsets found. Please ensure trainsets are marked as active.
                  </p>
                )}
              </div>
            </div>

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
                  placeholder="e.g., Aluva"
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
                  placeholder="e.g., Petta"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
            </div>

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
                  <option value="ONE_TIME">One Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Duration (minutes)
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
                  placeholder="Driver name"
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
                  placeholder="EMP-XXX"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-kmrl-600 text-white rounded-lg hover:bg-kmrl-700 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateScheduleModal;