/**
 * Registro Central de Rotas
 * Combina todos os módulos de rotas em um único registrador
 */

import express, { Express } from 'express';
import { createServer, Server } from 'http';
import { logger } from '../utils/logger';

// Inicialização do banco de dados
import { migrateToNeon } from '../migrateToNeon';
import { setupNeonData } from '../setupNeonData';

// Rotas modulares
import { authRoutes } from './authRoutes';
import { userRoutes } from './userRoutes';
import { churchRoutes } from './churchRoutes';
import { settingsRoutes } from './settingsRoutes';
import { systemRoutes } from './systemRoutes';
import { dashboardRoutes } from './dashboardRoutes';
import { pointsRoutes } from './pointsRoutes';
import { spiritualRoutes } from './spiritualRoutes';
import { eventRoutes } from './eventRoutes';
import { meetingRoutes } from './meetingRoutes';
import { relationshipRoutes } from './relationshipRoutes';
import { discipleshipRoutes } from './discipleshipRoutes';
import { messagingRoutes } from './messagingRoutes';
import { notificationRoutes } from './notificationRoutes';
import { prayerRoutes } from './prayerRoutes';
import { calendarRoutes } from './calendarRoutes';
import { taskRoutes } from './taskRoutes';
import { debugRoutes } from './debugRoutes';
import { analyticsRoutes } from './analyticsRoutes';
import twoFactorRouter from './twoFactorRoutes';

// Rotas movidas para pasta routes
import { electionRoutes } from './electionRoutes';
import { districtRoutes } from './districtRoutes';
import { importRoutes } from './importRoutes';
import { inviteRoutes } from './inviteRoutes';
import { adminRoutes } from './adminRoutes';

/**
 * Registra todas as rotas da aplicação
 */
export const registerAllRoutes = async (app: Express): Promise<Server> => {
  // Inicializar banco de dados
  try {
    await migrateToNeon();
    logger.info('✅ Neon Database conectado e funcionando');

    await setupNeonData();
    logger.info('✅ Dados iniciais configurados');
  } catch (error) {
    logger.error('❌ Erro ao conectar com Neon Database:', error);
  }

  // Servir arquivos estáticos da pasta uploads
  app.use('/uploads', express.static('uploads'));

  // Registrar todas as rotas modulares
  authRoutes(app);
  userRoutes(app);
  churchRoutes(app);
  settingsRoutes(app);
  systemRoutes(app);
  dashboardRoutes(app);
  pointsRoutes(app);
  spiritualRoutes(app);
  eventRoutes(app);
  meetingRoutes(app);
  relationshipRoutes(app);
  discipleshipRoutes(app);
  messagingRoutes(app);
  notificationRoutes(app);
  prayerRoutes(app);
  calendarRoutes(app);
  taskRoutes(app);
  analyticsRoutes(app);

  // Rotas de 2FA (Router Express)
  app.use('/api/2fa', twoFactorRouter);

  // Rotas já separadas
  electionRoutes(app);
  districtRoutes(app);
  importRoutes(app);

  // Rotas de convite de pastores
  inviteRoutes(app);

  // Rotas administrativas (auditoria, métricas, etc)
  app.use('/api/admin', adminRoutes);

  // Debug routes apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    debugRoutes(app);
  }

  return createServer(app);
};

// Alias para compatibilidade
export const registerRoutes = registerAllRoutes;

export default registerAllRoutes;
