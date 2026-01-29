/**
 * User Service
 * @module services/userService
 * @description Serviço centralizado para lógica de negócio de usuários.
 * Gerencia CRUD de usuários com controle de permissões baseado em roles,
 * filtros avançados e paginação.
 *
 * @example
 * ```typescript
 * import { userService } from './services/userService';
 *
 * // Buscar usuários com filtros
 * const result = await userService.getUsers(
 *   { role: 'member', status: 'active' },
 *   { page: 1, limit: 20 },
 *   currentUser
 * );
 *
 * // Criar usuário
 * const newUser = await userService.createUser({
 *   name: 'João',
 *   email: 'joao@email.com',
 *   role: 'member'
 * }, adminUser);
 * ```
 */

import { userRepository } from '../repositories';
import { authService } from './authService';
import { logger } from '../utils/logger';
import { hasAdminAccess, isSuperAdmin, canCreateUserWithRole } from '../utils/permissions';
import type { User } from '../../shared/schema';

/**
 * Opções de filtro para busca de usuários
 * @interface UserFilterOptions
 */
export interface UserFilterOptions {
  /** Filtrar por papel do usuário */
  role?: string;
  /** Filtrar por nome da igreja */
  church?: string;
  /** Filtrar por código da igreja */
  churchCode?: string;
  /** Filtrar por ID do distrito */
  districtId?: number;
  /** Filtrar por status (active, pending, inactive) */
  status?: string;
  /** Busca textual por nome ou email */
  search?: string;
  /** Filtrar por aprovação */
  isApproved?: boolean;
}

/**
 * Opções de paginação e ordenação
 * @interface PaginationOptions
 */
