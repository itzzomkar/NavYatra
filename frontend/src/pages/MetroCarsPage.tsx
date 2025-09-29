import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TruckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { Trainset, TrainsetStatus } from '../types';
import { metroCarsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/dateInput.css';

const MetroCarsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrainsetStatus | 'all'>('all');
  const [selectedTrainset, setSelectedTrainset] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrainset, setEditingTrainset] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    trainsetNumber: '',
    manufacturer: '',
    model: '',
    yearOfManufacture: new Date().getFullYear(),
    capacity: 975,
    maxSpeed: 80,
    depot: 'Muttom',
    currentMileage: 0,
    totalMileage: 0,
    status: 'AVAILABLE',
    location: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    fitnessExpiry: '',
    operationalHours: 0,
  });
  const [formData, setFormData] = useState({
    trainsetNumber: '',
    manufacturer: '',
    model: '',
    yearOfManufacture: new Date().getFullYear(),
    capacity: 975,
    maxSpeed: 80,
    depot: 'Muttom',
    currentMileage: 0,
    totalMileage: 0,
    status: 'AVAILABLE',
    location: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    fitnessExpiry: '',
    operationalHours: 0,
  });

  // Generate KMRL fallback trainsets data
  const generateKMRLTrainsetsData = () => {
    return {
      data: [
        {
          id: 'ts-kmrl-001',
          trainsetNumber: 'KMRL-001',
          manufacturer: 'Alstom',
          model: 'Metropolis',
          yearOfManufacture: 2017,
          capacity: 975,
          maxSpeed: 80,
          depot: 'Aluva',
          currentMileage: 48500,
          totalMileage: 48500,
          status: 'IN_SERVICE',
          location: 'Edapally - Palarivattom',
          lastMaintenanceDate: '2024-08-15',
          nextMaintenanceDate: '2024-09-15',
          fitnessExpiry: '2025-03-20',
          operationalHours: 2890,
          energyEfficiency: 94.2,
          brandingInfo: { partner: 'Kerala Tourism', revenue: 15000 }
        },
        {
          id: 'ts-kmrl-002',
          trainsetNumber: 'KMRL-002',
          manufacturer: 'Alstom',
          model: 'Metropolis',
          yearOfManufacture: 2017,
          capacity: 975,
          maxSpeed: 80,
          depot: 'Muttom',
          currentMileage: 47200,
          totalMileage: 47200,
          status: 'AVAILABLE',
          location: 'Muttom Depot',
          lastMaintenanceDate: '2024-08-20',
          nextMaintenanceDate: '2024-09-20',
          fitnessExpiry: '2025-04-15',
          operationalHours: 2750,
          energyEfficiency: 93.8
        },
        {
          id: 'ts-kmrl-003',
          trainsetNumber: 'KMRL-003',
          manufacturer: 'Alstom',
          model: 'Metropolis',
          yearOfManufacture: 2017,
          capacity: 975,
          maxSpeed: 80,
          depot: 'Aluva',
          currentMileage: 46800,
          totalMileage: 46800,
          status: 'MAINTENANCE',
          location: 'Aluva Depot - Bay 3',
          lastMaintenanceDate: '2024-09-01',
          nextMaintenanceDate: '2024-10-01',
          fitnessExpiry: '2025-02-10',
          operationalHours: 2680,
          energyEfficiency: 92.1
        },
        {
          id: 'ts-kmrl-004',
          trainsetNumber: 'KMRL-004',
          manufacturer: 'Alstom',
          model: 'Metropolis',
          yearOfManufacture: 2018,
          capacity: 975,
          maxSpeed: 80,
          depot: 'Muttom',
          currentMileage: 45900,
          totalMileage: 45900,
          status: 'IN_SERVICE',
          location: 'Kalamassery - Cusat',
          lastMaintenanceDate: '2024-08-25',
          nextMaintenanceDate: '2024-09-25',
          fitnessExpiry: '2025-05-30',
          operationalHours: 2820,
          energyEfficiency: 94.7,
          brandingInfo: { partner: 'Flipkart', revenue: 12000 }
        },
        {
          id: 'ts-kmrl-005',
          trainsetNumber: 'KMRL-005',
          manufacturer: 'Alstom',
          model: 'Metropolis',
          yearOfManufacture: 2018,
          capacity: 975,
          maxSpeed: 80,
          depot: 'Aluva',
          currentMileage: 45100,
          totalMileage: 45100,
          status: 'IN_SERVICE',
          location: 'Town Hall - MG Road',
          lastMaintenanceDate: '2024-08-10',
          nextMaintenanceDate: '2024-09-10',
          fitnessExpiry: '2025-01-25',
          operationalHours: 2920,
          energyEfficiency: 93.5
        }
      ]
    };
  };

  // Fetch trainsets
  const {
    data: trainsetsResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['trainsets'],
    queryFn: metroCarsApi.getAll,
    retry: 3,
    retryDelay: 1000,
    placeholderData: { success: true, ...generateKMRLTrainsetsData() }, // Use fallback data while loading
  });

  // Extract trainsets data from API response, fallback to KMRL demo data
  const trainsets = trainsetsResponse?.data || generateKMRLTrainsetsData().data;
  
  // Debug: Log first trainset to see data structure
  if (trainsets.length > 0) {
    console.log('First trainset data:', trainsets[0]);
  }

  // Delete mutation
  const deleteTrainsetMutation = useMutation({
    mutationFn: metroCarsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainsets'] });
      toast.success('Trainset deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete trainset');
    },
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrainsetStatus }) =>
      metroCarsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainsets'] });
      toast.success('Trainset status updated');
    },
    onError: () => {
      toast.error('Failed to update trainset status');
    },
  });

  // Create mutation
  const createTrainsetMutation = useMutation({
    mutationFn: metroCarsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainsets'] });
      toast.success('Trainset created successfully');
      setShowAddModal(false);
      setFormData({
        trainsetNumber: '',
        manufacturer: '',
        model: '',
        yearOfManufacture: new Date().getFullYear(),
        capacity: 975,
        maxSpeed: 80,
        depot: 'Muttom',
        currentMileage: 0,
        totalMileage: 0,
        status: 'AVAILABLE',
        location: '',
        lastMaintenanceDate: '',
        nextMaintenanceDate: '',
        fitnessExpiry: '',
        operationalHours: 0,
      });
    },
    onError: (error: any) => {
      console.error('Create trainset error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create trainset';
      toast.error(errorMessage);
      
      // Log validation errors if any
      if (error?.response?.data?.errors) {
        error.response.data.errors.forEach((err: any) => {
          console.error(`Validation error - ${err.field}: ${err.message}`);
        });
      }
    },
  });

  // Update mutation
  const updateTrainsetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      metroCarsApi.update(id, data),
    onSuccess: (response) => {
      console.log('Update response:', response);
      queryClient.invalidateQueries({ queryKey: ['trainsets'] });
      queryClient.refetchQueries({ queryKey: ['trainsets'] });
      toast.success('Trainset updated successfully');
      setShowEditModal(false);
      setEditingTrainset(null);
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update trainset');
    },
  });

  // Filter trainsets
  const filteredTrainsets = trainsets.filter((trainset: any) => {
    const matchesSearch =
      (trainset.trainsetNumber || trainset.id).toLowerCase().includes(search.toLowerCase()) ||
      trainset.model.toLowerCase().includes(search.toLowerCase()) ||
      trainset.manufacturer.toLowerCase().includes(search.toLowerCase());

    // Handle status filtering with case-insensitive comparison
    let matchesStatus = statusFilter === 'all';
    if (!matchesStatus && trainset.status) {
      const trainsetStatus = trainset.status.toLowerCase();
      const filterStatus = statusFilter.toLowerCase();
      
      // Map database status to frontend enum values
      if (filterStatus === 'available' && trainsetStatus === 'active') {
        matchesStatus = true;
      } else if (filterStatus === 'in_service' && trainsetStatus === 'active') {
        matchesStatus = true;
      } else {
        matchesStatus = trainsetStatus === filterStatus || 
                       trainsetStatus.replace(/_/g, '').toLowerCase() === filterStatus.replace(/_/g, '').toLowerCase();
      }
    }

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (trainset: any) => {
    if (
      window.confirm(
        `Are you sure you want to delete trainset ${trainset.trainsetNumber || trainset.id}? This action cannot be undone.`
      )
    ) {
      deleteTrainsetMutation.mutate(trainset.id);
    }
  };

  const handleStatusToggle = (trainset: any) => {
    const newStatus: TrainsetStatus =
      trainset.status === TrainsetStatus.AVAILABLE ? TrainsetStatus.MAINTENANCE : TrainsetStatus.AVAILABLE;
    updateStatusMutation.mutate({ id: trainset.id, status: newStatus });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting trainset data:', formData);
    createTrainsetMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleEdit = (trainset: any) => {
    setEditingTrainset(trainset);
    setEditFormData({
      trainsetNumber: trainset.trainsetNumber || '',
      manufacturer: trainset.manufacturer || '',
      model: trainset.model || '',
      yearOfManufacture: trainset.yearOfManufacture || new Date().getFullYear(),
      capacity: trainset.capacity || 975,
      maxSpeed: trainset.maxSpeed || 80,
      depot: trainset.depot || 'Muttom',
      currentMileage: trainset.currentMileage || 0,
      totalMileage: trainset.totalMileage || 0,
      status: trainset.status || 'AVAILABLE',
      location: trainset.location || '',
      lastMaintenanceDate: trainset.lastMaintenanceDate ? 
        new Date(trainset.lastMaintenanceDate).toISOString().split('T')[0] : '',
      nextMaintenanceDate: trainset.nextMaintenanceDate ? 
        new Date(trainset.nextMaintenanceDate).toISOString().split('T')[0] : '',
      fitnessExpiry: trainset.fitnessExpiry ? 
        new Date(trainset.fitnessExpiry).toISOString().split('T')[0] : '',
      operationalHours: trainset.operationalHours || 0,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTrainsetMutation.mutate({ id: editingTrainset.id, data: editFormData });
  };

  const getStatusColor = (status: TrainsetStatus) => {
    switch (status) {
      case TrainsetStatus.AVAILABLE:
        return 'text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200';
      case TrainsetStatus.IN_SERVICE:
        return 'text-blue-700 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200';
      case TrainsetStatus.MAINTENANCE:
        return 'text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200';
      case TrainsetStatus.CLEANING:
        return 'text-cyan-700 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200';
      case TrainsetStatus.OUT_OF_ORDER:
        return 'text-red-700 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200';
      case TrainsetStatus.DECOMMISSIONED:
        return 'text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200';
      default:
        return 'text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200';
    }
  };

  const getStatusIcon = (status: TrainsetStatus) => {
    switch (status) {
      case TrainsetStatus.AVAILABLE:
      case TrainsetStatus.IN_SERVICE:
        return <PlayIcon className="h-4 w-4" />;
      case TrainsetStatus.MAINTENANCE:
      case TrainsetStatus.CLEANING:
        return <PauseIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Error loading trainsets</h3>
          <p className="text-gray-500 mt-2">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Trainsets</h1>
          <p className="text-gray-600 mt-2">
            Manage your train fleet and monitor status
          </p>
        </motion.div>

        {hasPermission('trainsets:create') && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button 
              className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-kmrl-600 to-blue-600 text-white font-medium rounded-lg hover:from-kmrl-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kmrl-500 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Trainset
            </button>
          </motion.div>
        )}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trainsets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TrainsetStatus | 'all')}
                className="form-input"
              >
                <option value="all">All Status</option>
                <option value={TrainsetStatus.AVAILABLE}>Available</option>
                <option value={TrainsetStatus.IN_SERVICE}>In Service</option>
                <option value={TrainsetStatus.MAINTENANCE}>Maintenance</option>
                <option value={TrainsetStatus.CLEANING}>Cleaning</option>
                <option value={TrainsetStatus.OUT_OF_ORDER}>Out of Order</option>
                <option value={TrainsetStatus.DECOMMISSIONED}>Decommissioned</option>
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Metro Cars Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredTrainsets.map((trainset: any, index: number) => (
            <motion.div
              key={trainset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-1 border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-kmrl-50 rounded-lg">
                      <TruckIcon className="h-8 w-8 text-kmrl-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {trainset.trainsetNumber || trainset.id}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {trainset.manufacturer} {trainset.model}
                      </p>
                    </div>
                  </div>
                  
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      trainset.status
                    )} shadow-sm`}
                  >
                    {getStatusIcon(trainset.status)}
                    <span className="ml-1.5">
                      {trainset.status.replace(/_/g, ' ').split(' ').map((word: string) => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ')}
                    </span>
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Capacity:</span>
                    <span className="font-medium text-gray-900">{trainset.capacity || 'N/A'} passengers</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Mileage:</span>
                    <span className="font-medium text-gray-900">{trainset.totalMileage?.toLocaleString() || '0'} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fitness Expiry:</span>
                    <span className="font-medium text-gray-900">
                      {trainset.fitnessExpiry
                        ? new Date(trainset.fitnessExpiry).toLocaleDateString()
                        : 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Maintenance:</span>
                    <span className="font-medium text-gray-900">
                      {trainset.lastMaintenanceDate
                        ? new Date(trainset.lastMaintenanceDate).toLocaleDateString()
                        : 'Not Set'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <button
                        className="inline-flex items-center p-2 text-gray-500 hover:text-kmrl-600 hover:bg-kmrl-50 rounded-lg transition-all duration-200"
                        onClick={() => {
                          setSelectedTrainset(trainset);
                          setShowModal(true);
                        }}
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      {hasPermission('trainsets:update') && (
                        <button
                          className="inline-flex items-center p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          onClick={() => handleEdit(trainset)}
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      
                      {hasPermission('trainsets:delete') && (
                        <button
                          className="inline-flex items-center p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          onClick={() => handleDelete(trainset)}
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {hasPermission('trainsets:update') && (
                      <button
                        onClick={() => handleStatusToggle(trainset)}
                        disabled={updateStatusMutation.isPending}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                          trainset.status === TrainsetStatus.AVAILABLE || trainset.status === TrainsetStatus.IN_SERVICE 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 focus:ring-orange-400 shadow-sm hover:shadow-md' 
                            : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 focus:ring-green-400 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {updateStatusMutation.isPending ? (
                          <LoadingSpinner size="sm" />
                        ) : (trainset.status === TrainsetStatus.AVAILABLE || trainset.status === TrainsetStatus.IN_SERVICE) ? (
                          <>
                            <PauseIcon className="h-3.5 w-3.5 mr-1" />
                            Set Maintenance
                          </>
                        ) : (
                          <>
                            <PlayIcon className="h-3.5 w-3.5 mr-1" />
                            Activate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTrainsets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12"
        >
          <TruckIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No metro cars found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first metro car'}
          </p>
          {hasPermission('trainsets:create') && (
            <button 
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Metro Car
            </button>
          )}
        </motion.div>
      )}

      {/* Add Trainset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-kmrl-600 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <PlusIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Add New Metro Car</h2>
                    <p className="text-sm text-white/80 mt-0.5">Enter metro car details to add to fleet</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
                  title="Close"
                >
                  <svg className="h-5 w-5 text-white group-hover:rotate-90 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Fields marked with</span>
                  <span className="text-red-500 font-semibold">*</span>
                  <span>are required</span>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Metro Car Number *
                    </label>
                    <input
                      type="text"
                      name="trainsetNumber"
                      value={formData.trainsetNumber}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      placeholder="KMRL-MC-005"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer *
                    </label>
                    <select
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    >
                      <option value="">Select Manufacturer</option>
                      <option value="Alstom">Alstom</option>
                      <option value="BEML">BEML</option>
                      <option value="Siemens">Siemens</option>
                      <option value="Bombardier">Bombardier</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      placeholder="Metropolis"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year of Manufacture *
                    </label>
                    <input
                      type="number"
                      name="yearOfManufacture"
                      value={formData.yearOfManufacture}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      min="2000"
                      max={new Date().getFullYear() + 2}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity (passengers) *
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      min="100"
                      max="500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Speed (km/h) *
                    </label>
                    <input
                      type="number"
                      name="maxSpeed"
                      value={formData.maxSpeed}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      min="50"
                      max="120"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Mileage (km)
                    </label>
                    <input
                      type="number"
                      name="currentMileage"
                      value={formData.currentMileage}
                      onChange={handleInputChange}
                      className="form-input"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Mileage (km)
                    </label>
                    <input
                      type="number"
                      name="totalMileage"
                      value={formData.totalMileage}
                      onChange={handleInputChange}
                      className="form-input"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operational Hours
                    </label>
                    <input
                      type="number"
                      name="operationalHours"
                      value={formData.operationalHours}
                      onChange={handleInputChange}
                      className="form-input"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="IN_SERVICE">In Service</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="OUT_OF_ORDER">Out of Order</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depot *
                    </label>
                    <select
                      name="depot"
                      value={formData.depot}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    >
                      <option value="Muttom">Muttom</option>
                      <option value="Aluva">Aluva</option>
                      <option value="Pettah">Pettah</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., Aluva Station"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Maintenance Date
                    </label>
                    <input
                      type="date"
                      name="lastMaintenanceDate"
                      value={formData.lastMaintenanceDate}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next Maintenance Date
                    </label>
                    <input
                      type="date"
                      name="nextMaintenanceDate"
                      value={formData.nextMaintenanceDate}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fitness Certificate Expiry
                    </label>
                    <input
                      type="date"
                      name="fitnessExpiry"
                      value={formData.fitnessExpiry}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTrainsetMutation.isPending}
                    className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-kmrl-600 to-blue-600 text-white font-medium rounded-lg hover:from-kmrl-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kmrl-500 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {createTrainsetMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Creating...</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Trainset
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal for trainset details - placeholder */}
      {showModal && selectedTrainset && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Trainset Details - {selectedTrainset.trainsetNumber || selectedTrainset.id}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Trainset Number:</span>
                        <span className="font-medium text-gray-900">{selectedTrainset.trainsetNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Manufacturer:</span>
                        <span className="font-medium text-gray-900">{selectedTrainset.manufacturer || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Model:</span>
                        <span className="font-medium text-gray-900">{selectedTrainset.model || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Year:</span>
                        <span className="font-medium text-gray-900">{selectedTrainset.yearOfManufacture || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Performance</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Capacity:</span>
                        <span className="font-medium text-gray-900">{selectedTrainset.capacity || 0} passengers</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Max Speed:</span>
                        <span className="font-medium text-gray-900">{selectedTrainset.maxSpeed || 0} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Mileage:</span>
                        <span className="font-medium text-gray-900">{selectedTrainset.currentMileage?.toLocaleString() || '0'} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Mileage:</span>
                        <span className="font-medium text-gray-900">{selectedTrainset.totalMileage?.toLocaleString() || '0'} km</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Status & Location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTrainset.status)}`}>
                        {selectedTrainset.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="font-medium text-gray-900">{selectedTrainset.location || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Depot:</span>
                      <span className="font-medium text-gray-900">{selectedTrainset.depot || 'Not Set'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Maintenance & Operations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Operational Hours:</span>
                      <span className="font-medium text-gray-900">{selectedTrainset.operationalHours || 0} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Maintenance:</span>
                      <span className="font-medium text-gray-900">
                        {selectedTrainset.lastMaintenanceDate ? new Date(selectedTrainset.lastMaintenanceDate).toLocaleDateString() : 'Not Set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Next Maintenance:</span>
                      <span className="font-medium text-gray-900">
                        {selectedTrainset.nextMaintenanceDate ? new Date(selectedTrainset.nextMaintenanceDate).toLocaleDateString() : 'Not Set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fitness Expiry:</span>
                      <span className="font-medium text-gray-900">
                        {selectedTrainset.fitnessExpiry ? new Date(selectedTrainset.fitnessExpiry).toLocaleDateString() : 'Not Set'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trainset Modal */}
      {showEditModal && editingTrainset && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <PencilIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Edit Trainset</h2>
                    <p className="text-sm text-white/80 mt-0.5">Updating: {editingTrainset.trainsetNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTrainset(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200 group"
                  title="Close"
                >
                  <svg className="h-5 w-5 text-white group-hover:rotate-90 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trainset Number *
                    </label>
                    <input
                      type="text"
                      name="trainsetNumber"
                      value={editFormData.trainsetNumber}
                      onChange={handleEditInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer *
                    </label>
                    <select
                      name="manufacturer"
                      value={editFormData.manufacturer}
                      onChange={handleEditInputChange}
                      className="form-input"
                      required
                    >
                      <option value="">Select Manufacturer</option>
                      <option value="Alstom">Alstom</option>
                      <option value="BEML">BEML</option>
                      <option value="Siemens">Siemens</option>
                      <option value="Bombardier">Bombardier</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={editFormData.model}
                      onChange={handleEditInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year of Manufacture *
                    </label>
                    <input
                      type="number"
                      name="yearOfManufacture"
                      value={editFormData.yearOfManufacture}
                      onChange={handleEditInputChange}
                      className="form-input"
                      required
                      min="2000"
                      max={new Date().getFullYear() + 2}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity (passengers) *
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={editFormData.capacity}
                      onChange={handleEditInputChange}
                      className="form-input"
                      required
                      min="100"
                      max="2000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Speed (km/h) *
                    </label>
                    <input
                      type="number"
                      name="maxSpeed"
                      value={editFormData.maxSpeed}
                      onChange={handleEditInputChange}
                      className="form-input"
                      required
                      min="50"
                      max="120"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Mileage (km)
                    </label>
                    <input
                      type="number"
                      name="currentMileage"
                      value={editFormData.currentMileage}
                      onChange={handleEditInputChange}
                      className="form-input"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Mileage (km)
                    </label>
                    <input
                      type="number"
                      name="totalMileage"
                      value={editFormData.totalMileage}
                      onChange={handleEditInputChange}
                      className="form-input"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operational Hours
                    </label>
                    <input
                      type="number"
                      name="operationalHours"
                      value={editFormData.operationalHours}
                      onChange={handleEditInputChange}
                      className="form-input"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="form-input"
                      required
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="IN_SERVICE">In Service</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="OUT_OF_ORDER">Out of Order</option>
                      <option value="DECOMMISSIONED">Decommissioned</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depot *
                    </label>
                    <select
                      name="depot"
                      value={editFormData.depot}
                      onChange={handleEditInputChange}
                      className="form-input"
                      required
                    >
                      <option value="Muttom">Muttom</option>
                      <option value="Aluva">Aluva</option>
                      <option value="Pettah">Pettah</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={editFormData.location}
                      onChange={handleEditInputChange}
                      className="form-input"
                      placeholder="e.g., Aluva Station"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Maintenance Date
                    </label>
                    <input
                      type="date"
                      name="lastMaintenanceDate"
                      value={editFormData.lastMaintenanceDate}
                      onChange={handleEditInputChange}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next Maintenance Date
                    </label>
                    <input
                      type="date"
                      name="nextMaintenanceDate"
                      value={editFormData.nextMaintenanceDate}
                      onChange={handleEditInputChange}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fitness Certificate Expiry
                    </label>
                    <input
                      type="date"
                      name="fitnessExpiry"
                      value={editFormData.fitnessExpiry}
                      onChange={handleEditInputChange}
                      className="form-input"
                    />
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTrainset(null);
                    }}
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateTrainsetMutation.isPending}
                    className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {updateTrainsetMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Updating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Update Trainset
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MetroCarsPage;
