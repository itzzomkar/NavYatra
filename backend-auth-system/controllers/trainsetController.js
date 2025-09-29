const Trainset = require('../models/Trainset');

// Get all trainsets with filtering and pagination
const getAllTrainsets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      depot,
      search,
      sortBy = 'trainsetNumber',
      sortOrder = 'asc'
    } = req.query;

    // Build filter query
    const filter = { isActive: true };
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (depot) {
      filter.depot = depot;
    }
    
    if (search) {
      filter.$or = [
        { trainsetNumber: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [trainsets, total] = await Promise.all([
      Trainset.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Trainset.countDocuments(filter)
    ]);

    // Map _id to id for frontend compatibility
    const formattedTrainsets = trainsets.map(trainset => {
      const obj = trainset.toObject();
      obj.id = obj._id.toString();
      return obj;
    });

    res.json({
      success: true,
      data: formattedTrainsets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get trainsets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainsets',
      error: error.message
    });
  }
};

// Get trainset by ID
const getTrainsetById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const trainset = await Trainset.findById(id);
    
    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    // Map _id to id for frontend compatibility
    const formattedTrainset = trainset.toObject();
    formattedTrainset.id = formattedTrainset._id.toString();

    res.json({
      success: true,
      data: formattedTrainset
    });
  } catch (error) {
    console.error('Get trainset by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainset',
      error: error.message
    });
  }
};

// Create new trainset
const createTrainset = async (req, res) => {
  try {
    const trainsetData = req.body;

    // Check if trainset number already exists
    const existingTrainset = await Trainset.findOne({ 
      trainsetNumber: trainsetData.trainsetNumber 
    });
    
    if (existingTrainset) {
      return res.status(400).json({
        success: false,
        message: 'Trainset number already exists'
      });
    }

    // Create new trainset
    const trainset = new Trainset(trainsetData);
    await trainset.save();

    // Map _id to id for frontend compatibility
    const formattedTrainset = trainset.toObject();
    formattedTrainset.id = formattedTrainset._id.toString();

    res.status(201).json({
      success: true,
      message: 'Trainset created successfully',
      data: formattedTrainset
    });
  } catch (error) {
    console.error('Create trainset error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create trainset',
      error: error.message
    });
  }
};

// Update trainset
const updateTrainset = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const trainset = await Trainset.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    // Map _id to id for frontend compatibility
    const formattedTrainset = trainset.toObject();
    formattedTrainset.id = formattedTrainset._id.toString();

    res.json({
      success: true,
      message: 'Trainset updated successfully',
      data: formattedTrainset
    });
  } catch (error) {
    console.error('Update trainset error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update trainset',
      error: error.message
    });
  }
};

// Update trainset status
const updateTrainsetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'IN_SERVICE', 'MAINTENANCE', 'CLEANING', 'OUT_OF_ORDER', 'DECOMMISSIONED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const trainset = await Trainset.findById(id);
    
    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    await trainset.updateStatus(status);

    // Map _id to id for frontend compatibility
    const formattedTrainset = trainset.toObject();
    formattedTrainset.id = formattedTrainset._id.toString();

    res.json({
      success: true,
      message: 'Trainset status updated successfully',
      data: formattedTrainset
    });
  } catch (error) {
    console.error('Update trainset status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trainset status',
      error: error.message
    });
  }
};

// Delete trainset (soft delete)
const deleteTrainset = async (req, res) => {
  try {
    const { id } = req.params;

    const trainset = await Trainset.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    res.json({
      success: true,
      message: 'Trainset deleted successfully'
    });
  } catch (error) {
    console.error('Delete trainset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trainset',
      error: error.message
    });
  }
};

// Get trainset statistics
const getTrainsetStats = async (req, res) => {
  try {
    const stats = await Trainset.getStatistics();
    
    // Additional statistics
    const depotStats = await Trainset.aggregate([
      { $match: { isActive: true } },
      { 
        $group: {
          _id: '$depot',
          count: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] }
          }
        }
      }
    ]);

    const ageDistribution = await Trainset.aggregate([
      { $match: { isActive: true } },
      {
        $bucket: {
          groupBy: { $subtract: [new Date().getFullYear(), '$yearOfManufacture'] },
          boundaries: [0, 5, 10, 15, 20, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgMileage: { $avg: '$totalMileage' }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        depotStats,
        ageDistribution,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Get trainset stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Add maintenance record
const addMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const maintenanceData = req.body;

    const trainset = await Trainset.findById(id);
    
    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    await trainset.addMaintenanceRecord(maintenanceData);

    res.json({
      success: true,
      message: 'Maintenance record added successfully',
      data: trainset
    });
  } catch (error) {
    console.error('Add maintenance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add maintenance record',
      error: error.message
    });
  }
};

// Update mileage
const updateMileage = async (req, res) => {
  try {
    const { id } = req.params;
    const { distance } = req.body;

    if (!distance || distance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid distance value'
      });
    }

    const trainset = await Trainset.findById(id);
    
    if (!trainset) {
      return res.status(404).json({
        success: false,
        message: 'Trainset not found'
      });
    }

    await trainset.updateMileage(distance);

    res.json({
      success: true,
      message: 'Mileage updated successfully',
      data: trainset
    });
  } catch (error) {
    console.error('Update mileage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update mileage',
      error: error.message
    });
  }
};

// Get trainsets due for maintenance
const getMaintenanceDue = async (req, res) => {
  try {
    const trainsets = await Trainset.getDueForMaintenance();
    
    res.json({
      success: true,
      data: trainsets,
      count: trainsets.length
    });
  } catch (error) {
    console.error('Get maintenance due error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainsets due for maintenance',
      error: error.message
    });
  }
};

module.exports = {
  getAllTrainsets,
  getTrainsetById,
  createTrainset,
  updateTrainset,
  updateTrainsetStatus,
  deleteTrainset,
  getTrainsetStats,
  addMaintenanceRecord,
  updateMileage,
  getMaintenanceDue
};