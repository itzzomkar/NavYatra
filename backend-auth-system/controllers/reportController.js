const Trainset = require('../models/Trainset');
const Schedule = require('../models/Schedule');
const Optimization = require('../models/Optimization');
const Fitness = require('../models/Fitness');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Generate comprehensive train report
const generateTrainReport = async (req, res) => {
  try {
    const { trainId } = req.params;
    const { format = 'pdf' } = req.query;
    
    const trainset = await Trainset.findById(trainId)
      .populate('latestFitness')
      .populate('currentSchedule');
    
    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    // Gather comprehensive data
    const reportData = await gatherTrainReportData(trainset);
    
    let filePath, fileName;
    
    if (format === 'pdf') {
      const result = await generateTrainPDFReport(reportData);
      filePath = result.filePath;
      fileName = result.fileName;
    } else if (format === 'excel') {
      const result = await generateTrainExcelReport(reportData);
      filePath = result.filePath;
      fileName = result.fileName;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: pdf, excel'
      });
    }

    // Send file as response
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up file after sending
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });

  } catch (error) {
    console.error('Generate train report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

// Generate fleet summary report
const generateFleetReport = async (req, res) => {
  try {
    const { format = 'pdf', timeRange = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Gather fleet data
    const reportData = await gatherFleetReportData(startDate, endDate);
    
    let filePath, fileName;
    
    if (format === 'pdf') {
      const result = await generateFleetPDFReport(reportData);
      filePath = result.filePath;
      fileName = result.fileName;
    } else if (format === 'excel') {
      const result = await generateFleetExcelReport(reportData);
      filePath = result.filePath;
      fileName = result.fileName;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: pdf, excel'
      });
    }

    // Send file as response
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up file after sending
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });

  } catch (error) {
    console.error('Generate fleet report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate fleet report',
      error: error.message
    });
  }
};

// Generate optimization report
const generateOptimizationReport = async (req, res) => {
  try {
    const { format = 'pdf', period = '30d' } = req.query;
    
    const endDate = new Date();
    let startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period.replace('d', '')));

    // Gather optimization data
    const reportData = await gatherOptimizationReportData(startDate, endDate);
    
    let filePath, fileName;
    
    if (format === 'pdf') {
      const result = await generateOptimizationPDFReport(reportData);
      filePath = result.filePath;
      fileName = result.fileName;
    } else if (format === 'excel') {
      const result = await generateOptimizationExcelReport(reportData);
      filePath = result.filePath;
      fileName = result.fileName;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: pdf, excel'
      });
    }

    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });

  } catch (error) {
    console.error('Generate optimization report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate optimization report',
      error: error.message
    });
  }
};

// Export data in CSV format
const exportData = async (req, res) => {
  try {
    const { type, format = 'csv' } = req.query;
    
    let data, filename;
    
    switch (type) {
      case 'trainsets':
        data = await exportTrainsetsData();
        filename = `KMRL_Trainsets_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'fitness':
        data = await exportFitnessData();
        filename = `KMRL_Fitness_Records_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'optimizations':
        data = await exportOptimizationsData();
        filename = `KMRL_Optimizations_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'schedules':
        data = await exportSchedulesData();
        filename = `KMRL_Schedules_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Supported types: trainsets, fitness, optimizations, schedules'
        });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

// Get IoT data for a specific train
const getTrainIoTData = async (req, res) => {
  try {
    const { trainId } = req.params;
    const { timeRange = '24h' } = req.query;
    
    const trainset = await Trainset.findById(trainId);
    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    // Generate mock IoT data (in production, this would come from IoT sensors)
    const iotData = await generateMockIoTData(trainset, timeRange);
    
    res.json({
      success: true,
      data: iotData
    });

  } catch (error) {
    console.error('Get IoT data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch IoT data',
      error: error.message
    });
  }
};

