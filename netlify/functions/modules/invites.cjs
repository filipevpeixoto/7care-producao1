/**
 * Módulo de Operações de Convites
 * Centraliza operações de convites para pastores
 */

const crypto = require('crypto');
const db = require('./database');
const { sanitizeObject } = require('./validation');

/**
 * Status de convite
 */
const INVITE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

/**
 * Campos padrão para selecionar convite
 */
const INVITE_FIELDS = `
  id, email, name, token, status, district_name, region,
  churches, created_at, updated_at, expires_at, approved_at,
  approved_by, rejected_at, rejected_by, rejection_reason,
  pastor_data, excel_data
`;

/**
 * Gera token único para convite
 * @returns {string} Token gerado
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Busca convite por ID
 * @param {number|string} id - ID do convite
 * @returns {Promise<Object|null>} Convite ou null
 */
async function findById(id) {
  return db.selectOne(
    `SELECT ${INVITE_FIELDS} FROM pastor_invites WHERE id = $1`,
    [id]
  );
}

/**
 * Busca convite por token
 * @param {string} token - Token do convite
 * @returns {Promise<Object|null>} Convite ou null
 */
async function findByToken(token) {
  if (!token) return null;
  return db.selectOne(
    `SELECT ${INVITE_FIELDS} FROM pastor_invites WHERE token = $1`,
    [token]
  );
}

/**
 * Busca convite por email
 * @param {string} email - Email do convite
 * @returns {Promise<Object|null>} Convite ou null
 */
async function findByEmail(email) {
  if (!email) return null;
  return db.selectOne(
    `SELECT ${INVITE_FIELDS} FROM pastor_invites WHERE LOWER(email) = LOWER($1) AND status = 'pending'`,
    [email.trim()]
  );
}

/**
 * Busca convites pendentes
 * @param {Object} options - Opções de paginação
 * @returns {Promise<Array>} Lista de convites
 */
async function findPending(options = {}) {
  let query = `SELECT ${INVITE_FIELDS} FROM pastor_invites WHERE status = 'pending' ORDER BY created_at DESC`;
  
  if (options.limit) {
    query += ` LIMIT ${parseInt(options.limit)}`;
  }
  
  if (options.offset) {
    query += ` OFFSET ${parseInt(options.offset)}`;
  }
  
  return db.select(query);
}

/**
 * Busca todos os convites
 * @param {Object} options - Opções de filtro e paginação
 * @returns {Promise<Array>} Lista de convites
 */
