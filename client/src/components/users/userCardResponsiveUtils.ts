import type { User as UserType } from '@shared/schema';

export type LocalUser = UserType & { photo?: string | null };

export const getExtraDataObject = (value: LocalUser['extraData']): Record<string, unknown> => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
};

export const getPhotoUrl = (user: LocalUser) => {
  const photo = user.photo || user.profilePhoto || user.avatarUrl || '';
  if (!photo) return '';
  if (photo.startsWith('http')) return photo;
  return `/uploads/${photo}`;
};

export const isValidWhatsAppNumber = (phone?: string | null) => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

export const getVisitCount = (user: LocalUser) => {
  const extraData = getExtraDataObject(user.extraData);
  const visitCount = extraData.visitCount;
  if (typeof visitCount === 'number') return visitCount;
  if (typeof visitCount === 'string') return Number(visitCount) || 0;
  return 0;
};

export const getLastVisitDate = (user: LocalUser) => {
  const extraData = getExtraDataObject(user.extraData);
  const lastVisitDate = extraData.lastVisitDate;
  return typeof lastVisitDate === 'string' ? lastVisitDate : undefined;
};

export const formatVisitDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const generateFirstAccessUsername = (name: string) => {
  if (!name) return 'usuario';

  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return nameParts[0].toLowerCase();
  }

  const firstName = nameParts[0].toLowerCase();
  const lastName = nameParts[nameParts.length - 1].toLowerCase();

  const cleanFirstName = firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const cleanLastName = lastName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return `${cleanFirstName}.${cleanLastName}`;
};

export const getSpiritualLevel = (score: number) => {
  switch (score) {
    case 1:
      return {
        emoji: '🍃',
        label: 'Distante',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      };
    case 2:
      return {
        emoji: '🔍',
        label: 'Buscando',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
      };
    case 3:
      return {
        emoji: '🌱',
        label: 'Enraizando',
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
      };
    case 4:
      return {
        emoji: '🌳',
        label: 'Frutificando',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      };
    case 5:
      return {
        emoji: '✨',
        label: 'Intimidade',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      };
    default:
      return {
        emoji: '❓',
        label: 'Sem check-in',
        color: 'bg-gray-100 text-gray-600 dark:bg-slate-700/50 dark:text-slate-300',
      };
  }
};
