const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Generate access token for user
const generateAccessToken = (userId) => {
  return generateToken({ userId, type: 'access' });
};

module.exports = {
  generateToken,
  verifyToken,
  generateAccessToken,
};