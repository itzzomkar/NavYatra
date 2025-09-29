// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  OPERATOR = 'OPERATOR',
  MAINTENANCE = 'MAINTENANCE',
  VIEWER = 'VIEWER',
}

export interface Permission {
  name: string;
  description: string;
  module: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Trainset Types
export interface Trainset {
  id: string;
  trainsetNumber: string;
  manufacturer: string;
  model: string;
  yearOfManufacture: number;
  capacity: number;
  maxSpeed: number;
  currentMileage: number;
  totalMileage: number;
  status: TrainsetStatus;
  location?: string;
  depot: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  fitnessRecords: FitnessCertificate[];
  jobCards: JobCard[];
  brandingRecords: BrandingRecord[];
  maintenanceRecords: MaintenanceRecord[];
  mileageRecords: MileageRecord[];
}

export enum TrainsetStatus {
  AVAILABLE = 'AVAILABLE',
  IN_SERVICE = 'IN_SERVICE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_ORDER = 'OUT_OF_ORDER',
  CLEANING = 'CLEANING',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

// Fitness Certificate Types
export interface FitnessCertificate {
  id: string;
  trainsetId: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  status: FitnessStatus;
  issuingAuthority: string;
  remarks?: string;
  documents: string[];
  iotData?: Record<string, any>;
  lastChecked?: string;
  createdAt: string;
  updatedAt: string;
}

export enum FitnessStatus {
  VALID = 'VALID',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  INVALID = 'INVALID',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

// Job Card Types
export interface JobCard {
  id: string;
  trainsetId: string;
  jobCardNumber: string;
  maximoId?: string;
  priority: JobPriority;
  status: JobStatus;
  workType: string;
  description: string;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  externalData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export enum JobPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
}

export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

// Maintenance Types
export interface MaintenanceRecord {
  id: string;
  trainsetId: string;
  type: MaintenanceType;
  description: string;
  performedBy: string;
  performedAt: string;
  nextDueDate?: string;
  cost?: number;
  parts?: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
  SCHEDULED = 'SCHEDULED',
  INSPECTION = 'INSPECTION',
}

// Branding Types
export interface BrandingRecord {
  id: string;
  trainsetId: string;
  brandName: string;
  campaignId?: string;
  startDate: string;
  endDate: string;
  priority: number;
  exposureTarget?: number;
  actualExposure?: number;
  revenue?: number;
  status: BrandingStatus;
  createdAt: string;
  updatedAt: string;
}

export enum BrandingStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

// Mileage Types
export interface MileageRecord {
  id: string;
  trainsetId: string;
  date: string;
  startMileage: number;
  endMileage: number;
  distance: number;
  routeInfo?: Record<string, any>;
  createdAt: string;
}

// Schedule Types
export interface Schedule {
  id: string;
  date: string;
  shift: Shift;
  status: ScheduleStatus;
  totalTrainsets: number;
  optimizationScore?: number;
  constraints?: Record<string, any>;
  metadata?: Record<string, any>;
  createdById: string;
  modifiedById?: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  entries: ScheduleEntry[];
  createdBy: User;
  modifiedBy?: User;
}

export enum Shift {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
}

export enum ScheduleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ScheduleEntry {
  id: string;
  scheduleId: string;
  trainsetId: string;
  assignedPosition: number;
  priority: number;
  reasoning?: string;
  fitnessStatus: FitnessStatus;
  jobCardStatus: JobStatus;
  brandingPriority?: number;
  mileageBalance?: number;
  cleaningSlot?: string;
  estimatedDeparture?: string;
  actualDeparture?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  trainset: Trainset;
}

// Optimization Types
export interface OptimizationRequest {
  optimization_id: string;
  algorithm?: string;
  schedule_date: string;
  shift: string;
  max_trainsets: number;
  timeout_seconds: number;
  parameters: Record<string, any>;
  constraints: OptimizationConstraints;
  generate_alternatives: boolean;
  explain_reasoning: boolean;
}

export interface OptimizationConstraints {
  require_valid_fitness: boolean;
  exclude_high_priority_jobs: boolean;
  respect_maintenance_windows: boolean;
  mileage_balance_weight: number;
  branding_priority_weight: number;
  energy_efficiency_weight: number;
  position_preference_weight: number;
  max_mileage_variance: number;
  min_reliability_score: number;
  max_days_since_maintenance: number;
  max_trainsets_to_assign: number;
  reserve_trainsets: number;
}

export interface OptimizationResult {
  optimization_id: string;
  status: OptimizationStatus;
  algorithm: string;
  score: number;
  execution_time: number;
  trainset_assignments: Record<string, number>;
  position_assignments?: Record<number, string>;
  constraint_violations: Record<string, any>;
  performance_metrics?: Record<string, number>;
  explanation: Record<string, any>;
  reasoning?: Record<string, string>;
  alternative_solutions: AlternativeSolution[];
  created_at: string;
  recommendations?: string[];
  warnings?: string[];
}

export enum OptimizationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface AlternativeSolution {
  solution_id: string;
  score: number;
  trainset_assignments: Record<string, number>;
  trade_offs: Record<string, string>;
  reasoning?: string;
}

export interface OptimizationJob {
  job_id: string;
  optimization_id: string;
  status: OptimizationStatus;
  progress: number;
  message?: string;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
  result?: OptimizationResult;
}

// Analytics Types
export interface PerformanceMetrics {
  utilization_rate: number;
  mileage_balance_score: number;
  energy_efficiency: number;
  branding_exposure_score: number;
  revenue_potential: number;
  maintenance_compliance: number;
  fitness_compliance: number;
  solution_quality: number;
  constraint_satisfaction: number;
  optimization_efficiency: number;
  convergence_rate: number;
}

export interface DashboardStats {
  totalTrainsets: number;
  availableTrainsets: number;
  inServiceTrainsets: number;
  maintenanceTrainsets: number;
  cleaningTrainsets: number;
  outOfOrderTrainsets: number;
  pendingJobCards: number;
  highPriorityJobs: number;
  expiringSoonFitness: number;
  activeSchedules: number;
  optimizationScore: number;
  fleetUtilization: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  priority: number;
  createdAt: string;
}

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  MAINTENANCE = 'MAINTENANCE',
  SCHEDULE = 'SCHEDULE',
  SYSTEM = 'SYSTEM',
  // Specific notification types
  OPTIMIZATION_COMPLETE = 'optimization_complete',
  MAINTENANCE_DUE = 'maintenance_due',
  FITNESS_ALERT = 'fitness_alert',
  SCHEDULE_CONFLICT = 'schedule_conflict',
  SYSTEM_UPDATE = 'system_update',
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// UI Types
export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface FilterOption {
  value: string | number;
  label: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

// Socket Types
export interface SocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

// Form Types
export interface FormField {
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date';
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: any;
  options?: FilterOption[];
}

// Additional utility types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface TrainsetAssignment {
  trainsetId: string;
  position: number;
  priority: number;
}

// Configuration Types
export interface Configuration {
  id: string;
  key: string;
  value: string;
  type: ConfigType;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum ConfigType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
}
