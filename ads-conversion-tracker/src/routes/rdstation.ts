import { Hono } from 'hono';
import { RDStationService } from '../services/RDStationService';

const app = new Hono();

/**
 * GET /api/sync-rdstation
 * Sincronizar todos os leads com status 'novo' para RD Station
 * 
 * Query Parameters:
 *   - force: true para forçar sincronização mesmo que já tenha sido sincronizado
 */
app.get('/', async (c) => {
  try {
    console.log('🔄 Iniciando sincronização com RD Station...');
    
    const result = await RDStationService.syncNewLeads();

    return c.json({
      success: result.success,
      message: result.success 
        ? `Sincronização concluída com sucesso: ${result.synced} leads sincronizados`
        : `Sincronização concluída com erros: ${result.synced} sucesso, ${result.failed} falhas`,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined
    }, result.success ? 200 : 207);
  } catch (error) {
    console.error('Erro ao sincronizar com RD Station:', error);
    return c.json({
      success: false,
      error: 'Erro ao sincronizar com RD Station',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * POST /api/sync-rdstation/lead/:id
 * Sincronizar um lead específico para RD Station
 */
app.post('/lead/:id', async (c) => {
  try {
    const leadId = c.req.param('id');

    if (!leadId) {
      return c.json({
        success: false,
        error: 'ID do lead é obrigatório'
      }, 400);
    }

    console.log(`📤 Sincronizando lead individual: ${leadId}`);

    const success = await RDStationService.syncLeadById(leadId);

    return c.json({
      success,
      message: success 
        ? 'Lead sincronizado com sucesso'
        : 'Falha ao sincronizar lead'
    }, success ? 200 : 400);
  } catch (error) {
    console.error('Erro ao sincronizar lead individual:', error);
    return c.json({
      success: false,
      error: 'Erro ao sincronizar lead',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, 500);
  }
});

/**
 * GET /api/sync-rdstation/health
 * Verificar saúde da sincronização
 */
app.get('/health', async (c) => {
  try {
    const rdStationUri = process.env.RDSTATION_URI;
    const rdStationApiKey = process.env.RDSTATION_API_KEY;

    const configured = Boolean(rdStationUri && rdStationApiKey);

    return c.json({
      success: true,
      status: configured ? 'configured' : 'not_configured',
      rdStationUri: rdStationUri ? '✓' : '✗',
      rdStationApiKey: rdStationApiKey ? '✓' : '✗'
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Erro ao verificar saúde'
    }, 500);
  }
});

export default app;
