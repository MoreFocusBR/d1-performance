import { Hono } from 'hono';
import { ConversionService } from '../services/ConversionService';

const app = new Hono();

// POST /api/conversions/sync-confirmed - Sync confirmed leads from Venda + leads + RDStation
app.post('/sync-confirmed', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({} as any));
    const result = await ConversionService.syncConfirmed({
      batch_size: body?.batch_size,
      max_batches: body?.max_batches,
      dry_run: body?.dry_run
    });

    return c.json(result);
  } catch (error) {
    console.error('Error in POST /conversions/sync-confirmed:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/conversions/confirmed - List confirmed conversions from view
app.get('/confirmed', async (c) => {
  try {
    const result = await ConversionService.getConfirmedConversions({
      page: Number(c.req.query('page') || '1'),
      limit: Number(c.req.query('limit') || '50'),
      search: c.req.query('search') || '',
      start_date: c.req.query('start_date') || null,
      end_date: c.req.query('end_date') || null
    });
    return c.json(result);
  } catch (error) {
    console.error('Error in GET /conversions/confirmed:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/conversions - Process a sale and create conversion
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    const result = await ConversionService.processSale({
      codigo_venda: body.codigo_venda,
      valor_venda: body.valor_venda,
      observacoes: body.observacoes,
      canal: body.canal || 'comercial',
      data_venda: body.data_venda || new Date().toISOString()
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      conversion: result.conversion
    }, 201);
  } catch (error) {
    console.error('Error in POST /conversions:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/conversions/:id - Get conversion details
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const conversion = await ConversionService.getConversionWithLead(id);

    if (!conversion) {
      return c.json({ success: false, error: 'Conversion not found' }, 404);
    }

    return c.json({ success: true, conversion });
  } catch (error) {
    console.error('Error in GET /conversions/:id:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/conversions - Get pending conversions
app.get('/', async (c) => {
  try {
    const conversions = await ConversionService.getPendingConversions();
    return c.json({ success: true, conversions });
  } catch (error) {
    console.error('Error in GET /conversions:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/conversions/:id/google-sent - Mark conversion as sent to Google Ads
app.post('/:id/google-sent', async (c) => {
  try {
    const id = c.req.param('id');
    const success = await ConversionService.markGoogleAdsSent(id);

    if (!success) {
      return c.json({ success: false, error: 'Failed to update conversion' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error in POST /conversions/:id/google-sent:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/conversions/:id/meta-sent - Mark conversion as sent to Meta Ads
app.post('/:id/meta-sent', async (c) => {
  try {
    const id = c.req.param('id');
    const success = await ConversionService.markMetaAdsSent(id);

    if (!success) {
      return c.json({ success: false, error: 'Failed to update conversion' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error in POST /conversions/:id/meta-sent:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default app;
