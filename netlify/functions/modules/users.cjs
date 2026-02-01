/**
 * Módulo de Operações de Usuários
 * Centraliza operações CRUD de usuários
 */

const db = require('./database');
const { hashPassword, comparePassword } = require('./auth');
const { calculateUserPoints, calculateLevel } = require('./points');
const { sanitizeObject, validateUserData, isValidEmail } = require('./validation');

/**
 * Campos padrão para selecionar usuário (sem senha)
 */
const USER_FIELDS = `
  id, name, email, phone, role, church_id, district_id,
  created_at, updated_at, points, level,
  step1_orar_por_1, step1_orar_por_2, step1_orar_por_3,
  step2_cuidar_de_1, step2_cuidar_de_2, step2_cuidar_de_3,
  step3_cultivar_1, step3_cultivar_2, step3_cultivar_3,
  step4_convidar_1, step4_convidar_2, step4_convidar_3,
  step5_apresentar_1, step5_apresentar_2, step5_apresentar_3,
  step6_preparar_1, step6_preparar_2, step6_preparar_3,
  step7_batismo_1, step7_batismo_2, step7_batismo_3,
  estudos_biblicos_count, baptisms_performed, member_type,
  is_active, last_login, avatar_url, bio, birth_date
`;

/**
 * Busca usuário por ID
 * @param {number|string} id - ID do usuário
 * @returns {Promise<Object|null>} Usuário ou null
 */
async function findById(id) {
  const user = await db.selectOne(
    `SELECT ${USER_FIELDS} FROM users WHERE id = $1`,
    [id]
  );
  return user;
}

/**
 * Busca usuário por email
 * @param {string} email - Email do usuário
 * @returns {Promise<Object|null>} Usuário ou null
 */
async function findByEmail(email) {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.selectOne(
    `SELECT ${USER_FIELDS}, password FROM users WHERE LOWER(email) = $1`,
    [normalizedEmail]
  );
  return user;
}

/**
 * Busca usuário por username
 * @param {string} username - Username do usuário
 * @returns {Promise<Object|null>} Usuário ou null
 */
async function findByUsername(username) {
  if (!username) return null;
  const normalizedUsername = username.toLowerCase().trim();
  const user = await db.selectOne(
    `SELECT ${USER_FIELDS}, password FROM users WHERE LOWER(username) = $1 OR username_normalized = $1`,
    [normalizedUsername]
  );
  return user;
}

/**
 * Busca usuários por igreja
 * @param {number} churchId - ID da igreja
 * @param {Object} options - Opções de paginação
 * @returns {Promise<Array>} Lista de usuários
 */
