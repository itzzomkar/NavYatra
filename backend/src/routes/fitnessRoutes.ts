/**
 * Fitness Certificate Routes with Comprehensive Functionality
 * 
 * Full-featured CRUD operations for fitness certificate management including:
 * - Certificate creation, retrieval, updating, and deletion
 * - Advanced filtering, search, and pagination
 * - Document management and file uploads
 * - Compliance tracking and analytics
 * - Real-time WebSocket updates
 * - Expiry alerts and renewal management
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import {
  createSampleFitnessCertificates,
  validateCertificateStatus,
  generateComplianceReport,
  processCertificateRenewal
} from '../utils/fitnessIntegration';
import fitnessIntegration from '../utils/fitnessIntegration';
const FITNESS_CONFIG = fitnessIntegration.FITNESS_CONFIG;
import * as fs from 'fs/promises';

const router = Router();
const prisma = new PrismaClient();

// Multer configuration for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'fitness-certificates');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `fitness-cert-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only documents, images, and archives are allowed!'));
    }
  }
});

// WebSocket instance (will be set by the server)
let io: Server;

export const setSocketIO = (socketIO: Server) => {
  io = socketIO;
};

// Emit fitness certificate updates to connected clients
const emitFitnessUpdate = (certificate: any, action: string = 'updated') => {
  if (io) {
    io.to('fitness').emit('fitness:updated', {
      certificate,
      action,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * GET /api/fitness-certificates - Get all fitness certificates with filtering, sorting, and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '25',
      status,
      trainsetId,
      trainsetNumber,
      depot,
      issuingAuthority,
      expiringIn,
      search,
      sortBy = 'expiryDate',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = String(status).toUpperCase();
    }

    if (trainsetId) {
      where.trainsetId = String(trainsetId);
    }

    if (issuingAuthority) {
      where.issuingAuthority = { contains: String(issuingAuthority) };
    }

    if (depot) {
      where.trainset = { depot: String(depot) };
    }

    if (expiringIn) {
      const daysAhead = parseInt(String(expiringIn));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      where.expiryDate = {
        lte: futureDate,
        gte: new Date()
      };
      where.status = 'VALID';
    }

    if (search) {
      const searchTerm = String(search);
      where.OR = [
        { certificateNumber: { contains: searchTerm } },
        { issuingAuthority: { contains: searchTerm } },
        { remarks: { contains: searchTerm } },
        { trainset: { trainsetNumber: { contains: searchTerm } } }
      ];
    }

    if (trainsetNumber) {
      // Find trainsets by number
      const trainsets = await prisma.trainset.findMany({
        where: { trainsetNumber: { contains: String(trainsetNumber) } }
      });
      if (trainsets.length > 0) {
        where.trainsetId = { in: trainsets.map(t => t.id) };
      } else {
        // No trainsets found, return empty result
        return res.json({
          success: true,
          message: 'Fitness certificates retrieved',
          data: {
            items: [],
            pagination: {
              currentPage: pageNum,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: pageSize,
              hasNextPage: false,
              hasPreviousPage: false
            }
          }
        });
      }
    }

    // Build order clause
    const orderBy: any = {};
    if (sortBy === 'trainsetNumber') {
      orderBy.trainset = { trainsetNumber: sortOrder as 'asc' | 'desc' };
    } else if (sortBy === 'issueDate' || sortBy === 'expiryDate') {
      orderBy[sortBy] = sortOrder as 'asc' | 'desc';
    } else if (['status', 'createdAt', 'updatedAt'].includes(sortBy as string)) {
      orderBy[sortBy as string] = sortOrder as 'asc' | 'desc';
    } else {
      orderBy.expiryDate = 'asc';
    }

    // Fetch data
    const [items, totalItems] = await Promise.all([
      prisma.fitnessCertificate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          trainset: {
            select: {
              id: true,
              trainsetNumber: true,
              manufacturer: true,
              model: true,
              depot: true,
              status: true,
              yearOfManufacture: true
            }
          }
        }
      }),
      prisma.fitnessCertificate.count({ where })
    ]);

    // Transform data to include computed fields and document parsing
    const transformedItems = items.map((item: any) => {
      let documents: any = {};
      try {
        documents = item.documents ? JSON.parse(item.documents) : {};
      } catch (e) {}

      const validation = validateCertificateStatus(item);

      return {
        id: item.id,
        certificateNumber: item.certificateNumber,
        trainsetId: item.trainsetId,
        trainsetNumber: item.trainset?.trainsetNumber,
        trainset: item.trainset,
        issueDate: item.issueDate,
        expiryDate: item.expiryDate,
        status: item.status,
        issuingAuthority: item.issuingAuthority,
        remarks: item.remarks,
        lastChecked: item.lastChecked,
        certificateType: documents.certificateType || 'Annual Fitness Certificate',
        documentCount: documents.documents?.length || 0,
        assessmentScore: documents.assessmentData?.overallScore || null,
        complianceStatus: documents.complianceChecks ? 
          documents.complianceChecks.filter((c: any) => c.status === 'COMPLIANT').length + 
          '/' + documents.complianceChecks.length : null,
        isValid: validation.isValid,
        daysToExpiry: validation.daysToExpiry,
        needsRenewal: validation.needsRenewal,
        alerts: validation.alerts,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });

    return res.json({
      success: true,
      message: 'Fitness certificates retrieved',
      data: {
        items: transformedItems,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalItems / pageSize) || 1,
          totalItems,
          itemsPerPage: pageSize,
          hasNextPage: pageNum * pageSize < totalItems,
          hasPreviousPage: pageNum > 1
        },
        filters: {
          status,
          trainsetId,
          trainsetNumber,
          depot,
          issuingAuthority,
          expiringIn,
          search
        },
        sorting: {
          sortBy,
          sortOrder
        }
      }
    });
  } catch (error) {
    console.error('Error fetching fitness certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fitness certificates',
      error: { code: 'FETCH_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/fitness-certificates/analytics/dashboard - Get fitness certificate analytics
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const complianceReport = await generateComplianceReport();
    
    if (complianceReport.success) {
      return res.json({
        success: true,
        message: 'Fitness certificate analytics retrieved',
        data: complianceReport.data
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate analytics',
        error: complianceReport.error
      });
    }
  } catch (error) {
    console.error('Error fetching fitness analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: { code: 'ANALYTICS_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/fitness-certificates/expiring - Get certificates expiring soon
 */
