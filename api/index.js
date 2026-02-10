// Vercel Serverless Function - wrapper para a função Netlify
let netlifyHandler = null;
let requireError = null;

try {
  netlifyHandler = require('../netlify/functions/api.js');
  console.log('[VERCEL] Netlify handler loaded successfully. Keys:', Object.keys(netlifyHandler));
} catch (err) {
  requireError = err;
  console.error('[VERCEL] FAILED to load Netlify handler:', err.message);
  console.error('[VERCEL] Stack:', err.stack);
}

module.exports = async (req, res) => {
  // Se deu erro ao carregar o módulo, retornar imediatamente
  if (requireError) {
    return res.status(500).json({
      error: 'Module load failed',
      message: requireError.message,
      stack: requireError.stack
    });
  }

  if (!netlifyHandler || !netlifyHandler.handler) {
    return res.status(500).json({
      error: 'Handler not found',
      keys: netlifyHandler ? Object.keys(netlifyHandler) : 'null',
      type: typeof netlifyHandler
    });
  }

  // Reconstruir o path original da requisição
  const originalUrl = req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.url;
  
  const urlObj = new URL(req.url, `https://${req.headers.host}`);
  const path = urlObj.searchParams.get('path') || originalUrl;
  
  const finalPath = path.startsWith('/api') ? path : `/api/${path}`;
  
  console.log('[VERCEL] Request:', req.method, finalPath, 'originalUrl:', originalUrl);

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
    queryStringParameters: Object.fromEntries(urlObj.searchParams),
    isBase64Encoded: false,
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
    console.error('[VERCEL] Handler error:', error.message);
    console.error('[VERCEL] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Handler execution failed', 
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
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