async function findAll(options = {}) {
  let query = `SELECT ${INVITE_FIELDS} FROM pastor_invites`;
  const params = [];
  const conditions = [];
  
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  
  if (options.email) {
    params.push(`%${options.email}%`);
    conditions.push(`LOWER(email) LIKE LOWER($${params.length})`);
  }
  
  if (options.name) {
    params.push(`%${options.name}%`);
    conditions.push(`LOWER(name) LIKE LOWER($${params.length})`);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY created_at DESC`;
  
  if (options.limit) {
    query += ` LIMIT ${parseInt(options.limit)}`;
  }
  
  if (options.offset) {
    query += ` OFFSET ${parseInt(options.offset)}`;
  }
  
  return db.select(query, params);
}

/**
 * Cria novo convite
 * @param {Object} inviteData - Dados do convite
 * @returns {Promise<Object>} Convite criado
 */
async function create(inviteData) {
  const sanitized = sanitizeObject(inviteData);
  
  // Verifica se já existe convite pendente para o email
  const existing = await findByEmail(sanitized.email);
  if (existing) {
    throw new Error('Já existe um convite pendente para este email');
  }
  
  // Gera token e define campos padrão
  sanitized.token = generateToken();
  sanitized.status = INVITE_STATUS.PENDING;
  sanitized.created_at = new Date().toISOString();
  sanitized.updated_at = new Date().toISOString();
  
  // Define expiração (7 dias por padrão)
  if (!sanitized.expires_at) {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    sanitized.expires_at = expiration.toISOString();
  }
  
  // Serializa dados complexos
  if (sanitized.churches && typeof sanitized.churches === 'object') {
    sanitized.churches = JSON.stringify(sanitized.churches);
  }
  if (sanitized.pastor_data && typeof sanitized.pastor_data === 'object') {
    sanitized.pastor_data = JSON.stringify(sanitized.pastor_data);
  }
  if (sanitized.excel_data && typeof sanitized.excel_data === 'object') {
    sanitized.excel_data = JSON.stringify(sanitized.excel_data);
  }
  
  return db.insert('pastor_invites', sanitized);
}

/**
 * Atualiza convite
 * @param {number|string} id - ID do convite
 * @param {Object} inviteData - Dados para atualizar
 * @returns {Promise<Object>} Convite atualizado
 */
async function update(id, inviteData) {
  const sanitized = sanitizeObject(inviteData);
  
  // Não permite atualizar certos campos
  delete sanitized.id;
  delete sanitized.token;
  delete sanitized.created_at;
  
  sanitized.updated_at = new Date().toISOString();
  
  // Serializa dados complexos
  if (sanitized.churches && typeof sanitized.churches === 'object') {
    sanitized.churches = JSON.stringify(sanitized.churches);
  }
  if (sanitized.pastor_data && typeof sanitized.pastor_data === 'object') {
    sanitized.pastor_data = JSON.stringify(sanitized.pastor_data);
  }
  if (sanitized.excel_data && typeof sanitized.excel_data === 'object') {
    sanitized.excel_data = JSON.stringify(sanitized.excel_data);
  }
  
  return db.update('pastor_invites', sanitized, { id });
}

/**
 * Aprova convite
 * @param {number|string} id - ID do convite
 * @param {number} approvedBy - ID do usuário que aprovou
 * @returns {Promise<Object>} Convite aprovado
 */
async function approve(id, approvedBy) {
  const invite = await findById(id);
  if (!invite) {
    throw new Error('Convite não encontrado');
  }
  
  if (invite.status !== INVITE_STATUS.PENDING) {
    throw new Error(`Convite não pode ser aprovado. Status atual: ${invite.status}`);
  }
  
  return update(id, {
    status: INVITE_STATUS.APPROVED,
    approved_at: new Date().toISOString(),
    approved_by: approvedBy
  });
}

/**
 * Rejeita convite
 * @param {number|string} id - ID do convite
 * @param {number} rejectedBy - ID do usuário que rejeitou
 * @param {string} reason - Motivo da rejeição
 * @returns {Promise<Object>} Convite rejeitado
 */
async function reject(id, rejectedBy, reason = null) {
  const invite = await findById(id);
  if (!invite) {
    throw new Error('Convite não encontrado');
  }
  
  if (invite.status !== INVITE_STATUS.PENDING) {
    throw new Error(`Convite não pode ser rejeitado. Status atual: ${invite.status}`);
  }
  
  return update(id, {
    status: INVITE_STATUS.REJECTED,
    rejected_at: new Date().toISOString(),
    rejected_by: rejectedBy,
    rejection_reason: reason
  });
}

/**
 * Cancela convite
 * @param {number|string} id - ID do convite
 * @returns {Promise<Object>} Convite cancelado
 */
async function cancel(id) {
  const invite = await findById(id);
  if (!invite) {
    throw new Error('Convite não encontrado');
  }
  
  if (invite.status !== INVITE_STATUS.PENDING) {
    throw new Error(`Convite não pode ser cancelado. Status atual: ${invite.status}`);
  }
  
  return update(id, {
    status: INVITE_STATUS.CANCELLED
  });
}

/**
 * Verifica se convite é válido
 * @param {string} token - Token do convite
 * @returns {Promise<Object>} Resultado da validação
 */
async function validate(token) {
  const invite = await findByToken(token);
  
  if (!invite) {
    return { valid: false, error: 'Convite não encontrado' };
  }
  
  if (invite.status !== INVITE_STATUS.APPROVED) {
    return { valid: false, error: `Convite não está aprovado. Status: ${invite.status}` };
  }
  
  // Verifica expiração
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    await update(invite.id, { status: INVITE_STATUS.EXPIRED });
    return { valid: false, error: 'Convite expirado' };
  }
  
  return { valid: true, invite };
}

/**
 * Marca convites expirados
 * @returns {Promise<number>} Número de convites marcados
 */
async function markExpired() {
  const result = await db.raw(`
    UPDATE pastor_invites 
    SET status = 'expired', updated_at = $1 
    WHERE status = 'pending' AND expires_at < $2
    RETURNING id
  `, [new Date().toISOString(), new Date().toISOString()]);
  
  return result.length;
}

/**
 * Conta convites por status
 * @returns {Promise<Object>} Contagem por status
 */
async function countByStatus() {
  const result = await db.select(`
    SELECT status, COUNT(*) as count 
    FROM pastor_invites 
    GROUP BY status
  `);
  
  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    cancelled: 0,
    total: 0
  };
  
  for (const row of result) {
    counts[row.status] = parseInt(row.count);
    counts.total += parseInt(row.count);
  }
  
  return counts;
}

/**
 * Exclui convite
 * @param {number|string} id - ID do convite
 * @returns {Promise<boolean>} Se foi excluído
 */
async function remove(id) {
  const result = await db.remove('pastor_invites', { id });
  return !!result;
}

/**
 * Converte resultado para camelCase (para API)
 * @param {Object} invite - Convite com snake_case
 * @returns {Object} Convite com camelCase
 */
function toCamelCase(invite) {
  if (!invite) return invite;
  
  // Parse JSON se necessário
  let churches = invite.churches;
  let pastorData = invite.pastor_data;
  let excelData = invite.excel_data;
  
  try {
    if (typeof churches === 'string') churches = JSON.parse(churches);
    if (typeof pastorData === 'string') pastorData = JSON.parse(pastorData);
    if (typeof excelData === 'string') excelData = JSON.parse(excelData);
  } catch (e) {
    // Ignora erros de parse
  }
  
  return {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    token: invite.token,
    status: invite.status,
    districtName: invite.district_name,
    region: invite.region,
    churches,
    createdAt: invite.created_at,
    updatedAt: invite.updated_at,
    expiresAt: invite.expires_at,
    approvedAt: invite.approved_at,
    approvedBy: invite.approved_by,
    rejectedAt: invite.rejected_at,
    rejectedBy: invite.rejected_by,
    rejectionReason: invite.rejection_reason,
    pastorData,
    excelData
  };
}

module.exports = {
  INVITE_STATUS,
  INVITE_FIELDS,
  generateToken,
  findById,
  findByToken,
  findByEmail,
  findPending,
  findAll,
  create,
  update,
  approve,
  reject,
  cancel,
  validate,
  markExpired,
  countByStatus,
  remove,
  toCamelCase
};
