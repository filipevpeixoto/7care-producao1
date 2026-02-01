/**
 * Módulo de Operações de Igrejas
 * Centraliza operações CRUD de igrejas
 */

const db = require('./database.cjs');
const { sanitizeObject, validateChurchData } = require('./validation.cjs');

/**
 * Campos padrão para selecionar igreja
 */
const CHURCH_FIELDS = `
  id, name, district_id, address, city, state,
  phone, email, pastor_name, created_at, updated_at,
  is_active, member_count, settings
`;

/**
 * Busca igreja por ID
 * @param {number|string} id - ID da igreja
 * @returns {Promise<Object|null>} Igreja ou null
 */
async function findById(id) {
  return db.selectOne(
    `SELECT ${CHURCH_FIELDS} FROM churches WHERE id = $1`,
    [id]
  );
}

/**
 * Busca igreja por nome (case insensitive)
 * @param {string} name - Nome da igreja
 * @param {number} districtId - ID do distrito (opcional)
 * @returns {Promise<Object|null>} Igreja ou null
 */
async function findByName(name, districtId = null) {
  if (!name) return null;
  
  let query = `SELECT ${CHURCH_FIELDS} FROM churches WHERE LOWER(name) = LOWER($1)`;
  const params = [name.trim()];
  
  if (districtId) {
    params.push(districtId);
    query += ` AND district_id = $${params.length}`;
  }
  
  return db.selectOne(query, params);
}

/**
 * Busca igrejas por distrito
 * @param {number} districtId - ID do distrito
 * @param {Object} options - Opções de paginação
 * @returns {Promise<Array>} Lista de igrejas
 */
async function findByDistrict(districtId, options = {}) {
  let query = `SELECT ${CHURCH_FIELDS} FROM churches WHERE district_id = $1`;
  const params = [districtId];
  
  if (options.activeOnly !== false) {
    query += ` AND (is_active = true OR is_active IS NULL)`;
  }
  
  query += ` ORDER BY name ASC`;
  
  if (options.limit) {
    query += ` LIMIT ${parseInt(options.limit)}`;
  }
  
  if (options.offset) {
    query += ` OFFSET ${parseInt(options.offset)}`;
  }
  
  return db.select(query, params);
}

/**
 * Busca todas as igrejas
 * @param {Object} options - Opções de paginação
 * @returns {Promise<Array>} Lista de igrejas
 */
async function findAll(options = {}) {
  let query = `SELECT ${CHURCH_FIELDS} FROM churches`;
  const params = [];
  
  if (options.activeOnly !== false) {
    query += ` WHERE is_active = true OR is_active IS NULL`;
  }
  
  query += ` ORDER BY name ASC`;
  
  if (options.limit) {
    query += ` LIMIT ${parseInt(options.limit)}`;
  }
  
  if (options.offset) {
    query += ` OFFSET ${parseInt(options.offset)}`;
  }
  
  return db.select(query, params);
}

/**
 * Cria nova igreja
 * @param {Object} churchData - Dados da igreja
 * @returns {Promise<Object>} Igreja criada
 */
