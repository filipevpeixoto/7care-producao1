/**
 * Auth Service
 * @module services/authService
 * @description Serviço centralizado para lógica de autenticação, incluindo login,
 * registro, alteração de senha e reset de senha. Implementa hashing seguro com bcrypt
 * e validação de força de senha.
 *
 * @example
 * ```typescript
 * import { authService } from './services/authService';
 *
 * // Login
 * const result = await authService.login('user@email.com', 'password');
 * if (result.success) {
 *   console.log('Token:', result.token);
 * }
 *
 * // Registro
 * const registerResult = await authService.register({
 *   name: 'João Silva',
 *   email: 'joao@email.com',
 *   password: 'SenhaSegura123!'
 * });
 * ```
 */

import * as bcrypt from 'bcryptjs';
import { userRepository } from '../repositories';
import { generateTokens } from '../middleware/jwtAuth';
import { logger } from '../utils/logger';
import { validatePasswordStrength, getPasswordSuggestions } from '../utils/passwordValidator';
import type { User } from '../../shared/schema';

/**
 * Resultado da operação de login
 * @interface LoginResult
 */
export interface LoginResult {
  /** Indica se o login foi bem-sucedido */
  success: boolean;
  /** Dados do usuário autenticado (sem senha) */
  user?: User;
  /** JWT access token */
  token?: string;
  /** JWT refresh token para renovação */
  refreshToken?: string;
  /** Mensagem de erro, se houver */
  error?: string;
  /** Indica se usuário precisa trocar a senha no primeiro acesso */
  requirePasswordChange?: boolean;
  /** Indica se autenticação 2FA é necessária */
  requires2FA?: boolean;
}

/**
 * Resultado da operação de registro
 * @interface RegisterResult
 */
export interface RegisterResult {
  /** Indica se o registro foi bem-sucedido */
  success: boolean;
  /** Dados do usuário criado (sem senha) */
  user?: User;
  /** Mensagem de erro, se houver */
  error?: string;
  /** Erros de validação detalhados por campo */
  validationErrors?: Array<{ field: string; message: string }>;
}

/**
 * Resultado da operação de alteração de senha
 * @interface PasswordChangeResult
 */
export interface PasswordChangeResult {
  /** Indica se a alteração foi bem-sucedida */
  success: boolean;
  /** Mensagem de erro, se houver */
  error?: string;
  /** Sugestões para melhorar a senha */
  suggestions?: string[];
}

/**
 * Serviço de autenticação
 * @class AuthService
 * @description Classe responsável por toda a lógica de autenticação do sistema.
 * Utiliza bcrypt para hashing de senhas com salt factor de 12 rounds.
 */
