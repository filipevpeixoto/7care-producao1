/**
 * Funções de parsing para importação de dados Excel/CSV
 * Extraído de Settings.tsx para melhor modularização
 */

/**
 * Mapeia string de tipo/cargo para role do sistema
 */
export const getRole = (tipo: string): string => {
  if (!tipo) return 'member';
  const tipoLower = tipo.toLowerCase().trim();

  // Superadmin roles
  if (
    tipoLower.includes('superadmin') ||
    tipoLower.includes('super admin') ||
    tipoLower.includes('super-adm') ||
    tipoLower.includes('admin geral')
  ) {
    return 'superadmin';
  }

  // Admin/Pastor roles
  if (
    tipoLower.includes('admin') ||
    tipoLower.includes('pastor') ||
    tipoLower.includes('pastora') ||
    tipoLower.includes('ministro') ||
    tipoLower.includes('ministra') ||
    tipoLower.includes('líder') ||
    tipoLower.includes('lider') ||
    tipoLower.includes('coordenador') ||
    tipoLower.includes('coordenadora')
  ) {
    return 'pastor';
  }

  // Missionary/Diácono roles
  if (
    tipoLower.includes('mission') ||
    tipoLower.includes('missionário') ||
    tipoLower.includes('missionaria') ||
    tipoLower.includes('diácon') ||
    tipoLower.includes('diacon') ||
    tipoLower.includes('evangelista') ||
    tipoLower.includes('pioneiro') ||
    tipoLower.includes('pioneira') ||
    tipoLower.includes('colportor') ||
    tipoLower.includes('colportora')
  ) {
    return 'missionary';
  }

  // Interested/Visitor roles
  if (
    tipoLower.includes('interest') ||
    tipoLower.includes('interessado') ||
    tipoLower.includes('interessada') ||
    tipoLower.includes('visit') ||
    tipoLower.includes('visitante') ||
    tipoLower.includes('simpatizante') ||
    tipoLower.includes('estudante') ||
    tipoLower.includes('candidato') ||
    tipoLower.includes('candidata') ||
    tipoLower.includes('prospecto') ||
    tipoLower.includes('prospecta')
  ) {
    return 'interested';
  }

  // Member roles (default)
  if (
    tipoLower.includes('member') ||
    tipoLower.includes('membro') ||
    tipoLower.includes('fiel') ||
    tipoLower.includes('batizado') ||
    tipoLower.includes('batizada') ||
    tipoLower.includes('adventista') ||
    tipoLower.includes('crente') ||
    tipoLower.includes('frequentador') ||
    tipoLower.includes('frequentadora')
  ) {
    return 'member';
  }

  // Default to member if no match found
  return 'member';
};

/**
 * Converte valor para número
 */
export const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

/**
 * Converte vários formatos de data para Date
 * Suporta: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY, DD.MM.YY,
 * intervalos com/sem ano, datas sem ano, serial dates do Excel
 */
