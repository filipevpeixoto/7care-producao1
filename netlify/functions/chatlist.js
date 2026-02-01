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

    // Get all active users for chat (status can be 'active' or 'approved')
    const users = await sql`
      SELECT id, name, email, church, extra_data 
      FROM users 
      WHERE status IN ('approved', 'active')
      LIMIT 500
    `;

    console.log('✅ Chat list: Found', users.length, 'users');

    const chatList = users.map(u => {
      // Try to get profilePhoto from extra_data if it exists
      let profilePhoto = null;
      if (u.extra_data && typeof u.extra_data === 'object') {
        profilePhoto = u.extra_data.profilePhoto || u.extra_data.profile_photo || null;
      }
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        church: u.church || null,
        profilePhoto
      };
    });

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