async function create(churchData) {
  const validation = validateChurchData(churchData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  
  const sanitized = sanitizeObject(churchData);
  
  // Define campos padrão
  sanitized.created_at = new Date().toISOString();
  sanitized.updated_at = new Date().toISOString();
  sanitized.is_active = sanitized.is_active !== false;
  sanitized.member_count = sanitized.member_count || 0;
  
  return db.insert('churches', sanitized);
}

/**
 * Cria múltiplas igrejas
 * @param {Array} churches - Lista de dados de igrejas
 * @param {number} districtId - ID do distrito
 * @returns {Promise<Object>} Resultado com criadas e erros
 */
async function createMany(churches, districtId) {
  const results = {
    created: [],
    errors: [],
    skipped: []
  };
  
  for (const churchData of churches) {
    try {
      // Verifica se já existe
      const existing = await findByName(churchData.name, districtId);
      if (existing) {
        results.skipped.push({
          name: churchData.name,
          reason: 'Igreja já existe',
          existingId: existing.id
        });
        continue;
      }
      
      const church = await create({
        ...churchData,
        district_id: districtId
      });
      
      results.created.push(church);
    } catch (error) {
      results.errors.push({
        name: churchData.name,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Atualiza igreja
 * @param {number|string} id - ID da igreja
 * @param {Object} churchData - Dados para atualizar
 * @returns {Promise<Object>} Igreja atualizada
 */
async function update(id, churchData) {
  const sanitized = sanitizeObject(churchData);
  
  // Não permite atualizar certos campos diretamente
  delete sanitized.id;
  delete sanitized.created_at;
  
  sanitized.updated_at = new Date().toISOString();
  
  return db.update('churches', sanitized, { id });
}

/**
 * Exclui igreja (soft delete)
 * @param {number|string} id - ID da igreja
 * @returns {Promise<boolean>} Se foi excluída
 */
async function softDelete(id) {
  const church = await update(id, { is_active: false });
  return !!church;
}

/**
 * Exclui igreja permanentemente
 * @param {number|string} id - ID da igreja
 * @returns {Promise<boolean>} Se foi excluída
 */
async function hardDelete(id) {
  const result = await db.remove('churches', { id });
  return !!result;
}

/**
 * Conta membros de uma igreja
 * @param {number|string} id - ID da igreja
 * @returns {Promise<number>} Total de membros
 */
async function countMembers(id) {
  const result = await db.selectOne(
    `SELECT COUNT(*) as total FROM users WHERE church_id = $1 AND is_active = true`,
    [id]
  );
  return parseInt(result?.total || 0);
}

/**
 * Atualiza contagem de membros da igreja
 * @param {number|string} id - ID da igreja
 * @returns {Promise<number>} Nova contagem
 */
async function updateMemberCount(id) {
  const count = await countMembers(id);
  await db.raw(
    `UPDATE churches SET member_count = $1, updated_at = $2 WHERE id = $3`,
    [count, new Date().toISOString(), id]
  );
  return count;
}

/**
 * Busca estatísticas da igreja
 * @param {number|string} id - ID da igreja
 * @returns {Promise<Object>} Estatísticas
 */
async function getStats(id) {
  const church = await findById(id);
  if (!church) return null;
  
  const members = await db.select(
    `SELECT id, name, points, role FROM users WHERE church_id = $1 AND is_active = true`,
    [id]
  );
  
  const totalPoints = members.reduce((sum, m) => sum + (m.points || 0), 0);
  const activeMembers = members.filter(m => m.points > 0).length;
  
  return {
    church,
    memberCount: members.length,
    activeMemberCount: activeMembers,
    totalPoints,
    averagePoints: members.length > 0 ? Math.round(totalPoints / members.length) : 0,
    participationRate: members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0,
    roleDistribution: members.reduce((acc, m) => {
      acc[m.role || 'member'] = (acc[m.role || 'member'] || 0) + 1;
      return acc;
    }, {})
  };
}

/**
 * Busca ranking de igrejas de um distrito
 * @param {number} districtId - ID do distrito
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>} Ranking
 */
async function getRanking(districtId, limit = 10) {
  const churches = await db.select(`
    SELECT c.id, c.name, 
           COALESCE(SUM(u.points), 0) as total_points,
           COUNT(DISTINCT u.id) as member_count,
           COUNT(DISTINCT CASE WHEN u.points > 0 THEN u.id END) as active_members
    FROM churches c
    LEFT JOIN users u ON u.church_id = c.id AND u.is_active = true
    WHERE c.district_id = $1 AND (c.is_active = true OR c.is_active IS NULL)
    GROUP BY c.id, c.name
    ORDER BY total_points DESC
    LIMIT $2
  `, [districtId, limit]);
  
  return churches.map((church, index) => ({
    rank: index + 1,
    ...church,
    averagePoints: church.member_count > 0 
      ? Math.round(church.total_points / church.member_count) 
      : 0
  }));
}

/**
 * Conta igrejas por filtro
 * @param {Object} filter - Filtros
 * @returns {Promise<number>} Total
 */
async function count(filter = {}) {
  let query = `SELECT COUNT(*) as total FROM churches WHERE 1=1`;
  const params = [];
  
  if (filter.districtId) {
    params.push(filter.districtId);
    query += ` AND district_id = $${params.length}`;
  }
  
  if (filter.activeOnly !== false) {
    query += ` AND (is_active = true OR is_active IS NULL)`;
  }
  
  const result = await db.selectOne(query, params);
  return parseInt(result?.total || 0);
}

/**
 * Converte resultado para camelCase (para API)
 * @param {Object} church - Igreja com snake_case
 * @returns {Object} Igreja com camelCase
 */
function toCamelCase(church) {
  if (!church) return church;
  return {
    id: church.id,
    name: church.name,
    districtId: church.district_id,
    address: church.address,
    city: church.city,
    state: church.state,
    phone: church.phone,
    email: church.email,
    pastorName: church.pastor_name,
    createdAt: church.created_at,
    updatedAt: church.updated_at,
    isActive: church.is_active,
    memberCount: church.member_count,
    settings: church.settings
  };
}

module.exports = {
  CHURCH_FIELDS,
  findById,
  findByName,
  findByDistrict,
  findAll,
  create,
  createMany,
  update,
  softDelete,
  hardDelete,
  countMembers,
  updateMemberCount,
  getStats,
  getRanking,
  count,
  toCamelCase
};
