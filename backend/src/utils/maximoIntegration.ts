/**
 * IBM Maximo Integration Utility
 * 
 * This module provides integration with IBM Maximo Asset Management system
 * for job cards synchronization. It handles importing work orders from Maximo
 * and exporting status updates back to Maximo.
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Initialize Prisma client
const prisma = new PrismaClient();

// Configuration (in production, use environment variables)
const MAXIMO_CONFIG = {
  baseUrl: process.env.MAXIMO_API_URL || 'https://maximo-api.kmrl.local',
  apiKey: process.env.MAXIMO_API_KEY || 'placeholder-api-key',
  username: process.env.MAXIMO_USERNAME || 'kmrl_api',
  password: process.env.MAXIMO_PASSWORD || 'placeholder-password',
  useStubData: process.env.USE_MAXIMO_STUB === 'true' || true,
  stubDataPath: './data/maximo-stubs',
  authType: 'basic' // or 'oauth' or 'apikey'
};

// Logging
const logMaximoActivity = (activity: string, details: any) => {
  console.log(`[MAXIMO INTEGRATION] ${activity}`, details);
  // In production, you would log to a file or monitoring system
};

/**
 * Generate authentication headers for Maximo API
 */
const getAuthHeaders = async () => {
  if (MAXIMO_CONFIG.authType === 'basic') {
    const authString = Buffer.from(`${MAXIMO_CONFIG.username}:${MAXIMO_CONFIG.password}`).toString('base64');
    return { 
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json'
    };
  } else if (MAXIMO_CONFIG.authType === 'apikey') {
    return { 
      'x-api-key': MAXIMO_CONFIG.apiKey,
      'Content-Type': 'application/json'
    };
  } else {
    // OAuth implementation would go here
    throw new Error('OAuth authentication not implemented');
  }
};

/**
 * Load stub data for development/testing
 */
const loadStubData = async (stubFileName: string) => {
  try {
    // Ensure directory exists
    await fs.mkdir(MAXIMO_CONFIG.stubDataPath, { recursive: true });
    
    const stubFilePath = path.join(MAXIMO_CONFIG.stubDataPath, stubFileName);
    
    try {
      const data = await fs.readFile(stubFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, create it with sample data
      const sampleData = generateSampleData(stubFileName);
      await fs.writeFile(stubFilePath, JSON.stringify(sampleData, null, 2));
      return sampleData;
    }
  } catch (error) {
    console.error('Error loading stub data:', error);
    return [];
  }
};

/**
 * Generate sample data based on stub file name
 */
const generateSampleData = (stubFileName: string) => {
  if (stubFileName === 'workorders.json') {
    return generateSampleWorkOrders(25);
  }
  return [];
};

/**
 * Generate sample work orders for development
 */
const generateSampleWorkOrders = (count: number) => {
  const workTypes = ['PREVENTIVE_MAINTENANCE', 'CORRECTIVE_MAINTENANCE', 'INSPECTION', 'REPAIR', 'CLEANING', 'SAFETY_CHECK'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const statuses = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];
  const departments = ['MAINTENANCE', 'ELECTRICAL', 'MECHANICAL', 'CLEANING', 'INSPECTION', 'SAFETY'];
  const trainsetNumbers = Array.from({length: 25}, (_, i) => `KMRL-${(i+1).toString().padStart(3, '0')}`);
  
  return Array.from({length: count}, (_, i) => {
    const createdDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
    const dueDate = new Date(createdDate.getTime() + Math.floor(Math.random() * 14 + 1) * 24 * 60 * 60 * 1000);
    const trainsetNumber = trainsetNumbers[Math.floor(Math.random() * trainsetNumbers.length)];
    const workType = workTypes[Math.floor(Math.random() * workTypes.length)];
    
    return {
      workorderId: `WO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      maximoId: `MAXIMO-${Math.floor(Math.random() * 1000000)}`,
      trainsetNumber,
      title: `${workType} for ${trainsetNumber}`,
      description: `Detailed work description for ${workType} on ${trainsetNumber}. This is auto-generated sample data.`,
      workType,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      createdDate: createdDate.toISOString(),
      dueDate: dueDate.toISOString(),
      assignedTo: Math.random() > 0.3 ? `tech_${Math.floor(Math.random() * 10) + 1}` : null,
      estimatedDuration: Math.floor(Math.random() * 240) + 30, // 30 to 270 minutes
      location: {
        depot: 'MUTTOM',
        bay: `Bay-${Math.floor(Math.random() * 5) + 1}`
      },
      parts: Array.from({length: Math.floor(Math.random() * 3)}, (_, j) => ({
        partNumber: `PART-${Math.floor(Math.random() * 10000)}`,
        partName: `Sample Part ${j+1}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        cost: Math.floor(Math.random() * 500) + 50
      }))
    };
  });
};

