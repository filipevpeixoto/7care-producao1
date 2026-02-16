/**
 * District CRUD Routes
 * Core CRUD operations for districts
 *
 * Routes:
 *   GET    /api/districts              - List districts (filtered by permission)
 *   GET    /api/districts/:id          - Get district by ID
 *   POST   /api/districts/pastor/create - Create district by pastor (first access)
 *   POST   /api/districts              - Create district (superadmin only)
 *   PUT    /api/districts/:id          - Update district (superadmin only)
 *   DELETE /api/districts/:id          - Delete district (superadmin only)
 */

import { type Express, type Request, type Response } from 'express';
import { sql } from '../../neonConfig';
import { getRepository } from '../../container';
import { hasAdminAccess, isSuperAdmin, isPastor } from '../../utils/permissions';
import { logger } from '../../utils/logger';
import { cacheMiddleware, invalidateCacheMiddleware } from '../../middleware/cache';
import { CACHE_TTL } from '../../constants';
import { validateBody, validateParams, type ValidatedRequest } from '../../middleware/validation';
import { createDistrictSchema, updateDistrictSchema, idParamSchema } from '../../schemas';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendForbidden,
  sendValidationError,
  sendInternalError,
} from '../../utils/apiResponse';
import { getAuthUserId } from '../../utils/authHelpers';
import { generateUniqueDistrictCode } from './districtHelpers';

