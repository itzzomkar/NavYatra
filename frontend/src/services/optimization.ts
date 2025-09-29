import { api, aiService } from './api';
import { Schedule, OptimizationResult, TrainsetAssignment } from '@/types';

export interface OptimizationConstraints {
  fitnessRequired?: boolean;
  priorityJobCards?: boolean;
  mileageBalancing?: boolean;
  brandingOptimization?: boolean;
  cleaningSlots?: boolean;
  stablingConstraints?: boolean;
}

export interface OptimizationParameters {
  optimizationWindow?: number; // hours
  maxIterations?: number;
  convergenceThreshold?: number;
}

export interface OptimizationPreferences {
  fitnessWeight?: number;
  jobCardsWeight?: number;
  mileageWeight?: number;
  brandingWeight?: number;
  cleaningWeight?: number;
  stablingWeight?: number;
  fitnessViolationPenalty?: number;
  jobCardDelayPenalty?: number;
  mileageImbalancePenalty?: number;
  brandingLossPenalty?: number;
}

export interface OptimizationRequest {
  constraints?: OptimizationConstraints;
  parameters?: OptimizationParameters;
  preferences?: OptimizationPreferences;
  optimizationWindow?: number;
}

export interface ScheduleFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
}

export interface CreateScheduleRequest {
  name: string;
  description?: string;
  date: string;
  trainsetAssignments: Array<{
    trainsetId: string;
    inductionSlot: string;
    stablingPosition: string;
    cleaningSlot?: string;
    maintenanceWindow?: string;
    brandingPriority?: number;
  }>;
}

class OptimizationService {
  // Request schedule optimization
  async optimizeSchedule(request: OptimizationRequest): Promise<{
    schedule: Schedule;
    optimizationResult: OptimizationResult;
    recommendations: TrainsetAssignment[];
  }> {
    const response = await api.post<{
      schedule: Schedule;
      optimizationResult: OptimizationResult;
      recommendations: TrainsetAssignment[];
    }>('/api/schedule/optimize', request);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Optimization failed');
  }

  // Get all schedules
  async getSchedules(filters?: ScheduleFilters): Promise<Schedule[]> {
    const params = filters || {};
    const response = await api.get<{ schedules: Schedule[] }>('/api/schedule', { params });
    
    if (response.success && response.data) {
      return response.data.schedules;
    }
    
    throw new Error(response.error || 'Failed to fetch schedules');
  }

  // Get schedule by ID
  async getSchedule(id: string): Promise<Schedule> {
    const response = await api.get<{ schedule: Schedule }>(`/api/schedule/${id}`);
    
    if (response.success && response.data) {
      return response.data.schedule;
    }
    
    throw new Error(response.error || 'Failed to fetch schedule');
  }

  // Create manual schedule
  async createSchedule(scheduleData: CreateScheduleRequest): Promise<Schedule> {
    const response = await api.post<{ schedule: Schedule }>('/api/schedule', scheduleData);
    
    if (response.success && response.data) {
      return response.data.schedule;
    }
    
    throw new Error(response.error || 'Failed to create schedule');
  }

  // Update schedule
  async updateSchedule(id: string, scheduleData: Partial<CreateScheduleRequest>): Promise<Schedule> {
    const response = await api.put<{ schedule: Schedule }>(`/api/schedule/${id}`, scheduleData);
    
    if (response.success && response.data) {
      return response.data.schedule;
    }
    
    throw new Error(response.error || 'Failed to update schedule');
  }