// Scheduled report management
const scheduleReport = async (req, res) => {
  try {
    const { reportType, frequency, format, recipients, parameters } = req.body;
    
    const scheduledReport = {
      id: `scheduled_${Date.now()}`,
      reportType,
      frequency, // daily, weekly, monthly
      format, // pdf, excel, csv
      recipients,
      parameters,
      nextRun: calculateNextRun(frequency),
      createdBy: req.user.id,
      createdAt: new Date(),
      status: 'active'
    };
    
    // In production, this would be saved to a database and handled by a job scheduler
    // For now, we'll just return the configuration
    
    res.json({
      success: true,
      message: 'Report scheduled successfully',
      data: scheduledReport
    });

  } catch (error) {
    console.error('Schedule report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule report',
      error: error.message
    });
  }
};

// Helper functions
async function gatherTrainReportData(trainset) {
  const [fitnessRecords, optimizations, schedules] = await Promise.all([
    Fitness.find({ trainsetId: trainset._id }).sort({ assessmentDate: -1 }).limit(10),
    Optimization.find({ trainsets: trainset._id }).sort({ createdAt: -1 }).limit(5),
    Schedule.find({ trainsetId: trainset._id }).sort({ date: -1 }).limit(10)
  ]);

  return {
    trainset: trainset.toObject(),
    fitnessRecords,
    optimizations,
    schedules,
    generatedAt: new Date(),
    reportType: 'INDIVIDUAL_TRAINSET'
  };
}

async function gatherFleetReportData(startDate, endDate) {
  const [trainsets, fitnessRecords, optimizations] = await Promise.all([
    Trainset.find({ isActive: true }).populate('latestFitness'),
    Fitness.find({ 
      assessmentDate: { $gte: startDate, $lte: endDate }
    }).populate('trainsetId'),
    Optimization.find({ 
      createdAt: { $gte: startDate, $lte: endDate }
    })
  ]);

  // Calculate fleet statistics
  const stats = {
    totalTrainsets: trainsets.length,
    inService: trainsets.filter(t => t.status === 'IN_SERVICE').length,
    inMaintenance: trainsets.filter(t => t.status === 'MAINTENANCE').length,
    avgFitnessScore: fitnessRecords.reduce((sum, f) => sum + f.overallScore, 0) / fitnessRecords.length || 0,
    totalOptimizations: optimizations.length,
    energySavings: optimizations.reduce((sum, o) => sum + (o.metrics?.energySavings || 0), 0)
  };

  return {
    trainsets,
    fitnessRecords,
    optimizations,
    stats,
    dateRange: { startDate, endDate },
    generatedAt: new Date(),
    reportType: 'FLEET_SUMMARY'
  };
}

async function gatherOptimizationReportData(startDate, endDate) {
  const optimizations = await Optimization.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).populate('trainsets').sort({ createdAt: -1 });

  const metrics = {
    totalOptimizations: optimizations.length,
    successfulOptimizations: optimizations.filter(o => o.status === 'COMPLETED').length,
    totalEnergySavings: optimizations.reduce((sum, o) => sum + (o.metrics?.energySavings || 0), 0),
    avgProcessingTime: optimizations.reduce((sum, o) => sum + (o.processingTime || 0), 0) / optimizations.length || 0,
    totalCostSavings: optimizations.reduce((sum, o) => sum + (o.metrics?.estimatedCostSavings || 0), 0)
  };

  return {
    optimizations,
    metrics,
    dateRange: { startDate, endDate },
    generatedAt: new Date(),
    reportType: 'OPTIMIZATION_SUMMARY'
  };
}

