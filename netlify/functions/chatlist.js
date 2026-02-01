const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    let dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL não configurada');
    }

    // Clean connection string
    if (dbUrl.startsWith('psql ')) {
      dbUrl = dbUrl.replace('psql ', '');
    }
    if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) {
      dbUrl = dbUrl.slice(1, -1);
    }
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
      dbUrl = dbUrl.slice(1, -1);
    }

    const sql = neon(dbUrl);

    // Get all approved users for chat
    const users = await sql`
      SELECT id, name, email, profile_photo 
      FROM users 
      WHERE status = 'approved'
      LIMIT 500
    `;

    console.log('✅ Chat list: Found', users.length, 'users');

    const chatList = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      profilePhoto: u.profile_photo
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(chatList)
    };
  } catch (error) {
    console.error('❌ Chat list error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao buscar usuários', details: error.message })
    };
  }
};
