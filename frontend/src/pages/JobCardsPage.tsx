import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  WrenchScrewdriverIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PauseIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Components
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MetricCard from '../components/ui/MetricCard';

// Hooks
import { useWebSocket } from '../hooks/useWebSocket';

// API
import { api } from '../services/api';

// Types
interface JobCard {
  id: string;
  jobCardNumber: string;
  trainsetId: string;
  trainsetNumber: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  category: 'PREVENTIVE' | 'CORRECTIVE' | 'BREAKDOWN' | 'SCHEDULED' | 'EMERGENCY';
  assignedTo: string;
  assignedBy: string;
  estimatedHours: number;
  actualHours?: number;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  dueDate: string;
  parts: Array<{
    partNumber: string;
    partName: string;
    quantity: number;
    cost: number;
  }>;
  attachments: string[];
  notes: string;
  workOrder?: string;
  ibmMaximoId?: string;
  createdAt: string;
  updatedAt: string;
}

interface JobCardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
  avgResolutionTime: number;
}

// Create Job Card Form Component
interface CreateJobCardFormProps {
  onSubmit: (data: Partial<JobCard>) => Promise<void>;
  onCancel: () => void;
}

const CreateJobCardForm: React.FC<CreateJobCardFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    trainsetId: '',
    title: '',
    description: '',
    priority: 'MEDIUM' as JobCard['priority'],
    category: 'PREVENTIVE' as JobCard['category'],
    assignedTo: '',
    estimatedHours: '',
    scheduledDate: new Date().toISOString().split('T')[0],
  });
  const [trainsets, setTrainsets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrainsets = async () => {
      try {
        const response = await api.get('/api/trainsets');
        if (response.success && response.data) {
          setTrainsets(response.data);
        }
      } catch (error) {
        console.error('Error fetching trainsets:', error);
      }
    };
    fetchTrainsets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jobCardData = {
        ...formData,
        jobCardNumber: `JC-${Date.now()}`,
        estimatedHours: parseFloat(formData.estimatedHours) || 0,
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
        dueDate: new Date(new Date(formData.scheduledDate).getTime() + (parseFloat(formData.estimatedHours) || 8) * 60 * 60 * 1000).toISOString(),
      };

      await onSubmit(jobCardData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trainset *
          </label>
          <select
            required
            value={formData.trainsetId}
            onChange={(e) => setFormData({ ...formData, trainsetId: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select Trainset</option>
            {trainsets.map((trainset) => (
              <option key={trainset._id || trainset.id} value={trainset._id || trainset.id}>
                {trainset.trainsetNumber} ({trainset.manufacturer} {trainset.model})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority *
          </label>
          <select
            required
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as JobCard['priority'] })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Enter job card title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          required
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Describe the maintenance task"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as JobCard['category'] })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="PREVENTIVE">Preventive</option>
            <option value="CORRECTIVE">Corrective</option>
            <option value="BREAKDOWN">Breakdown</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To
          </label>
          <input
            type="text"
            value={formData.assignedTo}
            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Technician name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Hours
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={formData.estimatedHours}
            onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Hours"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scheduled Date *
        </label>
        <input
          type="date"
          required
          value={formData.scheduledDate}
          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Job Card'}
        </button>
      </div>
    </form>
  );
};

const JobCardsPage: React.FC = () => {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [filteredJobCards, setFilteredJobCards] = useState<JobCard[]>([]);
  const [stats, setStats] = useState<JobCardStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0,
    avgResolutionTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // WebSocket integration for real-time updates
  const { subscribeToJobCards } = useWebSocket({
    subscriptions: ['jobcards'],
    onJobCardUpdate: (data) => {
      toast.success('Job card updated');
      fetchJobCards(); // Refresh data
    }
  });

  useEffect(() => {
    fetchJobCards();
    subscribeToJobCards();
  }, []);

  useEffect(() => {
    filterJobCards();
  }, [jobCards, searchTerm, statusFilter, priorityFilter]);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (selectedJobCard || showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedJobCard, showCreateModal]);

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from real API first
      try {
        const response = await api.get('/api/jobcards');
        
        if (response.success && response.data && response.data.jobCards) {
          const jobCardsData = response.data.jobCards;
          
          // Transform API data to match frontend interface
          const transformedJobCards: JobCard[] = jobCardsData.map((card: any) => ({
            id: card.id,
            jobCardNumber: card.jobCardNumber,
            trainsetId: card.trainsetId,
            trainsetNumber: card.trainset?.trainsetNumber || 'Unknown',
            title: card.workType || card.description?.substring(0, 50) || 'Maintenance Task',
            description: card.description || '',
            priority: card.priority || 'MEDIUM',
            status: card.status || 'PENDING',
            category: card.workType === 'PREVENTIVE' ? 'PREVENTIVE' : 
                     card.workType === 'CORRECTIVE' ? 'CORRECTIVE' : 
                     card.priority === 'EMERGENCY' ? 'EMERGENCY' : 'SCHEDULED',
            assignedTo: card.assignedTo || 'Unassigned',
            assignedBy: 'System',
            estimatedHours: card.estimatedHours || 0,
            actualHours: card.actualHours,
            scheduledDate: card.scheduledDate || new Date().toISOString(),
            startedAt: card.startedAt,
            completedAt: card.completedDate,
            dueDate: card.scheduledDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            parts: [],
            attachments: [],
            notes: card.notes || '',
            workOrder: card.maximoId || 'N/A',
            ibmMaximoId: card.maximoId,
            createdAt: card.createdAt || new Date().toISOString(),
            updatedAt: card.updatedAt || new Date().toISOString()
          }));
          
          setJobCards(transformedJobCards);
          calculateStatsFromJobCards(transformedJobCards);
          console.log('✅ Loaded', transformedJobCards.length, 'job cards from API');
          return;
        }
      } catch (apiError) {
        console.log('Job cards API not available, using demo data');
      }
      
      // If API fails, generate demo data based on actual trainsets
      const trainsetsResponse = await api.get('/api/trainsets');
      let demoJobCards: JobCard[] = [];
      
      if (trainsetsResponse.success && trainsetsResponse.data?.length > 0) {
        demoJobCards = generateDemoJobCards(trainsetsResponse.data);
        console.log('🎭 Generated', demoJobCards.length, 'demo job cards from trainset data');
      } else {
        demoJobCards = generateFallbackJobCards();
        console.log('📋 Using fallback job cards data');
      }
      
      setJobCards(demoJobCards);
      calculateStatsFromJobCards(demoJobCards);
      
    } catch (error) {
      console.error('Error fetching job cards:', error);
      toast.error('Failed to load job cards');
      
      // Use fallback data
      const fallbackData = generateFallbackJobCards();
      setJobCards(fallbackData);
      calculateStatsFromJobCards(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  // Generate demo job cards based on actual trainset data
  const generateDemoJobCards = (trainsets: any[]): JobCard[] => {
    const jobTypes = [
      { type: 'Brake System Inspection', category: 'PREVENTIVE', priority: 'HIGH', hours: 4, description: 'Complete inspection of disc brakes, brake pads, and pneumatic system' },
      { type: 'Door Mechanism Repair', category: 'CORRECTIVE', priority: 'CRITICAL', hours: 3, description: 'Repair faulty door mechanism and replace worn components' },
      { type: 'Monthly Safety Inspection', category: 'SCHEDULED', priority: 'MEDIUM', hours: 6, description: 'Comprehensive safety inspection including fire suppression, emergency exits, and communication systems' },
      { type: 'Air Conditioning Service', category: 'PREVENTIVE', priority: 'MEDIUM', hours: 2, description: 'Clean filters, check refrigerant levels, and test cooling efficiency' },
      { type: 'Electrical System Check', category: 'PREVENTIVE', priority: 'MEDIUM', hours: 3, description: 'Inspect wiring, test circuits, and verify electrical connections' },
      { type: 'Wheel Bearing Replacement', category: 'CORRECTIVE', priority: 'HIGH', hours: 8, description: 'Replace worn wheel bearings and perform wheel alignment' },
      { type: 'Emergency Brake Test', category: 'EMERGENCY', priority: 'EMERGENCY', hours: 1, description: 'Emergency test of pneumatic brake system following safety alert' },
      { type: 'Interior Cleaning & Sanitization', category: 'SCHEDULED', priority: 'LOW', hours: 2, description: 'Deep cleaning of passenger compartment and sanitization of surfaces' },
      { type: 'Traction Motor Maintenance', category: 'PREVENTIVE', priority: 'HIGH', hours: 6, description: 'Service traction motors, lubricate bearings, and test performance' },
      { type: 'Battery System Check', category: 'PREVENTIVE', priority: 'MEDIUM', hours: 4, description: 'Test battery capacity, check connections, and replace aging cells' },
      { type: 'HVAC Filter Replacement', category: 'SCHEDULED', priority: 'LOW', hours: 1, description: 'Replace air filtration system filters and check ventilation' },
      { type: 'Coupler System Inspection', category: 'PREVENTIVE', priority: 'MEDIUM', hours: 3, description: 'Inspect coupling mechanism and test emergency uncoupling' },
      { type: 'LED Lighting Repair', category: 'CORRECTIVE', priority: 'LOW', hours: 2, description: 'Replace faulty LED strips and test emergency lighting' },
      { type: 'Pantograph Maintenance', category: 'PREVENTIVE', priority: 'HIGH', hours: 5, description: 'Service pantograph mechanism and replace carbon strips' },
      { type: 'Floor System Repair', category: 'CORRECTIVE', priority: 'MEDIUM', hours: 4, description: 'Repair damaged flooring and ensure passenger safety' },
      { type: 'Window Seal Replacement', category: 'CORRECTIVE', priority: 'LOW', hours: 3, description: 'Replace weathered window seals to prevent water ingress' },
      { type: 'Fire Detection System Test', category: 'SCHEDULED', priority: 'HIGH', hours: 2, description: 'Test fire detection sensors and suppression system' },
      { type: 'Suspension System Check', category: 'PREVENTIVE', priority: 'MEDIUM', hours: 4, description: 'Inspect pneumatic suspension and adjust ride height' },
      { type: 'Communication System Upgrade', category: 'SCHEDULED', priority: 'MEDIUM', hours: 8, description: 'Update onboard communication systems and test connectivity' },
      { type: 'Wheels & Axle Inspection', category: 'PREVENTIVE', priority: 'HIGH', hours: 6, description: 'Ultrasonic testing of wheels and axles for crack detection' }
    ];
    
    const statuses: Array<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'> = 
      ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'];
    
    const technicians = [
      'Ravi Kumar', 'Priya Sharma', 'Rajesh Kumar', 'Suresh Nair', 'Anitha Das', 
      'Deepak Singh', 'Lakshmi Nair', 'Arun Kumar', 'Vivek Patel', 'Meena Iyer',
      'Kiran Reddy', 'Sanjay Gupta', 'Pooja Nair', 'Ramesh Babu', 'Sneha Shah'
    ];
    
    // Parts catalog for different job types
    const partsInventory = {
      'Brake System Inspection': [
        { partNumber: 'BRK-PAD-001', partName: 'Brake Pad Set', quantity: 4, cost: 12500 },
        { partNumber: 'BRK-DSC-002', partName: 'Brake Disc', quantity: 2, cost: 25000 },
        { partNumber: 'BRK-FLD-003', partName: 'Brake Fluid (5L)', quantity: 1, cost: 850 }
      ],
      'Door Mechanism Repair': [
        { partNumber: 'DR-MOT-101', partName: 'Door Motor Assembly', quantity: 1, cost: 35000 },
        { partNumber: 'DR-SNS-102', partName: 'Door Sensor', quantity: 2, cost: 4500 },
        { partNumber: 'DR-RBR-103', partName: 'Door Rubber Seal', quantity: 1, cost: 2800 }
      ],
      'Traction Motor Maintenance': [
        { partNumber: 'TM-BRG-201', partName: 'Motor Bearing Set', quantity: 2, cost: 45000 },
        { partNumber: 'TM-OIL-202', partName: 'Synthetic Lubricant (10L)', quantity: 1, cost: 3200 },
        { partNumber: 'TM-FLT-203', partName: 'Air Filter', quantity: 4, cost: 1500 }
      ],
      'Battery System Check': [
        { partNumber: 'BAT-CEL-301', partName: 'Battery Cell Module', quantity: 2, cost: 75000 },
        { partNumber: 'BAT-CBL-302', partName: 'High Voltage Cable', quantity: 3, cost: 8500 },
        { partNumber: 'BAT-CNT-303', partName: 'Battery Contactor', quantity: 1, cost: 12000 }
      ],
      'Pantograph Maintenance': [
        { partNumber: 'PAN-STR-401', partName: 'Carbon Contact Strip', quantity: 2, cost: 18000 },
        { partNumber: 'PAN-SPR-402', partName: 'Pantograph Spring', quantity: 4, cost: 6500 },
        { partNumber: 'PAN-INS-403', partName: 'Insulator Assembly', quantity: 2, cost: 15000 }
      ],
      'Air Conditioning Service': [
        { partNumber: 'AC-FLT-501', partName: 'HVAC Filter', quantity: 6, cost: 2400 },
        { partNumber: 'AC-REF-502', partName: 'Refrigerant R134a (10kg)', quantity: 1, cost: 4800 },
        { partNumber: 'AC-CMP-503', partName: 'Compressor Belt', quantity: 2, cost: 1200 }
      ],
      'LED Lighting Repair': [
        { partNumber: 'LED-STR-601', partName: 'LED Strip 24V', quantity: 8, cost: 3600 },
        { partNumber: 'LED-DRV-602', partName: 'LED Driver', quantity: 4, cost: 5200 },
        { partNumber: 'LED-LNS-603', partName: 'LED Lens Cover', quantity: 12, cost: 1800 }
      ],
      'Wheel Bearing Replacement': [
        { partNumber: 'WHL-BRG-701', partName: 'Wheel Bearing Assembly', quantity: 4, cost: 85000 },
        { partNumber: 'WHL-GRS-702', partName: 'High Temp Grease (5kg)', quantity: 1, cost: 2500 },
        { partNumber: 'WHL-SLD-703', partName: 'Bearing Seal Kit', quantity: 4, cost: 6000 }
      ]
    };
    
    const demoJobCards: JobCard[] = [];
    let jobCardCounter = 1;
    
    // Generate 2-4 job cards per trainset for better data richness
    trainsets.forEach((trainset, index) => {
      const numJobCards = Math.floor(Math.random() * 3) + 2; // 2-4 job cards per train
      
      for (let i = 0; i < numJobCards; i++) {
        const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const assignedTo = technicians[Math.floor(Math.random() * technicians.length)];
        
        // More realistic date distribution
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 45) - 15); // -15 to +30 days
        
        const dueDate = new Date(scheduledDate);
        dueDate.setHours(dueDate.getHours() + jobType.hours + Math.floor(Math.random() * 4)); // Add buffer time
        
        let startedAt: string | undefined;
        let completedAt: string | undefined;
        let actualHours: number | undefined;
        
        if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
          startedAt = new Date(scheduledDate.getTime() + Math.random() * 4 * 60 * 60 * 1000).toISOString();
        }
        
        if (status === 'COMPLETED') {
          const startTime = new Date(startedAt!);
          const duration = jobType.hours + (Math.random() * 4 - 2); // ±2 hour variation
          completedAt = new Date(startTime.getTime() + duration * 60 * 60 * 1000).toISOString();
          actualHours = Math.max(0.5, duration); // Minimum 0.5 hours
        }
        
        // Assign parts based on job type and add some randomness
        const assignedParts = partsInventory[jobType.type as keyof typeof partsInventory] || [];
        const jobParts = Math.random() > 0.3 ? // 70% chance of having parts
          assignedParts.map(part => ({
            ...part,
            quantity: Math.max(1, part.quantity + Math.floor(Math.random() * 3) - 1), // ±1 quantity variation
            cost: part.cost + Math.floor(Math.random() * part.cost * 0.2) - Math.floor(part.cost * 0.1) // ±10% cost variation
          })) : [];
        
        // Generate more detailed notes based on status and job type
        let jobNotes = '';
        if (status === 'COMPLETED') {
          jobNotes = `${jobType.type} completed successfully. All systems tested and verified. ${jobParts.length > 0 ? `Parts replaced: ${jobParts.map(p => p.partName).join(', ')}.` : ''} Next inspection scheduled.`;
        } else if (status === 'IN_PROGRESS') {
          jobNotes = `${jobType.type} currently in progress. ${actualHours ? `${actualHours.toFixed(1)} hours completed.` : ''} Expected completion within scheduled time.`;
        } else if (status === 'ON_HOLD') {
          jobNotes = `Work temporarily suspended. ${jobParts.length > 0 ? 'Waiting for parts delivery.' : 'Awaiting technical approval.'}`;
        } else if (status === 'PENDING') {
          jobNotes = `${jobType.type} scheduled for ${trainset.trainsetNumber}. ${jobParts.length > 0 ? 'Parts requisitioned and available.' : 'No parts required.'}`;
        }
        
        const jobCard: JobCard = {
          id: `jc-${jobCardCounter}`,
          jobCardNumber: `JC-2024-${jobCardCounter.toString().padStart(4, '0')}`,
          trainsetId: trainset._id || trainset.id,
          trainsetNumber: trainset.trainsetNumber,
          title: jobType.type,
          description: jobType.description + ` - ${trainset.trainsetNumber} (${trainset.manufacturer} ${trainset.model})`,
          priority: jobType.priority as any,
          status: status,
          category: jobType.category as any,
          assignedTo: assignedTo,
          assignedBy: 'Maintenance Supervisor',
          estimatedHours: jobType.hours,
          actualHours: actualHours,
          scheduledDate: scheduledDate.toISOString(),
          startedAt: startedAt,
          completedAt: completedAt,
          dueDate: dueDate.toISOString(),
          parts: jobParts,
          attachments: [], // Could add random attachment names here
          notes: jobNotes,
          workOrder: `WO-2024-${(jobCardCounter + 1000).toString().padStart(4, '0')}`,
          ibmMaximoId: `MAXIMO-${50000 + jobCardCounter}`,
          createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(), // Created within last 2 weeks
          updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() // Updated within last day
        };
        
        demoJobCards.push(jobCard);
        jobCardCounter++;
      }
    });
    
    return demoJobCards;
  };
  
  // Generate fallback job cards when no trainset data is available
  const generateFallbackJobCards = (): JobCard[] => {
    return [
      {
        id: 'jc-fallback-001',
        jobCardNumber: 'JC-2024-0001',
        trainsetId: 'ts001',
        trainsetNumber: 'TS001',
        title: 'Brake System Inspection',
        description: 'Complete inspection of disc brakes, brake pads, and pneumatic system - TS001 (Alstom Metropolis)',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        category: 'PREVENTIVE',
        assignedTo: 'Ravi Kumar',
        assignedBy: 'Maintenance Supervisor',
        estimatedHours: 4,
        actualHours: 2.5,
        scheduledDate: new Date().toISOString(),
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        parts: [
          { partNumber: 'BRK-PAD-001', partName: 'Brake Pad Set', quantity: 4, cost: 12500 },
          { partNumber: 'BRK-FLD-003', partName: 'Brake Fluid (5L)', quantity: 1, cost: 850 }
        ],
        attachments: [],
        notes: 'Brake System Inspection currently in progress. 2.5 hours completed. Expected completion within scheduled time.',
        workOrder: 'WO-2024-1001',
        ibmMaximoId: 'MAXIMO-50001',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'jc-fallback-002',
        jobCardNumber: 'JC-2024-0002',
        trainsetId: 'ts002',
        trainsetNumber: 'TS002',
        title: 'Traction Motor Maintenance',
        description: 'Service traction motors, lubricate bearings, and test performance - TS002 (Alstom Metropolis)',
        priority: 'HIGH',
        status: 'COMPLETED',
        category: 'PREVENTIVE',
        assignedTo: 'Priya Sharma',
        assignedBy: 'Maintenance Supervisor',
        estimatedHours: 6,
        actualHours: 5.8,
        scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        parts: [
          { partNumber: 'TM-BRG-201', partName: 'Motor Bearing Set', quantity: 2, cost: 45000 },
          { partNumber: 'TM-OIL-202', partName: 'Synthetic Lubricant (10L)', quantity: 1, cost: 3200 }
        ],
        attachments: [],
        notes: 'Traction Motor Maintenance completed successfully. All systems tested and verified. Parts replaced: Motor Bearing Set, Synthetic Lubricant (10L). Next inspection scheduled.',
        workOrder: 'WO-2024-1002',
        ibmMaximoId: 'MAXIMO-50002',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'jc-fallback-003',
        jobCardNumber: 'JC-2024-0003',
        trainsetId: 'ts003',
        trainsetNumber: 'TS003',
        title: 'Door Mechanism Repair',
        description: 'Repair faulty door mechanism and replace worn components - TS003 (Alstom Metropolis)',
        priority: 'CRITICAL',
        status: 'PENDING',
        category: 'CORRECTIVE',
        assignedTo: 'Rajesh Kumar',
        assignedBy: 'Maintenance Supervisor',
        estimatedHours: 3,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
        parts: [
          { partNumber: 'DR-MOT-101', partName: 'Door Motor Assembly', quantity: 1, cost: 35000 },
          { partNumber: 'DR-SNS-102', partName: 'Door Sensor', quantity: 2, cost: 4500 }
        ],
        attachments: [],
        notes: 'Door Mechanism Repair scheduled for TS003. Parts requisitioned and available.',
        workOrder: 'WO-2024-1003',
        ibmMaximoId: 'MAXIMO-50003',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'jc-fallback-004',
        jobCardNumber: 'JC-2024-0004',
        trainsetId: 'ts004',
        trainsetNumber: 'TS004',
        title: 'Battery System Check',
        description: 'Test battery capacity, check connections, and replace aging cells - TS004 (Alstom Metropolis)',
        priority: 'MEDIUM',
        status: 'ON_HOLD',
        category: 'PREVENTIVE',
        assignedTo: 'Suresh Nair',
        assignedBy: 'Maintenance Supervisor',
        estimatedHours: 4,
        scheduledDate: new Date().toISOString(),
        startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
        parts: [
          { partNumber: 'BAT-CEL-301', partName: 'Battery Cell Module', quantity: 2, cost: 75000 }
        ],
        attachments: [],
        notes: 'Work temporarily suspended. Waiting for parts delivery.',
        workOrder: 'WO-2024-1004',
        ibmMaximoId: 'MAXIMO-50004',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        id: 'jc-fallback-005',
        jobCardNumber: 'JC-2024-0005',
        trainsetId: 'ts005',
        trainsetNumber: 'TS005',
        title: 'Monthly Safety Inspection',
        description: 'Comprehensive safety inspection including fire suppression, emergency exits, and communication systems - TS005 (Alstom Metropolis)',
        priority: 'MEDIUM',
        status: 'PENDING',
        category: 'SCHEDULED',
        assignedTo: 'Anitha Das',
        assignedBy: 'Maintenance Supervisor',
        estimatedHours: 6,
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(),
        parts: [],
        attachments: [],
        notes: 'Monthly Safety Inspection scheduled for TS005. No parts required.',
        workOrder: 'WO-2024-1005',
        ibmMaximoId: 'MAXIMO-50005',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  };
  
  // Calculate statistics from job cards data
  const calculateStatsFromJobCards = (jobCardsData: JobCard[]) => {
    const totalCards = jobCardsData.length;
    const pendingCards = jobCardsData.filter(card => card.status === 'PENDING').length;
    const inProgressCards = jobCardsData.filter(card => card.status === 'IN_PROGRESS').length;
    const completedCards = jobCardsData.filter(card => card.status === 'COMPLETED').length;
    
    // Calculate overdue cards
    const now = new Date();
    const overdueCards = jobCardsData.filter(card => 
      card.status !== 'COMPLETED' && new Date(card.dueDate) < now
    ).length;
    
    const completionRate = totalCards > 0 ? (completedCards / totalCards) * 100 : 0;
    
    // Calculate average resolution time from completed cards
    const completedWithHours = jobCardsData.filter(card => 
      card.status === 'COMPLETED' && card.actualHours
    );
    const avgResolutionTime = completedWithHours.length > 0 ? 
      completedWithHours.reduce((sum, card) => sum + (card.actualHours || 0), 0) / completedWithHours.length :
      24; // Default 24 hours

    setStats({
      total: totalCards,
      pending: pendingCards,
      inProgress: inProgressCards,
      completed: completedCards,
      overdue: overdueCards,
      completionRate: Math.round(completionRate),
      avgResolutionTime: Math.round(avgResolutionTime)
    });
  };

  const filterJobCards = () => {
    let filtered = jobCards;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(card => 
        card.jobCardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.trainsetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(card => card.status === statusFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(card => card.priority === priorityFilter);
    }

    setFilteredJobCards(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'PENDING':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'CANCELLED':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'ON_HOLD':
        return <PauseIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'IN_PROGRESS':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'PENDING':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'CANCELLED':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'ON_HOLD':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'text-red-800 bg-red-100 border-red-300';
      case 'CRITICAL':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-green-700 bg-green-50 border-green-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'COMPLETED' && new Date(dueDate) < new Date();
  };

  // Create new job card
  const createJobCard = async (jobCardData: Partial<JobCard>) => {
    try {
      const response = await api.post('/api/jobcards', jobCardData);
      
      if (response.success) {
        toast.success('Job card created successfully');
        await fetchJobCards(); // Refresh the list
        return true;
      }
    } catch (error) {
      console.error('Error creating job card:', error);
      toast.error('Failed to create job card');
    }
    return false;
  };

  // Update job card
  const updateJobCard = async (id: string, updateData: Partial<JobCard>) => {
    try {
      const response = await api.put(`/api/jobcards/${id}`, updateData);
      
      if (response.success) {
        toast.success('Job card updated successfully');
        await fetchJobCards(); // Refresh the list
        return true;
      }
    } catch (error) {
      console.error('Error updating job card:', error);
      toast.error('Failed to update job card');
    }
    return false;
  };

  // Complete job card
  const completeJobCard = async (id: string, actualHours: number, notes?: string) => {
    try {
      const response = await api.patch(`/api/jobcards/${id}/complete`, {
        actualHours,
        completionNotes: notes
      });
      
      if (response.success) {
        toast.success('Job card completed successfully');
        await fetchJobCards(); // Refresh the list
        return true;
      }
    } catch (error) {
      console.error('API not available, updating local data:', error);
      
      // Fallback: Update local state for demo mode
      const updatedJobCards = jobCards.map(card => {
        if (card.id === id) {
          return {
            ...card,
            status: 'COMPLETED' as JobCard['status'],
            actualHours,
            completedAt: new Date().toISOString(),
            notes: notes || card.notes || 'Completed via UI',
            updatedAt: new Date().toISOString()
          };
        }
        return card;
      });
      
      setJobCards(updatedJobCards);
      calculateStatsFromJobCards(updatedJobCards);
      toast.success('Job card completed successfully');
      return true;
    }
  };

  // Update job card status
  const updateJobCardStatus = async (id: string, status: JobCard['status'], notes?: string) => {
    try {
      const updateData: any = { status };
      if (notes) updateData.notes = notes;
      
      const response = await api.put(`/api/jobcards/${id}`, updateData);
      
      if (response.success) {
        toast.success(`Job card status updated to ${status}`);
        await fetchJobCards(); // Refresh the list
        return true;
      }
    } catch (error) {
      console.error('API not available, updating local data:', error);
      
      // Fallback: Update local state for demo mode
      const updatedJobCards = jobCards.map(card => {
        if (card.id === id) {
          return {
            ...card,
            status,
            notes: notes || card.notes,
            updatedAt: new Date().toISOString(),
            // Add timestamp for status change tracking
            ...(status === 'IN_PROGRESS' && !card.startedAt ? { startedAt: new Date().toISOString() } : {}),
            ...(status === 'IN_PROGRESS' && card.status === 'ON_HOLD' ? { notes: notes || 'Resumed from hold' } : {}),
            ...(status === 'ON_HOLD' ? { notes: notes || 'Put on hold via UI' } : {}),
            ...(status === 'PENDING' ? { startedAt: undefined, completedAt: undefined } : {})
          };
        }
        return card;
      });
      
      setJobCards(updatedJobCards);
      calculateStatsFromJobCards(updatedJobCards);
      toast.success(`Job card status updated to ${status.replace('_', ' ')}`);
      return true;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Cards</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage maintenance job cards and work orders
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Job Card
        </button>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6"
      >
        <MetricCard
          title="Total Job Cards"
          value={stats.total}
          icon={DocumentTextIcon}
          color="blue"
        />
        <MetricCard
          title="Pending"
          value={stats.pending}
          icon={ExclamationTriangleIcon}
          color="yellow"
        />
        <MetricCard
          title="In Progress"
          value={stats.inProgress}
          icon={ClockIcon}
          color="blue"
        />
        <MetricCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircleIcon}
          color="green"
        />
        <MetricCard
          title="Overdue"
          value={stats.overdue}
          icon={ExclamationTriangleIcon}
          color="red"
        />
        <MetricCard
          title="Completion Rate"
          value={stats.completionRate}
          icon={ChartBarIcon}
          color="green"
          suffix="%"
        />
        <MetricCard
          title="Avg Resolution"
          value={stats.avgResolutionTime}
          icon={ClockIcon}
          color="blue"
          suffix="h"
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by job card number, trainset, title, or assignee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
            <div className="sm:w-48">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Job Cards Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Card
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trainset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobCards.map((jobCard) => (
                  <tr key={jobCard.id} className={`hover:bg-gray-50 ${isOverdue(jobCard.dueDate, jobCard.status) ? 'bg-red-25' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {jobCard.jobCardNumber}
                      </div>
                      <div className="text-sm text-gray-500">{jobCard.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {jobCard.trainsetNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">{jobCard.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{jobCard.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(jobCard.priority)}`}>
                        {jobCard.priority}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(jobCard.status)}`}>
                        {getStatusIcon(jobCard.status)}
                        <span className="ml-1">{jobCard.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="text-sm text-gray-900">{jobCard.assignedTo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className={`flex items-center ${isOverdue(jobCard.dueDate, jobCard.status) ? 'text-red-600' : ''}`}>
                        <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(jobCard.dueDate)}
                        {isOverdue(jobCard.dueDate, jobCard.status) && (
                          <ExclamationTriangleIcon className="h-4 w-4 ml-1 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedJobCard(jobCard)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        View
                      </button>
                      {jobCard.status === 'PENDING' && (
                        <button 
                          onClick={() => updateJobCardStatus(jobCard.id, 'IN_PROGRESS')}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Start
                        </button>
                      )}
                      {jobCard.status === 'IN_PROGRESS' && (
                        <>
                          <button 
                            onClick={() => {
                              const hours = prompt('Enter actual hours worked:');
                              if (hours) {
                                completeJobCard(jobCard.id, parseFloat(hours), 'Completed via UI');
                              }
                            }}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Complete
                          </button>
                          <button 
                            onClick={() => updateJobCardStatus(jobCard.id, 'ON_HOLD', 'Put on hold')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Hold
                          </button>
                        </>
                      )}
                      {jobCard.status === 'ON_HOLD' && (
                        <>
                          <button 
                            onClick={() => updateJobCardStatus(jobCard.id, 'IN_PROGRESS', 'Resumed work')}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Resume
                          </button>
                          <button 
                            onClick={() => updateJobCardStatus(jobCard.id, 'PENDING', 'Reset to pending')}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Reset
                          </button>
                        </>
                      )}
                      {jobCard.status === 'PENDING' && (
                        <button 
                          onClick={() => updateJobCardStatus(jobCard.id, 'ON_HOLD', 'Put on hold')}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Hold
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Job Card Details Modal */}
      {selectedJobCard && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden"
          onClick={() => setSelectedJobCard(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Job Card Details: {selectedJobCard.jobCardNumber}
                </h3>
                <button
                  onClick={() => setSelectedJobCard(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>Trainset: <span className="font-medium text-gray-900">{selectedJobCard.trainsetNumber}</span></div>
                    <div>Title: <span className="font-medium text-gray-900">{selectedJobCard.title}</span></div>
                    <div>Category: <span className="font-medium text-gray-900">{selectedJobCard.category}</span></div>
                    <div>Priority: <span className={`font-medium ${getPriorityColor(selectedJobCard.priority)}`}>{selectedJobCard.priority}</span></div>
                    <div>Status: <span className="font-medium text-gray-900">{selectedJobCard.status}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Assignment Details</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>Assigned To: <span className="font-medium text-gray-900">{selectedJobCard.assignedTo}</span></div>
                    <div>Assigned By: <span className="font-medium text-gray-900">{selectedJobCard.assignedBy}</span></div>
                    <div>Estimated Hours: <span className="font-medium text-gray-900">{selectedJobCard.estimatedHours}</span></div>
                    {selectedJobCard.actualHours && (
                      <div>Actual Hours: <span className="font-medium text-gray-900">{selectedJobCard.actualHours}</span></div>
                    )}
                    <div>Work Order: <span className="font-medium text-gray-900">{selectedJobCard.workOrder}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>Scheduled: <span className="font-medium text-gray-900">{formatDate(selectedJobCard.scheduledDate)}</span></div>
                    <div>Due Date: <span className="font-medium text-gray-900">{formatDateTime(selectedJobCard.dueDate)}</span></div>
                    {selectedJobCard.startedAt && (
                      <div>Started: <span className="font-medium text-gray-900">{formatDateTime(selectedJobCard.startedAt)}</span></div>
                    )}
                    {selectedJobCard.completedAt && (
                      <div>Completed: <span className="font-medium text-gray-900">{formatDateTime(selectedJobCard.completedAt)}</span></div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Parts Required</h4>
                  {selectedJobCard.parts.length > 0 ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        {selectedJobCard.parts.map((part, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{part.partName}</div>
                              <div className="text-xs text-gray-500">Part #: {part.partNumber}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">₹{part.cost.toLocaleString('en-IN')}</div>
                              <div className="text-xs text-gray-500">Qty: {part.quantity}</div>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-300">
                          <span className="font-medium text-gray-900">Total Parts Cost:</span>
                          <span className="font-bold text-lg text-indigo-600">
                            ₹{(selectedJobCard.parts || []).reduce((sum, part) => sum + (part.cost * part.quantity), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No parts required for this maintenance task</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-800 leading-relaxed">{selectedJobCard.description}</p>
                </div>
              </div>

              {selectedJobCard.notes && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900 leading-relaxed">{selectedJobCard.notes}</p>
                  </div>
                </div>
              )}
              
              {/* Cost Summary */}
              <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
                <h4 className="font-medium text-gray-900 mb-3">Cost Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Labor Cost ({selectedJobCard.actualHours || selectedJobCard.estimatedHours} hrs @ ₹800/hr):</span>
                      <span className="font-medium text-gray-900">
                        ₹{((selectedJobCard.actualHours || selectedJobCard.estimatedHours) * 800).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Parts Cost:</span>
                      <span className="font-medium text-gray-900">
                        ₹{(selectedJobCard.parts || []).reduce((sum, part) => sum + (part.cost * part.quantity), 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Service Tax (18%):</span>
                      <span className="font-medium text-gray-900">
                        ₹{(((selectedJobCard.actualHours || selectedJobCard.estimatedHours) * 800 + (selectedJobCard.parts || []).reduce((sum, part) => sum + (part.cost * part.quantity), 0)) * 0.18).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <div className="md:pl-4 md:border-l border-indigo-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total Estimated Cost:</span>
                      <span className="text-xl font-bold text-indigo-600">
                        ₹{(((selectedJobCard.actualHours || selectedJobCard.estimatedHours) * 800 + (selectedJobCard.parts || []).reduce((sum, part) => sum + (part.cost * part.quantity), 0)) * 1.18).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Work Order: {selectedJobCard.workOrder} | Maximo ID: {selectedJobCard.ibmMaximoId}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Create Job Card Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-hidden"
          onClick={() => setShowCreateModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Create New Job Card
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <CreateJobCardForm 
                onSubmit={async (data) => {
                  const success = await createJobCard(data);
                  if (success) {
                    setShowCreateModal(false);
                  }
                }}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default JobCardsPage;