async function generateTrainPDFReport(reportData) {
  const fileName = `KMRL_Train_${reportData.trainset.trainsetNumber}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  
  // Ensure temp directory exists
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  // Header
  doc.fontSize(20).text('KMRL Train Individual Report', 50, 50);
  doc.fontSize(14).text(`Train: ${reportData.trainset.trainsetNumber}`, 50, 80);
  doc.fontSize(12).text(`Generated: ${reportData.generatedAt.toLocaleString()}`, 50, 100);
  
  // Train Details
  doc.fontSize(16).text('Train Details', 50, 140);
  doc.fontSize(12)
    .text(`Manufacturer: ${reportData.trainset.manufacturer}`, 50, 160)
    .text(`Model: ${reportData.trainset.model}`, 50, 180)
    .text(`Status: ${reportData.trainset.status}`, 50, 200)
    .text(`Current Mileage: ${reportData.trainset.currentMileage} km`, 50, 220)
    .text(`Depot: ${reportData.trainset.depot}`, 50, 240);

  // Fitness Records
  if (reportData.fitnessRecords.length > 0) {
    doc.fontSize(16).text('Recent Fitness Records', 50, 280);
    let yPosition = 300;
    reportData.fitnessRecords.slice(0, 5).forEach(record => {
      doc.fontSize(11)
        .text(`${record.assessmentDate.toDateString()}: ${record.overallScore}%`, 50, yPosition);
      yPosition += 20;
    });
  }

  doc.end();
  
  return { filePath, fileName };
}

async function generateTrainExcelReport(reportData) {
  const fileName = `KMRL_Train_${reportData.trainset.trainsetNumber}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  
  // Train Details Sheet
  const detailsSheet = workbook.addWorksheet('Train Details');
  detailsSheet.addRow(['Property', 'Value']);
  detailsSheet.addRow(['Trainset Number', reportData.trainset.trainsetNumber]);
  detailsSheet.addRow(['Manufacturer', reportData.trainset.manufacturer]);
  detailsSheet.addRow(['Model', reportData.trainset.model]);
  detailsSheet.addRow(['Status', reportData.trainset.status]);
  detailsSheet.addRow(['Current Mileage', reportData.trainset.currentMileage]);
  detailsSheet.addRow(['Depot', reportData.trainset.depot]);

  // Fitness Records Sheet
  if (reportData.fitnessRecords.length > 0) {
    const fitnessSheet = workbook.addWorksheet('Fitness Records');
    fitnessSheet.addRow(['Date', 'Overall Score', 'Assessor']);
    reportData.fitnessRecords.forEach(record => {
      fitnessSheet.addRow([
        record.assessmentDate.toDateString(),
        record.overallScore,
        record.assessor
      ]);
    });
  }

  await workbook.xlsx.writeFile(filePath);
  
  return { filePath, fileName };
}

async function generateFleetPDFReport(reportData) {
  const fileName = `KMRL_Fleet_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  // Header
  doc.fontSize(20).text('KMRL Fleet Summary Report', 50, 50);
  doc.fontSize(12).text(`Generated: ${reportData.generatedAt.toLocaleString()}`, 50, 80);
  doc.text(`Period: ${reportData.dateRange.startDate.toDateString()} - ${reportData.dateRange.endDate.toDateString()}`, 50, 100);

  // Fleet Statistics
  doc.fontSize(16).text('Fleet Statistics', 50, 140);
  doc.fontSize(12)
    .text(`Total Trainsets: ${reportData.stats.totalTrainsets}`, 50, 160)
    .text(`In Service: ${reportData.stats.inService}`, 50, 180)
    .text(`In Maintenance: ${reportData.stats.inMaintenance}`, 50, 200)
    .text(`Average Fitness Score: ${reportData.stats.avgFitnessScore.toFixed(1)}%`, 50, 220)
    .text(`Total Optimizations: ${reportData.stats.totalOptimizations}`, 50, 240);

  doc.end();
  
  return { filePath, fileName };
}

async function generateFleetExcelReport(reportData) {
  const fileName = `KMRL_Fleet_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  
  // Fleet Summary Sheet
  const summarySheet = workbook.addWorksheet('Fleet Summary');
  summarySheet.addRow(['Metric', 'Value']);
  summarySheet.addRow(['Total Trainsets', reportData.stats.totalTrainsets]);
  summarySheet.addRow(['In Service', reportData.stats.inService]);
  summarySheet.addRow(['In Maintenance', reportData.stats.inMaintenance]);
  summarySheet.addRow(['Average Fitness Score', `${reportData.stats.avgFitnessScore.toFixed(1)}%`]);
  summarySheet.addRow(['Total Optimizations', reportData.stats.totalOptimizations]);

  // Trainsets Detail Sheet
  const trainsetsSheet = workbook.addWorksheet('Trainsets');
  trainsetsSheet.addRow(['Trainset Number', 'Manufacturer', 'Status', 'Mileage', 'Depot', 'Fitness Score']);
  reportData.trainsets.forEach(trainset => {
    trainsetsSheet.addRow([
      trainset.trainsetNumber,
      trainset.manufacturer,
      trainset.status,
      trainset.currentMileage,
      trainset.depot,
      trainset.latestFitness?.overallScore || 'N/A'
    ]);
  });

  await workbook.xlsx.writeFile(filePath);
  
  return { filePath, fileName };
}

