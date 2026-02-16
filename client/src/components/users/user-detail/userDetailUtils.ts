import { getRoleDisplayName } from '@/lib/permissions';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Users');

export const parseDate = (dateValue: unknown): Date | null => {
  if (!dateValue) return null;

  try {
    const dateStr = dateValue.toString().trim().replace(/['"]/g, '');

    if (!isNaN(dateValue as number) && typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = dateValue - 2;
      const date = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);

      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    }

    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const parsedDay = parseInt(day);
        const parsedMonth = parseInt(month);
        let parsedYear = parseInt(year);

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

    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        return date;
      }
    }

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

    if (dateStr.includes('-') && dateStr.includes('/')) {
      const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}\/(\d{4})$/);
      if (match) {
        const firstDate = `${match[1]}/${match[2]}`;
        return parseDate(firstDate);
      }
    }

    if (dateStr.includes('-') && dateStr.includes('/') && !dateStr.match(/\d{4}/)) {
      const match = dateStr.match(/^(\d{1,2}\/\d{1,2})-\d{1,2}\/\d{1,2}$/);
      if (match) {
        const currentYear = new Date().getFullYear();
        const firstDate = `${match[1]}/${currentYear}`;
        return parseDate(firstDate);
      }
    }

    if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
      const currentYear = new Date().getFullYear();
      const dateWithYear = `${dateStr}/${currentYear}`;
      return parseDate(dateWithYear);
    }

    const date = new Date(dateValue as string);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
      return date;
    }

    return null;
  } catch {
    return null;
  }
};

export const calculateAge = (birthDate: string | null | undefined) => {
  if (!birthDate) return 'Não informado';

  const dateObj = parseDate(birthDate);
  if (!dateObj) return 'Não informado';

  return `${Math.floor(
    (new Date().getTime() - dateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )} anos`;
};

export const formatDateForDisplay = (dateValue: unknown): string => {
  if (!dateValue) return 'Não informado';

  const dateObj = parseDate(dateValue);
  if (!dateObj) return 'Não informado';

  return dateObj.toLocaleDateString('pt-BR');
};

export const calculateYearsSince = (date: string | null | undefined) => {
  if (!date) return 'Não informado';

  const dateObj = parseDate(date);
  if (!dateObj) return 'Não informado';

  return `${Math.floor(
    (new Date().getTime() - dateObj.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )} anos`;
};

export const formatDate = (date: string | number | boolean | null | undefined) => {
  if (!date) return 'Não informado';

  const dateObj = parseDate(date);
  if (!dateObj) {
    logger.debug(`Data inválida detectada no frontend: ${date}`);
    return 'Não informado';
  }

  return dateObj.toLocaleDateString('pt-BR');
};

export const getExtraData = (user: Record<string, unknown>): Record<string, string | number | boolean | null | undefined> => {
  try {
    const extraDataField = user.extra_data || user.extraData;
    if (extraDataField && typeof extraDataField === 'string') {
      return JSON.parse(extraDataField);
    }
    if (extraDataField && typeof extraDataField === 'object') {
      return extraDataField as Record<string, string | number | boolean | null | undefined>;
    }
    return {};
  } catch (error) {
    logger.error('Erro ao parsear extra_data:', error);
    return {};
  }
};

export const getRoleLabel = (role: string) => {
  if (role === 'admin') return 'Administrador';
  if (role === 'interested') return 'Amigo';
  return getRoleDisplayName(role);
};

export const getCivilStatusLabel = (status: string | null | undefined) => {
  switch (status) {
    case 'single':
      return 'Solteiro(a)';
    case 'married':
      return 'Casado(a)';
    case 'divorced':
      return 'Divorciado(a)';
    case 'widowed':
      return 'Viúvo(a)';
    default:
      return 'Não informado';
  }
};

export const getDepartments = (user: Record<string, unknown>) => {
  if (!user.departments) return [];
  if (typeof user.departments === 'string') {
    return user.departments
      .split(',')
      .map((d: string) => d.trim())
      .filter((d: string) => d);
  }
  if (Array.isArray(user.departments)) {
    return user.departments;
  }
  return [];
};

export const getPhoneWarning = (user: Record<string, unknown>) => {
  try {
    if (user.extraData && typeof user.extraData === 'string') {
      const extraData = JSON.parse(user.extraData);
      return extraData.phoneWarning
        ? {
            hasWarning: true,
            originalPhone: extraData.originalPhone,
          }
        : { hasWarning: false };
    }
    return { hasWarning: false };
  } catch {
    return { hasWarning: false };
  }
};
