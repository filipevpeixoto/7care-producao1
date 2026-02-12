/**
 * District Pastor Routes
 * CRUD operations for pastor management
 *
 * Routes:
 *   GET    /api/pastors     - List pastors (filtered by permission)
 *   GET    /api/pastors/:id - Get pastor by ID
 *   POST   /api/pastors     - Create pastor (superadmin only)
 *   PUT    /api/pastors/:id - Update pastor (superadmin only)
 *   DELETE /api/pastors/:id - Delete pastor (superadmin only)
 */

import { type Express, type Request, type Response } from 'express';
import { sql } from '../../neonConfig';
import { getRepository } from '../../container';
import { isSuperAdmin, isPastor, canManagePastors } from '../../utils/permissions';
import { logger } from '../../utils/logger';
import { BCRYPT_SALT_ROUNDS } from '../../config/security';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendForbidden,
  sendValidationError,
  sendInternalError,
} from '../../utils/apiResponse';
import { getAuthUserId } from '../../utils/authHelpers';

export const districtPastorRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');

  // Listar pastores (filtrado por permissão)
  app.get('/api/pastors', async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (isSuperAdmin(user)) {
        // Superadmin vê todos os pastores
        const pastors = await sql`
          SELECT u.*, d.name as district_name, d.code as district_code
          FROM users u
          LEFT JOIN districts d ON u.district_id = d.id
          WHERE u.role = 'pastor'
          ORDER BY u.name
        `;
        return sendSuccess(res, pastors);
      } 
        return sendSuccess(res, []);
      
    } catch (error) {
      logger.error('Erro ao buscar pastores:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Obter pastor por ID
  app.get('/api/pastors/:id', async (req: Request, res: Response) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      const pastor = await sql`
        SELECT u.*, d.name as district_name, d.code as district_code
        FROM users u
        LEFT JOIN districts d ON u.district_id = d.id
        WHERE u.id = ${pastorId} AND u.role = 'pastor'
      `;

      if (pastor.length === 0) {
        return sendNotFound(res, 'Pastor não encontrado');
      }

      // Verificar permissão - superadmin tem acesso a tudo, pastor apenas ao seu próprio perfil
      if (!isSuperAdmin(user) && !(isPastor(user) && user?.id === pastorId)) {
        return sendForbidden(res, 'Acesso negado');
      }

      return sendSuccess(res, pastor[0]);
    } catch (error) {
      logger.error('Erro ao buscar pastor:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Criar pastor (apenas superadmin)
  app.post('/api/pastors', async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!canManagePastors(user)) {
        return sendForbidden(res, 'Apenas superadmin pode criar pastores');
      }

      const { name, email, password, districtId } = req.body;

      if (!name || !email || !password) {
        return sendValidationError(res, { message: 'Nome, email e senha são obrigatórios' });
      }

      // Verificar se email já existe
      const existing = await userRepo.getUserByEmail(email);
      if (existing) {
        return sendValidationError(res, { message: 'Email já está em uso' });
      }

      // Verificar se districtId é válido (se fornecido)
      if (districtId) {
        const district = await sql`
          SELECT id FROM districts WHERE id = ${districtId}
        `;
        if (district.length === 0) {
          return sendValidationError(res, { message: 'Distrito não encontrado' });
        }
      }

      // Hash da senha
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      // Criar usuário como pastor
      const newPastor = await userRepo.createUser({
        name,
        email,
        password: hashedPassword,
        role: 'pastor',
        districtId: districtId || null,
        isApproved: true,
        firstAccess: true,
        status: 'active' as const,
        churchCode: '',
        departments: '',
        birthDate: '',
        civilStatus: '',
        occupation: '',
        education: '',
        address: '',
        baptismDate: '',
        previousReligion: '',
        biblicalInstructor: null,
        interestedSituation: '',
        isDonor: false,
        isTither: false,
        points: 0,
        level: 'Iniciante',
        attendance: 0,
        observations: '',
      });

      return sendCreated(res, newPastor);
    } catch (error) {
      logger.error('Erro ao criar pastor:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Atualizar pastor (apenas superadmin)
  app.put('/api/pastors/:id', async (req: Request, res: Response) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!canManagePastors(user)) {
        return sendForbidden(res, 'Apenas superadmin pode atualizar pastores');
      }

      const pastor = await userRepo.getUserById(pastorId);
      if (!pastor || pastor.role !== 'pastor') {
        return sendNotFound(res, 'Pastor não encontrado');
      }

      const { name, email, districtId, password } = req.body;
      const updates: Record<string, string | number | boolean | null> = {};

      if (name) updates.name = name;
      if (email && email !== pastor.email) {
        // Verificar se novo email já existe
        const existing = await userRepo.getUserByEmail(email);
        if (existing) {
          return sendValidationError(res, { message: 'Email já está em uso' });
        }
        updates.email = email;
      }
      if (districtId !== undefined) {
        // Verificar se districtId é válido
        if (districtId) {
          const district = await sql`
            SELECT id FROM districts WHERE id = ${districtId}
          `;
          if (district.length === 0) {
            return sendValidationError(res, { message: 'Distrito não encontrado' });
          }
        }
        updates.districtId = districtId;
      }
      if (password) {
        const bcrypt = await import('bcryptjs');
        updates.password = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      }

      const updated = await userRepo.updateUser(pastorId, updates);
      return sendSuccess(res, updated);
    } catch (error) {
      logger.error('Erro ao atualizar pastor:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });

  // Deletar pastor (apenas superadmin)
  app.delete('/api/pastors/:id', async (req: Request, res: Response) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!canManagePastors(user)) {
        return sendForbidden(res, 'Apenas superadmin pode deletar pastores');
      }

      const pastor = await userRepo.getUserById(pastorId);
      if (!pastor || pastor.role !== 'pastor') {
        return sendNotFound(res, 'Pastor não encontrado');
      }

      // Remover associação do distrito
      if (pastor.districtId) {
        await sql`
          UPDATE districts
          SET pastor_id = NULL
          WHERE pastor_id = ${pastorId}
        `;
      }

      // Deletar pastor (ou converter para member)
      // Por segurança, vamos apenas remover o role de pastor
      await userRepo.updateUser(pastorId, { role: 'member', districtId: null });

      return sendSuccess(res, { success: true, message: 'Pastor removido com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar pastor:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });
};
