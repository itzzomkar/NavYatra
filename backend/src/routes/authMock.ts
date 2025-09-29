import express, { Request, Response } from 'express';
import { authenticateUser, generateTokens, mockDb, verifyToken } from '../services/mockDb';

const router = express.Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Authenticate user
    const user = await authenticateUser(email, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        tokens,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No authorization header',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    const user = await mockDb.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

// Refresh token endpoint (simplified)
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // For simplicity, just generate new tokens
    // In production, validate the refresh token properly
    const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-key';
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    
    const user = await mockDb.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    const tokens = generateTokens(user);
    
    res.json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
    });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  // For mock, just return success
  // In production, you'd blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
