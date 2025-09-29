/**
 * Fitness Certificate Management Utility
 * 
 * This module provides comprehensive fitness certificate management functionality
 * including certificate generation, validation, compliance tracking, document handling,
 * and integration with regulatory authorities.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Initialize Prisma client
const prisma = new PrismaClient();

// Configuration for fitness certificate management
const FITNESS_CONFIG = {
  certificateValidityMonths: 12, // Standard fitness certificate validity period
  reminderDaysBefore: [30, 15, 7, 3, 1], // Days before expiry to send reminders
  issuingAuthorities: [
    'Commissioner of Railway Safety (CRS)',
    'Chief Commissioner of Railway Safety (CCRS)',
    'KMRL Safety Department',
    'Independent Railway Safety Assessor',
    'Metro Railway Safety Board'
  ],
  certificateTypes: [
    'Initial Fitness Certificate',
    'Annual Fitness Certificate',
    'Post-Maintenance Fitness',
    'Emergency Fitness Assessment',
    'Compliance Fitness Check'
  ],
  statusTypes: ['VALID', 'EXPIRED', 'PENDING', 'INVALID', 'UNDER_REVIEW', 'SUSPENDED'],
  documentTypes: [
    'Fitness Certificate PDF',
    'Technical Assessment Report',
    'Safety Compliance Certificate',
    'Inspection Photos',
    'Test Results Data',
    'Maintenance Records'
  ],
  stubDataPath: './data/fitness-stubs'
};

// Logging function
const logFitnessActivity = (activity: string, details: any) => {
  console.log(`[FITNESS CERTIFICATE] ${activity}`, details);
};

/**
 * Generate sample fitness certificates for development/testing
 */
