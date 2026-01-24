/**
 * Serviço de Autenticação de Dois Fatores (2FA)
 * Implementação TOTP (Time-based One-Time Password) com QR Codes
 */

import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { db } from '../neonConfig';
import { schema } from '../schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { JWT_SECRET } from '../config/jwtConfig';

interface TwoFactorSecret {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

interface VerifyResult {
  valid: boolean;
  message: string;
}

/**
 * Interface para campos de 2FA no usuário
 */
interface UserTwoFactorFields {
  twoFactorEnabled?: boolean | null;
  twoFactorSecret?: string | null;
  twoFactorPendingSecret?: string | null;
  twoFactorRecoveryCodes?: string | null;
}

/**
 * Tipo para atualização de campos 2FA
 */
type TwoFactorUpdate = Partial<UserTwoFactorFields>;

/**
 * Gera um novo secret TOTP para o usuário
 */
export async function generateTwoFactorSecret(
  userId: number,
  userEmail: string,
  appName: string = '7Care'
): Promise<TwoFactorSecret> {
  // Gera secret aleatório
  const secret = generateSecret();
  
  // Cria URL otpauth para apps autenticadores
  const otpauthUrl = generateURI({
    secret,
    issuer: appName,
    label: userEmail,
    algorithm: 'sha1',
    digits: 6,
    period: 30,
  });
  
  // Gera QR Code como data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
  
  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/**
 * Salva o secret temporário (pending) até o usuário confirmar
 */
export async function savePendingTwoFactorSecret(
  userId: number,
  secret: string
): Promise<void> {
  // Criptografa o secret antes de salvar
  const encryptedSecret = encryptSecret(secret);
  
  await db
    .update(schema.users)
    .set({
      twoFactorPendingSecret: encryptedSecret,
    } as TwoFactorUpdate)
    .where(eq(schema.users.id, userId));
}

/**
 * Verifica e ativa 2FA após o usuário confirmar com código válido
 */
export async function enableTwoFactor(
  userId: number,
  token: string
): Promise<VerifyResult> {
  // Busca o usuário
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  
  if (!user) {
    return { valid: false, message: 'Usuário não encontrado' };
  }
  
  const userWith2FA = user as typeof user & UserTwoFactorFields;
  const pendingSecret = userWith2FA.twoFactorPendingSecret;
  
  if (!pendingSecret) {
    return { valid: false, message: 'Nenhum 2FA pendente para ativar' };
  }
  
  // Descriptografa e verifica o token
  const decryptedSecret = decryptSecret(pendingSecret);
  const isValid = verifySync({ secret: decryptedSecret, token });
  
  if (!isValid) {
    return { valid: false, message: 'Código inválido' };
  }
  
  // Gera códigos de recuperação
  const recoveryCodes = generateRecoveryCodes();
  const hashedRecoveryCodes = recoveryCodes.map(code => hashRecoveryCode(code));
  
  // Ativa 2FA
  await db
    .update(schema.users)
    .set({
      twoFactorSecret: pendingSecret, // Já está criptografado
      twoFactorPendingSecret: null,
      twoFactorEnabled: true,
      twoFactorRecoveryCodes: JSON.stringify(hashedRecoveryCodes),
    } as TwoFactorUpdate)
    .where(eq(schema.users.id, userId));
  
  return {
    valid: true,
    message: 'Autenticação de dois fatores ativada com sucesso',
  };
}

/**
 * Desativa 2FA do usuário
 */
export async function disableTwoFactor(
  userId: number,
  token: string
): Promise<VerifyResult> {
  // Primeiro verifica se o token é válido
  const verification = await verifyTwoFactorToken(userId, token);
  
  if (!verification.valid) {
    return verification;
  }
  
  // Desativa 2FA
  await db
    .update(schema.users)
    .set({
      twoFactorSecret: null,
      twoFactorPendingSecret: null,
      twoFactorEnabled: false,
      twoFactorRecoveryCodes: null,
    } as TwoFactorUpdate)
    .where(eq(schema.users.id, userId));
  
  return {
    valid: true,
    message: 'Autenticação de dois fatores desativada',
  };
}

/**
 * Verifica token TOTP
 */
export async function verifyTwoFactorToken(
  userId: number,
  token: string
): Promise<VerifyResult> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  
  if (!user) {
    return { valid: false, message: 'Usuário não encontrado' };
  }
  
  const userWithTwoFactor = user as typeof user & UserTwoFactorFields;
  
  if (!userWithTwoFactor.twoFactorEnabled || !userWithTwoFactor.twoFactorSecret) {
    return { valid: false, message: '2FA não está ativado' };
  }
  
  // Descriptografa o secret
  const decryptedSecret = decryptSecret(userWithTwoFactor.twoFactorSecret);
  
  // Verifica o token
  const isValid = verifySync({ secret: decryptedSecret, token });
  
  if (isValid) {
    return { valid: true, message: 'Token válido' };
  }
  
  return { valid: false, message: 'Código inválido ou expirado' };
}

/**
 * Verifica código de recuperação
 */
export async function verifyRecoveryCode(
  userId: number,
  code: string
): Promise<VerifyResult> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  
  if (!user) {
    return { valid: false, message: 'Usuário não encontrado' };
  }
  
