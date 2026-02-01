/**
 * Módulo de Autenticação
 * Responsável por login, registro, validação de tokens e gestão de sessões
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Gera um token JWT para o usuário
 * @param {Object} user - Dados do usuário
 * @returns {string} Token JWT
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verifica e decodifica um token JWT
 * @param {string} token - Token JWT
 * @returns {Object|null} Dados decodificados ou null se inválido
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Middleware de autenticação - extrai usuário do token ou header
 * @param {Object} event - Evento da função Netlify
 * @param {Object} sql - Conexão com banco de dados
 * @returns {Object} Resultado da autenticação
 */
async function requireAuth(event, sql = null) {
  // Tentar autenticação via Bearer token primeiro
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      return {
        isValid: true,
        user: decoded,
        method: 'jwt'
      };
    }
  }
  
  // Fallback para x-user-id (compatibilidade)
  const userId = event.headers['x-user-id'];
  if (userId && sql) {
    try {
      const users = await sql`SELECT id, email, role, name FROM users WHERE id = ${userId} LIMIT 1`;
      if (users.length > 0) {
        return {
          isValid: true,
          user: users[0],
          method: 'x-user-id'
        };
      }
    } catch (error) {
      console.error('Error fetching user by x-user-id:', error);
    }
  }
  
  return {
    isValid: false,
    error: 'Token não fornecido ou inválido',
    statusCode: 401
  };
}

/**
 * Verifica se o usuário é superadmin
 * @param {Object} user - Dados do usuário
 * @returns {boolean}
 */
function isSuperAdmin(user) {
  if (!user) return false;
  return user.role === 'superadmin' || 
         user.email === 'superadmin@7care.com' ||
         user.email === 'admin@church.com';
}

/**
 * Verifica se o usuário tem acesso de admin (pastor ou superadmin)
 * @param {Object} user - Dados do usuário
 * @returns {boolean}
 */
function hasAdminAccess(user) {
  if (!user) return false;
  return ['superadmin', 'pastor', 'admin'].includes(user.role);
}

/**
 * Hash de senha usando bcrypt
 * @param {string} password - Senha em texto plano
 * @returns {Promise<string>} Hash da senha
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Compara senha com hash
 * @param {string} password - Senha em texto plano
 * @param {string} hash - Hash da senha
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  isSuperAdmin,
  hasAdminAccess,
  hashPassword,
  comparePassword,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
