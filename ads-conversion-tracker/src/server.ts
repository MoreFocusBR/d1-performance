import { Hono } from 'hono';
import { serve } from 'bun';
import { corsMiddleware } from './middleware/cors';
import { loggerMiddleware } from './middleware/logger';
import leadsRouter from './routes/leads';
import conversionsRouter from './routes/conversions';
import externalRouter from './routes/external';
import healthRouter from './routes/health';
import rdstationRouter from './routes/rdstation';
import metaWebhookRouter from './routes/metaWebhook';
import { runAutoMigrations } from './utils/migrations';

// Load environment variables
import 'dotenv/config';

const app = new Hono();

// Apply global middleware
app.use('*', loggerMiddleware);
app.use('*', corsMiddleware);

// Static files
app.use('/public/*', async (c) => {
  const filePath = c.req.path.replace('/public', '');
  try {
    const file = Bun.file(`./public${filePath}`);
    const buffer = await file.arrayBuffer();

    // Determine content type
    let contentType = 'application/octet-stream';
    if (filePath.endsWith('.html')) contentType = 'text/html';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    if (filePath.endsWith('.json')) contentType = 'application/json';
    if (filePath.endsWith('.png')) contentType = 'image/png';
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
    if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

    return new Response(buffer, {
      headers: { 'Content-Type': contentType }
    });
  } catch (error) {
    return c.json({ error: 'File not found' }, 404);
  }
});

// API Routes
app.route('/api/leads', leadsRouter);
app.route('/api/conversions', conversionsRouter);
app.route('/api/external', externalRouter);
app.route('/api/sync-rdstation', rdstationRouter);
app.route('/webhooks/meta-leads', metaWebhookRouter);
app.route('/health', healthRouter);

// Root route - serve landing page
app.get('/', async (c) => {
  try {
    const file = Bun.file('./public/index.html');
    const html = await file.text();
    return c.html(html);
  } catch (error) {
    return c.html('<h1>Landing Page - Coming Soon</h1>');
  }
});

// Admin route - serve admin panel
app.get('/admin', async (c) => {
  try {
    const file = Bun.file('./public/admin.html');
    const html = await file.text();
    return c.html(html);
  } catch (error) {
    return c.html('<h1>Admin Panel - Coming Soon</h1>');
  }
});

// Alternative admin route
app.get('/admin.html', async (c) => {
  try {
    const file = Bun.file('./public/admin.html');
    const html = await file.text();
    return c.html(html);
  } catch (error) {
    return c.html('<h1>Admin Panel - Coming Soon</h1>');
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Start server with auto-migrations
const port = parseInt(process.env.PORT || '3001');

async function startServer() {
  // Executar migrações automáticas antes de iniciar o servidor
  await runAutoMigrations();

  console.log(`🚀 Server starting on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`🔐 External API: /api/external (requires API key)`);
  console.log(`📡 Meta Webhook: /webhooks/meta-leads`);

  serve({
    fetch: app.fetch,
    port: port,
    hostname: '0.0.0.0'
  });

  console.log(`✅ Server running at http://localhost:${port}`);
}

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