router.get('/expiring', async (req, res) => {
  try {
    const { days = '30' } = req.query;
    const daysAhead = parseInt(String(days));
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiringCertificates = await prisma.fitnessCertificate.findMany({
      where: {
        status: 'VALID',
        expiryDate: {
          lte: futureDate,
          gte: new Date()
        }
      },
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true,
            model: true,
            depot: true,
            status: true
          }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });

    const transformedCertificates = expiringCertificates.map(cert => ({
      ...cert,
      daysToExpiry: Math.ceil((new Date(cert.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    }));

    return res.json({
      success: true,
      message: 'Expiring certificates retrieved',
      data: {
        certificates: transformedCertificates,
        count: expiringCertificates.length,
        daysAhead
      }
    });
  } catch (error) {
    console.error('Error fetching expiring certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring certificates',
      error: { code: 'EXPIRING_FETCH_ERROR', message: String(error) }
    });
  }
});

/**
 * GET /api/fitness-certificates/:id - Get single fitness certificate with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.fitnessCertificate.findUnique({
      where: { id: req.params.id },
      include: {
        trainset: {
          select: {
            id: true,
            trainsetNumber: true,
            manufacturer: true,
            model: true,
            yearOfManufacture: true,
            depot: true,
            status: true,
            location: true
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Fitness certificate not found'
      });
    }

    let documents: any = {};
    try {
      documents = item.documents ? JSON.parse(item.documents as string) : {};
    } catch (e) {}

    const validation = validateCertificateStatus(item);

    const certificate = {
      id: item.id,
      certificateNumber: item.certificateNumber,
      trainsetId: item.trainsetId,
      trainset: item.trainset,
      issueDate: item.issueDate,
      expiryDate: item.expiryDate,
      status: item.status,
      issuingAuthority: item.issuingAuthority,
      remarks: item.remarks,
      lastChecked: item.lastChecked,
      certificateType: documents.certificateType || 'Annual Fitness Certificate',
      documents: documents.documents || [],
      assessmentData: documents.assessmentData || {},
      complianceChecks: documents.complianceChecks || [],
      inspectionDetails: documents.inspectionDetails || {},
      validation,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    return res.json({
      success: true,
      message: 'Fitness certificate retrieved',
      data: { certificate }
    });
  } catch (error) {
    console.error('Error fetching fitness certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fitness certificate',
      error: { code: 'FETCH_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/fitness-certificates - Create new fitness certificate
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};

    // Validate required fields
    if (!body.trainsetId || !body.certificateNumber || !body.issuingAuthority) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: trainsetId, certificateNumber, and issuingAuthority are required'
      });
    }

    // Check if trainset exists
    const trainset = await prisma.trainset.findUnique({
      where: { id: String(body.trainsetId) }
    });

    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    // Check if certificate number already exists
    const existingCert = await prisma.fitnessCertificate.findUnique({
      where: { certificateNumber: String(body.certificateNumber) }
    });

    if (existingCert) {
      return res.status(400).json({
        success: false,
        message: 'Certificate number already exists'
      });
    }

    // Prepare certificate data
    const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : 
      new Date(issueDate.getTime() + FITNESS_CONFIG.certificateValidityMonths * 30 * 24 * 60 * 60 * 1000);

    const documentData = {
      certificateType: body.certificateType || 'Annual Fitness Certificate',
      documents: body.documents || [],
      assessmentData: body.assessmentData || {},
      complianceChecks: body.complianceChecks || [],
      inspectionDetails: body.inspectionDetails || {}
    };

    const certificateData = {
      trainsetId: String(body.trainsetId),
      certificateNumber: String(body.certificateNumber),
      issueDate,
      expiryDate,
      status: String(body.status || 'VALID').toUpperCase(),
      issuingAuthority: String(body.issuingAuthority),
      remarks: body.remarks || 'Certificate issued',
      documents: JSON.stringify(documentData),
      lastChecked: new Date()
    };

    const created = await prisma.fitnessCertificate.create({
      data: certificateData,
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true,
            model: true
          }
        }
      }
    });

    // Emit real-time update
    emitFitnessUpdate(created, 'created');

    return res.status(201).json({
      success: true,
      message: 'Fitness certificate created',
      data: {
        certificate: {
          id: created.id,
          certificateNumber: created.certificateNumber,
          trainsetNumber: created.trainset?.trainsetNumber,
          status: created.status,
          expiryDate: created.expiryDate
        }
      }
    });
  } catch (error) {
    console.error('Error creating fitness certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fitness certificate',
      error: { code: 'CREATE_ERROR', message: String(error) }
    });
  }
});

/**
 * PUT /api/fitness-certificates/:id - Update fitness certificate
 */
router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};

    // Get existing certificate
    const existing = await prisma.fitnessCertificate.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Fitness certificate not found'
      });
    }

    // Parse existing documents
    let existingDocs: any = {};
    try {
      existingDocs = existing.documents ? JSON.parse(existing.documents as string) : {};
    } catch (e) {}

    // Prepare update data
    const updateData: any = { lastChecked: new Date() };

    if (body.status) updateData.status = String(body.status).toUpperCase();
    if (body.issuingAuthority) updateData.issuingAuthority = String(body.issuingAuthority);
    if (body.remarks) updateData.remarks = String(body.remarks);
    if (body.issueDate) updateData.issueDate = new Date(body.issueDate);
    if (body.expiryDate) updateData.expiryDate = new Date(body.expiryDate);

    // Update documents if provided
    if (body.documents || body.assessmentData || body.complianceChecks || body.inspectionDetails) {
      const updatedDocuments = {
        ...existingDocs,
        ...(body.certificateType && { certificateType: body.certificateType }),
        ...(body.documents && { documents: body.documents }),
        ...(body.assessmentData && { assessmentData: body.assessmentData }),
        ...(body.complianceChecks && { complianceChecks: body.complianceChecks }),
        ...(body.inspectionDetails && { inspectionDetails: body.inspectionDetails })
      };
      updateData.documents = JSON.stringify(updatedDocuments);
    }

    const updated = await prisma.fitnessCertificate.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        trainset: {
          select: {
            trainsetNumber: true,
            manufacturer: true,
            model: true
          }
        }
      }
    });

    // Emit real-time update
    emitFitnessUpdate(updated, 'updated');

    return res.json({
      success: true,
      message: 'Fitness certificate updated',
      data: {
        certificate: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error updating fitness certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update fitness certificate',
      error: { code: 'UPDATE_ERROR', message: String(error) }
    });
  }
});

