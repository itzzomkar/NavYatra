const Schedule = require('../models/Schedule');
const Trainset = require('../models/Trainset');

// Get all schedules with filtering and pagination
const getAllSchedules = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      date,
      trainsetId,
      route,
      search,
      sortBy = 'departureTime',
      sortOrder = 'asc'
    } = req.query;

    // Build filter query - only show active schedules
    const filter = { isActive: true };
    
    // Date filter
    if (date && date !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      switch(date) {
        case 'today':
          filter.operationalDate = {
            $gte: today,
            $lt: tomorrow
          };
          break;
        case 'tomorrow':
          const dayAfterTomorrow = new Date(tomorrow);
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
          filter.operationalDate = {
            $gte: tomorrow,
            $lt: dayAfterTomorrow
          };
          break;
        case 'week':
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          filter.operationalDate = {
            $gte: today,
            $lt: weekEnd
          };
          break;
        case 'month':
          const monthEnd = new Date(today);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          filter.operationalDate = {
            $gte: today,
            $lt: monthEnd
          };
          break;
      }
    }
    
    if (status && status !== 'all') {
      filter.status = status.toUpperCase();
    }
    
    if (trainsetId) {
      filter.trainsetId = trainsetId;
    }
    
    if (route) {
      filter.$or = [
        { 'route.from': { $regex: route, $options: 'i' } },
        { 'route.to': { $regex: route, $options: 'i' } },
        { 'route.routeName': { $regex: route, $options: 'i' } }
      ];
    }
    
    if (search) {
      filter.$or = [
        { scheduleNumber: { $regex: search, $options: 'i' } },
        { trainsetNumber: { $regex: search, $options: 'i' } },
        { 'route.routeName': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Debug logging
    console.log('\n=== SCHEDULE FETCH DEBUG ===');
    console.log('Request query params:', req.query);
    console.log('Schedule filter:', JSON.stringify(filter, null, 2));
    console.log('Date param:', date);
    console.log('Status param:', status);
    console.log('Sort options:', sortOptions);
    console.log('Pagination - page:', page, 'limit:', limit, 'skip:', skip);
    
    // First, let's see ALL schedules in the database for debugging
    const allSchedulesCount = await Schedule.countDocuments({});
    const activeSchedulesCount = await Schedule.countDocuments({ isActive: true });
    console.log('Total schedules in DB:', allSchedulesCount);
    console.log('Active schedules in DB:', activeSchedulesCount);
    
    // Execute query with pagination
    const [schedules, total] = await Promise.all([
      Schedule.find(filter)
        .populate('trainsetId', 'trainsetNumber manufacturer model status')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Schedule.countDocuments(filter)
    ]);
    
    console.log('Found schedules matching filter:', schedules.length, 'Total:', total);
    if (schedules.length > 0) {
      console.log('First schedule sample:', {
        id: schedules[0]._id,
        scheduleNumber: schedules[0].scheduleNumber,
        isActive: schedules[0].isActive,
        status: schedules[0].status,
        operationalDate: schedules[0].operationalDate,
        createdAt: schedules[0].createdAt
      });
    }
    console.log('=== END DEBUG ===\n');

    // Map _id to id and format response
    const formattedSchedules = schedules.map(schedule => {
      const obj = schedule.toObject();
      obj.id = obj._id.toString();
      obj.routeDisplay = `${obj.route.from} - ${obj.route.to}`;
      return obj;
    });

    res.json({
      success: true,
      data: formattedSchedules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules',
      error: error.message
    });
  }
};

// Get schedule by ID
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await Schedule.findById(id)
      .populate('trainsetId')
      .populate('createdBy', 'username email')
      .populate('lastModifiedBy', 'username email');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Map _id to id for frontend compatibility
    const formattedSchedule = schedule.toObject();
    formattedSchedule.id = formattedSchedule._id.toString();

    res.json({
      success: true,
      data: formattedSchedule
    });
  } catch (error) {
    console.error('Get schedule by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: error.message
    });
  }
};

