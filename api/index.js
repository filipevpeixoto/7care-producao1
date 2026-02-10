// Vercel Serverless Function - wrapper para a função Netlify
// Importa e exporta a mesma lógica
const netlifyHandler = require('../netlify/functions/api.js');

module.exports = async (req, res) => {
  // Adaptar formato Netlify → Vercel
  const event = {
    httpMethod: req.method,
    headers: req.headers,
    path: req.url,
    rawUrl: `https://${req.headers.host}${req.url}`,
    body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : null,
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

    // Retornar resposta
    res.status(response.statusCode).send(response.body);
  } catch (error) {
    console.error('Vercel function error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
