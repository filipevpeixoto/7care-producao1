/**
 * Módulo de Operações de Distritos
 * Centraliza operações CRUD de distritos
 */

const db = require('./database');
const { sanitizeObject, validateDistrictData } = require('./validation');

/**
 * Campos padrão para selecionar distrito
 */
const DISTRICT_FIELDS = `
  id, name, region, pastor_id, created_at, updated_at,
  is_active, church_count, member_count, settings, points_config
`;

/**
 * Busca distrito por ID
 * @param {number|string} id - ID do distrito
 * @returns {Promise<Object|null>} Distrito ou null
 */
async function findById(id) {
  return db.selectOne(
    `SELECT ${DISTRICT_FIELDS} FROM districts WHERE id = $1`,
    [id]
  );
}

/**
 * Busca distrito por nome
 * @param {string} name - Nome do distrito
 * @returns {Promise<Object|null>} Distrito ou null
 */
async function findByName(name) {
  if (!name) return null;
  return db.selectOne(
    `SELECT ${DISTRICT_FIELDS} FROM districts WHERE LOWER(name) = LOWER($1)`,
    [name.trim()]
  );
}

/**
 * Busca distrito por pastor
 * @param {number} pastorId - ID do pastor
 * @returns {Promise<Object|null>} Distrito ou null
 */
async function findByPastor(pastorId) {
  return db.selectOne(
    `SELECT ${DISTRICT_FIELDS} FROM districts WHERE pastor_id = $1`,
    [pastorId]
  );
}

/**
 * Busca todos os distritos
 * @param {Object} options - Opções de paginação
 * @returns {Promise<Array>} Lista de distritos
 */