// Create new schedule
const createSchedule = async (req, res) => {
  try {
    const scheduleData = req.body;
    scheduleData.createdBy = req.user.id;
    
    console.log('\n=== CREATE SCHEDULE DEBUG ===');
    console.log('Received schedule data:', JSON.stringify(scheduleData, null, 2));

    // Check if schedule number already exists
    const existingSchedule = await Schedule.findOne({ 
      scheduleNumber: scheduleData.scheduleNumber 
    });
    
    if (existingSchedule) {
      return res.status(400).json({
        success: false,
        message: 'Schedule number already exists'
      });
    }

    // Verify trainset exists and is available
    if (scheduleData.trainsetId) {
      const trainset = await Trainset.findById(scheduleData.trainsetId);
      if (!trainset) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trainset ID'
        });
      }
      
      // Check if trainset is available for scheduling
      if (trainset.status !== 'AVAILABLE' && trainset.status !== 'IN_SERVICE') {
        return res.status(400).json({
          success: false,
          message: `Trainset ${trainset.trainsetNumber} is not available for scheduling (Status: ${trainset.status})`
        });
      }
      
      scheduleData.trainsetNumber = trainset.trainsetNumber;
    }

    // Create new schedule
    const schedule = new Schedule(scheduleData);
    await schedule.save();
    
    console.log('Schedule saved successfully:');
    console.log('  ID:', schedule._id);
    console.log('  Schedule Number:', schedule.scheduleNumber);
    console.log('  isActive:', schedule.isActive);
    console.log('  status:', schedule.status);
    console.log('  operationalDate:', schedule.operationalDate);
    console.log('=== END CREATE DEBUG ===\n');

    // Populate references for response
    await schedule.populate('trainsetId', 'trainsetNumber manufacturer model status');

    // Map _id to id for frontend compatibility
    const formattedSchedule = schedule.toObject();
    formattedSchedule.id = formattedSchedule._id.toString();

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: formattedSchedule
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    
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
      message: 'Failed to create schedule',
      error: error.message
    });
  }
};

// Update schedule
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.lastModifiedBy = req.user.id;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    // If trainsetId is being updated, verify it exists
    if (updateData.trainsetId) {
      const trainset = await Trainset.findById(updateData.trainsetId);
      if (!trainset) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trainset ID'
        });
      }
      updateData.trainsetNumber = trainset.trainsetNumber;
    }

    const schedule = await Schedule.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('trainsetId', 'trainsetNumber manufacturer model status');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Map _id to id for frontend compatibility
    const formattedSchedule = schedule.toObject();
    formattedSchedule.id = formattedSchedule._id.toString();

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: formattedSchedule
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    
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
      message: 'Failed to update schedule',
      error: error.message
    });
  }
};

// Update schedule status
const updateScheduleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const schedule = await Schedule.findById(id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    schedule.status = status;
    if (status === 'DELAYED' && reason) {
      schedule.delayReason = reason;
    }
    schedule.lastModifiedBy = req.user.id;
    
    await schedule.save();
    await schedule.populate('trainsetId', 'trainsetNumber manufacturer model status');

    // Map _id to id for frontend compatibility
    const formattedSchedule = schedule.toObject();
    formattedSchedule.id = formattedSchedule._id.toString();

    res.json({
      success: true,
      message: 'Schedule status updated successfully',
      data: formattedSchedule
    });
  } catch (error) {
    console.error('Update schedule status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule status',
      error: error.message
    });
  }
};

// Delete schedule
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Soft delete by marking as inactive
    schedule.isActive = false;
    schedule.lastModifiedBy = req.user.id;
    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule',
      error: error.message
    });
  }
};

// Get schedule statistics
const getScheduleStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalSchedules,
      todaySchedules,
      activeSchedules,
      delayedSchedules,
      completedToday,
      upcomingSchedules
    ] = await Promise.all([
      Schedule.countDocuments({ isActive: true }),
      Schedule.countDocuments({
        operationalDate: { $gte: today, $lt: tomorrow },
        isActive: true
      }),
      Schedule.countDocuments({ status: 'ACTIVE', isActive: true }),
      Schedule.countDocuments({ status: 'DELAYED', isActive: true }),
      Schedule.countDocuments({
        status: 'COMPLETED',
        operationalDate: { $gte: today, $lt: tomorrow },
        isActive: true
      }),
      Schedule.getUpcomingSchedules(2)
    ]);

    // Calculate on-time performance for today
    const todayCompleted = await Schedule.find({
      status: 'COMPLETED',
      operationalDate: { $gte: today, $lt: tomorrow },
      isActive: true
    });

    const onTimeCount = todayCompleted.filter(s => s.delay <= 5).length;
    const onTimePercentage = todayCompleted.length > 0 
      ? Math.round((onTimeCount / todayCompleted.length) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        total: totalSchedules,
        today: todaySchedules,
        active: activeSchedules,
        delayed: delayedSchedules,
        completedToday,
        onTimePercentage,
        upcoming: upcomingSchedules.map(s => ({
          id: s._id.toString(),
          scheduleNumber: s.scheduleNumber,
          trainsetNumber: s.trainsetNumber,
          route: `${s.route.from} - ${s.route.to}`,
          departureTime: s.departureTime,
          status: s.status
        }))
      }
    });
  } catch (error) {
    console.error('Get schedule stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  updateScheduleStatus,
  deleteSchedule,
  getScheduleStats
};