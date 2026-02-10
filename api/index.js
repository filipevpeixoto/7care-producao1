// Vercel Serverless Function - wrapper para a função Netlify
const path = require('path');

module.exports = async (req, res) => {
  // Lazy load do handler Netlify - para capturar erros de require na resposta
  let netlifyHandler;
  try {
    const handlerPath = path.resolve(__dirname, '..', 'netlify', 'functions', 'api.js');
    console.log('[VERCEL] Trying to load handler from:', handlerPath);
    console.log('[VERCEL] __dirname:', __dirname);
    console.log('[VERCEL] Files in __dirname:', require('fs').readdirSync(__dirname).join(', '));
    
    // Tentar listar o diretório netlify/functions
    const netlifyDir = path.resolve(__dirname, '..', 'netlify', 'functions');
    try {
      const files = require('fs').readdirSync(netlifyDir);
      console.log('[VERCEL] Files in netlify/functions:', files.join(', '));
    } catch (dirErr) {
      console.log('[VERCEL] Cannot read netlify/functions:', dirErr.message);
      // Tentar dir raiz
      try {
        const rootFiles = require('fs').readdirSync(path.resolve(__dirname, '..'));
        console.log('[VERCEL] Files in parent dir:', rootFiles.join(', '));
      } catch (e) {
        console.log('[VERCEL] Cannot read parent dir either');
      }
    }
    
    netlifyHandler = require('../netlify/functions/api.js');
    console.log('[VERCEL] Handler loaded! Keys:', Object.keys(netlifyHandler));
  } catch (err) {
    console.error('[VERCEL] FAILED to load handler:', err.message);
    console.error('[VERCEL] Stack:', err.stack);
    return res.status(500).json({
      error: 'Module load failed',
      message: err.message,
      dirname: __dirname,
    });
  }

  if (!netlifyHandler || !netlifyHandler.handler) {
    return res.status(500).json({
      error: 'Handler not found',
      keys: netlifyHandler ? Object.keys(netlifyHandler) : 'null',
    });
  }

  // Reconstruir o path original da requisição
  const originalUrl = req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.url;
  
  const urlObj = new URL(req.url, `https://${req.headers.host}`);
  const reqPath = urlObj.searchParams.get('path') || originalUrl;
  
  const finalPath = reqPath.startsWith('/api') ? reqPath : `/api/${reqPath}`;
  
  console.log('[VERCEL] Request:', req.method, finalPath);

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
    
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    res.status(response.statusCode).send(response.body);
  } catch (error) {
    console.error('[VERCEL] Handler error:', error.message);
    res.status(500).json({ 
      error: 'Handler execution failed', 
      message: error.message,
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
