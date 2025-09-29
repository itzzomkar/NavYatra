import { api } from './api';
import { ApiResponse, Trainset, PaginationParams, PaginatedResponse } from '@/types';

export interface TrainsetFilters {
  status?: string;
  depot?: string;
  search?: string;
  fitnessStatus?: string;
  maintenanceStatus?: string;
}

export interface CreateTrainsetRequest {
  trainsetNumber: string;
  manufacturer: string;
  model: string;
  yearOfManufacture: number;
  capacity: number;
  maxSpeed: number;
  depot: string;
}

export interface UpdateTrainsetRequest {
  trainsetNumber?: string;
  manufacturer?: string;
  model?: string;
  capacity?: number;
  maxSpeed?: number;
  depot?: string;
  status?: string;
  location?: string;
}

export interface TrainsetStatusUpdate {
  status: string;
  location?: string;
  notes?: string;
}

export interface TrainsetStats {
  totalTrainsets: number;
  statusCounts: Array<{
    status: string;
    _count: number;
  }>;
  maintenanceDue: number;
  timestamp: string;
}

class TrainsetsService {
  // Get all trainsets with pagination and filters
  async getTrainsets(params: PaginationParams & TrainsetFilters): Promise<PaginatedResponse<Trainset>> {
    const response = await api.get<PaginatedResponse<Trainset>>('/api/trainsets', { params });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch trainsets');
  }

  // Get single trainset by ID
  async getTrainset(id: string): Promise<Trainset> {
    const response = await api.get<{ trainset: Trainset }>(`/api/trainsets/${id}`);
    
    if (response.success && response.data) {
      return response.data.trainset;
    }
    
    throw new Error(response.error || 'Failed to fetch trainset');
  }

  // Create new trainset
  async createTrainset(trainsetData: CreateTrainsetRequest): Promise<Trainset> {
    const response = await api.post<{ trainset: Trainset }>('/api/trainsets', trainsetData);
    
    if (response.success && response.data) {
      return response.data.trainset;
    }
    
    throw new Error(response.error || 'Failed to create trainset');
  }

  // Update trainset
  async updateTrainset(id: string, trainsetData: UpdateTrainsetRequest): Promise<Trainset> {
    const response = await api.put<{ trainset: Trainset }>(`/api/trainsets/${id}`, trainsetData);
    
    if (response.success && response.data) {
      return response.data.trainset;
    }
    
    throw new Error(response.error || 'Failed to update trainset');
  }

  // Update trainset status
  async updateTrainsetStatus(id: string, statusUpdate: TrainsetStatusUpdate): Promise<Trainset> {
    const response = await api.patch<{ trainset: Trainset }>(`/api/trainsets/${id}/status`, statusUpdate);
    
    if (response.success && response.data) {
      return response.data.trainset;
    }
    
    throw new Error(response.error || 'Failed to update trainset status');
  }

  // Delete trainset
  async deleteTrainset(id: string): Promise<void> {
    const response = await api.delete(`/api/trainsets/${id}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete trainset');
    }
  }

  // Get trainset dashboard stats
  async getDashboardStats(): Promise<TrainsetStats> {
    const response = await api.get<TrainsetStats>('/api/trainsets/stats/dashboard');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch dashboard stats');
  }

  // Get trainsets available for scheduling
  async getAvailableTrainsets(): Promise<Trainset[]> {
    const response = await api.get<{ trainsets: Trainset[] }>('/api/trainsets', {
      params: {
        status: 'AVAILABLE',
        fitnessStatus: 'VALID',
        limit: 25
      }
    });
    
    if (response.success && response.data) {
      return response.data.trainsets;
    }
    
    throw new Error(response.error || 'Failed to fetch available trainsets');
  }

  // Get trainsets requiring maintenance
  async getMaintenanceRequired(): Promise<Trainset[]> {
    const response = await api.get<{ trainsets: Trainset[] }>('/api/trainsets', {
      params: {
        maintenanceStatus: 'DUE',
        limit: 50
      }
    });
    
    if (response.success && response.data) {
      return response.data.trainsets;
    }
    
    throw new Error(response.error || 'Failed to fetch trainsets requiring maintenance');
  }

  // Get trainset history
  async getTrainsetHistory(id: string, type?: string): Promise<any[]> {
    const params: any = {};
    if (type) params.type = type;
    
    const response = await api.get<{ history: any[] }>(`/api/trainsets/${id}/history`, { params });
    
    if (response.success && response.data) {
      return response.data.history;
    }
    
    throw new Error(response.error || 'Failed to fetch trainset history');
  }

  // Get trainset performance metrics
  async getPerformanceMetrics(id: string, dateRange?: { from: string; to: string }): Promise<any> {
    const params = dateRange ? { from: dateRange.from, to: dateRange.to } : {};
    
    const response = await api.get<any>(`/api/trainsets/${id}/performance`, { params });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch performance metrics');
  }

  // Bulk update trainsets
  async bulkUpdateTrainsets(ids: string[], updates: Partial<UpdateTrainsetRequest>): Promise<void> {
    const response = await api.post('/api/trainsets/bulk-update', {
      trainsetIds: ids,
      updates
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to bulk update trainsets');
    }
  }

  // Export trainsets data
  async exportTrainsets(filters?: TrainsetFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const params = { ...filters, format };
    
    const response = await api.get('/api/trainsets/export', { 
      params,
      responseType: 'blob' as any
    });
    
    if (response instanceof Blob) {
      return response;
    }
    
    throw new Error('Failed to export trainsets data');
  }

  // Import trainsets from file
  async importTrainsets(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<{ imported: number; errors: string[] }>('/api/trainsets/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to import trainsets');
  }
}

export const trainsetsService = new TrainsetsService();
