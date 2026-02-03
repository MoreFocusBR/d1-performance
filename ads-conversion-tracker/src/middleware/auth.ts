import { Context } from 'hono';

// Store valid API keys in memory (in production, use a database)
const VALID_API_KEYS = new Set(
  (process.env.API_KEYS || 'default-api-key-change-in-production').split(',').map(k => k.trim())
);

export interface AuthContext {
  apiKey: string;
  isValid: boolean;
}

/**
 * Middleware para autenticar requisições via API key
 * Aceita API key em:
 * 1. Header: X-API-Key
 * 2. Query parameter: api_key
 * 3. Body: api_key (para POST requests)
 */
export async function authMiddleware(c: Context, next: () => Promise<void>) {
  try {
    let apiKey = '';

    // 1. Check header
    apiKey = c.req.header('x-api-key') || '';

    // 2. Check query parameter
    if (!apiKey) {
      apiKey = c.req.query('api_key') || '';
    }

    // 3. Check body (only for POST/PUT requests)
    if (!apiKey && (c.req.method === 'POST' || c.req.method === 'PUT')) {
      try {
        const body = await c.req.json();
        apiKey = body.api_key || '';
      } catch (error) {
        // Body is not JSON, skip
      }
    }

    // Validate API key
    const isValid = apiKey && VALID_API_KEYS.has(apiKey);

    // Store auth context in request
    (c as any).auth = {
      apiKey,
      isValid
    };

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ success: false, error: 'Authentication error' }, 500);
  }
}

/**
 * Middleware para verificar se a API key é válida
 * Deve ser usado após authMiddleware
 */
export async function requireAuth(c: Context, next: () => Promise<void>) {
  const auth = (c as any).auth as AuthContext;

  if (!auth || !auth.isValid) {
    return c.json({ success: false, error: 'Unauthorized - Invalid or missing API key' }, 401);
  }

  await next();
}

/**
 * Função auxiliar para validar API key
 */
export function isValidApiKey(apiKey: string): boolean {
  return apiKey && VALID_API_KEYS.has(apiKey);
}

/**
 * Função para adicionar nova API key em tempo de execução
 */
export function addApiKey(apiKey: string): void {
  VALID_API_KEYS.add(apiKey);
  console.log(`✅ API key adicionada: ${apiKey.substring(0, 8)}...`);
}

/**
 * Função para remover API key em tempo de execução
 */
export function removeApiKey(apiKey: string): void {
  VALID_API_KEYS.delete(apiKey);
  console.log(`❌ API key removida: ${apiKey.substring(0, 8)}...`);
}

/**
 * Função para listar todas as API keys (apenas primeiros caracteres por segurança)
 */
export function listApiKeys(): string[] {
  return Array.from(VALID_API_KEYS).map(key => `${key.substring(0, 8)}...`);
}
