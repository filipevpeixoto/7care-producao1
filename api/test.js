// Simple test function to verify Vercel routing works
module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Vercel function is working!',
    url: req.url,
    method: req.method,
    headers: {
      host: req.headers.host,
      'x-forwarded-uri': req.headers['x-forwarded-uri'],
      'x-invoke-path': req.headers['x-invoke-path'],
    },
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    }
  });
};