async function findAll(options = {}) {
  let query = `SELECT ${DISTRICT_FIELDS} FROM districts`;
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
 * Busca distritos por região
 * @param {string} region - Nome da região
 * @returns {Promise<Array>} Lista de distritos
 */
async function findByRegion(region) {
  return db.select(
    `SELECT ${DISTRICT_FIELDS} FROM districts WHERE LOWER(region) = LOWER($1) AND (is_active = true OR is_active IS NULL) ORDER BY name ASC`,
    [region.trim()]
  );
}

/**
 * Cria novo distrito
 * @param {Object} districtData - Dados do distrito
 * @returns {Promise<Object>} Distrito criado
 */
async function create(districtData) {
  const validation = validateDistrictData(districtData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  
  const sanitized = sanitizeObject(districtData);
  
  // Define campos padrão
  sanitized.created_at = new Date().toISOString();
  sanitized.updated_at = new Date().toISOString();
  sanitized.is_active = sanitized.is_active !== false;
  sanitized.church_count = sanitized.church_count || 0;
  sanitized.member_count = sanitized.member_count || 0;
  
  return db.insert('districts', sanitized);
}

/**
 * Atualiza distrito
 * @param {number|string} id - ID do distrito
 * @param {Object} districtData - Dados para atualizar
 * @returns {Promise<Object>} Distrito atualizado
 */
async function update(id, districtData) {
  const sanitized = sanitizeObject(districtData);
  
  // Não permite atualizar certos campos diretamente
  delete sanitized.id;
  delete sanitized.created_at;
  
  sanitized.updated_at = new Date().toISOString();
  
  return db.update('districts', sanitized, { id });
}

/**
 * Exclui distrito (soft delete)
 * @param {number|string} id - ID do distrito
 * @returns {Promise<boolean>} Se foi excluído
 */
async function softDelete(id) {
  const district = await update(id, { is_active: false });
  return !!district;
}

/**
 * Conta igrejas de um distrito
 * @param {number|string} id - ID do distrito
 * @returns {Promise<number>} Total de igrejas
 */
async function countChurches(id) {
  const result = await db.selectOne(
    `SELECT COUNT(*) as total FROM churches WHERE district_id = $1 AND (is_active = true OR is_active IS NULL)`,
    [id]
  );
  return parseInt(result?.total || 0);
}

/**
 * Conta membros de um distrito
 * @param {number|string} id - ID do distrito
 * @returns {Promise<number>} Total de membros
 */
async function countMembers(id) {
  const result = await db.selectOne(
    `SELECT COUNT(*) as total FROM users WHERE district_id = $1 AND is_active = true`,
    [id]
  );
  return parseInt(result?.total || 0);
}

/**
 * Atualiza contagens do distrito
 * @param {number|string} id - ID do distrito
 * @returns {Promise<Object>} Contagens atualizadas
 */
async function updateCounts(id) {
  const churchCount = await countChurches(id);
  const memberCount = await countMembers(id);
  
  await db.raw(
    `UPDATE districts SET church_count = $1, member_count = $2, updated_at = $3 WHERE id = $4`,
    [churchCount, memberCount, new Date().toISOString(), id]
  );
  
  return { churchCount, memberCount };
}

/**
 * Busca estatísticas do distrito
 * @param {number|string} id - ID do distrito
 * @returns {Promise<Object>} Estatísticas
 */
async function getStats(id) {
  const district = await findById(id);
  if (!district) return null;
  
  const churches = await db.select(
    `SELECT id, name FROM churches WHERE district_id = $1 AND (is_active = true OR is_active IS NULL)`,
    [id]
  );
  
  const members = await db.select(
    `SELECT id, name, points, church_id, role FROM users WHERE district_id = $1 AND is_active = true`,
    [id]
  );
  
  const totalPoints = members.reduce((sum, m) => sum + (m.points || 0), 0);
  const activeMembers = members.filter(m => m.points > 0).length;
  
  // Pontos por igreja
  const churchStats = churches.map(church => {
    const churchMembers = members.filter(m => m.church_id === church.id);
    const churchPoints = churchMembers.reduce((sum, m) => sum + (m.points || 0), 0);
    return {
      ...church,
      memberCount: churchMembers.length,
      totalPoints: churchPoints,
      averagePoints: churchMembers.length > 0 ? Math.round(churchPoints / churchMembers.length) : 0
    };
  });
  
  return {
    district,
    churchCount: churches.length,
    memberCount: members.length,
    activeMemberCount: activeMembers,
    totalPoints,
    averagePoints: members.length > 0 ? Math.round(totalPoints / members.length) : 0,
    participationRate: members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0,
    churchStats: churchStats.sort((a, b) => b.totalPoints - a.totalPoints)
  };
}

/**
 * Busca configuração de pontos do distrito
 * @param {number|string} id - ID do distrito
 * @returns {Promise<Object>} Configuração de pontos
 */
async function getPointsConfig(id) {
  const district = await findById(id);
  if (!district) return null;
  
  return district.points_config || {
    etapa1: 10,
    etapa2: 10,
    etapa3: 15,
    etapa4: 15,
    etapa5: 20,
    etapa6: 20,
    etapa7: 25,
    biblicalStudies: 15
  };
}

/**
 * Atualiza configuração de pontos do distrito
 * @param {number|string} id - ID do distrito
 * @param {Object} config - Nova configuração
 * @returns {Promise<Object>} Configuração atualizada
 */
async function updatePointsConfig(id, config) {
  await db.raw(
    `UPDATE districts SET points_config = $1, updated_at = $2 WHERE id = $3`,
    [JSON.stringify(config), new Date().toISOString(), id]
  );
  return config;
}

/**
 * Busca configurações gerais do distrito
 * @param {number|string} id - ID do distrito
 * @returns {Promise<Object>} Configurações
 */
async function getSettings(id) {
  const district = await findById(id);
  if (!district) return null;
  
  return district.settings || {};
}

/**
 * Atualiza configurações do distrito
 * @param {number|string} id - ID do distrito
 * @param {Object} settings - Novas configurações
 * @returns {Promise<Object>} Configurações atualizadas
 */
async function updateSettings(id, settings) {
  const current = await getSettings(id);
  const merged = { ...current, ...settings };
  
  await db.raw(
    `UPDATE districts SET settings = $1, updated_at = $2 WHERE id = $3`,
    [JSON.stringify(merged), new Date().toISOString(), id]
  );
  
  return merged;
}

/**
 * Busca ranking de distritos
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>} Ranking
 */
async function getRanking(limit = 10) {
  const districts = await db.select(`
    SELECT d.id, d.name, d.region,
           COALESCE(SUM(u.points), 0) as total_points,
           COUNT(DISTINCT c.id) as church_count,
           COUNT(DISTINCT u.id) as member_count,
           COUNT(DISTINCT CASE WHEN u.points > 0 THEN u.id END) as active_members
    FROM districts d
    LEFT JOIN churches c ON c.district_id = d.id AND (c.is_active = true OR c.is_active IS NULL)
    LEFT JOIN users u ON u.district_id = d.id AND u.is_active = true
    WHERE d.is_active = true OR d.is_active IS NULL
    GROUP BY d.id, d.name, d.region
    ORDER BY total_points DESC
    LIMIT $1
  `, [limit]);
  
  return districts.map((district, index) => ({
    rank: index + 1,
    ...district,
    averagePoints: district.member_count > 0 
      ? Math.round(district.total_points / district.member_count) 
      : 0
  }));
}

/**
 * Conta distritos
 * @param {Object} filter - Filtros
 * @returns {Promise<number>} Total
 */
async function count(filter = {}) {
  let query = `SELECT COUNT(*) as total FROM districts WHERE 1=1`;
  const params = [];
  
  if (filter.region) {
    params.push(filter.region);
    query += ` AND LOWER(region) = LOWER($${params.length})`;
  }
  
  if (filter.activeOnly !== false) {
    query += ` AND (is_active = true OR is_active IS NULL)`;
  }
  
  const result = await db.selectOne(query, params);
  return parseInt(result?.total || 0);
}

/**
 * Converte resultado para camelCase (para API)
 * @param {Object} district - Distrito com snake_case
 * @returns {Object} Distrito com camelCase
 */
function toCamelCase(district) {
  if (!district) return district;
  return {
    id: district.id,
    name: district.name,
    region: district.region,
    pastorId: district.pastor_id,
    createdAt: district.created_at,
    updatedAt: district.updated_at,
    isActive: district.is_active,
    churchCount: district.church_count,
    memberCount: district.member_count,
    settings: district.settings,
    pointsConfig: district.points_config
  };
}

module.exports = {
  DISTRICT_FIELDS,
  findById,
  findByName,
  findByPastor,
  findAll,
  findByRegion,
  create,
  update,
  softDelete,
  countChurches,
  countMembers,
  updateCounts,
  getStats,
  getPointsConfig,
  updatePointsConfig,
  getSettings,
  updateSettings,
  getRanking,
  count,
  toCamelCase
};