export const districtCrudRoutes = (app: Express): void => {
  const userRepo = getRepository('userRepository');

  // Listar distritos (filtrado por permissão)
  app.get(
    '/api/districts',
    cacheMiddleware('districts', CACHE_TTL.DISTRICTS),
    async (req: Request, res: Response) => {
      try {
        const userId = getAuthUserId(req);
        const user = userId ? await userRepo.getUserById(userId) : null;

        if (isSuperAdmin(user)) {
          // Superadmin vê todos os distritos
          const districts = await sql`
          SELECT d.*, u.name as pastor_name, u.email as pastor_email
          FROM districts d
          LEFT JOIN users u ON d.pastor_id = u.id
          ORDER BY d.name
        `;
          return sendSuccess(res, districts);
        } else if (hasAdminAccess(user) && user?.districtId) {
          // Pastor vê apenas seu distrito, superadmin também pode ver se tiver districtId
          const districts = await sql`
          SELECT d.*, u.name as pastor_name, u.email as pastor_email
          FROM districts d
          LEFT JOIN users u ON d.pastor_id = u.id
          WHERE d.id = ${user.districtId}
        `;
          return sendSuccess(res, districts);
        } 
          return sendSuccess(res, []);
        
      } catch (error) {
        logger.error('Erro ao buscar distritos:', error);
        return sendInternalError(res, 'Internal server error');
      }
    }
  );

  // Obter distrito por ID
  app.get(
    '/api/districts/:id',
    cacheMiddleware('districts', CACHE_TTL.DISTRICTS),
    async (req: Request, res: Response) => {
      try {
        const districtId = parseInt(req.params.id);
        const userId = getAuthUserId(req);
        const user = userId ? await userRepo.getUserById(userId) : null;

        const district = await sql`
        SELECT d.*, u.name as pastor_name, u.email as pastor_email
        FROM districts d
        LEFT JOIN users u ON d.pastor_id = u.id
        WHERE d.id = ${districtId}
      `;

        if (district.length === 0) {
          return sendNotFound(res, 'Distrito não encontrado');
        }

        // Verificar permissão - superadmin tem acesso a tudo, pastor apenas ao seu distrito
        if (!isSuperAdmin(user) && !(isPastor(user) && user?.districtId === districtId)) {
          return sendForbidden(res, 'Acesso negado');
        }

        return sendSuccess(res, district[0]);
      } catch (error) {
        logger.error('Erro ao buscar distrito:', error);
        return sendInternalError(res, 'Internal server error');
      }
    }
  );

  // Criar distrito pelo pastor (primeiro acesso)
  app.post(
    '/api/districts/pastor/create',
    invalidateCacheMiddleware('districts'),
    async (req: Request, res: Response) => {
      try {
        const userId = getAuthUserId(req);
        const user = userId ? await userRepo.getUserById(userId) : null;

        // Apenas pastores podem usar esta rota
        if (!isPastor(user)) {
          return res
            .status(403)
            .json({ error: 'Apenas pastores podem criar distritos através desta rota' });
        }

        // Verificar se o pastor já tem um distrito
        if (user?.districtId) {
          return sendValidationError(res, { message: 'Você já possui um distrito associado' });
        }

        const { name, code, pastorId } = req.body;

        if (!name) {
          return sendValidationError(res, { message: 'Nome é obrigatório' });
        }

        // Garantir que o pastorId seja o próprio usuário
        const finalPastorId = pastorId && parseInt(pastorId) === userId ? userId : userId;

        // Gerar código único
        const finalCode = await generateUniqueDistrictCode(name, code);

        // Criar distrito
        const newDistrict = await sql`
        INSERT INTO districts (name, code, pastor_id, description, created_at, updated_at)
        VALUES (${name}, ${finalCode}, ${finalPastorId}, NULL, NOW(), NOW())
        RETURNING *
      `;

        // Atualizar o usuário pastor com o district_id
        if (newDistrict[0]) {
          await sql`
          UPDATE users
          SET district_id = ${newDistrict[0].id}
          WHERE id = ${finalPastorId}
        `;
        }

        return sendCreated(res, newDistrict[0]);
      } catch (error) {
        logger.error('Erro ao criar distrito pelo pastor:', error);
        return sendInternalError(res, 'Internal server error');
      }
    }
  );

  // Criar distrito (apenas superadmin)
  app.post(
    '/api/districts',
    validateBody(createDistrictSchema),
    async (req: Request, res: Response) => {
      try {
        const userId = getAuthUserId(req);
        const user = userId ? await userRepo.getUserById(userId) : null;

        if (!isSuperAdmin(user)) {
          return sendForbidden(res, 'Apenas superadmin pode criar distritos');
        }

        const { name, code, pastorId } = (
          req as ValidatedRequest<typeof createDistrictSchema._type>
        ).validatedBody;
        const description = req.body.description;

        // Verificar se código já existe
        if (code) {
          const existing = await sql`
          SELECT id FROM districts WHERE code = ${code}
        `;
          if (existing.length > 0) {
            return sendValidationError(res, { message: 'Código já existe' });
          }
        }

        // Se pastorId foi fornecido, verificar se é um pastor válido
        if (pastorId) {
          const pastor = await userRepo.getUserById(pastorId);
          if (!pastor || pastor.role !== 'pastor') {
            return sendValidationError(res, { message: 'Usuário não é um pastor válido' });
          }
        }

        const newDistrict = await sql`
        INSERT INTO districts (name, code, pastor_id, description, created_at, updated_at)
        VALUES (${name}, ${code || null}, ${pastorId || null}, ${description || null}, NOW(), NOW())
        RETURNING *
      `;

        // Se pastorId foi fornecido, atualizar o usuário pastor
        if (pastorId && newDistrict[0]) {
          await sql`
          UPDATE users
          SET district_id = ${newDistrict[0].id}
          WHERE id = ${pastorId}
        `;
        }

        return sendCreated(res, newDistrict[0]);
      } catch (error) {
        logger.error('Erro ao criar distrito:', error);
        return sendInternalError(res, 'Internal server error');
      }
    }
  );

  // Atualizar distrito (apenas superadmin)
  app.put(
    '/api/districts/:id',
    validateParams(idParamSchema),
    validateBody(updateDistrictSchema),
    async (req: Request, res: Response) => {
      try {
        const districtId = (req as ValidatedRequest<typeof idParamSchema._type>).validatedParams.id;
        const userId = getAuthUserId(req);
        const user = userId ? await userRepo.getUserById(userId) : null;

        if (!isSuperAdmin(user)) {
          return sendForbidden(res, 'Apenas superadmin pode atualizar distritos');
        }

        const { name, code, pastorId } = (
          req as ValidatedRequest<typeof updateDistrictSchema._type>
        ).validatedBody;
        const description = req.body.description;

        // Verificar se distrito existe
        const existing = await sql`
        SELECT * FROM districts WHERE id = ${districtId}
      `;
        if (existing.length === 0) {
          return sendNotFound(res, 'Distrito não encontrado');
        }

        // Se código foi alterado, verificar se já existe
        if (code && code !== existing[0].code) {
          const codeExists = await sql`
          SELECT id FROM districts WHERE code = ${code} AND id <> ${districtId}
        `;
          if (codeExists.length > 0) {
            return sendValidationError(res, { message: 'Código já existe' });
          }
        }

        // Se pastorId foi fornecido, verificar se é um pastor válido
        if (pastorId !== undefined) {
          if (pastorId) {
            const pastor = await userRepo.getUserById(pastorId);
            if (!pastor || pastor.role !== 'pastor') {
              return sendValidationError(res, { message: 'Usuário não é um pastor válido' });
            }
          }
        }

        const currentPastorId = existing[0].pastor_id;
        const newPastorId = pastorId !== undefined ? pastorId || null : currentPastorId;

        const updated = await sql`
        UPDATE districts
        SET 
          name = COALESCE(${name}, name),
          code = COALESCE(${code}, code),
          pastor_id = ${newPastorId},
          description = COALESCE(${description}, description),
          updated_at = NOW()
        WHERE id = ${districtId}
        RETURNING *
      `;

        // Atualizar districtId do pastor se necessário
        if (pastorId !== undefined) {
          // Remover associação do pastor anterior
          if (existing[0].pastor_id) {
            await sql`
            UPDATE users
            SET district_id = NULL
            WHERE id = ${existing[0].pastor_id}
          `;
          }
          // Associar novo pastor
          if (pastorId) {
            await sql`
            UPDATE users
            SET district_id = ${districtId}
            WHERE id = ${pastorId}
          `;
          }
        }

        return sendSuccess(res, updated[0]);
      } catch (error) {
        logger.error('Erro ao atualizar distrito:', error);
        return sendInternalError(res, 'Internal server error');
      }
    }
  );

  // Deletar distrito (apenas superadmin)
  app.delete('/api/districts/:id', async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = getAuthUserId(req);
      const user = userId ? await userRepo.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return sendForbidden(res, 'Apenas superadmin pode deletar distritos');
      }

      // Verificar se distrito existe
      const existing = await sql`
        SELECT * FROM districts WHERE id = ${districtId}
      `;
      if (existing.length === 0) {
        return sendNotFound(res, 'Distrito não encontrado');
      }

      // Verificar se há igrejas associadas
      const churches = await sql`
        SELECT COUNT(*) as count FROM churches WHERE district_id = ${districtId}
      `;
      const churchCount = Number((churches[0] as { count: number | string }).count) || 0;
      if (churchCount > 0) {
        return res.status(400).json({
          error:
            'Não é possível deletar distrito com igrejas associadas. Remova as igrejas primeiro.',
        });
      }

      // Remover associação de pastores
      await sql`
        UPDATE users
        SET district_id = NULL
        WHERE district_id = ${districtId}
      `;

      // Deletar distrito
      await sql`
        DELETE FROM districts WHERE id = ${districtId}
      `;

      return sendSuccess(res, { success: true, message: 'Distrito deletado com sucesso' });
    } catch (error) {
      logger.error('Erro ao deletar distrito:', error);
      return sendInternalError(res, 'Internal server error');
    }
  });
};
