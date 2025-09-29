import axios from 'axios';
import { TrainsetStatus } from '../../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kmrl_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('kmrl_token');
      localStorage.removeItem('kmrl_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const trainsetsApi = {
  // Get all trainsets
  getAll: async () => {
    try {
      const response = await apiClient.get('/trainsets');
      // Backend returns { success: true, data: trainsets[] }
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trainsets:', error);
      throw error;
    }
  },

  // Get single trainset by ID
  getById: async (id: string) => {
    try {
      const response = await apiClient.get(`/trainsets/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trainset:', error);
      throw error;
    }
  },

  // Create new trainset
  create: async (trainsetData: any) => {
    try {
      const response = await apiClient.post('/trainsets', trainsetData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating trainset:', error);
      throw error;
    }
  },

  // Update trainset
  update: async (id: string, trainsetData: any) => {
    try {
      const response = await apiClient.put(`/trainsets/${id}`, trainsetData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating trainset:', error);
      throw error;
    }
  },

  // Update trainset status
  updateStatus: async (id: string, status: TrainsetStatus) => {
    try {
      const response = await apiClient.patch(`/trainsets/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error('Error updating trainset status:', error);
      throw error;
    }
  },

  // Delete trainset
  delete: async (id: string) => {
    try {
      const response = await apiClient.delete(`/trainsets/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting trainset:', error);
      throw error;
    }
  },

  // Get trainset statistics
  getStats: async () => {
    try {
      const response = await apiClient.get('/trainsets/stats/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  },

  // Add maintenance record
  addMaintenance: async (id: string, maintenanceData: any) => {
    try {
      const response = await apiClient.post(`/trainsets/${id}/maintenance`, maintenanceData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding maintenance record:', error);
      throw error;
    }
  },

  // Update mileage
  updateMileage: async (id: string, distance: number) => {
    try {
      const response = await apiClient.patch(`/trainsets/${id}/mileage`, { distance });
      return response.data;
    } catch (error: any) {
      console.error('Error updating mileage:', error);
      throw error;
    }
  }
};