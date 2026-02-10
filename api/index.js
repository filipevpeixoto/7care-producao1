// Vercel Serverless Function - wrapper para a função Netlify
const netlifyHandler = require('../netlify/functions/api.js');

module.exports = async (req, res) => {
  // Reconstruir o path original da requisição
  // O rewrite /api/(.*) → /api faz o req.url virar "/api"
  // O path original fica no header x-vercel-proxy-path ou podemos reconstruir da URL
  const originalUrl = req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.url;
  
  // Se veio via rewrite, usar query param para recuperar path original
  // Vercel preserva o path original nos query params quando usa rewrite com regex capture
  const urlObj = new URL(req.url, `https://${req.headers.host}`);
  const path = urlObj.searchParams.get('path') || originalUrl;
  
  // Limpar: se path não começa com /api, reconstruir
  const finalPath = path.startsWith('/api') ? path : `/api/${path}`;
  
  // Ler body raw para POST/PUT/PATCH
  let body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await getRawBody(req);
  }

  const event = {
    httpMethod: req.method,
    headers: req.headers,
    path: finalPath,
    rawUrl: `https://${req.headers.host}${finalPath}`,
    body: body,
  };

  const context = {};

  try {
    const response = await netlifyHandler.handler(event, context);
    
    // Aplicar headers
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    res.status(response.statusCode).send(response.body);
  } catch (error) {
    console.error('Vercel function error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
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