  const userWithTwoFactor = user as typeof user & UserTwoFactorFields;
  
  if (!userWithTwoFactor.twoFactorRecoveryCodes) {
    return { valid: false, message: 'Nenhum código de recuperação disponível' };
  }
  
  const hashedCodes: string[] = JSON.parse(userWithTwoFactor.twoFactorRecoveryCodes);
  const hashedInput = hashRecoveryCode(code);
  
  const codeIndex = hashedCodes.findIndex(hashed => hashed === hashedInput);
  
  if (codeIndex === -1) {
    return { valid: false, message: 'Código de recuperação inválido' };
  }
  
  // Remove o código usado
  hashedCodes.splice(codeIndex, 1);
  
  await db
    .update(schema.users)
    .set({
      twoFactorRecoveryCodes: JSON.stringify(hashedCodes),
    } as TwoFactorUpdate)
    .where(eq(schema.users.id, userId));
  
  return {
    valid: true,
    message: `Código de recuperação válido. Restam ${hashedCodes.length} códigos.`,
  };
}

/**
 * Gera novos códigos de recuperação
 */
export async function regenerateRecoveryCodes(
  userId: number,
  token: string
): Promise<{ codes: string[] } | VerifyResult> {
  // Verifica o token primeiro
  const verification = await verifyTwoFactorToken(userId, token);
  
  if (!verification.valid) {
    return verification;
  }
  
  // Gera novos códigos
  const recoveryCodes = generateRecoveryCodes();
  const hashedRecoveryCodes = recoveryCodes.map(code => hashRecoveryCode(code));
  
  await db
    .update(schema.users)
    .set({
      twoFactorRecoveryCodes: JSON.stringify(hashedRecoveryCodes),
    } as TwoFactorUpdate)
    .where(eq(schema.users.id, userId));
  
  return { codes: recoveryCodes };
}

/**
 * Verifica se o usuário tem 2FA ativado
 */
export async function checkTwoFactorStatus(userId: number): Promise<{
  enabled: boolean;
  hasRecoveryCodes: boolean;
  recoveryCodesCount: number;
}> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  
  if (!user) {
    return { enabled: false, hasRecoveryCodes: false, recoveryCodesCount: 0 };
  }
  
  const userWithTwoFactor = user as typeof user & UserTwoFactorFields;
  
  let recoveryCodesCount = 0;
  if (userWithTwoFactor.twoFactorRecoveryCodes) {
    try {
      const codes = JSON.parse(userWithTwoFactor.twoFactorRecoveryCodes);
      recoveryCodesCount = codes.length;
    } catch {
      // Ignora erro de parse
    }
  }
  
  return {
    enabled: !!userWithTwoFactor.twoFactorEnabled,
    hasRecoveryCodes: recoveryCodesCount > 0,
    recoveryCodesCount,
  };
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Gera 10 códigos de recuperação aleatórios
 */
function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    // Formato: XXXX-XXXX-XXXX
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}-${part3}`);
  }
  return codes;
}

/**
 * Hash de código de recuperação
 */
function hashRecoveryCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code.toUpperCase().replace(/-/g, ''))
    .digest('hex');
}

/**
 * Criptografa o secret TOTP
 */
function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descriptografa o secret TOTP
 */
function decryptSecret(encryptedSecret: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedSecret.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Obtém a chave de criptografia do ambiente
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY || 
              JWT_SECRET ||
              'default-insecure-key-change-me-in-production-32';
  
  // Garante que a chave tenha 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

export default {
  generateTwoFactorSecret,
  savePendingTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorToken,
  verifyRecoveryCode,
  regenerateRecoveryCodes,
  checkTwoFactorStatus,
};
