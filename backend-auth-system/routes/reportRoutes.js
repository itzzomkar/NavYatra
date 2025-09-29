const express = require('express');
const router = express.Router();
const {
  generateTrainReport,
  generateFleetReport,
  generateOptimizationReport,
  exportData,
  getTrainIoTData,
  scheduleReport
} = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Train-specific reports
router.get('/train/:trainId', authorize(['admin', 'operator', 'viewer']), generateTrainReport);
router.get('/train/:trainId/iot', authorize(['admin', 'operator']), getTrainIoTData);

// Fleet reports
router.get('/fleet', authorize(['admin', 'operator', 'viewer']), generateFleetReport);

// Optimization reports
router.get('/optimization', authorize(['admin', 'operator']), generateOptimizationReport);

// Data export endpoints
router.get('/export', authorize(['admin', 'operator']), exportData);

// Scheduled reports
router.post('/schedule', authorize(['admin', 'operator']), scheduleReport);

// Get list of available scheduled reports
router.get('/scheduled', authorize(['admin', 'operator']), async (req, res) => {
  try {
    // Mock scheduled reports data
    const scheduledReports = [
      {
        id: 'sched_1',
        reportType: 'fleet',
        frequency: 'daily',
        format: 'pdf',
        recipients: ['fleet.manager@kmrl.com'],
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'sched_2',
        reportType: 'optimization',
        frequency: 'weekly',
        format: 'excel',
        recipients: ['operations@kmrl.com', 'management@kmrl.com'],
        nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'active',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      }
    ];

    res.json({
      success: true,
      data: scheduledReports
    });

  } catch (error) {
    console.error('Get scheduled reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled reports',
      error: error.message
    });
  }
});

// Delete scheduled report
router.delete('/scheduled/:id', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // In production, this would delete from database
    // For now, just acknowledge the action
    
    res.json({
      success: true,
      message: 'Scheduled report deleted successfully',
      data: { id, deletedAt: new Date() }
    });

  } catch (error) {
    console.error('Delete scheduled report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scheduled report',
      error: error.message
    });
  }
});

// Update scheduled report
router.put('/scheduled/:id', authorize(['admin', 'operator']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Mock update operation
    const updatedReport = {
      id,
      ...updateData,
      updatedAt: new Date(),
      updatedBy: req.user.id
    };
    
    res.json({
      success: true,
      message: 'Scheduled report updated successfully',
      data: updatedReport
    });

  } catch (error) {
    console.error('Update scheduled report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduled report',
      error: error.message
    });
  }
});

// Get report history
router.get('/history', authorize(['admin', 'operator', 'viewer']), async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    // Mock report history data
    let reportHistory = [
      {
        id: 'hist_1',
        type: 'train',
        name: 'KMRL-001 Individual Report',
        format: 'pdf',
        generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        generatedBy: req.user.id,
        size: '2.4 MB',
        downloadUrl: '/api/reports/download/hist_1',
        status: 'ready'
      },
      {
        id: 'hist_2',
        type: 'fleet',
        name: 'Fleet Summary Report',
        format: 'excel',
        generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        generatedBy: req.user.id,
        size: '1.8 MB',
        downloadUrl: '/api/reports/download/hist_2',
        status: 'ready'
      },
      {
        id: 'hist_3',
        type: 'optimization',
        name: 'Optimization Analysis Report',
        format: 'pdf',
        generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        generatedBy: req.user.id,
        size: '3.1 MB',
        downloadUrl: '/api/reports/download/hist_3',
        status: 'ready'
      }
    ];

    if (type) {
      reportHistory = reportHistory.filter(report => report.type === type);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = reportHistory.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: reportHistory.length,
        pages: Math.ceil(reportHistory.length / limit)
      }
    });

  } catch (error) {
    console.error('Get report history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report history',
      error: error.message
    });
  }
});

// Download report from history
router.get('/download/:id', authorize(['admin', 'operator', 'viewer']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, this would:
    // 1. Look up the report in the database
    // 2. Check if the file still exists
    // 3. Stream the file to the client
    
    // For now, return a 404 since we don't have persistent file storage
    res.status(404).json({
      success: false,
      message: 'Report file not found or expired'
    });

  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download report',
      error: error.message
    });
  }
});

// Get report templates
router.get('/templates', authorize(['admin', 'operator']), async (req, res) => {
  try {
    const templates = [
      {
        id: 'train_standard',
        name: 'Individual Train Report',
        description: 'Comprehensive report for a single trainset including fitness, maintenance, and operational data',
        type: 'train',
        formats: ['pdf', 'excel'],
        parameters: ['trainId', 'includeHistory', 'includeFitness', 'includeIoT']
      },
      {
        id: 'fleet_summary',
        name: 'Fleet Summary Report',
        description: 'Overview of entire fleet status, performance metrics, and statistics',
        type: 'fleet',
        formats: ['pdf', 'excel'],
        parameters: ['timeRange', 'includeTrainsets', 'includeFitness', 'includeOptimizations']
      },
      {
        id: 'optimization_analysis',
        name: 'Optimization Analysis Report',
        description: 'Detailed analysis of optimization runs, energy savings, and performance improvements',
        type: 'optimization',
        formats: ['pdf', 'excel'],
        parameters: ['period', 'includeDetails', 'includeMetrics', 'includeComparisons']
      },
      {
        id: 'maintenance_schedule',
        name: 'Maintenance Schedule Report',
        description: 'Upcoming maintenance schedules, overdue items, and maintenance history',
        type: 'maintenance',
        formats: ['pdf', 'excel'],
        parameters: ['timeRange', 'depot', 'priority', 'includeHistory']
      },
      {
        id: 'fitness_compliance',
        name: 'Fitness Compliance Report',
        description: 'Fitness certificate status, upcoming expirations, and compliance overview',
        type: 'fitness',
        formats: ['pdf', 'excel'],
        parameters: ['timeRange', 'depot', 'includeDetails', 'includeAlerts']
      }
    ];

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Get report templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report templates',
      error: error.message
    });
  }
});

// Generate custom report from template
router.post('/generate/:templateId', authorize(['admin', 'operator']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const { parameters, format = 'pdf' } = req.body;
    
    // This would trigger the appropriate report generation based on template
    let result;
    
    switch (templateId) {
      case 'train_standard':
        result = await generateTrainReport(req, res);
        break;
      case 'fleet_summary':
        result = await generateFleetReport(req, res);
        break;
      case 'optimization_analysis':
        result = await generateOptimizationReport(req, res);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid template ID'
        });
    }

  } catch (error) {
    console.error('Generate custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate custom report',
      error: error.message
    });
  }
});

module.exports = router;