export class AuthService {
  /**
   * Autentica usuário com email e senha
   * @async
   * @param {string} email - Email do usuário
   * @param {string} password - Senha em texto plano
   * @returns {Promise<LoginResult>} Resultado do login com tokens se bem-sucedido
   * @example
   * ```typescript
   * const result = await authService.login('user@email.com', 'password123');
   * if (result.success) {
   *   localStorage.setItem('token', result.token);
   * }
   * ```
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Buscar usuário por email
      const user = await userRepository.getUserByEmail(email);

      if (!user) {
        logger.warn('Login falhou: usuário não encontrado', { email });
        return { success: false, error: 'Credenciais inválidas' };
      }

      // Verificar se usuário está ativo
      if (user.status === 'inactive') {
        logger.warn('Login falhou: usuário inativo', { userId: user.id });
        return { success: false, error: 'Conta desativada. Entre em contato com o administrador.' };
      }

      // Verificar senha
      const isValidPassword = await this.verifyPassword(password, user.password || '');

      if (!isValidPassword) {
        logger.warn('Login falhou: senha inválida', { userId: user.id });
        return { success: false, error: 'Credenciais inválidas' };
      }

      // Gerar tokens
      const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        church: user.church,
        districtId: user.districtId,
      });

      // Atualizar último acesso
      await userRepository.updateUser(user.id, {
        lastLogin: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
      });

      logger.info('Login bem-sucedido', { userId: user.id, role: user.role });

      // Remover senha do retorno
      const safeUser = { ...user, password: undefined };

      return {
        success: true,
        user: safeUser as User,
        token: accessToken,
        refreshToken,
        requirePasswordChange: user.firstAccess || false,
      };
    } catch (error) {
      logger.error('Erro no login', error);
      return { success: false, error: 'Erro interno no servidor' };
    }
  }

  /**
   * Registra novo usuário no sistema
   * @async
   * @param {Object} userData - Dados do novo usuário
   * @param {string} userData.name - Nome completo do usuário
   * @param {string} userData.email - Email único do usuário
   * @param {string} userData.password - Senha (deve atender requisitos de segurança)
   * @param {string} [userData.role='member'] - Papel do usuário no sistema
   * @param {string} [userData.church] - Nome da igreja
   * @param {string} [userData.churchCode] - Código da igreja
   * @param {number} [userData.districtId] - ID do distrito
   * @returns {Promise<RegisterResult>} Resultado do registro
   * @throws {Error} Se ocorrer erro no banco de dados
   * @example
   * ```typescript
   * const result = await authService.register({
   *   name: 'Maria Santos',
   *   email: 'maria@email.com',
   *   password: 'SenhaForte123!',
   *   role: 'member',
   *   churchCode: 'IGR001'
   * });
   * ```
   */
  async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    church?: string;
    churchCode?: string;
    districtId?: number;
  }): Promise<RegisterResult> {
    try {
      // Verificar se email já existe
      const existingUser = await userRepository.getUserByEmail(userData.email);

      if (existingUser) {
        return {
          success: false,
          error: 'Email já cadastrado',
          validationErrors: [{ field: 'email', message: 'Este email já está em uso' }],
        };
      }

      // Validar força da senha
      const passwordValidation = validatePasswordStrength(userData.password);

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: 'Senha não atende aos requisitos de segurança',
          validationErrors: passwordValidation.errors.map((e: string) => ({
            field: 'password',
            message: e,
          })),
        };
      }

      // Hash da senha
      const hashedPassword = await this.hashPassword(userData.password);

      // Criar usuário
      const user = await userRepository.createUser({
        ...userData,
        password: hashedPassword,
        role: (userData.role || 'member') as User['role'],
        status: 'pending',
        firstAccess: true,
        isApproved: false,
      });

      logger.info('Usuário registrado', { userId: user.id, email: user.email });

      return {
        success: true,
        user: { ...user, password: undefined } as User,
      };
    } catch (error) {
      logger.error('Erro no registro', error);
      return { success: false, error: 'Erro ao criar conta' };
    }
  }

  /**
   * Altera senha do usuário autenticado
   * @async
   * @param {number} userId - ID do usuário
   * @param {string} currentPassword - Senha atual para verificação
   * @param {string} newPassword - Nova senha (deve atender requisitos de segurança)
   * @returns {Promise<PasswordChangeResult>} Resultado da operação
   * @example
   * ```typescript
   * const result = await authService.changePassword(123, 'senhaAtual', 'NovaSenha123!');
   * if (!result.success && result.suggestions) {
   *   console.log('Sugestões:', result.suggestions);
   * }
   * ```
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<PasswordChangeResult> {
    try {
      const user = await userRepository.getUserById(userId);

      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // Verificar senha atual
      const isValidPassword = await this.verifyPassword(currentPassword, user.password || '');

      if (!isValidPassword) {
        return { success: false, error: 'Senha atual incorreta' };
      }

      // Validar nova senha
      const passwordValidation = validatePasswordStrength(newPassword);

      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: 'Nova senha não atende aos requisitos',
          suggestions: getPasswordSuggestions(newPassword),
        };
      }

      // Hash e atualizar
      const hashedPassword = await this.hashPassword(newPassword);

      await userRepository.updateUser(userId, {
        password: hashedPassword,
        firstAccess: false,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Senha alterada', { userId });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao alterar senha', error);
      return { success: false, error: 'Erro ao alterar senha' };
    }
  }

  /**
   * Reset de senha - gera senha temporária para o usuário
   * @async
   * @param {string} email - Email do usuário
   * @returns {Promise<{success: boolean, tempPassword?: string, error?: string}>}
   *          Resultado com senha temporária (para envio por email)
   * @description Por segurança, sempre retorna success=true mesmo se usuário não existir,
   *              para não revelar quais emails estão cadastrados.
   * @example
   * ```typescript
   * const result = await authService.resetPassword('user@email.com');
   * if (result.tempPassword) {
   *   await emailService.sendPasswordReset(email, result.tempPassword);
   * }
   * ```
   */
  async resetPassword(
    email: string
  ): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
    try {
      const user = await userRepository.getUserByEmail(email);

      if (!user) {
        // Não revelar se usuário existe
        return { success: true };
      }

      // Gerar senha temporária
      const tempPassword = this.generateTempPassword();
      const hashedPassword = await this.hashPassword(tempPassword);

      await userRepository.updateUser(user.id, {
        password: hashedPassword,
        firstAccess: true,
      });

      logger.info('Senha resetada', { userId: user.id });

      return { success: true, tempPassword };
    } catch (error) {
      logger.error('Erro no reset de senha', error);
      return { success: false, error: 'Erro ao resetar senha' };
    }
  }

  /**
   * Gera hash seguro de senha usando bcrypt
   * @async
   * @param {string} password - Senha em texto plano
   * @returns {Promise<string>} Hash bcrypt da senha
   * @description Utiliza 12 rounds de salt para segurança adequada
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Verifica se senha corresponde ao hash armazenado
   * @async
   * @param {string} password - Senha em texto plano para verificar
   * @param {string} hash - Hash bcrypt armazenado
   * @returns {Promise<boolean>} true se senha corresponder ao hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!hash || hash.length === 0) {
      return false;
    }
    return bcrypt.compare(password, hash);
  }

  /**
   * Gera senha temporária segura com requisitos mínimos
   * @param {number} [length=12] - Comprimento da senha
   * @returns {string} Senha aleatória contendo maiúsculas, minúsculas, números e símbolos
   * @description Garante pelo menos um caractere de cada tipo para cumprir
   *              requisitos de complexidade. Evita caracteres ambíguos (0, O, l, 1).
   */
  generateTempPassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';

    // Garantir pelo menos um de cada tipo
    password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    password += 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)];
    password += '23456789'[Math.floor(Math.random() * 8)];
    password += '!@#$%'[Math.floor(Math.random() * 5)];

    // Completar com caracteres aleatórios
    for (let i = password.length; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Embaralhar
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}

/** Instância singleton do serviço de autenticação */
export const authService = new AuthService();
export default authService;
