import { Express, Request, Response } from 'express';
import { sql } from './neonConfig';
import { NeonAdapter } from './neonAdapter';
import { hasAdminAccess, isSuperAdmin, isPastor, canManagePastors } from './utils/permissions';
import { logger } from './utils/logger';

export const districtRoutes = (app: Express): void => {
  const storage = new NeonAdapter();

  // ========== DISTRITOS ==========

  // Listar distritos (filtrado por permissão)
  app.get("/api/districts", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      if (isSuperAdmin(user)) {
        // Superadmin vê todos os distritos
        const districts = await sql`
          SELECT d.*, u.name as pastor_name, u.email as pastor_email
          FROM districts d
          LEFT JOIN users u ON d.pastor_id = u.id
          ORDER BY d.name
        `;
        return res.json(districts);
      } else if (hasAdminAccess(user) && user?.districtId) {
        // Pastor vê apenas seu distrito, superadmin também pode ver se tiver districtId
        const districts = await sql`
          SELECT d.*, u.name as pastor_name, u.email as pastor_email
          FROM districts d
          LEFT JOIN users u ON d.pastor_id = u.id
          WHERE d.id = ${user.districtId}
        `;
        return res.json(districts);
      } else {
        return res.json([]);
      }
    } catch (error) {
      logger.error("Erro ao buscar distritos:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Obter distrito por ID
  app.get("/api/districts/:id", async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      const district = await sql`
        SELECT d.*, u.name as pastor_name, u.email as pastor_email
        FROM districts d
        LEFT JOIN users u ON d.pastor_id = u.id
        WHERE d.id = ${districtId}
      `;

      if (district.length === 0) {
        return res.status(404).json({ error: "Distrito não encontrado" });
      }

      // Verificar permissão - superadmin tem acesso a tudo, pastor apenas ao seu distrito
      if (!isSuperAdmin(user) && !(isPastor(user) && user?.districtId === districtId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      return res.json(district[0]);
    } catch (error) {
      logger.error("Erro ao buscar distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Criar distrito pelo pastor (primeiro acesso)
  app.post("/api/districts/pastor/create", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      // Apenas pastores podem usar esta rota
      if (!isPastor(user)) {
        return res.status(403).json({ error: "Apenas pastores podem criar distritos através desta rota" });
      }

      // Verificar se o pastor já tem um distrito
      if (user?.districtId) {
        return res.status(400).json({ error: "Você já possui um distrito associado" });
      }

      const { name, code, pastorId } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      // Garantir que o pastorId seja o próprio usuário
      const finalPastorId = pastorId && parseInt(pastorId) === userId ? userId : userId;

      // Gerar código se não fornecido
      let finalCode = code;
      if (!finalCode || finalCode.trim() === '') {
        finalCode = name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .substring(0, 20);
      }

      // Verificar se código já existe
      const existing = await sql`
        SELECT id FROM districts WHERE code = ${finalCode}
      `;
      if (existing.length > 0) {
        // Se código existe, adicionar sufixo numérico
        let counter = 1;
        let newCode = `${finalCode}-${counter}`;
        while (true) {
          const check = await sql`
            SELECT id FROM districts WHERE code = ${newCode}
          `;
          if (check.length === 0) {
            finalCode = newCode;
            break;
          }
          counter++;
          newCode = `${finalCode}-${counter}`;
        }
      }

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

      return res.status(201).json(newDistrict[0]);
    } catch (error) {
      logger.error("Erro ao criar distrito pelo pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Criar distrito (apenas superadmin)
  app.post("/api/districts", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode criar distritos" });
      }

      const { name, code, pastorId, description } = req.body;

      if (!name || !code) {
        return res.status(400).json({ error: "Nome e código são obrigatórios" });
      }

      // Verificar se código já existe
      const existing = await sql`
        SELECT id FROM districts WHERE code = ${code}
      `;
      if (existing.length > 0) {
        return res.status(400).json({ error: "Código já existe" });
      }

      // Se pastorId foi fornecido, verificar se é um pastor válido
      if (pastorId) {
        const pastor = await storage.getUserById(pastorId);
        if (!pastor || pastor.role !== 'pastor') {
          return res.status(400).json({ error: "Usuário não é um pastor válido" });
        }
      }

      const newDistrict = await sql`
        INSERT INTO districts (name, code, pastor_id, description, created_at, updated_at)
        VALUES (${name}, ${code}, ${pastorId || null}, ${description || null}, NOW(), NOW())
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

      return res.status(201).json(newDistrict[0]);
    } catch (error) {
      logger.error("Erro ao criar distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Atualizar distrito (apenas superadmin)
  app.put("/api/districts/:id", async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode atualizar distritos" });
      }

      const { name, code, pastorId, description } = req.body;

      // Verificar se distrito existe
      const existing = await sql`
        SELECT * FROM districts WHERE id = ${districtId}
      `;
      if (existing.length === 0) {
        return res.status(404).json({ error: "Distrito não encontrado" });
      }

      // Se código foi alterado, verificar se já existe
      if (code && code !== existing[0].code) {
        const codeExists = await sql`
          SELECT id FROM districts WHERE code = ${code} AND id != ${districtId}
        `;
        if (codeExists.length > 0) {
          return res.status(400).json({ error: "Código já existe" });
        }
      }

      // Se pastorId foi fornecido, verificar se é um pastor válido
      if (pastorId !== undefined) {
        if (pastorId) {
          const pastor = await storage.getUserById(pastorId);
          if (!pastor || pastor.role !== 'pastor') {
            return res.status(400).json({ error: "Usuário não é um pastor válido" });
          }
        }
      }

      const updated = await sql`
        UPDATE districts
        SET 
          name = COALESCE(${name}, name),
          code = COALESCE(${code}, code),
          pastor_id = ${pastorId !== undefined ? (pastorId || null) : sql`pastor_id`},
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

      return res.json(updated[0]);
    } catch (error) {
      logger.error("Erro ao atualizar distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Deletar distrito (apenas superadmin)
  app.delete("/api/districts/:id", async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      if (!isSuperAdmin(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode deletar distritos" });
      }

      // Verificar se distrito existe
      const existing = await sql`
        SELECT * FROM districts WHERE id = ${districtId}
      `;
      if (existing.length === 0) {
        return res.status(404).json({ error: "Distrito não encontrado" });
      }

      // Verificar se há igrejas associadas
      const churches = await sql`
        SELECT COUNT(*) as count FROM churches WHERE district_id = ${districtId}
      `;
      if (churches[0].count > 0) {
        return res.status(400).json({ 
          error: "Não é possível deletar distrito com igrejas associadas. Remova as igrejas primeiro." 
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

      return res.json({ success: true, message: "Distrito deletado com sucesso" });
    } catch (error) {
      logger.error("Erro ao deletar distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Listar igrejas de um distrito
  app.get("/api/districts/:id/churches", async (req: Request, res: Response) => {
    try {
      const districtId = parseInt(req.params.id);
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      // Verificar permissão - superadmin tem acesso a tudo, pastor apenas ao seu distrito
      if (!isSuperAdmin(user) && !(isPastor(user) && user?.districtId === districtId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const churches = await storage.getChurchesByDistrict(districtId);
      return res.json(churches);
    } catch (error) {
      logger.error("Erro ao buscar igrejas do distrito:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========== PASTORES ==========

  // Listar pastores (filtrado por permissão)
  app.get("/api/pastors", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      if (isSuperAdmin(user)) {
        // Superadmin vê todos os pastores
        const pastors = await sql`
          SELECT u.*, d.name as district_name, d.code as district_code
          FROM users u
          LEFT JOIN districts d ON u.district_id = d.id
          WHERE u.role = 'pastor'
          ORDER BY u.name
        `;
        return res.json(pastors);
      } else {
        return res.json([]);
      }
    } catch (error) {
      logger.error("Erro ao buscar pastores:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Obter pastor por ID
  app.get("/api/pastors/:id", async (req: Request, res: Response) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      const pastor = await sql`
        SELECT u.*, d.name as district_name, d.code as district_code
        FROM users u
        LEFT JOIN districts d ON u.district_id = d.id
        WHERE u.id = ${pastorId} AND u.role = 'pastor'
      `;

      if (pastor.length === 0) {
        return res.status(404).json({ error: "Pastor não encontrado" });
      }

      // Verificar permissão - superadmin tem acesso a tudo, pastor apenas ao seu próprio perfil
      if (!isSuperAdmin(user) && !(isPastor(user) && user?.id === pastorId)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      return res.json(pastor[0]);
    } catch (error) {
      logger.error("Erro ao buscar pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Criar pastor (apenas superadmin)
  app.post("/api/pastors", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      if (!canManagePastors(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode criar pastores" });
      }

      const { name, email, password, districtId } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
      }

      // Verificar se email já existe
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email já está em uso" });
      }

      // Verificar se districtId é válido (se fornecido)
      if (districtId) {
        const district = await sql`
          SELECT id FROM districts WHERE id = ${districtId}
        `;
        if (district.length === 0) {
          return res.status(400).json({ error: "Distrito não encontrado" });
        }
      }

      // Hash da senha
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário como pastor
      const newPastor = await storage.createUser({
        name,
        email,
        password: hashedPassword,
        role: 'pastor',
        districtId: districtId || null,
        isApproved: true,
        firstAccess: true,
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
        observations: ''
      });

      return res.status(201).json(newPastor);
    } catch (error) {
      logger.error("Erro ao criar pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Atualizar pastor (apenas superadmin)
  app.put("/api/pastors/:id", async (req: Request, res: Response) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      if (!canManagePastors(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode atualizar pastores" });
      }

      const pastor = await storage.getUserById(pastorId);
      if (!pastor || pastor.role !== 'pastor') {
        return res.status(404).json({ error: "Pastor não encontrado" });
      }

      const { name, email, districtId, password } = req.body;
      const updates: Record<string, string | number | boolean | null> = {};

      if (name) updates.name = name;
      if (email && email !== pastor.email) {
        // Verificar se novo email já existe
        const existing = await storage.getUserByEmail(email);
        if (existing) {
          return res.status(400).json({ error: "Email já está em uso" });
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
            return res.status(400).json({ error: "Distrito não encontrado" });
          }
        }
        updates.districtId = districtId;
      }
      if (password) {
        const bcrypt = await import('bcryptjs');
        updates.password = await bcrypt.hash(password, 10);
      }

      const updated = await storage.updateUser(pastorId, updates);
      return res.json(updated);
    } catch (error) {
      logger.error("Erro ao atualizar pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Deletar pastor (apenas superadmin)
  app.delete("/api/pastors/:id", async (req: Request, res: Response) => {
    try {
      const pastorId = parseInt(req.params.id);
      const userId = parseInt(req.headers['x-user-id'] as string || '0');
      const user = userId ? await storage.getUserById(userId) : null;

      if (!canManagePastors(user)) {
        return res.status(403).json({ error: "Apenas superadmin pode deletar pastores" });
      }

      const pastor = await storage.getUserById(pastorId);
      if (!pastor || pastor.role !== 'pastor') {
        return res.status(404).json({ error: "Pastor não encontrado" });
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
      await storage.updateUser(pastorId, { role: 'member', districtId: null });

      return res.json({ success: true, message: "Pastor removido com sucesso" });
    } catch (error) {
      logger.error("Erro ao deletar pastor:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
};
