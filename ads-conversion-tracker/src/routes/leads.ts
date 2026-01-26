import { Hono } from 'hono';
import { LeadService } from '../services/LeadService';

const app = new Hono();

// POST /api/leads - Capture a new lead
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    
    const result = await LeadService.captureLead({
      telefone: body.telefone,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      gclid: body.gclid,
      fbclid: body.fbclid,
      ip_address: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      user_agent: c.req.header('user-agent') || 'unknown'
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    // Generate WhatsApp link
    const whatsappLink = await LeadService.generateWhatsAppLink(
      body.telefone,
      process.env.WHATSAPP_MESSAGE
    );

    return c.json({
      success: true,
      lead: result.lead,
      whatsapp_link: whatsappLink
    }, 201);
  } catch (error) {
    console.error('Error in POST /leads:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/leads - Get all pending leads
app.get('/', async (c) => {
  try {
    const status = c.req.query('status') || 'novo';
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    const leads = await LeadService.getAllLeads({
      status,
      limit,
      offset
    });

    return c.json({ success: true, leads });
  } catch (error) {
    console.error('Error in GET /leads:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/leads/:phone - Get lead by phone
app.get('/:phone', async (c) => {
  try {
    const phone = c.req.param('phone');
    const lead = await LeadService.findLeadByPhone(phone);

    if (!lead) {
      return c.json({ success: false, error: 'Lead not found' }, 404);
    }

    return c.json({ success: true, lead });
  } catch (error) {
    console.error('Error in GET /leads/:phone:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default app;
