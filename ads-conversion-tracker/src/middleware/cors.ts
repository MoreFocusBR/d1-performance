import { Context, Next } from 'hono';

export async function corsMiddleware(c: Context, next: Next) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  c.header('Access-Control-Allow-Origin', frontendUrl);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400');

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
}
