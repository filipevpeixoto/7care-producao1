/**
 * Rotas de Autenticação de Dois Fatores (2FA)
 */

import { Router, Request, Response } from 'express';
import twoFactorService from '../services/twoFactorService';
import '../types/express'; // Importar tipos customizados do Express
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendUnauthorized } from '../utils/apiResponse';

const router = Router();

// Interface para Request autenticado
interface AuthenticatedRequest extends Request {
  userId?: number;
  user?: { id?: number; email?: string; role?: string } | null;
}

// Helper para extrair userId de forma type-safe
const getUserId = (req: AuthenticatedRequest): number | undefined => req.userId;
const getUserEmail = (req: AuthenticatedRequest): string | undefined => req.user?.email;

/**
 * GET /api/2fa/status
 * Verifica status do 2FA do usuário
 */
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    if (!userId) {
      return sendUnauthorized(res, 'Não autenticado');
    }

    const status = await twoFactorService.checkTwoFactorStatus(userId);
    return sendSuccess(res, status);
  })
);

/**
 * POST /api/2fa/setup
 * Inicia a configuração do 2FA (gera secret e QR code)
 */
router.post(
  '/setup',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const userEmail = getUserEmail(req) || 'user@7care.com';

    if (!userId) {
      return sendUnauthorized(res, 'Não autenticado');
    }

    // Verifica se já tem 2FA ativado
    const status = await twoFactorService.checkTwoFactorStatus(userId);
    if (status.enabled) {
      return sendError(res, '2FA já está ativado');
    }

    // Gera o secret e QR code
    const { secret, qrCodeDataUrl, otpauthUrl } = await twoFactorService.generateTwoFactorSecret(
      userId,
      userEmail,
      '7Care'
    );

    // Salva o secret pendente
    await twoFactorService.savePendingTwoFactorSecret(userId, secret);

    return sendSuccess(res, {
      qrCode: qrCodeDataUrl,
      manualKey: secret, // Para entrada manual no app
      otpauthUrl,
    });
  })
);

/**
 * POST /api/2fa/enable
 * Ativa o 2FA após verificar código
 */
router.post(
  '/enable',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { token } = req.body;

    if (!userId) {
      return sendUnauthorized(res, 'Não autenticado');
    }

    if (!token || typeof token !== 'string') {
      return sendError(res, 'Código é obrigatório');
    }

    const result = await twoFactorService.enableTwoFactor(userId, token);

    if (!result.valid) {
      return sendError(res, result.message);
    }

    return sendSuccess(res, { message: result.message });
  })
);

/**
 * POST /api/2fa/disable
 * Desativa o 2FA
 */
router.post(
  '/disable',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { token } = req.body;

    if (!userId) {
      return sendUnauthorized(res, 'Não autenticado');
    }

    if (!token || typeof token !== 'string') {
      return sendError(res, 'Código é obrigatório');
    }

    const result = await twoFactorService.disableTwoFactor(userId, token);

    if (!result.valid) {
      return sendError(res, result.message);
    }

    return sendSuccess(res, { message: result.message });
  })
);

/**
 * POST /api/2fa/verify
 * Verifica um código TOTP
 */
router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { token } = req.body;

    if (!userId) {
      return sendUnauthorized(res, 'Não autenticado');
    }

    if (!token || typeof token !== 'string') {
      return sendError(res, 'Código é obrigatório');
    }

    const result = await twoFactorService.verifyTwoFactorToken(userId, token);

    return sendSuccess(res, { valid: result.valid, message: result.message });
  })
);

/**
 * POST /api/2fa/verify-recovery
 * Verifica um código de recuperação
 */
router.post(
  '/verify-recovery',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { code } = req.body;

    if (!userId) {
      return sendUnauthorized(res, 'Não autenticado');
    }

    if (!code || typeof code !== 'string') {
      return sendError(res, 'Código de recuperação é obrigatório');
    }

    const result = await twoFactorService.verifyRecoveryCode(userId, code);

    if (!result.valid) {
      return sendError(res, result.message);
    }

    return sendSuccess(res, { valid: true, message: result.message });
  })
);

/**
 * POST /api/2fa/regenerate-recovery
 * Regenera códigos de recuperação
 */
router.post(
  '/regenerate-recovery',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { token } = req.body;

    if (!userId) {
      return sendUnauthorized(res, 'Não autenticado');
    }

    if (!token || typeof token !== 'string') {
      return sendError(res, 'Código 2FA é obrigatório');
    }

    const result = await twoFactorService.regenerateRecoveryCodes(userId, token);

    if ('valid' in result && !result.valid) {
      return sendError(res, result.message);
    }

    if ('codes' in result) {
      return sendSuccess(res, {
        recoveryCodes: result.codes,
        message: 'Novos códigos de recuperação gerados. Guarde-os em local seguro!',
      });
    }
    return sendError(res, 'Erro inesperado');
  })
);

export default router;
