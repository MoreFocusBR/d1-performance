import { createHmac } from 'crypto';
import type { Context, Next } from 'hono';

const APP_SECRET = process.env.META_APP_SECRET || '';

/**
 * Middleware para validar a assinatura X-Hub-Signature-256 do Meta
 * 
 * O Meta assina todas as notificações de webhook com o App Secret.
 * Este middleware verifica a assinatura para garantir que a requisição
 * é autêntica e vem do Meta.
 */
export async function metaSignatureMiddleware(c: Context, next: Next) {
  // Apenas valida assinatura em requisições POST
  if (c.req.method !== 'POST') {
    return next();
  }

  const signature = c.req.header('x-hub-signature-256');

  if (!signature) {
    console.warn('⚠️ [Meta Webhook] Requisição POST sem assinatura X-Hub-Signature-256');
    return c.json({ error: 'Assinatura ausente' }, 401);
  }

  if (!APP_SECRET) {
    console.error('❌ [Meta Webhook] META_APP_SECRET não configurado');
    return c.json({ error: 'Configuração de segurança ausente' }, 500);
  }

  try {
    // Ler o corpo da requisição como texto para calcular o hash
    const rawBody = await c.req.text();

    // Calcular o hash HMAC-SHA256 do corpo usando o App Secret
    const expectedHash = createHmac('sha256', APP_SECRET)
      .update(rawBody)
      .digest('hex');

    // Extrair o hash da assinatura recebida (formato: sha256=<hash>)
    const elements = signature.split('=');
    const signatureHash = elements[1];

    // Comparar os hashes de forma segura (timing-safe)
    const isValid = timingSafeEqual(signatureHash, expectedHash);

    if (!isValid) {
      console.warn('⚠️ [Meta Webhook] Assinatura inválida');
      return c.json({ error: 'Assinatura inválida' }, 403);
    }

    // Armazenar o corpo parseado no contexto para uso posterior
    c.set('rawBody', rawBody);
    c.set('parsedBody', JSON.parse(rawBody));

    console.log('✅ [Meta Webhook] Assinatura validada com sucesso');
    return next();
  } catch (error) {
    console.error('❌ [Meta Webhook] Erro ao validar assinatura:', error);
    return c.json({ error: 'Erro ao validar assinatura' }, 500);
  }
}

/**
 * Comparação de strings segura contra timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
