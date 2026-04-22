/**
 * Vercel Serverless Function - Entry Point
 *
 * ARCHITECTURE NOTE:
 * Production runs on Vercel.
 * This file wraps the legacy serverless handler stored in `netlify/functions/api.js`.
 *
 * DO NOT DELETE `netlify/functions/api.js` yet — Vercel still depends on it through this wrapper.
 *
 * Dependency chain:
 *   Vercel: api/index.js -> netlify/functions/api.js
 *
 * DEPRECATION PLAN:
 * When migrating fully to the Express server (server/app.ts),
 * both this file and the legacy handler can be removed together.
 * The Express server already handles all routes via server/routes/*.
 */
// Vercel Serverless Function - wrapper para o handler legado
import legacyHandler from '../netlify/functions/api.js';

const { URL, URLSearchParams, console } = globalThis;

export default async (req, res) => {
  if (!legacyHandler || !legacyHandler.handler) {
    return res.status(500).json({ error: 'Handler not loaded' });
  }

  // Reconstruir o path original da requisição
  const urlObj = new URL(req.url, `https://${req.headers.host}`);
  const reqPath = urlObj.searchParams.get('path') || req.url;
  const finalPath = reqPath.startsWith('/api') ? reqPath : `/api/${reqPath}`;

  // Reconstruir query string original (excluindo o param interno 'path' do rewrite)
  const originalParams = new URLSearchParams(urlObj.searchParams);
  originalParams.delete('path');
  const queryString = originalParams.toString();
  const rawUrl = `https://${req.headers.host}${finalPath}${queryString ? '?' + queryString : ''}`;

  // Ler body raw para POST/PUT/PATCH
  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await getRawBody(req);
  }

  const event = {
    httpMethod: req.method,
    headers: req.headers,
    path: finalPath,
    rawUrl: rawUrl,
    body: body,
    queryStringParameters: Object.fromEntries(originalParams),
    isBase64Encoded: false,
  };

  try {
    const response = await legacyHandler.handler(event, {});
    
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    res.status(response.statusCode).send(response.body);
  } catch (error) {
    console.error('[VERCEL] Handler error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Helper para ler o body raw da requisição
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    // Se já foi parseado pelo Vercel
    if (req.body !== undefined && req.body !== null) {
      resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      return;
    }
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data || null));
    req.on('error', reject);
  });
}