/**
 * PATCH /api/fitness-certificates/:id/status - Update certificate status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, remarks, updatedBy } = req.body || {};

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const existing = await prisma.fitnessCertificate.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Fitness certificate not found'
      });
    }

    const newStatus = String(status).toUpperCase();
    const updateRemarks = remarks || `Status updated to ${newStatus} by ${updatedBy || 'system'}`;

    const updated = await prisma.fitnessCertificate.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        remarks: updateRemarks,
        lastChecked: new Date()
      }
    });

    // Emit real-time update
    emitFitnessUpdate(updated, 'status_updated');

    return res.json({
      success: true,
      message: 'Certificate status updated',
      data: {
        certificate: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error updating certificate status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update certificate status',
      error: { code: 'STATUS_UPDATE_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/fitness-certificates/:id/renew - Renew fitness certificate
 */
router.post('/:id/renew', async (req, res) => {
  try {
    const renewalResult = await processCertificateRenewal(req.params.id, req.body);

    if (renewalResult.success) {
      // Emit real-time update
      emitFitnessUpdate(renewalResult.data?.newCertificate, 'renewed');

      return res.json({
        success: true,
        message: 'Certificate renewed successfully',
        data: renewalResult.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Failed to renew certificate',
        error: renewalResult.error
      });
    }
  } catch (error) {
    console.error('Error renewing certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew certificate',
      error: { code: 'RENEWAL_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/fitness-certificates/:id/documents - Upload document to fitness certificate
 */
router.post('/:id/documents', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document uploaded'
      });
    }

    const existing = await prisma.fitnessCertificate.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Fitness certificate not found'
      });
    }

    // Parse existing documents
    let documents: any = {};
    try {
      documents = existing.documents ? JSON.parse(existing.documents as string) : {};
    } catch (e) {}

    // Add new document
    if (!documents.documents) documents.documents = [];
    const newDocument = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: req.body.documentName || req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      type: path.extname(req.file.originalname).toLowerCase(),
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      description: req.body.description || '',
      verified: false
    };

    documents.documents.push(newDocument);

    const updated = await prisma.fitnessCertificate.update({
      where: { id: req.params.id },
      data: { documents: JSON.stringify(documents) }
    });

    // Emit real-time update
    emitFitnessUpdate(updated, 'document_added');

    return res.json({
      success: true,
      message: 'Document uploaded',
      data: {
        document: {
          id: newDocument.id,
          name: newDocument.name,
          size: newDocument.size
        }
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: { code: 'UPLOAD_ERROR', message: String(error) }
    });
  }
});