export const parseDate = (dateValue: unknown): Date | null => {
  if (!dateValue) return null;

  try {
    // Limpa a string (remove espaços, aspas)
    const dateStr = String(dateValue).trim().replace(/['"]/g, '');

    // 1. Detecção de Números do Excel (serial dates)
    if (typeof dateValue === 'number') {
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
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        let parsedYear = parseInt(year);

        // Se o ano tem 2 dígitos, converte para 4 dígitos
        if (parsedYear < 100) {
          parsedYear += parsedYear < 50 ? 2000 : 1900;
        }

        if (
          parsedDay >= 1 &&
          parsedDay <= 31 &&
          parsedMonth >= 1 &&
          parsedMonth <= 12 &&
          parsedYear >= 1900 &&
          parsedYear <= 2100
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
    }

    // 3. Formato DD-MM-YYYY
    if (dateStr.includes('-') && dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const parts = dateStr.split('-');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day);
      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);

      if (
        parsedDay >= 1 &&
        parsedDay <= 31 &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        parsedYear >= 1900 &&
        parsedYear <= 2100
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
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    }

    // 5. Formato YYYY/MM/DD (formato alternativo)
    if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      const parts = dateStr.split('/');
      const [year, month, day] = parts;
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedDay = parseInt(day);

      if (
        parsedYear >= 1900 &&
        parsedYear <= 2100 &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        parsedDay >= 1 &&
        parsedDay <= 31
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
    if (dateStr.includes('.') && dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      const parts = dateStr.split('.');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day);
      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);

      if (
        parsedDay >= 1 &&
        parsedDay <= 31 &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        parsedYear >= 1900 &&
        parsedYear <= 2100
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
    if (dateStr.includes('.') && dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{2}$/)) {
      const parts = dateStr.split('.');
      const [day, month, year] = parts;
      const parsedDay = parseInt(day);
      const parsedMonth = parseInt(month);
      let parsedYear = parseInt(year);

      parsedYear += parsedYear < 50 ? 2000 : 1900;

      if (
        parsedDay >= 1 &&
        parsedDay <= 31 &&
        parsedMonth >= 1 &&
        parsedMonth <= 12 &&
        parsedYear >= 1900 &&
        parsedYear <= 2100
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

    // 8. Intervalos com ano (ex: "15/01-20/02/2024") - usa a primeira data
    if (dateStr.includes('-') && dateStr.includes('/')) {
      const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}\/(\d{4})$/);
      if (match) {
        const firstDate = `${match[1]}/${match[2]}`;
        return parseDate(firstDate);
      }
    }

    // 9. Intervalos sem ano (ex: "24/07-03/08") - usa ano atual
    if (dateStr.includes('-') && dateStr.includes('/') && !dateStr.match(/\d{4}/)) {
      const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}$/);
      if (match) {
        const currentYear = new Date().getFullYear();
        const firstDate = `${match[1]}/${currentYear}`;
        return parseDate(firstDate);
      }
    }

    // 10. Data sem ano (ex: "03/12") - usa ano atual
    if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
      const currentYear = new Date().getFullYear();
      const dateWithYear = `${dateStr}/${currentYear}`;
      return parseDate(dateWithYear);
    }

    // 11. Fallback: tenta o construtor padrão do JavaScript
    const date = new Date(dateValue as string | number | Date);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
      return date;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Converte valor para boolean
 */
export const parseBooleanField = (value: unknown): boolean => {
  if (!value) return false;
  const str = String(value).toLowerCase();
  return str === 'sim' || str === 'true' || str === '1' || str === 'yes';
};

/**
 * Detecta e mapeia valores de dizimista
 */
export const parseDizimistaField = (
  value: unknown
): { isDonor: boolean; dizimistaType: string } => {
  if (!value) return { isDonor: false, dizimistaType: 'Não Dizimista' };

  const str = String(value).trim();
  const lowerStr = str.toLowerCase();

  if (
    lowerStr === 'não dizimista' ||
    lowerStr === 'nao dizimista' ||
    lowerStr === 'não' ||
    lowerStr === 'nao' ||
    lowerStr === 'n'
  ) {
    return { isDonor: false, dizimistaType: 'Não Dizimista' };
  }

  if (lowerStr === 'pontual (1-3)' || lowerStr === 'pontual' || lowerStr.includes('pontual')) {
    return { isDonor: true, dizimistaType: 'Pontual (1-3)' };
  }

  if (lowerStr === 'sazonal (4-7)' || lowerStr === 'sazonal' || lowerStr.includes('sazonal')) {
    return { isDonor: true, dizimistaType: 'Sazonal (4-7)' };
  }

  if (
    lowerStr === 'recorrente (8-12)' ||
    lowerStr === 'recorrente' ||
    lowerStr.includes('recorrente')
  ) {
    return { isDonor: true, dizimistaType: 'Recorrente (8-12)' };
  }

  if (lowerStr === 'sim' || lowerStr === 'true' || lowerStr === '1' || lowerStr === 'yes') {
    return { isDonor: true, dizimistaType: 'Sim' };
  }

  return { isDonor: true, dizimistaType: str };
};

/**
 * Detecta e mapeia valores de ofertante
 */
export const parseOfertanteField = (
  value: unknown
): { isOffering: boolean; ofertanteType: string } => {
  if (!value) return { isOffering: false, ofertanteType: 'Não Ofertante' };

  const str = String(value).trim();
  const lowerStr = str.toLowerCase();

  if (
    lowerStr === 'não ofertante' ||
    lowerStr === 'nao ofertante' ||
    lowerStr === 'não' ||
    lowerStr === 'nao' ||
    lowerStr === 'n'
  ) {
    return { isOffering: false, ofertanteType: 'Não Ofertante' };
  }

  if (lowerStr === 'pontual (1-3)' || lowerStr === 'pontual' || lowerStr.includes('pontual')) {
    return { isOffering: true, ofertanteType: 'Pontual (1-3)' };
  }

  if (lowerStr === 'sazonal (4-7)' || lowerStr === 'sazonal' || lowerStr.includes('sazonal')) {
    return { isOffering: true, ofertanteType: 'Sazonal (4-7)' };
  }

  if (
    lowerStr === 'recorrente (8-12)' ||
    lowerStr === 'recorrente' ||
    lowerStr.includes('recorrente')
  ) {
    return { isOffering: true, ofertanteType: 'Recorrente (8-12)' };
  }

  if (lowerStr === 'sim' || lowerStr === 'true' || lowerStr === '1' || lowerStr === 'yes') {
    return { isOffering: true, ofertanteType: 'Sim' };
  }

  return { isOffering: true, ofertanteType: str };
};

/**
 * Formata número de telefone brasileiro
 */
export const formatPhoneNumber = (phone: unknown): string | null => {
  if (!phone) return null;

  const cleanPhone = String(phone).replace(/[^0-9]/g, '');

  if (cleanPhone.length < 10) {
    return null;
  }

  let formattedPhone: string;

  if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
    formattedPhone = `55${cleanPhone}`;
  } else if (!cleanPhone.startsWith('55') && cleanPhone.length === 10) {
    formattedPhone = `55${cleanPhone}`;
  } else {
    formattedPhone = cleanPhone;
  }

  if (formattedPhone.length === 13) {
    const countryCode = formattedPhone.substring(0, 2);
    const areaCode = formattedPhone.substring(2, 4);
    const firstPart = formattedPhone.substring(4, 9);
    const lastPart = formattedPhone.substring(9, 13);
    return `+${countryCode}(${areaCode})${firstPart}-${lastPart}`;
  } else if (formattedPhone.length === 12) {
    const countryCode = formattedPhone.substring(0, 2);
    const areaCode = formattedPhone.substring(2, 4);
    const firstPart = formattedPhone.substring(4, 8);
    const lastPart = formattedPhone.substring(8, 12);
    return `+${countryCode}(${areaCode})${firstPart}-${lastPart}`;
  } else {
    return cleanPhone;
  }
};