  // Delete schedule
  async deleteSchedule(id: string): Promise<void> {
    const response = await api.delete(`/api/schedule/${id}`);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete schedule');
    }
  }

  // Approve/publish schedule
  async approveSchedule(id: string): Promise<Schedule> {
    const response = await api.patch<{ schedule: Schedule }>(`/api/schedule/${id}/approve`);
    
    if (response.success && response.data) {
      return response.data.schedule;
    }
    
    throw new Error(response.error || 'Failed to approve schedule');
  }

  // Get optimization history
  async getOptimizationHistory(limit: number = 10): Promise<OptimizationResult[]> {
    try {
      const response = await aiService.get<OptimizationResult[]>('/api/v1/optimization/history', {
        params: { limit }
      });
      return response;
    } catch (error) {
      throw new Error('Failed to fetch optimization history');
    }
  }

  // Validate optimization constraints
  async validateConstraints(constraints: OptimizationConstraints): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    try {
      const response = await aiService.post<{ valid: boolean; violations: string[] }>(
        '/api/v1/optimization/validate',
        { constraints }
      );
      return response;
    } catch (error) {
      throw new Error('Failed to validate constraints');
    }
  }

  // Get optimization status
  async getOptimizationStatus(optimizationId: string): Promise<{
    id: string;
    status: string;
    optimizationScore?: number;
    executionTime?: number;
    progress?: number;
    message?: string;
  }> {
    try {
      const response = await aiService.get<{
        id: string;
        status: string;
        optimizationScore?: number;
        executionTime?: number;
        progress?: number;
        message?: string;
      }>(`/api/v1/optimization/status/${optimizationId}`);
      return response;
    } catch (error) {
      throw new Error('Failed to get optimization status');
    }
  }

  // Simulate optimization (quick what-if analysis)
  async simulateOptimization(request: OptimizationRequest): Promise<{
    simulation: boolean;
    estimated_score: number;
    estimated_assignments: number;
    execution_time: number;
    full_result: OptimizationResult;
  }> {
    try {
      // First get available trainsets
      const trainsetsResponse = await api.get<{ trainsets: any[] }>('/api/trainsets', {
        params: { status: 'AVAILABLE', limit: 25 }
      });
      
      if (!trainsetsResponse.success || !trainsetsResponse.data) {
        throw new Error('Failed to fetch trainsets for simulation');
      }
      
      const response = await aiService.post<{
        simulation: boolean;
        estimated_score: number;
        estimated_assignments: number;
        execution_time: number;
        full_result: OptimizationResult;
      }>('/api/v1/optimization/simulate', {
        trainsetsData: trainsetsResponse.data.trainsets,
        constraints: request.constraints,
        parameters: request.parameters,
        preferences: request.preferences
      });
      
      return response;
    } catch (error) {
      throw new Error('Failed to run optimization simulation');
    }
  }

  // Get optimization algorithms
  async getAvailableAlgorithms(): Promise<{
    algorithms: string[];
    default: string;
  }> {
    try {
      const response = await aiService.get<{
        algorithms: string[];
        default: string;
      }>('/api/v1/optimization/algorithms');
      return response;
    } catch (error) {
      throw new Error('Failed to fetch available algorithms');
    }
  }

  // Get optimization statistics
  async getOptimizationStats(): Promise<{
    total_jobs: number;
    completed_jobs: number;
    active_jobs: number;
    failed_jobs: number;
    success_rate: number;
    average_score: number;
    algorithms_used: Record<string, number>;
  }> {
    try {
      const response = await aiService.get<{
        total_jobs: number;
        completed_jobs: number;
        active_jobs: number;
        failed_jobs: number;
        success_rate: number;
        average_score: number;
        algorithms_used: Record<string, number>;
      }>('/api/v1/optimization/stats');
      return response;
    } catch (error) {
      throw new Error('Failed to fetch optimization statistics');
    }
  }

  // Export schedule to PDF/Excel
  async exportSchedule(id: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> {
    const response = await api.get(`/api/schedule/${id}/export`, {
      params: { format },
      responseType: 'blob' as any
    });
    
    if (response instanceof Blob) {
      return response;
    }
    
    throw new Error('Failed to export schedule');
  }

  // Clone/duplicate schedule
  async cloneSchedule(id: string, newName: string, newDate: string): Promise<Schedule> {
    const response = await api.post<{ schedule: Schedule }>(`/api/schedule/${id}/clone`, {
      name: newName,
      date: newDate
    });
    
    if (response.success && response.data) {
      return response.data.schedule;
    }
    
    throw new Error(response.error || 'Failed to clone schedule');
  }

  // Get schedule conflicts
  async getScheduleConflicts(id: string): Promise<{
    conflicts: Array<{
      type: string;
      trainsetId: string;
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }>;
  }> {
    const response = await api.get<{
      conflicts: Array<{
        type: string;
        trainsetId: string;
        description: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      }>;
    }>(`/api/schedule/${id}/conflicts`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch schedule conflicts');
  }

  // Get schedule recommendations
  async getScheduleRecommendations(id: string): Promise<{
    recommendations: Array<{
      type: string;
      description: string;
      impact: string;
      priority: number;
    }>;
  }> {
    const response = await api.get<{
      recommendations: Array<{
        type: string;
        description: string;
        impact: string;
        priority: number;
      }>;
    }>(`/api/schedule/${id}/recommendations`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch schedule recommendations');
  }
}

export const optimizationService = new OptimizationService();
