import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

// Base API configuration
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const AUTH_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:5000/api';
const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8001';

// Create axios instances
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const aiClient: AxiosInstance = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 60000, // Longer timeout for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let token: string | null = null;

export const setAuthToken = (authToken: string | null) => {
  token = authToken;
  if (authToken) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    aiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    delete aiClient.defaults.headers.common['Authorization'];
  }
};

// Request interceptors
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptors
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('kmrl_refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${AUTH_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { access } = response.data.data.tokens;
          setAuthToken(access);
          localStorage.setItem('kmrl_token', access);
          
          // Retry original request
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('kmrl_token');
        localStorage.removeItem('kmrl_refresh_token');
        localStorage.removeItem('kmrl_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// AI service interceptors
aiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('AI Service Error:', error);
    return Promise.reject(error);
  }
);

// Generic API methods
class ApiService {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await apiClient.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

// AI Service methods
class AiService {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await aiClient.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await aiClient.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await aiClient.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await aiClient.delete<T>(url, config);
    return response.data;
  }
}

// Export instances
export const api = new ApiService();
export const aiService = new AiService();

// Health check functions
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/health');
    return true;
  } catch {
    return false;
  }
};

export const checkAiServiceHealth = async (): Promise<boolean> => {
  try {
    await aiClient.get('/health/status');
    return true;
  } catch {
    return false;
  }
};

// Specific API services
// Metro Cars API - primary API for trainset operations
export const metroCarsApi = {
  getAll: (params?: any) => api.get('/api/trainsets', { params }),
  getById: (id: string) => api.get(`/api/trainsets/${id}`),
  create: (data: any) => api.post('/api/trainsets', data),
  update: (id: string, data: any) => api.put(`/api/trainsets/${id}`, data),
  delete: (id: string) => api.delete(`/api/trainsets/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/api/trainsets/${id}/status`, { status }),
  getStats: () => api.get('/api/trainsets/stats/dashboard'),
};

// Legacy alias for backward compatibility (deprecated - use metroCarsApi)
export const trainsetsApi = metroCarsApi;

export const schedulesApi = {
  getAll: (params?: any) => api.get('/api/schedules', { params }),
  getById: (id: string) => api.get(`/api/schedules/${id}`),
  create: (data: any) => api.post('/api/schedules', data),
  update: (id: string, data: any) => api.put(`/api/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/api/schedules/${id}`),
  updateStatus: (id: string, status: string, reason?: string) => 
    api.patch(`/api/schedules/${id}/status`, { status, reason }),
  getStats: () => api.get('/api/schedules/stats'),
};

export const aiApi = {
  optimize: (data: any) => aiService.post('/optimize', data),
  getOptimizationStatus: (id: string) => aiService.get(`/optimize/${id}/status`),
  getOptimizationHistory: () => aiService.get('/optimize/history'),
  validateConstraints: (data: any) => aiService.post('/validate', data),
};

export const fitnessApi = {
  getAll: () => api.get('/api/fitness'),
  getById: (id: string) => api.get(`/api/fitness/${id}`),
  create: (data: any) => api.post('/api/fitness', data),
  update: (id: string, data: any) => api.put(`/api/fitness/${id}`, data),
  delete: (id: string) => api.delete(`/api/fitness/${id}`),
  getStats: () => api.get('/api/fitness/stats/dashboard'),
};

export const jobCardsApi = {
  getAll: () => api.get('/api/job-cards'),
  getById: (id: string) => api.get(`/api/job-cards/${id}`),
  create: (data: any) => api.post('/api/job-cards', data),
  update: (id: string, data: any) => api.put(`/api/job-cards/${id}`, data),
  delete: (id: string) => api.delete(`/api/job-cards/${id}`),
  getStats: () => api.get('/api/job-cards/stats/dashboard'),
  syncWithMaximo: () => api.post('/api/job-cards/sync/maximo'),
};

export const scheduleApi = {
  getAll: () => api.get('/api/schedule'),
  getById: (id: string) => api.get(`/api/schedule/${id}`),
  optimize: (data: any) => api.post('/api/schedule/optimize', data),
};

export const analyticsApi = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
  getPerformance: () => api.get('/api/analytics/performance'),
  getMaintenance: () => api.get('/api/analytics/maintenance'),
  getUtilization: () => api.get('/api/analytics/utilization'),
  getFinancial: () => api.get('/api/analytics/financial'),
  getOptimization: () => api.get('/api/analytics/optimization'),
};

export const usersApi = {
  getAll: () => api.get('/api/users'),
  getById: (id: string) => api.get(`/api/users/${id}`),
  create: (data: any) => api.post('/api/users', data),
  update: (id: string, data: any) => api.put(`/api/users/${id}`, data),
  delete: (id: string) => api.delete(`/api/users/${id}`),
  getStats: () => api.get('/api/users/stats/overview'),
  getPermissions: () => api.get('/api/users/permissions/list'),
};

// Authentication API (uses auth service)
export const authApi = {
  login: async (data: { identifier: string; password: string }) => {
    const response = await axios.post(`${AUTH_URL}/auth/login`, data);
    return response.data;
  },
  register: async (data: any) => {
    const response = await axios.post(`${AUTH_URL}/auth/register`, data);
    return response.data;
  },
  refresh: async (refreshToken: string) => {
    const response = await axios.post(`${AUTH_URL}/auth/refresh`, { refreshToken });
    return response.data;
  },
  logout: async (refreshToken: string) => {
    const response = await axios.post(`${AUTH_URL}/auth/logout`, { refreshToken });
    return response.data;
  },
  getProfile: async (token: string) => {
    const response = await axios.get(`${AUTH_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

// Export axios instances for advanced usage
export { apiClient, aiClient };
