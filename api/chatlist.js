// Vercel Serverless Function - wrapper para chatlist
const netlifyHandler = require('../netlify/functions/chatlist.js');

module.exports = async (req, res) => {
  const event = {
    httpMethod: req.method,
    headers: req.headers,
    path: '/api/users/chat-list',
    rawUrl: `https://${req.headers.host}${req.url}`,
    body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : null,
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
    console.error('Vercel chatlist error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
