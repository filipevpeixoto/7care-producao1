/**
 * Rotas de Autenticação de Dois Fatores (2FA)
 */

import { Router, Request, Response } from 'express';
import twoFactorService from '../services/twoFactorService';

const router = Router();

// Helper para extrair userId de forma type-safe
const getUserId = (req: Request): number | undefined => req.userId;
const getUserEmail = (req: Request): string | undefined => req.user?.email;

/**
 * GET /api/2fa/status
 * Verifica status do 2FA do usuário
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    const status = await twoFactorService.checkTwoFactorStatus(userId);
    return res.json(status);
  } catch (error) {
    console.error('Erro ao verificar status 2FA:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/2fa/setup
 * Inicia a configuração do 2FA (gera secret e QR code)
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const userEmail = getUserEmail(req) || 'user@7care.com';
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    // Verifica se já tem 2FA ativado
    const status = await twoFactorService.checkTwoFactorStatus(userId);
    if (status.enabled) {
      return res.status(400).json({ error: '2FA já está ativado' });
    }
    
    // Gera o secret e QR code
    const { secret, qrCodeDataUrl, otpauthUrl } = await twoFactorService.generateTwoFactorSecret(
      userId,
      userEmail,
      '7Care'
    );
    
    // Salva o secret pendente
    await twoFactorService.savePendingTwoFactorSecret(userId, secret);
    
    return res.json({
      qrCode: qrCodeDataUrl,
      manualKey: secret, // Para entrada manual no app
      otpauthUrl,
    });
  } catch (error) {
    console.error('Erro ao configurar 2FA:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/2fa/enable
 * Ativa o 2FA após verificar código
 */
router.post('/enable', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Código é obrigatório' });
    }
    
    const result = await twoFactorService.enableTwoFactor(userId, token);
    
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Erro ao ativar 2FA:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/2fa/disable
 * Desativa o 2FA
 */
router.post('/disable', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Código é obrigatório' });
    }
    
    const result = await twoFactorService.disableTwoFactor(userId, token);
    
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Erro ao desativar 2FA:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/2fa/verify
 * Verifica um código TOTP
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Código é obrigatório' });
    }
    
    const result = await twoFactorService.verifyTwoFactorToken(userId, token);
    
    return res.json({ valid: result.valid, message: result.message });
  } catch (error) {
    console.error('Erro ao verificar 2FA:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/2fa/verify-recovery
 * Verifica um código de recuperação
 */
router.post('/verify-recovery', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { code } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código de recuperação é obrigatório' });
    }
    
    const result = await twoFactorService.verifyRecoveryCode(userId, code);
    
    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.json({ valid: true, message: result.message });
  } catch (error) {
    console.error('Erro ao verificar código de recuperação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/2fa/regenerate-recovery
 * Regenera códigos de recuperação
 */
router.post('/regenerate-recovery', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { token } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Código 2FA é obrigatório' });
    }
    
    const result = await twoFactorService.regenerateRecoveryCodes(userId, token);
    
    if ('valid' in result && !result.valid) {
      return res.status(400).json({ error: result.message });
    }
    
    if ('codes' in result) {
      return res.json({
        success: true,
        recoveryCodes: result.codes,
        message: 'Novos códigos de recuperação gerados. Guarde-os em local seguro!',
      });
    }
    return res.status(500).json({ error: 'Erro inesperado' });
  } catch (error) {
    console.error('Erro ao regenerar códigos de recuperação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
