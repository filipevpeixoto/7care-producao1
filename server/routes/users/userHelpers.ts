/**
 * User Routes - Shared Helpers
 * Common utilities used across user sub-modules
 */

import { type User } from '../../../shared/schema';

/**
 * Format a user for birthday display (used by birthdays route)
 */
export const formatBirthdayUser = (user: User) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  birthDate: user.birthDate || '',
  profilePhoto: user.profilePhoto,
  church: user.church || null,
});

/**
 * Redact PII from a user object (used by missionary view and my-interested)
 */
export const redactUserPII = (user: User) => ({
  ...user,
  id: user.id,
  name: user.name,
  role: user.role,
  status: user.status,
  church: user.church,
  churchCode: user.churchCode,
  email: user.email ? '***@***.***' : null,
  phone: user.phone ? '***-***-****' : null,
  address: user.address ? '*** *** ***' : null,
  birthDate: user.birthDate ? '**/**/****' : null,
  cpf: user.cpf ? '***.***.***-**' : null,
  occupation: user.occupation ? '***' : null,
  education: user.education ? '***' : null,
  previousReligion: user.previousReligion ? '***' : null,
  interestedSituation: user.interestedSituation ? '***' : null,
  points: 0,
  level: '***',
  attendance: 0,
  biblicalInstructor: null,
  isLinked: false,
  canRequestDiscipleship: true,
});