async function findByChurch(churchId, options = {}) {
  let query = `SELECT ${USER_FIELDS} FROM users WHERE church_id = $1`;
  const params = [churchId];
  
  if (options.activeOnly) {
    query += ` AND is_active = true`;
  }
  
  if (options.role) {
    params.push(options.role);
    query += ` AND role = $${params.length}`;
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
 * Busca usuários por distrito
 * @param {number} districtId - ID do distrito
 * @param {Object} options - Opções de paginação
 * @returns {Promise<Array>} Lista de usuários
 */
async function findByDistrict(districtId, options = {}) {
  let query = `SELECT ${USER_FIELDS} FROM users WHERE district_id = $1`;
  const params = [districtId];
  
  if (options.activeOnly) {
    query += ` AND is_active = true`;
  }
  
  if (options.role) {
    params.push(options.role);
    query += ` AND role = $${params.length}`;
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
 * Cria novo usuário
 * @param {Object} userData - Dados do usuário
 * @returns {Promise<Object>} Usuário criado (sem senha)
 */
async function create(userData) {
  const validation = validateUserData(userData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  
  // Verifica se email já existe
  const existingUser = await findByEmail(userData.email);
  if (existingUser) {
    throw new Error('Email já cadastrado');
  }
  
  const sanitized = sanitizeObject(userData);
  
  // Hash da senha se fornecida
  if (sanitized.password) {
    sanitized.password = await hashPassword(sanitized.password);
  }
  
  // Normaliza email e username
  sanitized.email = sanitized.email.toLowerCase().trim();
  if (sanitized.username) {
    sanitized.username_normalized = sanitized.username.toLowerCase().trim();
  }
  
  // Define campos padrão
  sanitized.created_at = new Date().toISOString();
  sanitized.updated_at = new Date().toISOString();
  sanitized.is_active = sanitized.is_active !== false;
  sanitized.points = sanitized.points || 0;
  
  const user = await db.insert('users', sanitized);
  
  // Remove senha do retorno
  delete user.password;
  return user;
}

/**
 * Atualiza usuário
 * @param {number|string} id - ID do usuário
 * @param {Object} userData - Dados para atualizar
 * @returns {Promise<Object>} Usuário atualizado (sem senha)
 */
async function update(id, userData) {
  const validation = validateUserData(userData, true);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }
  
  const sanitized = sanitizeObject(userData);
  
  // Não permite atualizar certos campos diretamente
  delete sanitized.id;
  delete sanitized.created_at;
  
  // Hash da senha se fornecida
  if (sanitized.password) {
    sanitized.password = await hashPassword(sanitized.password);
  }
  
  // Normaliza email e username se fornecidos
  if (sanitized.email) {
    sanitized.email = sanitized.email.toLowerCase().trim();
  }
  if (sanitized.username) {
    sanitized.username_normalized = sanitized.username.toLowerCase().trim();
  }
  
  sanitized.updated_at = new Date().toISOString();
  
  const user = await db.update('users', sanitized, { id });
  
  // Remove senha do retorno
  if (user) delete user.password;
  return user;
}

/**
 * Exclui usuário (soft delete)
 * @param {number|string} id - ID do usuário
 * @returns {Promise<boolean>} Se foi excluído
 */
async function softDelete(id) {
  const user = await update(id, { is_active: false });
  return !!user;
}

/**
 * Exclui usuário permanentemente
 * @param {number|string} id - ID do usuário
 * @returns {Promise<boolean>} Se foi excluído
 */
async function hardDelete(id) {
  const result = await db.remove('users', { id });
  return !!result;
}

/**
 * Autentica usuário
 * @param {string} emailOrUsername - Email ou username
 * @param {string} password - Senha
 * @returns {Promise<Object|null>} Usuário autenticado ou null
 */
async function authenticate(emailOrUsername, password) {
  // Tenta buscar por email primeiro
  let user = await findByEmail(emailOrUsername);
  
  // Se não encontrou, tenta por username
  if (!user) {
    user = await findByUsername(emailOrUsername);
  }
  
  if (!user) return null;
  
  // Verifica se usuário está ativo
  if (user.is_active === false) return null;
  
  // Verifica senha
  const passwordMatch = await comparePassword(password, user.password);
  if (!passwordMatch) return null;
  
  // Atualiza último login
  await db.raw(
    `UPDATE users SET last_login = $1 WHERE id = $2`,
    [new Date().toISOString(), user.id]
  );
  
  // Remove senha do retorno
  delete user.password;
  return user;
}

/**
 * Altera senha do usuário
 * @param {number|string} id - ID do usuário
 * @param {string} currentPassword - Senha atual
 * @param {string} newPassword - Nova senha
 * @returns {Promise<boolean>} Se senha foi alterada
 */
async function changePassword(id, currentPassword, newPassword) {
  const user = await db.selectOne(
    `SELECT id, password FROM users WHERE id = $1`,
    [id]
  );
  
  if (!user) return false;
  
  // Verifica senha atual
  const passwordMatch = await comparePassword(currentPassword, user.password);
  if (!passwordMatch) return false;
  
  // Atualiza senha
  const hashedPassword = await hashPassword(newPassword);
  await db.raw(
    `UPDATE users SET password = $1, updated_at = $2 WHERE id = $3`,
    [hashedPassword, new Date().toISOString(), id]
  );
  
  return true;
}

/**
 * Recalcula pontos de um usuário
 * @param {number|string} id - ID do usuário
 * @returns {Promise<Object>} Usuário com pontos atualizados
 */
async function recalculatePoints(id) {
  const user = await findById(id);
  if (!user) return null;
  
  const points = calculateUserPoints(user);
  const level = calculateLevel(points);
  
  await db.raw(
    `UPDATE users SET points = $1, level = $2, updated_at = $3 WHERE id = $4`,
    [points, level.name, new Date().toISOString(), id]
  );
  
  return { ...user, points, level: level.name };
}

/**
 * Recalcula pontos de todos os usuários de uma igreja
 * @param {number} churchId - ID da igreja
 * @returns {Promise<number>} Número de usuários atualizados
 */
async function recalculateChurchPoints(churchId) {
  const users = await findByChurch(churchId);
  let updated = 0;
  
  for (const user of users) {
    await recalculatePoints(user.id);
    updated++;
  }
  
  return updated;
}

/**
 * Busca ranking de usuários
 * @param {Object} filter - Filtros (churchId, districtId)
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>} Ranking
 */
async function getRanking(filter = {}, limit = 10) {
  let query = `SELECT ${USER_FIELDS} FROM users WHERE is_active = true AND points > 0`;
  const params = [];
  
  if (filter.churchId) {
    params.push(filter.churchId);
    query += ` AND church_id = $${params.length}`;
  }
  
  if (filter.districtId) {
    params.push(filter.districtId);
    query += ` AND district_id = $${params.length}`;
  }
  
  query += ` ORDER BY points DESC LIMIT ${parseInt(limit)}`;
  
  const users = await db.select(query, params);
  return users.map((user, index) => ({
    rank: index + 1,
    ...user,
    level: calculateLevel(user.points)
  }));
}

/**
 * Conta usuários por filtro
 * @param {Object} filter - Filtros
 * @returns {Promise<number>} Total
 */
async function count(filter = {}) {
  let query = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
  const params = [];
  
  if (filter.churchId) {
    params.push(filter.churchId);
    query += ` AND church_id = $${params.length}`;
  }
  
  if (filter.districtId) {
    params.push(filter.districtId);
    query += ` AND district_id = $${params.length}`;
  }
  
  if (filter.role) {
    params.push(filter.role);
    query += ` AND role = $${params.length}`;
  }
  
  if (filter.activeOnly) {
    query += ` AND is_active = true`;
  }
  
  const result = await db.selectOne(query, params);
  return parseInt(result?.total || 0);
}

module.exports = {
  USER_FIELDS,
  findById,
  findByEmail,
  findByUsername,
  findByChurch,
  findByDistrict,
  create,
  update,
  softDelete,
  hardDelete,
  authenticate,
  changePassword,
  recalculatePoints,
  recalculateChurchPoints,
  getRanking,
  count
};