/**
 * Fetch work orders from IBM Maximo
 */
export const fetchWorkOrders = async (options: { 
  startDate?: Date; 
  endDate?: Date; 
  status?: string; 
  trainsetNumber?: string;
  limit?: number;
}) => {
  try {
    logMaximoActivity('Fetching work orders', options);
    
    // Use stub data for development/testing
    if (MAXIMO_CONFIG.useStubData) {
      const stubData = await loadStubData('workorders.json');
      
      // Apply filters to stub data
      let filtered = [...stubData];
      
      if (options.trainsetNumber) {
        filtered = filtered.filter(wo => wo.trainsetNumber === options.trainsetNumber);
      }
      
      if (options.status) {
        filtered = filtered.filter(wo => wo.status === options.status);
      }
      
      if (options.startDate) {
        const startTime = new Date(options.startDate).getTime();
        filtered = filtered.filter(wo => new Date(wo.createdDate).getTime() >= startTime);
      }
      
      if (options.endDate) {
        const endTime = new Date(options.endDate).getTime();
        filtered = filtered.filter(wo => new Date(wo.createdDate).getTime() <= endTime);
      }
      
      if (options.limit) {
        filtered = filtered.slice(0, options.limit);
      }
      
      return { 
        success: true, 
        data: filtered,
        source: 'stub'
      };
    }
    
    // Real Maximo API integration
    const headers = await getAuthHeaders();
    const response = await axios.get(
      `${MAXIMO_CONFIG.baseUrl}/api/workorders`, 
      { 
        headers,
        params: {
          startDate: options.startDate ? options.startDate.toISOString() : undefined,
          endDate: options.endDate ? options.endDate.toISOString() : undefined,
          status: options.status,
          trainsetNumber: options.trainsetNumber,
          limit: options.limit || 100
        }
      }
    );
    
    return {
      success: true,
      data: response.data,
      source: 'maximo'
    };
  } catch (error: any) {
    logMaximoActivity('Error fetching work orders', error);
    return {
      success: false,
      error: `Failed to fetch work orders: ${error?.message || 'Unknown error'}`,
      source: MAXIMO_CONFIG.useStubData ? 'stub' : 'maximo'
    };
  }
};

/**
 * Fetch a single work order details from IBM Maximo
 */
export const fetchWorkOrderDetails = async (maximoId: string) => {
  try {
    logMaximoActivity('Fetching work order details', { maximoId });
    
    // Use stub data for development/testing
    if (MAXIMO_CONFIG.useStubData) {
      const stubData = await loadStubData('workorders.json');
      const workOrder = stubData.find(wo => wo.maximoId === maximoId);
      
      if (!workOrder) {
        return {
          success: false,
          error: 'Work order not found',
          source: 'stub'
        };
      }
      
      return { 
        success: true, 
        data: {
          ...workOrder,
          // Add more detailed fields for a single work order
          attachments: [
            { filename: 'manual.pdf', size: 1024 * 1024, uploadedDate: new Date().toISOString() },
            { filename: 'diagram.png', size: 512 * 1024, uploadedDate: new Date().toISOString() }
          ],
          history: [
            { action: 'Created', timestamp: new Date(workOrder.createdDate).toISOString(), user: 'system' },
            { action: 'Updated', timestamp: new Date().toISOString(), user: 'tech_user' }
          ]
        },
        source: 'stub'
      };
    }
    
    // Real Maximo API integration
    const headers = await getAuthHeaders();
    const response = await axios.get(
      `${MAXIMO_CONFIG.baseUrl}/api/workorders/${maximoId}`, 
      { headers }
    );
    
    return {
      success: true,
      data: response.data,
      source: 'maximo'
    };
  } catch (error: any) {
    logMaximoActivity('Error fetching work order details', error);
    return {
      success: false,
      error: `Failed to fetch work order details: ${error?.message || 'Unknown error'}`,
      source: MAXIMO_CONFIG.useStubData ? 'stub' : 'maximo'
    };
  }
};