export interface PaginationOptions {
  /** Número da página (começando em 1) */
  page?: number;
  /** Quantidade de itens por página */
  limit?: number;
  /** Campo para ordenação */
  sortBy?: string;
  /** Direção da ordenação */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Resultado paginado de uma consulta
 * @interface PaginatedResult
 * @template T - Tipo dos itens retornados
 */
export interface PaginatedResult<T> {
  /** Array de itens da página atual */
  data: T[];
  /** Total de itens (todas as páginas) */
  total: number;
  /** Página atual */
  page: number;
  /** Limite de itens por página */
  limit: number;
  /** Total de páginas disponíveis */
  totalPages: number;
}

/**
 * Resultado de operações de usuário (create, update, delete)
 * @interface UserOperationResult
 */
export interface UserOperationResult {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;
  /** Dados do usuário afetado (sem senha) */
  user?: User;
  /** Mensagem de erro, se houver */
  error?: string;
  /** Erros de validação detalhados por campo */
  validationErrors?: Array<{ field: string; message: string }>;
}

/**
 * Serviço de gerenciamento de usuários
 * @class UserService
 * @description Implementa toda a lógica de negócio relacionada a usuários,
 * incluindo controle de acesso baseado em roles e hierarquia organizacional.
 */
export class UserService {
  /**
   * Busca usuários com filtros, paginação e controle de permissão
   * @async
   * @param {UserFilterOptions} [filters={}] - Filtros a aplicar
   * @param {PaginationOptions} [pagination={}] - Opções de paginação
   * @param {Partial<User>} [requestingUser] - Usuário fazendo a requisição (para controle de acesso)
   * @returns {Promise<PaginatedResult<User>>} Lista paginada de usuários
   * @description Aplica filtros hierárquicos baseados no role do usuário:
   * - SuperAdmin: vê todos os usuários
   * - Pastor: vê usuários do seu distrito
   * - Outros: vêem usuários da sua igreja
   */
  async getUsers(
    filters: UserFilterOptions = {},
    pagination: PaginationOptions = {},
    requestingUser?: Partial<User>
  ): Promise<PaginatedResult<User>> {
    try {
      // Buscar todos os usuários
      let users = await userRepository.getAllUsers();

      // Aplicar filtros baseados em permissões
      if (requestingUser && !isSuperAdmin(requestingUser)) {
        // Pastor só vê usuários do seu distrito
        if (requestingUser.districtId) {
          users = users.filter(u => u.districtId === requestingUser.districtId);
        }
        // Membro só vê usuários da sua igreja
        if (!hasAdminAccess(requestingUser) && requestingUser.churchCode) {
          users = users.filter(u => u.churchCode === requestingUser.churchCode);
        }
      }

      // Aplicar filtros de busca
      if (filters.role) {
        users = users.filter(u => u.role === filters.role);
      }
      if (filters.church) {
        users = users.filter(u => u.church === filters.church);
      }
      if (filters.churchCode) {
        users = users.filter(u => u.churchCode === filters.churchCode);
      }
      if (filters.districtId !== undefined) {
        users = users.filter(u => u.districtId === filters.districtId);
      }
      if (filters.status) {
        users = users.filter(u => u.status === filters.status);
      }
      if (filters.isApproved !== undefined) {
        users = users.filter(u => u.isApproved === filters.isApproved);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        users = users.filter(
          u =>
            u.name.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
      }

      // Ordenação
      const sortBy = pagination.sortBy || 'name';
      const sortOrder = pagination.sortOrder || 'asc';

      users.sort((a, b) => {
        const aVal = String((a as unknown as Record<string, unknown>)[sortBy] ?? '');
        const bVal = String((b as unknown as Record<string, unknown>)[sortBy] ?? '');
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      // Paginação
      const page = pagination.page || 1;
      const limit = pagination.limit || 50;
      const startIndex = (page - 1) * limit;
      const total = users.length;
      const totalPages = Math.ceil(total / limit);

      const paginatedUsers = users.slice(startIndex, startIndex + limit);

      // Remover senhas
      const safeUsers = paginatedUsers.map(u => ({ ...u, password: undefined })) as User[];

      return {
        data: safeUsers,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Erro ao buscar usuários', error);
      return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    }
  }

  /**
   * Busca usuário por ID com verificação de permissão
   * @async
   * @param {number} id - ID do usuário a buscar
   * @param {Partial<User>} [requestingUser] - Usuário fazendo a requisição
   * @returns {Promise<User | null>} Usuário encontrado ou null se não existir/sem permissão
   * @description Verifica permissões hierárquicas antes de retornar dados:
   * - SuperAdmin: acesso total
   * - Pastor: acesso a usuários do seu distrito
   * - Membro: acesso apenas a si mesmo ou usuários da mesma igreja
   */
  async getUserById(id: number, requestingUser?: Partial<User>): Promise<User | null> {
    try {
      const user = await userRepository.getUserById(id);

      if (!user) {
        return null;
      }

      // Verificar permissão de acesso
      if (requestingUser && !isSuperAdmin(requestingUser)) {
        // Pastor pode ver usuários do seu distrito
        if (hasAdminAccess(requestingUser)) {
          if (requestingUser.districtId && user.districtId !== requestingUser.districtId) {
            logger.warn('Acesso negado: usuário fora do distrito', {
              requesterId: requestingUser.id,
              targetId: id,
            });
            return null;
          }
        } else {
          // Membro só pode ver a si mesmo ou usuários da mesma igreja
          if (requestingUser.id !== id && requestingUser.churchCode !== user.churchCode) {
            logger.warn('Acesso negado: usuário fora da igreja', {
              requesterId: requestingUser.id,
              targetId: id,
            });
            return null;
          }
        }
      }

      return { ...user, password: undefined } as User;
    } catch (error) {
      logger.error('Erro ao buscar usuário por ID', error);
      return null;
    }
  }

  /**
   * Cria novo usuário no sistema
   * @async
   * @param {Partial<User>} userData - Dados do novo usuário
   * @param {Partial<User>} [requestingUser] - Usuário fazendo a requisição (para verificar permissões)
   * @returns {Promise<UserOperationResult>} Resultado da operação
   * @description Verifica permissões para criar usuários com roles específicos
   * e valida duplicidade de email.
   * @example
   * ```typescript
   * const result = await userService.createUser({
   *   name: 'Maria',
   *   email: 'maria@email.com',
   *   role: 'member',
   *   churchCode: 'IGR001'
   * }, adminUser);
   * ```
   */
  async createUser(
    userData: Partial<User>,
    requestingUser?: Partial<User>
  ): Promise<UserOperationResult> {
    try {
      // Verificar permissão para criar com o role especificado
      if (requestingUser && userData.role) {
        if (!canCreateUserWithRole(requestingUser, userData.role)) {
          return {
            success: false,
            error: 'Sem permissão para criar usuário com este perfil',
          };
        }
      }

      // Verificar email duplicado
      if (userData.email) {
        const existing = await userRepository.getUserByEmail(userData.email);
        if (existing) {
          return {
            success: false,
            error: 'Email já cadastrado',
            validationErrors: [{ field: 'email', message: 'Este email já está em uso' }],
          };
        }
      }

      // Definir valores padrão
      const newUserData = {
        ...userData,
        role: (userData.role || 'member') as User['role'],
        status: userData.status || 'pending',
        isApproved: userData.isApproved ?? false,
        firstAccess: true,
        points: userData.points || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Hash de senha se fornecida
      if (newUserData.password) {
        newUserData.password = await authService.hashPassword(newUserData.password);
      } else {
        // Gerar senha temporária
        const tempPassword = authService.generateTempPassword();
        newUserData.password = await authService.hashPassword(tempPassword);
      }

      const user = await userRepository.createUser(
        newUserData as Parameters<typeof userRepository.createUser>[0]
      );

      logger.info('Usuário criado', { userId: user.id, role: user.role });

      return {
        success: true,
        user: { ...user, password: undefined } as User,
      };
    } catch (error) {
      logger.error('Erro ao criar usuário', error);
      return { success: false, error: 'Erro ao criar usuário' };
    }
  }

  /**
   * Atualiza usuário
   */
  async updateUser(
    id: number,
    updates: Partial<User>,
    requestingUser?: Partial<User>
  ): Promise<UserOperationResult> {
    try {
      const existingUser = await userRepository.getUserById(id);

      if (!existingUser) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // Verificar permissões
      if (requestingUser) {
        // Não pode alterar superadmin a menos que seja superadmin
        if (isSuperAdmin(existingUser) && !isSuperAdmin(requestingUser)) {
          return { success: false, error: 'Sem permissão para editar este usuário' };
        }

        // Não pode promover para superadmin a menos que seja superadmin
        if (updates.role === 'superadmin' && !isSuperAdmin(requestingUser)) {
          return { success: false, error: 'Sem permissão para definir este perfil' };
        }

        // Pastor só pode editar usuários do seu distrito
        if (!isSuperAdmin(requestingUser) && hasAdminAccess(requestingUser)) {
          if (requestingUser.districtId && existingUser.districtId !== requestingUser.districtId) {
            return { success: false, error: 'Sem permissão para editar usuário de outro distrito' };
          }
        }
      }

      // Hash de senha se fornecida
      if (updates.password && !updates.password.startsWith('$2')) {
        updates.password = await authService.hashPassword(updates.password);
      }

      const updatedUser = await userRepository.updateUser(id, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      if (!updatedUser) {
        return { success: false, error: 'Erro ao atualizar usuário' };
      }

      logger.info('Usuário atualizado', { userId: id });

      return {
        success: true,
        user: { ...updatedUser, password: undefined } as User,
      };
    } catch (error) {
      logger.error('Erro ao atualizar usuário', error);
      return { success: false, error: 'Erro ao atualizar usuário' };
    }
  }

  /**
   * Deleta usuário
   */
  async deleteUser(
    id: number,
    requestingUser?: Partial<User>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await userRepository.getUserById(id);

      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // Não pode deletar superadmin
      if (isSuperAdmin(user)) {
        return { success: false, error: 'Não é possível excluir o Super Administrador' };
      }

      // Verificar permissões
      if (requestingUser && !isSuperAdmin(requestingUser)) {
        if (hasAdminAccess(user)) {
          return { success: false, error: 'Não é possível excluir administradores' };
        }

        if (requestingUser.districtId && user.districtId !== requestingUser.districtId) {
          return { success: false, error: 'Sem permissão para excluir usuário de outro distrito' };
        }
      }

      await userRepository.deleteUser(id);

      logger.info('Usuário excluído', { userId: id });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao excluir usuário', error);
      return { success: false, error: 'Erro ao excluir usuário' };
    }
  }

  /**
   * Aprova usuário
   */
  async approveUser(id: number, requestingUser?: Partial<User>): Promise<UserOperationResult> {
    return this.updateUser(id, { isApproved: true, status: 'active' }, requestingUser);
  }

  /**
   * Busca estatísticas de usuários
   */
  async getUserStats(districtId?: number): Promise<{
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    pending: number;
    approved: number;
  }> {
    try {
      let users = await userRepository.getAllUsers();

      if (districtId !== undefined) {
        users = users.filter(u => u.districtId === districtId);
      }

      const byRole: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let pending = 0;
      let approved = 0;

      for (const user of users) {
        // Contar por role
        byRole[user.role] = (byRole[user.role] || 0) + 1;

        // Contar por status
        const status = user.status || 'pending';
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Contar aprovados/pendentes
        if (user.isApproved) {
          approved++;
        } else {
          pending++;
        }
      }

      return {
        total: users.length,
        byRole,
        byStatus,
        pending,
        approved,
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas', error);
      return { total: 0, byRole: {}, byStatus: {}, pending: 0, approved: 0 };
    }
  }
}

export const userService = new UserService();
export default userService;