/**
 * DELETE /api/fitness-certificates/:id - Delete fitness certificate
 */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.fitnessCertificate.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Fitness certificate not found'
      });
    }

    const deleted = await prisma.fitnessCertificate.delete({
      where: { id: req.params.id }
    });

    // Emit real-time update
    emitFitnessUpdate(deleted, 'deleted');

    return res.json({
      success: true,
      message: 'Fitness certificate deleted',
      data: {
        certificateId: req.params.id
      }
    });
  } catch (error) {
    console.error('Error deleting fitness certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete fitness certificate',
      error: { code: 'DELETE_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/fitness-certificates/sample/create - Create sample fitness certificates for development
 */
router.post('/sample/create', async (req, res) => {
  try {
    const { count = 20 } = req.body;
    console.log(`🎲 Creating ${count} sample fitness certificates...`);

    const result = await createSampleFitnessCertificates(count);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Sample fitness certificates created',
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to create sample certificates',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error creating sample certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sample certificates',
      error: { code: 'SAMPLE_CREATE_ERROR', message: String(error) }
    });
  }
});

/**
 * POST /api/fitness-certificates/bulk/status - Bulk update certificate status
 */
router.post('/bulk/status', async (req, res) => {
  try {
    const { certificateIds, status, remarks } = req.body || {};

    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Certificate IDs array is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updateData = {
      status: String(status).toUpperCase(),
      remarks: remarks || `Bulk status update to ${status}`,
      lastChecked: new Date()
    };

    const updatedCertificates = await prisma.$transaction(
      certificateIds.map((id: string) =>
        prisma.fitnessCertificate.update({
          where: { id },
          data: updateData,
          include: {
            trainset: {
              select: {
                trainsetNumber: true,
                manufacturer: true,
                model: true
              }
            }
          }
        })
      )
    );

    // Emit real-time updates
    if (io) {
      updatedCertificates.forEach(certificate => {
        emitFitnessUpdate(certificate, 'bulk_status_updated');
      });
    }

    return res.json({
      success: true,
      message: `${updatedCertificates.length} certificates updated successfully`,
      data: { updatedCertificates }
    });
  } catch (error) {
    console.error('Error bulk updating certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update certificates',
      error: { code: 'BULK_UPDATE_ERROR', message: String(error) }
    });
  }
});

export default router;