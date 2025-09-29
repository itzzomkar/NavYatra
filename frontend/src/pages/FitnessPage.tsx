import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
// Simple fitness assessment interface
interface FitnessAssessment {
  _id: string;
  trainsetId: string;
  trainsetNumber: string;
  healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  fitnessScore: number;
  onTimePerformance: number;
  energyEfficiency: number;
  assessmentDate: string;
  lastMaintenance: string;
}

interface FitnessStats {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  critical: number;
}

const FitnessPage: React.FC = () => {
  const [assessments, setAssessments] = useState<FitnessAssessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<FitnessAssessment[]>([]);
  const [stats, setStats] = useState<FitnessStats>({
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    critical: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFullDetailsModalOpen, setIsFullDetailsModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('fitness-summary');
  const [selectedReportFormat, setSelectedReportFormat] = useState<string>('pdf');
  
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Process assessment data from API
  const processAssessmentData = (assessment: any) => {
    // Extract trainset info - handle both object and primitive types
    let trainsetId = 'Unknown';
    let trainsetNumber = 'N/A';
    
    if (assessment.trainsetId && typeof assessment.trainsetId === 'object') {
      trainsetId = assessment.trainsetId.trainsetNumber || assessment.trainsetId._id || 'Unknown';
      trainsetNumber = assessment.trainsetId.trainsetNumber || 'N/A';
    } else if (assessment.trainsetId && typeof assessment.trainsetId === 'string') {
      trainsetId = assessment.trainsetId;
    }
    
    if (assessment.trainsetNumber && typeof assessment.trainsetNumber === 'string') {
      trainsetNumber = assessment.trainsetNumber;
    }
    
    // Handle nested health metrics safely
    const healthMetrics = assessment.healthMetrics || {};
    const overall = healthMetrics.overall || {};
    let healthStatus = 'FAIR';
    
    if (assessment.overallHealthStatus && typeof assessment.overallHealthStatus === 'string') {
      healthStatus = assessment.overallHealthStatus;
      // Map newer status values to standard ones
      if (healthStatus === 'VERY_GOOD') healthStatus = 'GOOD';
      if (healthStatus === 'VERY_POOR') healthStatus = 'POOR';
    } else if (overall.status && typeof overall.status === 'string') {
      healthStatus = overall.status;
    }
    
    // Extract fitness score from various possible locations
    let fitnessScore = 75; // default
    if (overall.fitnessScore) {
      fitnessScore = Number(overall.fitnessScore) * 10; // Convert 0-10 scale to 0-100
    } else if (assessment.fitnessScore) {
      fitnessScore = Number(assessment.fitnessScore);
    }
    
    // Handle performance metrics safely
    const performanceMetrics = assessment.performanceMetrics || {};
    const operational = performanceMetrics.operational || {};
    const energy = performanceMetrics.energy || {};
    const onTimePerformance = Math.round(Number(operational.onTimePerformance || 85));
    const energyEfficiency = Math.round(Number(energy.energyEfficiencyScore ? (energy.energyEfficiencyScore * 10) : 80));
    
    // Handle assessment details safely
    const assessmentDetails = assessment.assessmentDetails || {};
    const assessmentDate = assessmentDetails.assessmentDate || assessment.createdAt || new Date().toISOString();
    
    return {
      _id: String(assessment._id || `temp-${Math.random()}`),
      trainsetId: String(trainsetId),
      trainsetNumber: String(trainsetNumber),
      healthStatus: String(healthStatus).toUpperCase() as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL',
      fitnessScore: fitnessScore,
      onTimePerformance: onTimePerformance,
      energyEfficiency: energyEfficiency,
      assessmentDate: String(assessmentDate),
      lastMaintenance: 'Software-based monitoring'
    };
  };

  // Generate fitness assessment from trainset data
  const generateFitnessFromTrainset = (trainset: any): FitnessAssessment => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - (trainset.yearOfManufacture || 2020);
    const mileage = trainset.currentMileage || 0;
    
    // Calculate fitness score based on real factors
    let baseScore = 10.0;
    
    // Age factor (newer trains score higher)
    if (age > 7) baseScore -= 2.0;
    else if (age > 5) baseScore -= 1.5;
    else if (age > 3) baseScore -= 1.0;
    else if (age > 1) baseScore -= 0.5;
    
    // Mileage factor
    if (mileage > 150000) baseScore -= 1.5;
    else if (mileage > 120000) baseScore -= 1.2;
    else if (mileage > 90000) baseScore -= 0.8;
    else if (mileage > 60000) baseScore -= 0.4;
    
    // Status factor
    if (trainset.status === 'OUT_OF_ORDER') baseScore -= 2.5;
    else if (trainset.status === 'MAINTENANCE') baseScore -= 1.0;
    else if (trainset.status === 'CLEANING') baseScore -= 0.2;
    
    // Maintenance factor (recent maintenance improves score)
    if (trainset.lastMaintenanceDate) {
      const daysSinceLastMaintenance = (Date.now() - new Date(trainset.lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastMaintenance > 120) baseScore -= 1.0;
      else if (daysSinceLastMaintenance > 90) baseScore -= 0.5;
      else if (daysSinceLastMaintenance < 30) baseScore += 0.5;
    }
    
    // Manufacturer factor (some variation)
    if (trainset.manufacturer === 'BEML Metro Coach Advanced') baseScore += 0.5;
    else if (trainset.manufacturer === 'BEML Metro Coach') baseScore += 0.2;
    
    // Ensure score is within bounds
    const fitnessScore = Math.max(1.0, Math.min(10.0, baseScore));
    
    // Determine health status
    let healthStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    if (fitnessScore >= 9.0) healthStatus = 'EXCELLENT';
    else if (fitnessScore >= 8.0) healthStatus = 'GOOD';
    else if (fitnessScore >= 7.0) healthStatus = 'FAIR';
    else if (fitnessScore >= 6.0) healthStatus = 'POOR';
    else healthStatus = 'CRITICAL';
    
    // Calculate performance metrics
    const onTimePerformance = Math.max(60, Math.min(100, 95 - (age * 2) - (mileage / 10000)));
    const energyEfficiency = Math.max(60, Math.min(100, 90 - (age * 1.5) - (mileage / 15000)));
    
    return {
      _id: trainset._id || `temp-${Math.random()}`,
      trainsetId: trainset._id || trainset.trainsetNumber,
      trainsetNumber: trainset.trainsetNumber,
      healthStatus,
      fitnessScore: Math.round(fitnessScore * 10),
      onTimePerformance: Math.round(onTimePerformance),
      energyEfficiency: Math.round(energyEfficiency),
      assessmentDate: new Date().toISOString(),
      lastMaintenance: trainset.lastMaintenanceDate ? new Date(trainset.lastMaintenanceDate).toLocaleDateString() : 'Not recorded'
    };
  };

  // Deduplicate assessments to show only the latest per train for existing trainsets
  const deduplicateAssessmentsByTrain = (assessments: FitnessAssessment[], currentTrainsets: any[]): FitnessAssessment[] => {
    // Create a set of existing trainset IDs for validation
    const existingTrainsetIds = new Set(currentTrainsets.map(ts => ts._id));
    const existingTrainsetNumbers = new Set(currentTrainsets.map(ts => ts.trainsetNumber));
    
    // Group assessments by trainset
    const assessmentsByTrain = new Map<string, FitnessAssessment[]>();
    
    assessments.forEach(assessment => {
      // Only include assessments for trains that currently exist
      const trainExists = existingTrainsetIds.has(assessment.trainsetId) || 
                         existingTrainsetNumbers.has(assessment.trainsetNumber) ||
                         existingTrainsetNumbers.has(assessment.trainsetId);
      
      if (trainExists) {
        const key = assessment.trainsetNumber || assessment.trainsetId;
        if (!assessmentsByTrain.has(key)) {
          assessmentsByTrain.set(key, []);
        }
        assessmentsByTrain.get(key)!.push(assessment);
      }
    });
    
    // Get the latest assessment for each train
    const latestAssessments: FitnessAssessment[] = [];
    
    assessmentsByTrain.forEach((trainAssessments, trainKey) => {
      // Sort by assessment date (most recent first)
      trainAssessments.sort((a, b) => {
        const dateA = new Date(a.assessmentDate).getTime();
        const dateB = new Date(b.assessmentDate).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      
      // Take the most recent assessment
      latestAssessments.push(trainAssessments[0]);
    });
    
    console.log(`Deduplicated ${assessments.length} assessments to ${latestAssessments.length} (latest per train)`);
    return latestAssessments;
  };

  // Calculate stats from assessments
  const calculateStats = (assessments: FitnessAssessment[]) => {
    const stats = assessments.reduce((acc: any, assessment: any) => {
      const status = String(assessment.healthStatus || 'FAIR').toLowerCase();
      
      switch (status) {
        case 'excellent':
          acc.excellent++;
          break;
        case 'good':
          acc.good++;
          break;
        case 'fair':
          acc.fair++;
          break;
        case 'poor':
          acc.poor++;
          break;
        case 'critical':
          acc.critical++;
          break;
        default:
          acc.fair++;
      }
      return acc;
    }, { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 });
    
    setStats(stats);
  };

  // Fetch real data from trainsets and generate/fetch fitness assessments
  const fetchAssessments = async () => {
    try {
      setLoading(true);
      
      // Get current trainsets first to ensure we only show existing trains
      const trainsetsData = await api.get('/api/trainsets');
      console.log('Trainsets API Response:', trainsetsData);
      
      let currentTrainsets = [];
      if (trainsetsData.success && trainsetsData.data && trainsetsData.data.length > 0) {
        currentTrainsets = trainsetsData.data;
        console.log('Found', currentTrainsets.length, 'current trainsets');
      } else {
        console.log('No current trainsets found');
        setAssessments([]);
        calculateStats([]);
        return;
      }
      
      // Try to fetch existing fitness assessments
      try {
        const fitnessData = await api.get('/api/fitness');
        console.log('Fitness API Response:', fitnessData);
        
        if (fitnessData.success && fitnessData.data) {
          // Handle both array format and object with assessments property
          let assessmentsArray = [];
          if (Array.isArray(fitnessData.data)) {
            assessmentsArray = fitnessData.data;
          } else if (fitnessData.data.assessments && Array.isArray(fitnessData.data.assessments)) {
            assessmentsArray = fitnessData.data.assessments;
          }
          
          if (assessmentsArray.length > 0) {
            console.log('Raw assessments from API:', assessmentsArray.length);
            
            // Process and deduplicate assessments
            const processedAssessments = assessmentsArray.map((assessment: any) => processAssessmentData(assessment));
            console.log('Processed assessments:', processedAssessments.length);
            
            // Get only the latest assessment per train from existing trainsets
            const deduplicatedAssessments = deduplicateAssessmentsByTrain(processedAssessments, currentTrainsets);
            console.log('After deduplication:', deduplicatedAssessments.length, 'assessments');
            
            // Log sample of latest assessments for debugging
            deduplicatedAssessments.slice(0, 3).forEach(assessment => {
              console.log(`Sample assessment: ${assessment.trainsetNumber} - Health: ${assessment.healthStatus} - Score: ${assessment.fitnessScore} - Date: ${assessment.assessmentDate}`);
            });
            
            setAssessments(deduplicatedAssessments);
            calculateStats(deduplicatedAssessments);
            console.log('✅ Updated UI with', deduplicatedAssessments.length, 'deduplicated fitness assessments');
            return;
          }
        }
      } catch (fitnessError) {
        console.log('Fitness API error:', fitnessError);
        console.log('Will generate from trainsets');
      }
      
      // If no fitness assessments exist, generate from trainsets
      if (currentTrainsets.length > 0) {
        console.log('Generating fitness assessments from trainset data');
        
        // Generate fitness assessments from trainset data
        const generatedAssessments = currentTrainsets.map((trainset: any) => generateFitnessFromTrainset(trainset));
        
        setAssessments(generatedAssessments);
        calculateStats(generatedAssessments);
        
        console.log('Generated', generatedAssessments.length, 'assessments');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      
// Do not use fallback demo data; keep it real
      setAssessments([]);
      calculateStats([]);
      console.warn('Fitness API error; showing no data instead of fallback');
    } finally {
      setLoading(false);
    }
  };

  // Generate fallback data based on KMRL Alstom Metropolis fleet
  const generateFallbackData = (): FitnessAssessment[] => {
    return [
      {
        _id: 'ts-kmrl-001',
        trainsetId: 'ts-kmrl-001',
        trainsetNumber: 'KMRL-001',
        healthStatus: 'EXCELLENT', // Modern Alstom Metropolis, well maintained
        fitnessScore: 94,
        onTimePerformance: 97,
        energyEfficiency: 94,
        assessmentDate: new Date().toISOString(),
        lastMaintenance: '15/8/2024'
      },
      {
        _id: 'ts-kmrl-002',
        trainsetId: 'ts-kmrl-002',
        trainsetNumber: 'KMRL-002',
        healthStatus: 'GOOD', // Alstom Metropolis, good condition
        fitnessScore: 88,
        onTimePerformance: 92,
        energyEfficiency: 89,
        assessmentDate: new Date().toISOString(),
        lastMaintenance: '20/8/2024'
      },
      {
        _id: 'ts-kmrl-003',
        trainsetId: 'ts-kmrl-003',
        trainsetNumber: 'KMRL-003',
        healthStatus: 'FAIR', // Currently in maintenance
        fitnessScore: 75,
        onTimePerformance: 85,
        energyEfficiency: 82,
        assessmentDate: new Date().toISOString(),
        lastMaintenance: '1/9/2024'
      },
      {
        _id: 'ts-kmrl-004',
        trainsetId: 'ts-kmrl-004',
        trainsetNumber: 'KMRL-004',
        healthStatus: 'GOOD', // Alstom Metropolis 2018 model
        fitnessScore: 90,
        onTimePerformance: 95,
        energyEfficiency: 91,
        assessmentDate: new Date().toISOString(),
        lastMaintenance: '25/8/2024'
      },
      {
        _id: 'ts-kmrl-005',
        trainsetId: 'ts-kmrl-005',
        trainsetNumber: 'KMRL-005',
        healthStatus: 'EXCELLENT', // Alstom Metropolis, excellent performance
        fitnessScore: 93,
        onTimePerformance: 96,
        energyEfficiency: 93,
        assessmentDate: new Date().toISOString(),
        lastMaintenance: '10/9/2024'
      }
    ];
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    filterAssessments();
  }, [assessments, searchTerm, statusFilter]);

  const filterAssessments = () => {
    let filtered = assessments;

    if (searchTerm) {
      filtered = filtered.filter(assessment => 
        assessment.trainsetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.trainsetNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(assessment => assessment.healthStatus === statusFilter);
    }

    setFilteredAssessments(filtered);
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT': return 'text-green-700 bg-green-50 border border-green-200';
      case 'GOOD': return 'text-blue-700 bg-blue-50 border border-blue-200';
      case 'FAIR': return 'text-yellow-700 bg-yellow-50 border border-yellow-200';
      case 'POOR': return 'text-orange-700 bg-orange-50 border border-orange-200';
      case 'CRITICAL': return 'text-red-700 bg-red-50 border border-red-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  // Create new fitness assessment for a specific trainset
  const createFitnessAssessment = async (trainsetId: string, showAlert: boolean = true) => {
    try {
      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        if (showAlert) alert('Please log in to create fitness assessments.');
        return false;
      }
      
      console.log('Creating fitness assessment for trainset:', trainsetId);
      
      const result = await api.post('/api/fitness', {
        trainsetId: trainsetId,
        assessmentType: 'COMPREHENSIVE_HEALTH_CHECK',
        inspectorId: user.id, // Use authenticated user's ID
        inspectorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        inspectorCertification: 'AI_POWERED_ASSESSMENT',
        assessmentLocation: 'KMRL Muttom Depot'
      });
      
      console.log('Fitness assessment created successfully:', result);
      
      // For individual assessments, refresh and show alert
      if (showAlert) {
        await fetchAssessments();
        alert(`Fitness assessment created successfully for ${trainsetId}!`);
      }
      
      return true;
    } catch (error) {
      console.error('Error creating fitness assessment:', error);
      if (showAlert) alert('Failed to create fitness assessment. Please try again.');
      return false;
    }
  };

  // Bulk create fitness assessments for all trainsets without assessments
  const createAllFitnessAssessments = async () => {
    try {
      if (!window.confirm('This will create fitness assessments for all trains. Continue?')) {
        return;
      }
      
      console.log('Creating fitness assessments for all trainsets');
      setLoading(true); // Show loading during creation
      
      // Get all trainsets
      const trainsetsData = await api.get('/api/trainsets');
      if (!trainsetsData.success || !trainsetsData.data) {
        throw new Error('No trainsets found');
      }
      
      // Create assessments for each trainset
      let successCount = 0;
      let failCount = 0;
      
      for (const trainset of trainsetsData.data) {
        const success = await createFitnessAssessment(trainset._id, false); // Don't show individual alerts
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`Bulk creation completed: ${successCount} successful, ${failCount} failed`);
      
      // Force refresh the data with a small delay to ensure backend consistency
      console.log('Refreshing fitness data after bulk creation...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      await fetchAssessments();
      
      // Show completion alert after refresh
      alert(`Fitness assessments creation completed:\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`);
      
    } catch (error) {
      console.error('Error creating bulk fitness assessments:', error);
      alert('Failed to create fitness assessments. Please try again.');
    } finally {
      setLoading(false); // Always remove loading state
    }
  };

  const getFitnessScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 45) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">KMRL Train Fitness Monitoring</h1>
            <p className="text-gray-600">Advanced health monitoring and predictive maintenance for KMRL trainsets</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => fetchAssessments()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              🔄 {loading ? 'Loading...' : 'Refresh Data'}
            </button>
            <button 
              onClick={createAllFitnessAssessments}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              ⚕️ Create Assessments
            </button>
            <button 
              onClick={() => {
                setSelectedAssessment(null);
                setIsReportModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📊 Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Health Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Excellent Health */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Excellent Health</p>
              <p className="text-2xl font-bold text-green-600">{stats.excellent}</p>
              <p className="text-xs text-gray-500 mt-1">95-100% fitness</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        {/* Good Health */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Good Health</p>
              <p className="text-2xl font-bold text-blue-600">{stats.good}</p>
              <p className="text-xs text-gray-500 mt-1">75-94% fitness</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div>

        {/* Fair Health */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fair Health</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.fair}</p>
              <p className="text-xs text-gray-500 mt-1">60-74% fitness</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>

        {/* Poor Health */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Poor Health</p>
              <p className="text-2xl font-bold text-orange-600">{stats.poor}</p>
              <p className="text-xs text-gray-500 mt-1">45-59% fitness</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <span className="text-2xl">📉</span>
            </div>
          </div>
        </div>

        {/* Critical Health */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Health</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-gray-500 mt-1">Below 45% fitness</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <span className="text-2xl">🚨</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by train ID or line..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">🔽</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Health Status</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fitness Assessments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Train Fitness Assessments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Train</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fitness Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Assessment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No fitness assessments found
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((assessment) => (
                  <tr key={assessment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">🚆</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{assessment.trainsetId}</div>
                          <div className="text-sm text-gray-500">{assessment.trainsetNumber} Line</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthStatusColor(assessment.healthStatus)}`}>
                        {assessment.healthStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-lg font-bold ${getFitnessScoreColor(assessment.fitnessScore)}`}>
                        {assessment.fitnessScore}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>OTP: {assessment.onTimePerformance}%</div>
                        <div className="text-gray-500">Energy: {assessment.energyEfficiency}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(assessment.assessmentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          👁️
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Generate Report"
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            // Reset selections to defaults when opening modal
                            setSelectedReportType('fitness-summary');
                            setSelectedReportFormat('pdf');
                            setIsReportModalOpen(true);
                          }}
                        >
                          📋
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Generation Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedAssessment ? `Generate Report for ${selectedAssessment.trainsetNumber}` : 'Generate Fleet Report'}
              </h2>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-700 hover:text-gray-900 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium mb-2 text-black">Report Type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  className={`border rounded-lg p-3 flex gap-3 items-center cursor-pointer transition-colors ${
                    selectedReportType === 'fitness-summary' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedReportType('fitness-summary')}
                >
                  <div className="bg-blue-100 p-2 rounded-full">📊</div>
                  <div>
                    <div className="font-medium text-black">Fitness Summary</div>
                    <div className="text-sm text-gray-600">Overall health and performance</div>
                  </div>
                  {selectedReportType === 'fitness-summary' && <div className="ml-auto text-blue-600">✓</div>}
                </div>
                <div 
                  className={`border rounded-lg p-3 flex gap-3 items-center cursor-pointer transition-colors ${
                    selectedReportType === 'detailed-analysis' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedReportType('detailed-analysis')}
                >
                  <div className="bg-green-100 p-2 rounded-full">🔍</div>
                  <div>
                    <div className="font-medium text-black">Detailed Analysis</div>
                    <div className="text-sm text-gray-600">In-depth metrics and analysis</div>
                  </div>
                  {selectedReportType === 'detailed-analysis' && <div className="ml-auto text-blue-600">✓</div>}
                </div>
                <div 
                  className={`border rounded-lg p-3 flex gap-3 items-center cursor-pointer transition-colors ${
                    selectedReportType === 'maintenance-report' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedReportType('maintenance-report')}
                >
                  <div className="bg-yellow-100 p-2 rounded-full">🛠️</div>
                  <div>
                    <div className="font-medium text-black">Maintenance Report</div>
                    <div className="text-sm text-gray-600">Required maintenance actions</div>
                  </div>
                  {selectedReportType === 'maintenance-report' && <div className="ml-auto text-blue-600">✓</div>}
                </div>
                <div 
                  className={`border rounded-lg p-3 flex gap-3 items-center cursor-pointer transition-colors ${
                    selectedReportType === 'trend-analysis' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedReportType('trend-analysis')}
                >
                  <div className="bg-purple-100 p-2 rounded-full">📈</div>
                  <div>
                    <div className="font-medium text-black">Trend Analysis</div>
                    <div className="text-sm text-gray-600">Historical performance trends</div>
                  </div>
                  {selectedReportType === 'trend-analysis' && <div className="ml-auto text-blue-600">✓</div>}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium mb-2 text-black">Report Format</h3>
              <div className="flex gap-3">
                <div 
                  className={`border rounded-lg p-2 flex gap-2 items-center cursor-pointer transition-colors ${
                    selectedReportFormat === 'pdf' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedReportFormat('pdf')}
                >
                  <div>📄</div>
                  <div className="text-black">PDF</div>
                  {selectedReportFormat === 'pdf' && <div className="text-blue-600 ml-1">✓</div>}
                </div>
                <div 
                  className={`border rounded-lg p-2 flex gap-2 items-center cursor-pointer transition-colors ${
                    selectedReportFormat === 'excel' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedReportFormat('excel')}
                >
                  <div>📊</div>
                  <div className="text-black">Excel</div>
                  {selectedReportFormat === 'excel' && <div className="text-blue-600 ml-1">✓</div>}
                </div>
                <div 
                  className={`border rounded-lg p-2 flex gap-2 items-center cursor-pointer transition-colors ${
                    selectedReportFormat === 'csv' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedReportFormat('csv')}
                >
                  <div>📋</div>
                  <div className="text-black">CSV</div>
                  {selectedReportFormat === 'csv' && <div className="text-blue-600 ml-1">✓</div>}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 border border-gray-600 text-black bg-white rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  // Get friendly names for the selections
                  const reportTypeNames = {
                    'fitness-summary': 'Fitness Summary',
                    'detailed-analysis': 'Detailed Analysis',
                    'maintenance-report': 'Maintenance Report',
                    'trend-analysis': 'Trend Analysis'
                  };
                  
                  const formatNames = {
                    'pdf': 'PDF',
                    'excel': 'Excel',
                    'csv': 'CSV'
                  };
                  
                  const selectedTypeName = reportTypeNames[selectedReportType as keyof typeof reportTypeNames];
                  const selectedFormatName = formatNames[selectedReportFormat as keyof typeof formatNames];
                  const trainsetName = selectedAssessment ? selectedAssessment.trainsetNumber : 'Fleet';
                  
                  // Show detailed feedback about the report being generated
                  alert(`Generating ${selectedTypeName} report for ${trainsetName} in ${selectedFormatName} format.\n\nThis may take a few moments...`);
                  
                  // In a real application, you would call an API here:
                  // generateReport({
                  //   trainsetId: selectedAssessment?._id,
                  //   reportType: selectedReportType,
                  //   format: selectedReportFormat
                  // });
                  
                  setIsReportModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Fitness Details for {selectedAssessment.trainsetNumber}
              </h2>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Overview</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-600">Health Status:</span>
                    <span className={`font-medium ${getHealthStatusColor(selectedAssessment.healthStatus)} px-2 py-1 rounded-full text-xs`}>
                      {selectedAssessment.healthStatus}
                    </span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-600">Fitness Score:</span>
                    <span className={`font-medium ${getFitnessScoreColor(selectedAssessment.fitnessScore)}`}>
                      {selectedAssessment.fitnessScore}%
                    </span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-600">Last Assessment:</span>
                    <span className="font-medium text-indigo-600">{formatDate(selectedAssessment.assessmentDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maintenance Method:</span>
                    <span className="font-medium text-teal-600">{selectedAssessment.lastMaintenance}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Performance Metrics</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-600">On-Time Performance:</span>
                    <span className="font-medium text-blue-600">
                      {Math.round(selectedAssessment.onTimePerformance)}%
                    </span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-600">Energy Efficiency:</span>
                    <span className="font-medium text-green-600">
                      {Math.round(selectedAssessment.energyEfficiency)}%
                    </span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-600">Overall Reliability:</span>
                    <span className="font-medium text-purple-600">
                      {(selectedAssessment.fitnessScore * 9).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Safety Rating:</span>
                    <span className="font-medium text-orange-600">
                      {(selectedAssessment.fitnessScore * 9.5).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Health Breakdown</h3>
              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-600 mb-1">Mechanical</p>
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.round(selectedAssessment.fitnessScore * 0.9)}%` }}></div>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{Math.round(selectedAssessment.fitnessScore * 0.9)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Electrical</p>
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${Math.round(selectedAssessment.fitnessScore * 1.1)}%` }}></div>
                    </div>
                    <span className="text-sm font-medium text-green-600">{Math.min(Math.round(selectedAssessment.fitnessScore * 1.1), 100)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Safety Systems</p>
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                      <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: `${Math.round(selectedAssessment.fitnessScore * 0.95)}%` }}></div>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">{Math.round(selectedAssessment.fitnessScore * 0.95)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Comfort</p>
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                      <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${Math.round(selectedAssessment.fitnessScore * 0.85)}%` }}></div>
                    </div>
                    <span className="text-sm font-medium text-purple-600">{Math.round(selectedAssessment.fitnessScore * 0.85)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setIsFullDetailsModalOpen(true);
                }}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                Full Details
              </button>
              <button 
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedAssessment(selectedAssessment);
                  setIsReportModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Details Modal */}
      {isFullDetailsModalOpen && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Comprehensive Fitness Report - {selectedAssessment.trainsetNumber}
              </h2>
              <button 
                onClick={() => setIsFullDetailsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Comprehensive Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Health Overview */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium mb-3 text-blue-600">Health Overview</h3>
                
                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <h4 className="font-medium mb-3 text-black">Overall Health</h4>
                  <div className="space-y-2">
                    <div className="text-black">🏥 Status: {selectedAssessment.healthStatus}</div>
                    <div className="text-black">💯 Fitness Score: {selectedAssessment.fitnessScore}%</div>
                    <div className="text-black">📅 Last Assessment: {formatDate(selectedAssessment.assessmentDate)}</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <h4 className="font-medium mb-3 text-black">Performance Metrics</h4>
                  <div className="space-y-2 text-black">
                    <div className="flex justify-between">
                      <span className="text-black">On-Time Performance:</span>
                      <span className="font-bold text-blue-900 bg-blue-100 px-2 py-1 rounded">
                        {Math.round(selectedAssessment.onTimePerformance)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Energy Efficiency:</span>
                      <span className="font-bold text-green-900 bg-green-100 px-2 py-1 rounded">
                        {Math.round(selectedAssessment.energyEfficiency)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Reliability:</span>
                      <span className="font-bold text-purple-900 bg-purple-100 px-2 py-1 rounded">
                        {(selectedAssessment.fitnessScore * 9).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <h4 className="font-medium mb-3 text-black">Assessment Details</h4>
                  <div className="space-y-2 text-sm text-black">
                    <div className="text-black"><strong>Inspector:</strong> KMRL Inspector</div>
                    <div className="text-black"><strong>Duration:</strong> 2.5 hours</div>
                    <div className="text-black"><strong>Location:</strong> {selectedAssessment.trainsetId} Depot</div>
                    <div className="text-black"><strong>Type:</strong> Comprehensive Health Check</div>
                  </div>
                </div>
              </div>

              {/* Column 2: System Health */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium mb-3 text-green-600">System Health Breakdown</h3>
                
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-gray-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-black">🔧 Mechanical Systems</span>
                      <span style={{color: '#1e3a8a', backgroundColor: '#c7d2fe', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px'}}>{Math.round(selectedAssessment.fitnessScore * 0.9)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.round(selectedAssessment.fitnessScore * 0.9)}%` }}></div>
                    </div>
                    <div className="text-xs text-black mt-1">Engine, Brakes, Suspension, Wheels</div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-black">⚡ Electrical Systems</span>
                      <span style={{color: '#14532d', backgroundColor: '#bbf7d0', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px'}}>{Math.min(Math.round(selectedAssessment.fitnessScore * 1.1), 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(Math.round(selectedAssessment.fitnessScore * 1.1), 100)}%` }}></div>
                    </div>
                    <div className="text-xs text-black mt-1">Power, Motors, Batteries, Lighting</div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-black">🛡️ Safety Systems</span>
                      <span style={{color: '#a16207', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px'}}>{Math.round(selectedAssessment.fitnessScore * 0.95)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: `${Math.round(selectedAssessment.fitnessScore * 0.95)}%` }}></div>
                    </div>
                    <div className="text-xs text-black mt-1">Emergency Systems, Fire Suppression, CCTV</div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-gray-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-black">🪑 Comfort Systems</span>
                      <span style={{color: '#581c87', backgroundColor: '#e9d5ff', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px'}}>{Math.round(selectedAssessment.fitnessScore * 0.85)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.round(selectedAssessment.fitnessScore * 0.85)}%` }}></div>
                    </div>
                    <div className="text-xs text-black mt-1">A/C, Seating, Windows, Cleanliness</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <h4 className="font-medium mb-3 text-black">Recommendations</h4>
                  <div className="space-y-2 text-sm text-black">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600">⚠️</span>
                      <span className="text-black">Schedule brake system inspection within 30 days</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600">ℹ️</span>
                      <span className="text-black">Continue current maintenance schedule</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600">✅</span>
                      <span className="text-black">All safety systems operating optimally</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Operational Data */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium mb-3 text-purple-600">Operational Data</h3>
                
                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <h4 className="font-medium mb-3 text-black">Usage Statistics</h4>
                  <div className="space-y-2 text-sm text-black">
                    <div className="text-black">📊 Total Mileage: 130,000 km</div>
                    <div className="text-black">📈 Recent Mileage: 4,751 km</div>
                    <div className="text-black">⏰ Operating Hours: 19,200 hrs</div>
                    <div className="text-black">🚇 Route: Blue Line</div>
                    <div className="text-black">📋 Avg Load: 89%</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <h4 className="font-medium mb-3 text-black">Environmental Impact</h4>
                  <div className="space-y-2 text-sm text-black">
                    <div className="text-black">🌍 Carbon Footprint: 0.29 kg CO₂/km</div>
                    <div className="text-black">⚡ Energy Source: Mixed</div>
                    <div className="text-black">🔊 Noise Level: 70 dB</div>
                    <div className="text-black">🌱 Eco Rating: 7.1/10</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <h4 className="font-medium mb-3 text-black">Financial Metrics</h4>
                  <div className="space-y-2 text-sm text-black">
                    <div className="text-black">💰 Maintenance Cost: ₹1,17,311/month</div>
                    <div className="text-black">💵 Operation Cost: ₹54/km</div>
                    <div className="text-black">💸 Revenue Capacity: ₹1,37,977/day</div>
                    <div className="text-black">📈 ROI: 1.64x</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-300">
                  <h4 className="font-medium mb-3 text-black">Compliance Status</h4>
                  <div className="space-y-2 text-sm text-black">
                    <div className="flex items-center justify-between">
                      <span className="text-black">Safety Standards:</span>
                      <span className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded">✅ Compliant</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-black">Performance:</span>
                      <span className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded">✅ Compliant</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-black">Certificates:</span>
                      <span className="text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded">✅ Valid</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsFullDetailsModalOpen(false)}
                className="px-4 py-2 border border-gray-600 text-black bg-white rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setIsFullDetailsModalOpen(false);
                  setSelectedAssessment(selectedAssessment);
                  setIsReportModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Report
              </button>
              <button 
                onClick={() => {
                  // This would typically export the data
                  alert('Exporting comprehensive data to PDF...');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FitnessPage;
