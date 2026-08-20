import express from 'express';

const router = express.Router();

// Record server startup time
const startTime = Date.now();

/**
 * @route   GET /api/health
 * @desc    Health-check endpoint returning server uptime, status, and environment
 * @access  Public
 */
router.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    status: 'ok',
    message: 'RealTimeChat Server is healthy and running',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds}s`,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

export default router;
