/**
 * Módulo de Validação e Sanitização
 * Centraliza validação de inputs e sanitização de dados
 */

/**
 * Sanitiza string removendo caracteres perigosos
 * @param {string} str - String para sanitizar
 * @returns {string} String sanitizada
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitiza objeto recursivamente
 * @param {Object} obj - Objeto para sanitizar
 * @returns {Object} Objeto sanitizado
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeString(key)] = sanitizeObject(value);
  }
  return sanitized;
}

/**
 * Valida email
 * @param {string} email - Email para validar
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida telefone brasileiro
 * @param {string} phone - Telefone para validar
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone) return true; // Telefone é opcional
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * Valida senha (mínimo 6 caracteres)
 * @param {string} password - Senha para validar
 * @returns {Object} Resultado da validação
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Senha é obrigatória' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Senha deve ter pelo menos 6 caracteres' };
  }
  return { valid: true };
}

/**
 * Valida dados de usuário para criação/atualização
 * @param {Object} userData - Dados do usuário
 * @param {boolean} isUpdate - Se é uma atualização (campos opcionais)
 * @returns {Object} Resultado da validação
 */
function validateUserData(userData, isUpdate = false) {
  const errors = [];
  
  if (!isUpdate) {
    if (!userData.name || userData.name.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }
    if (!isValidEmail(userData.email)) {
      errors.push('Email inválido');
    }
  }
  
  if (userData.email && !isValidEmail(userData.email)) {
    errors.push('Email inválido');
  }
  
  if (userData.phone && !isValidPhone(userData.phone)) {
    errors.push('Telefone inválido');
  }
  
  if (userData.role && !['superadmin', 'pastor', 'admin', 'member', 'missionary', 'interested'].includes(userData.role)) {
    errors.push('Role inválido');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida dados de igreja
 * @param {Object} churchData - Dados da igreja
 * @returns {Object} Resultado da validação
 */
function validateChurchData(churchData) {
  const errors = [];
  
  if (!churchData.name || churchData.name.trim().length < 2) {
    errors.push('Nome da igreja deve ter pelo menos 2 caracteres');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida dados de distrito
 * @param {Object} districtData - Dados do distrito
 * @returns {Object} Resultado da validação
 */
function validateDistrictData(districtData) {
  const errors = [];
  
  if (!districtData.name || districtData.name.trim().length < 2) {
    errors.push('Nome do distrito deve ter pelo menos 2 caracteres');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida dados de evento
 * @param {Object} eventData - Dados do evento
 * @returns {Object} Resultado da validação
 */
function validateEventData(eventData) {
  const errors = [];
  
  if (!eventData.title || eventData.title.trim().length < 2) {
    errors.push('Título do evento deve ter pelo menos 2 caracteres');
  }
  
  if (!eventData.date) {
    errors.push('Data do evento é obrigatória');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Formata número de telefone
 * @param {string} phone - Telefone para formatar
 * @returns {string|null} Telefone formatado ou null
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits;
}

/**
 * Parse de data com múltiplos formatos
 * @param {any} dateValue - Valor da data
 * @returns {Date|null} Data parseada ou null
 */
function parseDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    const dateStr = String(dateValue).trim().replace(/['"]/g, '');
    
    // Números do Excel (serial dates)
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = dateValue - 2;
      const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) return date;
    }
    
    // Formato DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        let parsedYear = parseInt(year);
        if (parsedYear < 100) parsedYear += parsedYear < 50 ? 2000 : 1900;
        const date = new Date(parsedYear, parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
    }
    
    // Formato DD-MM-YYYY
    if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const parts = dateStr.split('-');
      const [day, month, year] = parts;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }
    
    // Formato YYYY-MM-DD (ISO)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Tentativa genérica
    const date = new Date(dateValue);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900) return date;
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Parse de boolean de múltiplos formatos
 * @param {any} val - Valor para parsear
 * @returns {boolean}
 */
function parseBool(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  const str = String(val).toLowerCase().trim();
  return str === 'true' || str === 'sim' || str === 's' || str === '1' || str === 'yes' || str === 'x';
}

/**
 * Parse de número
 * @param {any} val - Valor para parsear
 * @returns {number}
 */
function parseNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  isValidPhone,
  validatePassword,
  validateUserData,
  validateChurchData,
  validateDistrictData,
  validateEventData,
  formatPhoneNumber,
  parseDate,
  parseBool,
  parseNumber
};
