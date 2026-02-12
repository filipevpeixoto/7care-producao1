/**
 * Vercel Serverless Function - Entry Point
 *
 * ARCHITECTURE NOTE:
 * This file wraps netlify/functions/api.js for Vercel deployment.
 * Both Vercel AND Netlify depend on the same api.js handler.
 *
 * DO NOT DELETE netlify/functions/api.js — it would break BOTH platforms.
 *
 * Dependency chain:
 *   Vercel:  api/index.js  →  netlify/functions/api.js
 *   Netlify: netlify/functions/api.js (direct)
 *
 * DEPRECATION PLAN:
 * When migrating fully to the Express server (server/app.ts),
 * both this file and netlify/functions/api.js can be removed together.
 * The Express server already handles all routes via server/routes/*.
 */
// Vercel Serverless Function - wrapper para a função Netlify
const netlifyHandler = require('../netlify/functions/api.js');

module.exports = async (req, res) => {
  if (!netlifyHandler || !netlifyHandler.handler) {
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
    const response = await netlifyHandler.handler(event, {});
    
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