export const generateSampleFitnessCertificates = (count: number = 20) => {
  const statuses = FITNESS_CONFIG.statusTypes;
  const authorities = FITNESS_CONFIG.issuingAuthorities;
  const types = FITNESS_CONFIG.certificateTypes;
  const trainsetNumbers = Array.from({length: 30}, (_, i) => `KMRL-${(i+1).toString().padStart(3, '0')}`);

  return Array.from({length: count}, (_, i) => {
    const issueDate = new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(issueDate.getTime() + FITNESS_CONFIG.certificateValidityMonths * 30 * 24 * 60 * 60 * 1000);
    const trainsetNumber = trainsetNumbers[Math.floor(Math.random() * trainsetNumbers.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const authority = authorities[Math.floor(Math.random() * authorities.length)];
    const certificateType = types[Math.floor(Math.random() * types.length)];

    // Adjust expiry date based on status
    if (status === 'EXPIRED') {
      expiryDate.setTime(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
    } else if (status === 'PENDING' || status === 'UNDER_REVIEW') {
      expiryDate.setTime(Date.now() + Math.floor(Math.random() * 30 + 30) * 24 * 60 * 60 * 1000);
    }

    return {
      certificateNumber: `FC-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      trainsetNumber,
      certificateType,
      issueDate: issueDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      status,
      issuingAuthority: authority,
      remarks: generateCertificateRemarks(status, certificateType),
      documents: generateCertificateDocuments(),
      assessmentData: generateAssessmentData(),
      complianceChecks: generateComplianceChecks(),
      inspectionDetails: generateInspectionDetails()
    };
  });
};

/**
 * Generate certificate remarks based on status and type
 */
const generateCertificateRemarks = (status: string, type: string): string => {
  const remarks = {
    VALID: [
      'All safety systems operational and compliant',
      'Trainset meets all regulatory standards',
      'Comprehensive inspection completed successfully',
      'All maintenance requirements fulfilled'
    ],
    EXPIRED: [
      'Certificate has expired - renewal required',
      'Immediate fitness assessment needed',
      'Service suspension until recertification'
    ],
    PENDING: [
      'Awaiting final inspection report',
      'Documentation under review',
      'Pending compliance verification'
    ],
    UNDER_REVIEW: [
      'Technical assessment in progress',
      'Additional testing required',
      'Regulatory approval pending'
    ],
    INVALID: [
      'Failed compliance standards',
      'Critical safety issues identified',
      'Major repairs required before certification'
    ],
    SUSPENDED: [
      'Service temporarily suspended',
      'Investigation in progress',
      'Awaiting corrective actions'
    ]
  };

  const statusRemarks = remarks[status as keyof typeof remarks] || remarks.VALID;
  return statusRemarks[Math.floor(Math.random() * statusRemarks.length)];
};

/**
 * Generate certificate documents
 */
const generateCertificateDocuments = () => {
  const docCount = Math.floor(Math.random() * 4) + 2; // 2-5 documents
  return Array.from({length: docCount}, (_, i) => ({
    id: `doc-${Date.now()}-${i}`,
    name: FITNESS_CONFIG.documentTypes[Math.floor(Math.random() * FITNESS_CONFIG.documentTypes.length)],
    type: ['PDF', 'JPG', 'DOCX', 'XLSX'][Math.floor(Math.random() * 4)],
    size: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
    uploadDate: new Date().toISOString(),
    verified: Math.random() > 0.2 // 80% verification rate
  }));
};

/**
 * Generate assessment data
 */
const generateAssessmentData = () => {
  return {
    overallScore: Math.floor(Math.random() * 30) + 70, // 70-100 score
    categories: {
      mechanicalSystems: Math.floor(Math.random() * 20) + 80,
      electricalSystems: Math.floor(Math.random() * 20) + 80,
      safetyEquipment: Math.floor(Math.random() * 15) + 85,
      brakingSystems: Math.floor(Math.random() * 15) + 85,
      signalingSystems: Math.floor(Math.random() * 20) + 80,
      structuralIntegrity: Math.floor(Math.random() * 15) + 85
    },
    testResults: {
      brakingDistance: `${Math.floor(Math.random() * 50) + 100}m`,
      maxSpeed: `${Math.floor(Math.random() * 20) + 80}km/h`,
      accelerationRate: `${(Math.random() * 0.5 + 1.0).toFixed(2)}m/s²`,
      noiseLevel: `${Math.floor(Math.random() * 10) + 65}dB`,
      vibrationLevel: `${(Math.random() * 2 + 3).toFixed(1)}mm/s`
    },
    inspector: `Inspector-${Math.floor(Math.random() * 50) + 1}`,
    inspectionDate: new Date().toISOString()
  };
};

/**
 * Generate compliance checks
 */
const generateComplianceChecks = () => {
  const checks = [
    'Fire Safety Systems',
    'Emergency Communication',
    'Passenger Safety Equipment',
    'Door Operation Systems',
    'HVAC Systems',
    'Lighting Systems',
    'Public Address System',
    'CCTV Systems',
    'Wheelchair Accessibility',
    'Emergency Evacuation Routes'
  ];

  return checks.map(check => ({
    checkName: check,
    status: Math.random() > 0.1 ? 'COMPLIANT' : 'NON_COMPLIANT',
    checkedDate: new Date().toISOString(),
    notes: Math.random() > 0.7 ? 'Minor adjustments required' : 'Fully compliant',
    inspector: `QA-${Math.floor(Math.random() * 20) + 1}`
  }));
};

/**
 * Generate inspection details
 */
const generateInspectionDetails = () => {
  return {
    inspectionType: FITNESS_CONFIG.certificateTypes[Math.floor(Math.random() * FITNESS_CONFIG.certificateTypes.length)],
    duration: `${Math.floor(Math.random() * 4) + 2} hours`,
    location: ['MUTTOM Depot', 'ALUVA Station', 'MG Road Workshop'][Math.floor(Math.random() * 3)],
    weatherConditions: ['Clear', 'Rainy', 'Cloudy'][Math.floor(Math.random() * 3)],
    temperature: `${Math.floor(Math.random() * 10) + 25}°C`,
    humidity: `${Math.floor(Math.random() * 30) + 50}%`,
    inspectorTeam: Array.from({length: Math.floor(Math.random() * 3) + 2}, (_, i) => 
      `Inspector-${Math.floor(Math.random() * 100) + 1}`
    ),
    equipmentUsed: [
      'Digital Multimeter',
      'Torque Wrench Set',
      'Pressure Gauges',
      'Vibration Analyzer',
      'Sound Level Meter',
      'Thermal Imaging Camera'
    ].slice(0, Math.floor(Math.random() * 4) + 2)
  };
};

/**
 * Validate certificate status based on expiry and conditions
 */
export const validateCertificateStatus = (certificate: any) => {
  const now = new Date();
  const expiryDate = new Date(certificate.expiryDate);
  const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

  let suggestedStatus = certificate.status;
  let alerts: any[] = [];

  if (expiryDate <= now && certificate.status === 'VALID') {
    suggestedStatus = 'EXPIRED';
    alerts.push({
      type: 'CRITICAL',
      message: 'Certificate has expired',
      action: 'Immediate renewal required'
    });
  } else if (daysDiff <= 30 && certificate.status === 'VALID') {
    alerts.push({
      type: 'WARNING',
      message: `Certificate expires in ${daysDiff} days`,
      action: 'Schedule renewal process'
    });
  }

  return {
    currentStatus: certificate.status,
    suggestedStatus,
    daysToExpiry: daysDiff,
    alerts,
    isValid: certificate.status === 'VALID' && expiryDate > now,
    needsRenewal: daysDiff <= 30
  };
};

/**
 * Create sample fitness certificates from generated data
 */
export const createSampleFitnessCertificates = async (count: number = 20) => {
  try {
    logFitnessActivity('Creating sample fitness certificates', { count });

    // Get all trainsets
    const trainsets = await prisma.trainset.findMany();
    if (trainsets.length === 0) {
      return {
        success: false,
        error: 'No trainsets found in the database'
      };
    }

    // Generate sample certificates
    const sampleCertificates = generateSampleFitnessCertificates(count);
    const results = {
      total: sampleCertificates.length,
      created: 0,
      errors: 0,
      skipped: 0
    };

    // Create certificates
    for (const certData of sampleCertificates) {
      try {
        // Find or select a random trainset
        let trainset = trainsets.find(t => t.trainsetNumber === certData.trainsetNumber);
        if (!trainset) {
          trainset = trainsets[Math.floor(Math.random() * trainsets.length)];
        }

        // Check if certificate number already exists
        const existing = await prisma.fitnessCertificate.findUnique({
          where: { certificateNumber: certData.certificateNumber }
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create certificate
        await prisma.fitnessCertificate.create({
          data: {
            trainsetId: trainset.id,
            certificateNumber: certData.certificateNumber,
            issueDate: new Date(certData.issueDate),
            expiryDate: new Date(certData.expiryDate),
            status: certData.status,
            issuingAuthority: certData.issuingAuthority,
            remarks: certData.remarks,
            documents: JSON.stringify({
              certificateType: certData.certificateType,
              documents: certData.documents,
              assessmentData: certData.assessmentData,
              complianceChecks: certData.complianceChecks,
              inspectionDetails: certData.inspectionDetails
            }),
            lastChecked: new Date()
          }
        });

        results.created++;
      } catch (error) {
        logFitnessActivity('Error creating sample certificate', error);
        results.errors++;
      }
    }

    logFitnessActivity('Sample certificate creation completed', results);
    return {
      success: true,
      data: results
    };
  } catch (error: any) {
    logFitnessActivity('Sample creation failed', error);
    return {
      success: false,
      error: `Failed to create sample certificates: ${error?.message || 'Unknown error'}`
    };
  }
};

/**
 * Generate fitness certificate compliance report
 */
export const generateComplianceReport = async () => {
  try {
    logFitnessActivity('Generating compliance report', {});

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      totalCertificates,
      validCertificates,
      expiredCertificates,
      pendingCertificates,
      expiringIn30Days,
      recentlyExpired,
      complianceByDepot,
      certificatesByAuthority
    ] = await Promise.all([
      prisma.fitnessCertificate.count(),
      prisma.fitnessCertificate.count({ where: { status: 'VALID' } }),
      prisma.fitnessCertificate.count({ where: { status: 'EXPIRED' } }),
      prisma.fitnessCertificate.count({ where: { status: 'PENDING' } }),
      prisma.fitnessCertificate.count({
        where: {
          status: 'VALID',
          expiryDate: { lte: thirtyDaysFromNow, gte: now }
        }
      }),
      prisma.fitnessCertificate.count({
        where: {
          status: 'EXPIRED',
          expiryDate: { gte: ninetyDaysAgo }
        }
      }),
      prisma.fitnessCertificate.findMany({
        include: {
          trainset: {
            select: { depot: true, status: true }
          }
        }
      }),
      prisma.fitnessCertificate.groupBy({
        by: ['issuingAuthority'],
        _count: { issuingAuthority: true }
      })
    ]);

    // Calculate compliance metrics
    const depotCompliance = complianceByDepot.reduce((acc: any, cert: any) => {
      const depot = cert.trainset.depot;
      if (!acc[depot]) {
        acc[depot] = { total: 0, valid: 0, expired: 0, pending: 0 };
      }
      acc[depot].total++;
      if (cert.status === 'VALID') acc[depot].valid++;
      if (cert.status === 'EXPIRED') acc[depot].expired++;
      if (cert.status === 'PENDING') acc[depot].pending++;
      return acc;
    }, {});

    const complianceRate = totalCertificates > 0 ? 
      ((validCertificates / totalCertificates) * 100).toFixed(1) : '0.0';

    const report = {
      summary: {
        totalCertificates,
        validCertificates,
        expiredCertificates,
        pendingCertificates,
        complianceRate: parseFloat(complianceRate),
        expiringIn30Days,
        recentlyExpired
      },
      depotCompliance: Object.entries(depotCompliance).map(([depot, stats]: [string, any]) => ({
        depot,
        ...stats,
        complianceRate: stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : '0.0'
      })),
      issuingAuthorities: certificatesByAuthority.map(auth => ({
        authority: auth.issuingAuthority,
        count: auth._count.issuingAuthority
      })),
      alerts: {
        criticalExpiry: expiringIn30Days > 0 ? `${expiringIn30Days} certificates expiring in 30 days` : null,
        overdueCertificates: expiredCertificates > 0 ? `${expiredCertificates} expired certificates need renewal` : null,
        pendingApprovals: pendingCertificates > 0 ? `${pendingCertificates} certificates pending approval` : null
      },
      recommendedActions: generateComplianceRecommendations({
        expiringIn30Days,
        expiredCertificates,
        pendingCertificates,
        complianceRate: parseFloat(complianceRate)
      }),
      reportGeneratedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: report
    };
  } catch (error: any) {
    logFitnessActivity('Compliance report generation failed', error);
    return {
      success: false,
      error: `Failed to generate compliance report: ${error?.message || 'Unknown error'}`
    };
  }
};

/**
 * Generate compliance recommendations
 */
const generateComplianceRecommendations = (metrics: any) => {
  const recommendations: any[] = [];

  if (metrics.expiringIn30Days > 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Schedule immediate fitness renewals',
      description: `${metrics.expiringIn30Days} certificates expiring within 30 days`,
      timeframe: 'Within 7 days'
    });
  }

  if (metrics.expiredCertificates > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      action: 'Suspend operations for expired certificates',
      description: `${metrics.expiredCertificates} trainsets operating with expired certificates`,
      timeframe: 'Immediate'
    });
  }

  if (metrics.pendingCertificates > 5) {
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Expedite pending certificate approvals',
      description: `${metrics.pendingCertificates} certificates pending approval may cause delays`,
      timeframe: 'Within 14 days'
    });
  }

  if (metrics.complianceRate < 80) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Improve overall compliance rate',
      description: `Current compliance rate of ${metrics.complianceRate}% is below recommended 80%`,
      timeframe: 'Within 30 days'
    });
  }

  return recommendations;
};

/**
 * Process certificate renewal
 */
export const processCertificateRenewal = async (certificateId: string, renewalData: any) => {
  try {
    logFitnessActivity('Processing certificate renewal', { certificateId });

    // Get existing certificate
    const existingCert = await prisma.fitnessCertificate.findUnique({
      where: { id: certificateId },
      include: { trainset: true }
    });

    if (!existingCert) {
      return {
        success: false,
        error: 'Certificate not found'
      };
    }

    // Generate new certificate number
    const newCertNumber = `FC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const issueDate = new Date();
    const expiryDate = new Date(issueDate.getTime() + FITNESS_CONFIG.certificateValidityMonths * 30 * 24 * 60 * 60 * 1000);

    // Create renewal record
    const renewedCertificate = await prisma.fitnessCertificate.create({
      data: {
        trainsetId: existingCert.trainsetId,
        certificateNumber: newCertNumber,
        issueDate,
        expiryDate,
        status: 'VALID',
        issuingAuthority: renewalData.issuingAuthority || existingCert.issuingAuthority,
        remarks: renewalData.remarks || 'Certificate renewed successfully',
        documents: renewalData.documents || existingCert.documents,
        lastChecked: new Date()
      },
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

    // Mark old certificate as expired
    await prisma.fitnessCertificate.update({
      where: { id: certificateId },
      data: { status: 'EXPIRED', remarks: `Replaced by certificate ${newCertNumber}` }
    });

    return {
      success: true,
      data: {
        oldCertificate: existingCert,
        newCertificate: renewedCertificate,
        renewalDate: issueDate.toISOString()
      }
    };
  } catch (error: any) {
    logFitnessActivity('Certificate renewal failed', error);
    return {
      success: false,
      error: `Failed to renew certificate: ${error?.message || 'Unknown error'}`
    };
  }
};

export default {
  generateSampleFitnessCertificates,
  createSampleFitnessCertificates,
  validateCertificateStatus,
  generateComplianceReport,
  processCertificateRenewal,
  FITNESS_CONFIG
};