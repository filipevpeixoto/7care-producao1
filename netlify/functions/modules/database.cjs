/**
 * Módulo de Conexão com Banco de Dados
 * Centraliza conexão e queries com o PostgreSQL (Neon)
 */

const { neon, Pool } = require('@neondatabase/serverless');

// Cache de conexões
let sqlInstance = null;
let poolInstance = null;

/**
 * Obtém instância SQL para queries simples
 * @returns {Function} Função SQL do Neon
 */
function getSql() {
  if (!sqlInstance) {
    const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não configurado');
    }
    sqlInstance = neon(connectionString);
  }
  return sqlInstance;
}

/**
 * Obtém pool de conexões para queries mais complexas
 * @returns {Pool} Pool de conexões
 */
function getPool() {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não configurado');
    }
    poolInstance = new Pool({ connectionString });
  }
  return poolInstance;
}

/**
 * Executa query SELECT com retorno de múltiplas linhas
 * @param {string} query - Query SQL
 * @param {Array} params - Parâmetros da query
 * @returns {Promise<Array>} Resultado da query
 */
async function select(query, params = []) {
  const sql = getSql();
  try {
    const result = await sql(query, params);
    return result;
  } catch (error) {
    console.error('Database SELECT error:', error.message);
    throw error;
  }
}

/**
 * Executa query SELECT com retorno de uma única linha
 * @param {string} query - Query SQL
 * @param {Array} params - Parâmetros da query
 * @returns {Promise<Object|null>} Resultado da query ou null
 */
async function selectOne(query, params = []) {
  const result = await select(query, params);
  return result.length > 0 ? result[0] : null;
}

/**
 * Executa query INSERT e retorna registro inserido
 * @param {string} table - Nome da tabela
 * @param {Object} data - Dados para inserir
 * @returns {Promise<Object>} Registro inserido
 */
async function insert(table, data) {
  const sql = getSql();
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  
  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  try {
    const result = await sql(query, values);
    return result[0];
  } catch (error) {
    console.error('Database INSERT error:', error.message);
    throw error;
  }
}

/**
 * Executa query UPDATE
 * @param {string} table - Nome da tabela
 * @param {Object} data - Dados para atualizar
 * @param {Object} where - Condições WHERE
 * @returns {Promise<Object>} Registro atualizado
 */
async function update(table, data, where) {
  const sql = getSql();
  
  const setColumns = Object.keys(data);
  const setValues = Object.values(data);
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  
  const setClause = setColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  const whereClause = whereColumns.map((col, i) => `${col} = $${setColumns.length + i + 1}`).join(' AND ');
  
  const query = `
    UPDATE ${table}
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING *
  `;
  
  try {
    const result = await sql(query, [...setValues, ...whereValues]);
    return result[0];
  } catch (error) {
    console.error('Database UPDATE error:', error.message);
    throw error;
  }
}

/**
 * Executa query DELETE
 * @param {string} table - Nome da tabela
 * @param {Object} where - Condições WHERE
 * @returns {Promise<Object>} Registro deletado
 */
async function remove(table, where) {
  const sql = getSql();
  
  const whereColumns = Object.keys(where);
  const whereValues = Object.values(where);
  const whereClause = whereColumns.map((col, i) => `${col} = $${i + 1}`).join(' AND ');
  
  const query = `
    DELETE FROM ${table}
    WHERE ${whereClause}
    RETURNING *
  `;
  
  try {
    const result = await sql(query, whereValues);
    return result[0];
  } catch (error) {
    console.error('Database DELETE error:', error.message);
    throw error;
  }
}

/**
 * Busca registro por ID
 * @param {string} table - Nome da tabela
 * @param {number|string} id - ID do registro
 * @returns {Promise<Object|null>} Registro encontrado ou null
 */
async function findById(table, id) {
  return selectOne(`SELECT * FROM ${table} WHERE id = $1`, [id]);
}

/**
 * Busca registro por campo
 * @param {string} table - Nome da tabela
 * @param {string} field - Nome do campo
 * @param {any} value - Valor para buscar
 * @returns {Promise<Object|null>} Registro encontrado ou null
 */
async function findBy(table, field, value) {
  return selectOne(`SELECT * FROM ${table} WHERE ${field} = $1`, [value]);
}

/**
 * Busca todos os registros de uma tabela
 * @param {string} table - Nome da tabela
 * @param {Object} options - Opções (limit, offset, orderBy)
 * @returns {Promise<Array>} Registros encontrados
 */
async function findAll(table, options = {}) {
  let query = `SELECT * FROM ${table}`;
  
  if (options.orderBy) {
    query += ` ORDER BY ${options.orderBy}`;
  }
  
  if (options.limit) {
    query += ` LIMIT ${parseInt(options.limit)}`;
  }
  
  if (options.offset) {
    query += ` OFFSET ${parseInt(options.offset)}`;
  }
  
  return select(query);
}

/**
 * Conta registros de uma tabela
 * @param {string} table - Nome da tabela
 * @param {Object} where - Condições WHERE opcionais
 * @returns {Promise<number>} Total de registros
 */
async function count(table, where = {}) {
  const sql = getSql();
  
  let query = `SELECT COUNT(*) as total FROM ${table}`;
  let values = [];
  
  const whereColumns = Object.keys(where);
  if (whereColumns.length > 0) {
    const whereClause = whereColumns.map((col, i) => `${col} = $${i + 1}`).join(' AND ');
    query += ` WHERE ${whereClause}`;
    values = Object.values(where);
  }
  
  const result = await sql(query, values);
  return parseInt(result[0]?.total || 0);
}

/**
 * Verifica se registro existe
 * @param {string} table - Nome da tabela
 * @param {Object} where - Condições WHERE
 * @returns {Promise<boolean>} Se existe ou não
 */
async function exists(table, where) {
  const c = await count(table, where);
  return c > 0;
}

/**
 * Executa query raw
 * @param {string} query - Query SQL
 * @param {Array} params - Parâmetros
 * @returns {Promise<Array>} Resultado
 */
async function raw(query, params = []) {
  const sql = getSql();
  return sql(query, params);
}

/**
 * Executa múltiplas operações em uma transação
 * @param {Function} callback - Função que recebe client e executa operações
 * @returns {Promise<any>} Resultado do callback
 */
async function transaction(callback) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getSql,
  getPool,
  select,
  selectOne,
  insert,
  update,
  remove,
  findById,
  findBy,
  findAll,
  count,
  exists,
  raw,
  transaction
};
