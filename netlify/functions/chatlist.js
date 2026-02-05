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

    const headerUserId = event.headers['x-user-id'];
    let currentUser = null;
    if (headerUserId) {
      const userId = parseInt(headerUserId);
      if (!Number.isNaN(userId)) {
        const userRows = await sql`SELECT id, role, church, district_id FROM users WHERE id = ${userId} LIMIT 1`;
        if (userRows.length > 0) {
          currentUser = userRows[0];
          if (currentUser.role === 'pastor' && !currentUser.district_id) {
            const districtRows = await sql`SELECT id FROM districts WHERE pastor_id = ${userId} LIMIT 1`;
            if (districtRows.length > 0) {
              currentUser = { ...currentUser, district_id: districtRows[0].id };
            }
          }
        }
      }
    }

    let users;
    if (currentUser && currentUser.role === 'pastor' && currentUser.district_id) {
      const districtChurches = await sql`SELECT name FROM churches WHERE district_id = ${currentUser.district_id}`;
      const districtChurchNames = districtChurches.map(church => church.name);
      if (districtChurchNames.length > 0) {
        users = await sql`
          SELECT id, name, email, church, extra_data 
          FROM users 
          WHERE status IN ('approved', 'active')
            AND (district_id = ${currentUser.district_id} OR church = ANY(${districtChurchNames}))
          LIMIT 500
        `;
      } else {
        users = await sql`
          SELECT id, name, email, church, extra_data 
          FROM users 
          WHERE status IN ('approved', 'active')
            AND district_id = ${currentUser.district_id}
          LIMIT 500
        `;
      }
    } else if (currentUser && currentUser.role !== 'superadmin' && currentUser.church) {
      users = await sql`
        SELECT id, name, email, church, extra_data 
        FROM users 
        WHERE status IN ('approved', 'active')
          AND church = ${currentUser.church}
        LIMIT 500
      `;
    } else {
      users = await sql`
        SELECT id, name, email, church, extra_data 
        FROM users 
        WHERE status IN ('approved', 'active')
        LIMIT 500
      `;
    }

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
