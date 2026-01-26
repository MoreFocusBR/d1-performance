import { Hono } from 'hono';
import { query } from '../utils/db';
import { ConversionService } from '../services/ConversionService';

const app = new Hono();

// GET /health - Health check
app.get('/', async (c) => {
  try {
    // Test database connection
    await query('SELECT 1');
    
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return c.json({
      status: 'error',
      error: 'Database connection failed'
    }, 503);
  }
});

// GET /stats - Get conversion statistics
app.get('/stats', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30');
    const stats = await ConversionService.getStats(days);

    return c.json({
      success: true,
      stats,
      period_days: days
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default app;
