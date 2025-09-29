import express, { Request, Response } from 'express';
import { mockDb } from '../services/mockDb';

const router = express.Router();

// Get all trainsets
router.get('/', async (req: Request, res: Response) => {
  try {
    const trainsets = await mockDb.getAllTrainsets();
    res.json({
      success: true,
      data: trainsets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trainsets',
    });
  }
});

// Get trainset by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const trainset = await mockDb.getTrainsetById(req.params.id);
    
    if (!trainset) {
      return res.status(404).json({
        success: false,
        error: 'Trainset not found',
      });
    }

    res.json({
      success: true,
      data: trainset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trainset',
    });
  }
});

// Update trainset status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const trainset = await mockDb.updateTrainset(req.params.id, { status });
    
    if (!trainset) {
      return res.status(404).json({
        success: false,
        error: 'Trainset not found',
      });
    }

    res.json({
      success: true,
      data: trainset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update trainset',
    });
  }
});

// Get dashboard stats
router.get('/stats/dashboard', async (req: Request, res: Response) => {
  try {
    const stats = await mockDb.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
    });
  }
});

export default router;