async function generateOptimizationPDFReport(reportData) {
  const fileName = `KMRL_Optimization_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text('KMRL Optimization Report', 50, 50);
  doc.fontSize(12).text(`Generated: ${reportData.generatedAt.toLocaleString()}`, 50, 80);
  
  // Metrics
  doc.fontSize(16).text('Optimization Metrics', 50, 120);
  doc.fontSize(12)
    .text(`Total Optimizations: ${reportData.metrics.totalOptimizations}`, 50, 140)
    .text(`Successful: ${reportData.metrics.successfulOptimizations}`, 50, 160)
    .text(`Total Energy Savings: ${reportData.metrics.totalEnergySavings.toFixed(1)}%`, 50, 180)
    .text(`Average Processing Time: ${reportData.metrics.avgProcessingTime.toFixed(0)}ms`, 50, 200);

  doc.end();
  
  return { filePath, fileName };
}

async function generateOptimizationExcelReport(reportData) {
  const fileName = `KMRL_Optimization_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  
  const tempDir = path.dirname(filePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow(['Metric', 'Value']);
  summarySheet.addRow(['Total Optimizations', reportData.metrics.totalOptimizations]);
  summarySheet.addRow(['Successful', reportData.metrics.successfulOptimizations]);
  summarySheet.addRow(['Total Energy Savings', `${reportData.metrics.totalEnergySavings.toFixed(1)}%`]);
  summarySheet.addRow(['Average Processing Time', `${reportData.metrics.avgProcessingTime.toFixed(0)}ms`]);

  const detailsSheet = workbook.addWorksheet('Optimization Details');
  detailsSheet.addRow(['Date', 'Type', 'Status', 'Energy Savings', 'Processing Time']);
  reportData.optimizations.forEach(opt => {
    detailsSheet.addRow([
      opt.createdAt.toDateString(),
      opt.type,
      opt.status,
      opt.metrics?.energySavings || 0,
      opt.processingTime || 0
    ]);
  });

  await workbook.xlsx.writeFile(filePath);
  
  return { filePath, fileName };
}

async function exportTrainsetsData() {
  const trainsets = await Trainset.find({ isActive: true }).populate('latestFitness');
  
  let csv = 'Trainset Number,Manufacturer,Model,Status,Mileage,Depot,Fitness Score,Last Maintenance\n';
  
  trainsets.forEach(trainset => {
    csv += `${trainset.trainsetNumber},${trainset.manufacturer},${trainset.model},${trainset.status},${trainset.currentMileage},${trainset.depot},${trainset.latestFitness?.overallScore || 'N/A'},${trainset.lastMaintenanceDate?.toDateString() || 'N/A'}\n`;
  });
  
  return csv;
}

async function exportFitnessData() {
  const fitnessRecords = await Fitness.find().populate('trainsetId').sort({ assessmentDate: -1 });
  
  let csv = 'Date,Trainset Number,Overall Score,Assessor,Braking Score,Traction Score,AC Score\n';
  
  fitnessRecords.forEach(record => {
    csv += `${record.assessmentDate.toDateString()},${record.trainsetId?.trainsetNumber || 'N/A'},${record.overallScore},${record.assessor},${record.categoryScores?.braking || 'N/A'},${record.categoryScores?.traction || 'N/A'},${record.categoryScores?.airConditioning || 'N/A'}\n`;
  });
  
  return csv;
}

async function exportOptimizationsData() {
  const optimizations = await Optimization.find().sort({ createdAt: -1 });
  
  let csv = 'Date,Type,Status,Energy Savings,Processing Time,Cost Savings\n';
  
  optimizations.forEach(opt => {
    csv += `${opt.createdAt.toDateString()},${opt.type},${opt.status},${opt.metrics?.energySavings || 0},${opt.processingTime || 0},${opt.metrics?.estimatedCostSavings || 0}\n`;
  });
  
  return csv;
}

async function exportSchedulesData() {
  const schedules = await Schedule.find().populate('trainsetId').sort({ date: -1 });
  
  let csv = 'Date,Trainset Number,Shift,Start Time,End Time,Energy Efficiency\n';
  
  schedules.forEach(schedule => {
    csv += `${schedule.date.toDateString()},${schedule.trainsetId?.trainsetNumber || 'N/A'},${schedule.shift},${schedule.startTime},${schedule.endTime},${schedule.energyEfficiency || 'N/A'}\n`;
  });
  
  return csv;
}

async function generateMockIoTData(trainset, timeRange) {
  const sensors = [
    { id: 'temp_engine', name: 'Engine Temperature', unit: '°C', type: 'temperature' },
    { id: 'pressure_brake', name: 'Brake Pressure', unit: 'psi', type: 'pressure' },
    { id: 'voltage_battery', name: 'Battery Voltage', unit: 'V', type: 'voltage' },
    { id: 'speed', name: 'Current Speed', unit: 'km/h', type: 'speed' },
    { id: 'temp_ac', name: 'AC Temperature', unit: '°C', type: 'temperature' },
    { id: 'door_status', name: 'Door Status', unit: '', type: 'status' }
  ];

  const dataPoints = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
  const interval = timeRange === '24h' ? 3600000 : timeRange === '7d' ? 3600000 * 24 : 3600000 * 24;

  const data = sensors.map(sensor => ({
    ...sensor,
    readings: Array.from({ length: dataPoints }, (_, i) => ({
      timestamp: new Date(Date.now() - (dataPoints - i) * interval),
      value: generateSensorValue(sensor.type),
      status: 'normal'
    }))
  }));

  return {
    trainsetId: trainset._id,
    trainsetNumber: trainset.trainsetNumber,
    lastUpdate: new Date(),
    timeRange,
    sensors: data,
    connectivity: 'online',
    dataQuality: Math.random() * 10 + 90, // 90-100%
    alerts: []
  };
}

function generateSensorValue(type) {
  switch (type) {
    case 'temperature':
      return Math.round(Math.random() * 30 + 50); // 50-80°C
    case 'pressure':
      return Math.round(Math.random() * 50 + 100); // 100-150 psi
    case 'voltage':
      return (Math.random() * 5 + 22).toFixed(1); // 22-27V
    case 'speed':
      return Math.round(Math.random() * 80); // 0-80 km/h
    case 'status':
      return Math.random() > 0.1 ? 'closed' : 'open'; // 90% closed
    default:
      return Math.random() * 100;
  }
}

function calculateNextRun(frequency) {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0); // 6 AM next day
      return tomorrow;
    case 'weekly':
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      nextWeek.setHours(6, 0, 0, 0);
      return nextWeek;
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1, 1);
      nextMonth.setHours(6, 0, 0, 0);
      return nextMonth;
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  }
}

module.exports = {
  generateTrainReport,
  generateFleetReport,
  generateOptimizationReport,
  exportData,
  getTrainIoTData,
  scheduleReport
};