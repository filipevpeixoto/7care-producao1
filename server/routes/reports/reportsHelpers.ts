/**
 * Reports Helpers
 * Shared helper functions for reports routes
 */

import { getRepository } from '../../container';
import { logger } from '../../utils/logger';
import { isSuperAdmin, isPastor } from '../../utils/permissions';
import { type User, type Church, type Event } from '../../../shared/schema';

/**
 * Helper function para buscar usuários com isolamento de distrito
 * PERFORMANCE & ISOLATION FIX: Usa query direta por distrito quando aplicável
 */
export const getUsersForReport = async (
  user: User | null
): Promise<{ users: User[]; churches: Church[]; events: Event[] }> => {
  const userRepo = getRepository('userRepository');
  const eventRepo = getRepository('eventRepository');
  const churchRepo = getRepository('churchRepository');

  const allEvents = await eventRepo.getAllEvents();

  if (isPastor(user) && user?.districtId) {
    // Pastor: query otimizada direto do banco por district_id
    logger.info(`🏛️ Reports Helper - Query direta por distrito: ${user.districtId}`);
    const users = await userRepo.getUsersByDistrictId(user.districtId);
    const filteredUsers = users.filter((u: User) => u.email !== 'admin@7care.com');
    const churches = await churchRepo.getChurchesByDistrict(user.districtId);
    const events = allEvents.filter((e: Event) => e.districtId === user.districtId);
    return { users: filteredUsers, churches, events };
  } else if (isSuperAdmin(user)) {
    if (user?.districtId) {
      // Superadmin com distrito específico
      const users = await userRepo.getUsersByDistrictId(user.districtId);
      const filteredUsers = users.filter((u: User) => u.email !== 'admin@7care.com');
      const churches = await churchRepo.getChurchesByDistrict(user.districtId);
      const events = allEvents.filter((e: Event) => e.districtId === user.districtId);
      return { users: filteredUsers, churches, events };
    } 
      // Superadmin sem distrito (vê tudo)
      const allUsers = await userRepo.getAllUsers();
      const filteredUsers = allUsers.filter((u: User) => u.email !== 'admin@7care.com');
      const allChurches = await churchRepo.getAllChurches();
      return { users: filteredUsers, churches: allChurches, events: allEvents };
    
  }

  // Fallback: sem acesso
  return { users: [], churches: [], events: [] };
};

/**
 * Helper function to calculate engagement level
 */
export const getEngagementScore = (user: User): number => {
  let score = 0;

  // Attendance score (0-30)
  score += Math.min((user.attendance || 0) * 3, 30);

  // Tither bonus (15 points)
  if (user.isTither) score += 15;

  // Donor bonus (10 points)
  if (user.isDonor) score += 10;

  // Has lesson bonus (10 points)
  if (user.hasLesson) score += 10;

  // Points/gamification (0-20)
  score += Math.min((user.points || 0) / 50, 20);

  // Streak bonus (0-15)
  score += Math.min((user.streak || 0) * 3, 15);

  return Math.min(score, 100);
};

/**
 * Helper function to classify users by spiritual stage
 */
export const getSpiritualStage = (user: User): string => {
  if (user.role === 'interested') {
    const classificacao = user.classificacao?.toUpperCase() || 'C';
    if (classificacao === 'A') return 'Interessado A';
    if (classificacao === 'B') return 'Interessado B';
    return 'Interessado C';
  }
  if (user.baptismDate) return 'Batizado';
  if (user.role === 'member') return 'Membro';
  if (user.role === 'missionary') return 'Missionário';
  return 'Outro';
};
