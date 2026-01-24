/**
 * Funções de Parsing e Transformação de Dados
 * Utilitários para conversão e validação de tipos
 */

/**
 * Faz parse de uma lista de cargos separados por vírgula
 */
export const parseCargos = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);
  }
  return [];
};

/**
 * Converte valor para boolean
 * Aceita: true, false, 'true', 'false', 'sim', 'não', '1', '0', 1, 0
 */
export const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'sim' || lower === 'true' || lower === '1' || lower === 'yes';
  }
  return !!value;
};

/**
 * Converte valor para número inteiro
 * Retorna 0 se não for possível converter
 */
export const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : Math.floor(value);
  }
  if (typeof value === 'string') {
    const num = parseInt(value.trim(), 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

/**
 * Converte valor para número decimal
 * Retorna 0 se não for possível converter
 */
export const parseFloat = (value: unknown): number => {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  if (typeof value === 'string') {
    // Substituir vírgula por ponto para formato brasileiro
    const normalized = value.trim().replace(',', '.');
    const num = Number.parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

/**
 * Faz parse de uma data - Sistema robusto de detecção
 * Suporta múltiplos formatos: DD/MM/YYYY, YYYY-MM-DD, Excel serial dates, etc.
 */
export const parseDate = (dateValue: unknown): Date | null => {
  if (!dateValue) return null;

  try {
    // Se já é uma Date válida
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }

    // Limpa a string (remove espaços, aspas)
    const dateStr = String(dateValue).trim().replace(/['"]/g, '');

    // 1. Detecção de Números do Excel (serial dates)
    if (!isNaN(Number(dateValue)) && typeof dateValue === 'number') {
      // Excel armazena datas como número de dias desde 1/1/1900
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = dateValue - 2; // Excel tem bug do ano bissexto 1900
      const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);

      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    }

    // 2. Formato DD/MM/YYYY (formato brasileiro padrão)
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const parsedDay = parseInt(day, 10);
        const parsedMonth = parseInt(month, 10);
        let parsedYear = parseInt(year, 10);

        // Se o ano tem 2 dígitos, converte para 4 dígitos
        if (parsedYear < 100) {
          parsedYear += parsedYear < 50 ? 2000 : 1900;
        }

        // Validação de dados
        if (
          parsedDay >= 1 && parsedDay <= 31 &&
          parsedMonth >= 1 && parsedMonth <= 12 &&
          parsedYear >= 1900 && parsedYear <= 2100
        ) {
          const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
          if (
            date.getDate() === parsedDay &&
            date.getMonth() === parsedMonth - 1 &&
            date.getFullYear() === parsedYear
          ) {
            return date;
          }
        }
      }

      // Formato DD/MM (sem ano) - usa ano atual
      if (parts.length === 2) {
        const [day, month] = parts;
        const parsedDay = parseInt(day, 10);
        const parsedMonth = parseInt(month, 10);
        const currentYear = new Date().getFullYear();

        if (
          parsedDay >= 1 && parsedDay <= 31 &&
          parsedMonth >= 1 && parsedMonth <= 12
        ) {
          const date = new Date(currentYear, parsedMonth - 1, parsedDay);
          if (date.getDate() === parsedDay && date.getMonth() === parsedMonth - 1) {
            return date;
          }
        }
      }
    }

    // 3. Formato DD-MM-YYYY
    if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const parts = dateStr.split('-');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);

      if (
        parsedDay >= 1 && parsedDay <= 31 &&
        parsedMonth >= 1 && parsedMonth <= 12 &&
        parsedYear >= 1900 && parsedYear <= 2100
      ) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 4. Formato YYYY-MM-DD (formato ISO)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      const parsedYear = parseInt(year, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedDay = parseInt(day, 10);

      if (
        parsedYear >= 1900 && parsedYear <= 2100 &&
        parsedMonth >= 1 && parsedMonth <= 12 &&
        parsedDay >= 1 && parsedDay <= 31
      ) {
        // Usa data local para evitar problemas de fuso horário
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 5. Formato YYYY/MM/DD
    if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      const parts = dateStr.split('/');
      const [year, month, day] = parts;
      const parsedYear = parseInt(year, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedDay = parseInt(day, 10);

      if (
        parsedYear >= 1900 && parsedYear <= 2100 &&
        parsedMonth >= 1 && parsedMonth <= 12 &&
        parsedDay >= 1 && parsedDay <= 31
      ) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 6. Formato DD.MM.YYYY
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const parts = dateStr.split('.');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);

      if (
        parsedDay >= 1 && parsedDay <= 31 &&
        parsedMonth >= 1 && parsedMonth <= 12 &&
        parsedYear >= 1900 && parsedYear <= 2100
      ) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 7. Formato DD.MM.YY
    if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{2}$/)) {
      const parts = dateStr.split('.');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(month, 10);
      let parsedYear = parseInt(year, 10);

      parsedYear += parsedYear < 50 ? 2000 : 1900;

      if (
        parsedDay >= 1 && parsedDay <= 31 &&
        parsedMonth >= 1 && parsedMonth <= 12 &&
        parsedYear >= 1900 && parsedYear <= 2100
      ) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
          date.getDate() === parsedDay &&
          date.getMonth() === parsedMonth - 1 &&
          date.getFullYear() === parsedYear
        ) {
          return date;
        }
      }
    }

    // 8. Tentar parse direto com Date (fallback)
    const directDate = new Date(dateStr);
    if (!isNaN(directDate.getTime()) && directDate.getFullYear() > 1900) {
      // Ajustar para data local para evitar timezone
      return new Date(directDate.getFullYear(), directDate.getMonth(), directDate.getDate());
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Converte data para formato de aniversário (YYYY-MM-DD sem hora)
 */
export const parseBirthDate = (dateValue: unknown): string | null => {
  const date = parseDate(dateValue);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Faz parse de email e normaliza
 */
export const parseEmail = (value: unknown): string | null => {
  if (!value || typeof value !== 'string') return null;

  const email = value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email) ? email : null;
};

/**
 * Faz parse de telefone e normaliza
 */
export const parsePhone = (value: unknown): string | null => {
  if (!value || typeof value !== 'string') return null;

  // Remove tudo exceto dígitos
  const digits = value.replace(/\D/g, '');

  // Telefone brasileiro tem entre 10 e 11 dígitos
  if (digits.length >= 10 && digits.length <= 11) {
    return digits;
  }

  return null;
};

/**
 * Faz parse de ID de request (pode vir como string ou número)
 */
export const parseId = (value: unknown): number | null => {
  if (typeof value === 'number' && !isNaN(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const num = parseInt(value.trim(), 10);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }
  return null;
};

/**
 * Faz parse de array de IDs
 */
export const parseIds = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map(v => parseId(v))
      .filter((v): v is number => v !== null);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(v => parseId(v.trim()))
      .filter((v): v is number => v !== null);
  }
  return [];
};

/**
 * Sanitiza string removendo caracteres perigosos
 */
export const sanitizeString = (value: unknown): string => {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);

  return value
    .trim()
    .replace(/[<>]/g, '') // Remove < e > para prevenir XSS básico
    .substring(0, 10000); // Limita tamanho
};

/**
 * Valida e normaliza role de usuário
 */
export const parseUserRole = (value: unknown): string | null => {
  const validRoles = ['superadmin', 'pastor', 'member', 'interested', 'missionary', 'admin_readonly'];

  if (typeof value !== 'string') return null;

  const role = value.trim().toLowerCase();
  return validRoles.includes(role) ? role : null;
};