/**
 * Import work orders from Maximo and create job cards in our system
 */
export const importWorkOrdersAsJobCards = async () => {
  try {
    logMaximoActivity('Starting import of work orders as job cards', {});
    
    // Fetch recent work orders from Maximo
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    
    const result = await fetchWorkOrders({
      startDate,
      limit: 100
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    const workOrders = result.data;
    const importResults = {
      total: workOrders.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    // Process each work order
    for (const workOrder of workOrders) {
      try {
        // Find trainset by number
        const trainset = await prisma.trainset.findFirst({
          where: { trainsetNumber: workOrder.trainsetNumber }
        });
        
        if (!trainset) {
          logMaximoActivity('Skipping work order - trainset not found', { trainsetNumber: workOrder.trainsetNumber });
          importResults.skipped++;
          continue;
        }
        
        // Check if job card already exists for this work order
        const existingJobCard = await prisma.jobCard.findFirst({
          where: { maximoId: workOrder.maximoId }
        });
        
        // Prepare job card data
        const jobCardData = {
          trainsetId: trainset.id,
          jobCardNumber: workOrder.workorderId || `JC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          maximoId: workOrder.maximoId,
          priority: workOrder.priority,
          status: mapMaximoStatusToJobCardStatus(workOrder.status),
          workType: workOrder.workType,
          description: workOrder.description,
          estimatedHours: workOrder.estimatedDuration ? workOrder.estimatedDuration / 60 : null,
          assignedTo: workOrder.assignedTo,
          scheduledDate: workOrder.createdDate ? new Date(workOrder.createdDate) : new Date(),
          dueDate: workOrder.dueDate ? new Date(workOrder.dueDate) : null,
          notes: JSON.stringify({
            title: workOrder.title,
            category: workOrder.workType,
            parts: workOrder.parts || [],
            workOrder: {
              id: workOrder.workorderId,
              maximoId: workOrder.maximoId,
              source: 'IBM_MAXIMO',
              importDate: new Date().toISOString()
            }
          })
        };
        
        // Create or update job card
        if (existingJobCard) {
          await prisma.jobCard.update({
            where: { id: existingJobCard.id },
            data: jobCardData
          });
          importResults.updated++;
        } else {
          await prisma.jobCard.create({
            data: jobCardData
          });
          importResults.created++;
        }
      } catch (error) {
        logMaximoActivity('Error processing work order', { workOrder, error });
        importResults.errors++;
      }
    }
    
    logMaximoActivity('Import completed', importResults);
    return {
      success: true,
      data: importResults
    };
  } catch (error: any) {
    logMaximoActivity('Import failed', error);
    return {
      success: false,
      error: `Failed to import work orders: ${error?.message || 'Unknown error'}`
    };
  }
};

/**
 * Update work order status in Maximo
 */
export const updateWorkOrderStatus = async (jobCardId: string, newStatus: string, comments?: string) => {
  try {
    // Find job card
    const jobCard = await prisma.jobCard.findUnique({
      where: { id: jobCardId }
    });
    
    if (!jobCard) {
      return {
        success: false,
        error: 'Job card not found'
      };
    }
    
    if (!jobCard.maximoId) {
      return {
        success: false,
        error: 'Job card not linked to IBM Maximo'
      };
    }
    
    logMaximoActivity('Updating work order status in Maximo', { 
      maximoId: jobCard.maximoId, 
      newStatus, 
      comments 
    });
    
    // For development/testing
    if (MAXIMO_CONFIG.useStubData) {
      // Update the status in the stub file
      const stubFilePath = path.join(MAXIMO_CONFIG.stubDataPath, 'workorders.json');
      const workOrders = await loadStubData('workorders.json');
      const index = workOrders.findIndex((wo: any) => wo.maximoId === jobCard.maximoId);
      
      if (index >= 0) {
        workOrders[index].status = mapJobCardStatusToMaximoStatus(newStatus);
        if (comments) {
          workOrders[index].comments = [
            ...(workOrders[index].comments || []), 
            { text: comments, date: new Date().toISOString() }
          ];
        }
        
        await fs.writeFile(stubFilePath, JSON.stringify(workOrders, null, 2));
      }
      
      return {
        success: true,
        data: {
          maximoId: jobCard.maximoId,
          status: newStatus,
          updateTime: new Date().toISOString()
        },
        source: 'stub'
      };
    }
    
    // Real Maximo API integration
    const headers = await getAuthHeaders();
    const response = await axios.patch(
      `${MAXIMO_CONFIG.baseUrl}/api/workorders/${jobCard.maximoId}`,
      { 
        status: mapJobCardStatusToMaximoStatus(newStatus),
        comments: comments ? [{ text: comments }] : undefined
      },
      { headers }
    );
    
    return {
      success: true,
      data: response.data,
      source: 'maximo'
    };
  } catch (error: any) {
    logMaximoActivity('Error updating work order status', error);
    return {
      success: false,
      error: `Failed to update work order status: ${error?.message || 'Unknown error'}`,
      source: MAXIMO_CONFIG.useStubData ? 'stub' : 'maximo'
    };
  }
};

/**
 * Map Maximo status to Job Card status
 */
const mapMaximoStatusToJobCardStatus = (maximoStatus: string): string => {
  const statusMap: Record<string, string> = {
    'WAPPR': 'OPEN',
    'WSCH': 'OPEN',
    'INPRG': 'IN_PROGRESS',
    'WMATL': 'ON_HOLD',
    'COMP': 'COMPLETED',
    'CLOSE': 'COMPLETED',
    'CANCEL': 'CANCELLED'
  };
  
  return statusMap[maximoStatus] || 'OPEN';
};

/**
 * Map Job Card status to Maximo status
 */
const mapJobCardStatusToMaximoStatus = (jobCardStatus: string): string => {
  const statusMap: Record<string, string> = {
    'OPEN': 'WAPPR',
    'IN_PROGRESS': 'INPRG',
    'ON_HOLD': 'WMATL',
    'COMPLETED': 'COMP',
    'CANCELLED': 'CANCEL'
  };
  
  return statusMap[jobCardStatus] || 'WAPPR';
};

/**
 * Upload attachment to Maximo
 */
export const uploadAttachmentToMaximo = async (
  jobCardId: string, 
  filePath: string, 
  description?: string
) => {
  try {
    // Find job card
    const jobCard = await prisma.jobCard.findUnique({
      where: { id: jobCardId }
    });
    
    if (!jobCard) {
      return {
        success: false,
        error: 'Job card not found'
      };
    }
    
    if (!jobCard.maximoId) {
      return {
        success: false,
        error: 'Job card not linked to IBM Maximo'
      };
    }
    
    logMaximoActivity('Uploading attachment to Maximo', { 
      maximoId: jobCard.maximoId, 
      filePath,
      description
    });
    
    // For development/testing
    if (MAXIMO_CONFIG.useStubData) {
      // Create a mock upload record
      const filename = path.basename(filePath);
      const fileStats = await fs.stat(filePath);
      const attachmentId = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Update the stub file with attachment info
      const stubFilePath = path.join(MAXIMO_CONFIG.stubDataPath, 'workorders.json');
      const workOrders = await loadStubData('workorders.json');
      const index = workOrders.findIndex((wo: any) => wo.maximoId === jobCard.maximoId);
      
      if (index >= 0) {
        if (!workOrders[index].attachments) {
          workOrders[index].attachments = [];
        }
        
        workOrders[index].attachments.push({
          id: attachmentId,
          filename,
          size: fileStats.size,
          description: description || filename,
          uploadedDate: new Date().toISOString()
        });
        
        await fs.writeFile(stubFilePath, JSON.stringify(workOrders, null, 2));
      }
      
      return {
        success: true,
        data: {
          attachmentId,
          filename,
          size: fileStats.size,
          uploadTime: new Date().toISOString()
        },
        source: 'stub'
      };
    }
    
    // Real Maximo API integration
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', createReadStream(filePath));
    formData.append('description', description || path.basename(filePath));
    
    const response = await axios.post(
      `${MAXIMO_CONFIG.baseUrl}/api/workorders/${jobCard.maximoId}/attachments`,
      formData,
      { 
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return {
      success: true,
      data: response.data,
      source: 'maximo'
    };
  } catch (error: any) {
    logMaximoActivity('Error uploading attachment', error);
    return {
      success: false,
      error: `Failed to upload attachment: ${error?.message || 'Unknown error'}`,
      source: MAXIMO_CONFIG.useStubData ? 'stub' : 'maximo'
    };
  }
};

/**
 * Synchronize all job cards with Maximo
 */
export const synchronizeWithMaximo = async () => {
  try {
    logMaximoActivity('Starting synchronization with Maximo', {});
    
    // Import new work orders from Maximo
    const importResult = await importWorkOrdersAsJobCards();
    
    // Update Maximo with any job card changes from our system
    const jobCards = await prisma.jobCard.findMany({
      where: {
        maximoId: { not: null },
        updatedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    });
    
    const updateResults = {
      total: jobCards.length,
      success: 0,
      failed: 0
    };
    
    for (const jobCard of jobCards) {
      try {
        // Get job card notes
        let notes = {};
        try {
          notes = jobCard.notes ? JSON.parse(jobCard.notes as string) : {};
        } catch (e) {}
        
        // Only update if the job card was last updated in our system
        if ((notes as any)?.lastUpdatedFrom !== 'maximo') {
          const updateResult = await updateWorkOrderStatus(
            jobCard.id, 
            jobCard.status,
            `Status updated from KMRL system on ${new Date().toISOString()}`
          );
          
          if (updateResult.success) {
            updateResults.success++;
          } else {
            updateResults.failed++;
          }
        }
      } catch (error) {
        logMaximoActivity('Error updating job card in Maximo', { jobCardId: jobCard.id, error });
        updateResults.failed++;
      }
    }
    
    const results = {
      import: importResult.success ? importResult.data : { error: importResult.error },
      updates: updateResults
    };
    
    logMaximoActivity('Synchronization completed', results);
    return {
      success: true,
      data: results
    };
  } catch (error: any) {
    logMaximoActivity('Synchronization failed', error);
    return {
      success: false,
      error: `Failed to synchronize with Maximo: ${error?.message || 'Unknown error'}`
    };
  }
};

/**
 * Create sample job cards from Maximo work orders
 * This function is for development/testing to populate the database with realistic data
 */
export const createSampleJobCards = async (count: number = 20) => {
  try {
    logMaximoActivity('Creating sample job cards', { count });
    
    // Get all trainsets
    const trainsets = await prisma.trainset.findMany();
    if (trainsets.length === 0) {
      return {
        success: false,
        error: 'No trainsets found in the database'
      };
    }
    
    // Generate sample work orders
    const workOrders = generateSampleWorkOrders(count);
    const results = {
      total: workOrders.length,
      created: 0,
      errors: 0
    };
    
    // Create job cards from work orders
    for (const workOrder of workOrders) {
      try {
        // Find or select a random trainset
        let trainset = trainsets.find(t => t.trainsetNumber === workOrder.trainsetNumber);
        if (!trainset) {
          trainset = trainsets[Math.floor(Math.random() * trainsets.length)];
        }
        
        // Create job card
        await prisma.jobCard.create({
          data: {
            trainsetId: trainset.id,
            jobCardNumber: workOrder.workorderId,
            maximoId: workOrder.maximoId,
            priority: workOrder.priority,
            status: mapMaximoStatusToJobCardStatus(workOrder.status),
            workType: workOrder.workType,
            description: workOrder.description,
            estimatedHours: workOrder.estimatedDuration ? workOrder.estimatedDuration / 60 : null,
            assignedTo: workOrder.assignedTo,
            scheduledDate: new Date(workOrder.createdDate),
            completedDate: workOrder.status === 'COMP' ? new Date() : null,
            notes: JSON.stringify({
              title: workOrder.title,
              category: workOrder.workType,
              parts: workOrder.parts || [],
              dueDate: workOrder.dueDate,
              workOrder: {
                id: workOrder.workorderId,
                maximoId: workOrder.maximoId,
                source: 'IBM_MAXIMO',
                importDate: new Date().toISOString()
              },
              lastUpdatedFrom: 'maximo'
            })
          }
        });
        
        results.created++;
      } catch (error) {
        logMaximoActivity('Error creating sample job card', error);
        results.errors++;
      }
    }
    
    logMaximoActivity('Sample creation completed', results);
    return {
      success: true,
      data: results
    };
  } catch (error: any) {
    logMaximoActivity('Sample creation failed', error);
    return {
      success: false,
      error: `Failed to create sample job cards: ${error?.message || 'Unknown error'}`
    };
  }
};

export default {
  fetchWorkOrders,
  fetchWorkOrderDetails,
  importWorkOrdersAsJobCards,
  updateWorkOrderStatus,
  uploadAttachmentToMaximo,
  synchronizeWithMaximo,
  createSampleJobCards
};
