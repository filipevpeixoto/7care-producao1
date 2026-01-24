/**
 * Módulo de criptografia para dados sensíveis offline
 * Usa AES-256-GCM com derivação de chave segura (PBKDF2)
 *
 * Melhorias de segurança:
 * - PBKDF2 para derivação de chave a partir de identificador único
 * - Salt único por dispositivo
 * - Chave armazenada em memória durante sessão (não exposta em localStorage)
 * - Suporte a rotação de chave
 * - Verificação de integridade
 */

// Constantes de configuração
const CRYPTO_SALT_KEY = '7care_device_salt';
const CRYPTO_KEY_CHECK = '7care_key_check';
const CRYPTO_LEGACY_KEY = '7care_device_key'; // Para migração
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Cache da chave em memória (mais seguro que localStorage)
let cachedKey: CryptoKey | null = null;
let keyVersion = 1;

/**
 * Gera um salt único para o dispositivo
 */
function getOrCreateSalt(): Uint8Array {
  const existingSalt = localStorage.getItem(CRYPTO_SALT_KEY);

  if (existingSalt) {
    try {
      return new Uint8Array(JSON.parse(existingSalt));
    } catch {
      // Salt corrompido, gerar novo
    }
  }

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  localStorage.setItem(CRYPTO_SALT_KEY, JSON.stringify(Array.from(salt)));
  return salt;
}

/**
 * Gera um identificador único do dispositivo
 * Combina múltiplos fatores para criar um ID estável
 */
function getDeviceIdentifier(): string {
  const factors: string[] = [
    navigator.userAgent || 'unknown',
    navigator.language || 'unknown',
    String(screen.width || 0),
    String(screen.height || 0),
    String(screen.colorDepth || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  ];

  // Adiciona um fator aleatório persistente se não existir
  let persistentFactor = localStorage.getItem('7care_device_id');
  if (!persistentFactor) {
    persistentFactor = generateUUID();
    localStorage.setItem('7care_device_id', persistentFactor);
  }
  factors.push(persistentFactor);

  return factors.join('|');
}

/**
 * Gera UUID compatível com navegadores antigos
 */
function generateUUID(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback para navegadores sem randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deriva uma chave criptográfica a partir de um identificador
 * Usa PBKDF2 com salt único do dispositivo
 */
async function deriveKey(identifier: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(identifier),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // Não exportável - mais seguro
    ['encrypt', 'decrypt']
  );
}

/**
 * Migra dados da chave antiga (se existir) para o novo sistema
 */
async function migrateLegacyKey(): Promise<CryptoKey | null> {
  try {
    const storedKey = localStorage.getItem(CRYPTO_LEGACY_KEY);
    if (!storedKey) return null;

    const keyArray = new Uint8Array(JSON.parse(storedKey));
    const legacyKey = await crypto.subtle.importKey(
      'raw',
      keyArray,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Remover chave legada após migração
    localStorage.removeItem(CRYPTO_LEGACY_KEY);
    console.log('[Crypto] Chave legada migrada com sucesso');

    return legacyKey;
  } catch {
    localStorage.removeItem(CRYPTO_LEGACY_KEY);
    return null;
  }
}

/**
 * Obtém ou cria a chave de criptografia do dispositivo
 * A chave é derivada de características do dispositivo e mantida em memória
 */
async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  if (cachedKey) {
    return cachedKey;
  }

  // Tentar migrar chave legada primeiro
  const legacyKey = await migrateLegacyKey();
  if (legacyKey) {
    cachedKey = legacyKey;
    return cachedKey;
  }

  const identifier = getDeviceIdentifier();
  cachedKey = await deriveKey(identifier);

  // Verificar integridade da chave
  await verifyKeyIntegrity(cachedKey);

  return cachedKey;
}

/**
 * Verifica a integridade da chave
 * Se falhar, significa que o dispositivo mudou ou os dados estão corrompidos
 */
async function verifyKeyIntegrity(key: CryptoKey): Promise<void> {
  const checkValue = localStorage.getItem(CRYPTO_KEY_CHECK);

  if (!checkValue) {
    // Primeira vez - criar valor de verificação
    const testData = { check: 'integrity', version: keyVersion, timestamp: Date.now() };
    const encrypted = await encryptWithKey(key, testData);
    localStorage.setItem(CRYPTO_KEY_CHECK, encrypted);
    return;
  }

  try {
    const decrypted = await decryptWithKey<{ check: string; version: number }>(key, checkValue);
    if (decrypted.check !== 'integrity') {
      throw new Error('Key integrity check failed');
    }
    keyVersion = decrypted.version || 1;
  } catch {
    // Chave mudou - limpar dados antigos e recriar verificação
    console.warn('[Crypto] Chave do dispositivo mudou, recriando verificação');
    await clearAllEncryptedData();
    const testData = { check: 'integrity', version: keyVersion, timestamp: Date.now() };
    const encrypted = await encryptWithKey(key, testData);
    localStorage.setItem(CRYPTO_KEY_CHECK, encrypted);
  }
}

/**
 * Limpa todos os dados criptografados quando a chave muda
 */
async function clearAllEncryptedData(): Promise<void> {
  try {
    const { clearAllOfflineData } = await import('./database');
    await clearAllOfflineData();
  } catch (error) {
    console.error('[Crypto] Erro ao limpar dados:', error);
  }
}

/**
 * Gera um IV (Initialization Vector) aleatório
 */
function generateIV(): Uint8Array {
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);
  return iv;
}

/**
 * Criptografa dados com uma chave específica
 */
async function encryptWithKey<T>(key: CryptoKey, data: T): Promise<string> {
  const iv = generateIV();
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(jsonString);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encodedData
  );

  // Combina versão (1 byte) + IV (12 bytes) + dados criptografados
  const versionByte = new Uint8Array([keyVersion]);
  const combined = new Uint8Array(1 + iv.length + encryptedBuffer.byteLength);
  combined.set(versionByte, 0);
  combined.set(iv, 1);
  combined.set(new Uint8Array(encryptedBuffer), 1 + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Descriptografa dados com uma chave específica
 */
async function decryptWithKey<T>(key: CryptoKey, encryptedString: string): Promise<T> {
  const combined = new Uint8Array(
    atob(encryptedString).split('').map(c => c.charCodeAt(0))
  );

  // Detectar formato: novo (com versão) ou legado (sem versão)
  let iv: Uint8Array;
  let encryptedData: Uint8Array;

  if (combined.length > IV_LENGTH + 1 && combined[0] <= 10) {
    // Novo formato: versão + IV + dados
    const version = combined[0];
    iv = combined.slice(1, 1 + IV_LENGTH);
    encryptedData = combined.slice(1 + IV_LENGTH);

    if (version !== keyVersion) {
      console.warn(`[Crypto] Versão da chave diferente: ${version} vs ${keyVersion}`);
    }
  } else {
    // Formato legado: IV + dados
    iv = combined.slice(0, IV_LENGTH);
    encryptedData = combined.slice(IV_LENGTH);
  }

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encryptedData.buffer.slice(encryptedData.byteOffset, encryptedData.byteOffset + encryptedData.byteLength) as ArrayBuffer
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}

/**
 * Criptografa dados usando AES-256-GCM
 * @param data Dados a serem criptografados (objeto ou string)
 * @returns String criptografada em base64 com IV
 */
export async function encryptData<T>(data: T): Promise<string> {
  try {
    if (!isCryptoAvailable()) {
      throw new Error('Web Crypto API não disponível');
    }

    const key = await getOrCreateDeviceKey();
    return await encryptWithKey(key, data);
  } catch (error) {
    console.error('[Crypto] Erro ao criptografar:', error);
    // Fallback APENAS em desenvolvimento para facilitar debug
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.warn('[Crypto] Usando fallback não criptografado (DEV ONLY)');
      return JSON.stringify({ __unencrypted: true, __warning: 'DEV_ONLY', data });
    }
    throw new Error('Falha ao criptografar dados sensíveis');
  }
}

/**
 * Descriptografa dados usando AES-256-GCM
 * @param encryptedString String criptografada em base64
 * @returns Dados originais
 */
export async function decryptData<T>(encryptedString: string): Promise<T> {
  try {
    // Verificar se são dados não criptografados (fallback de dev)
    if (encryptedString.startsWith('{')) {
      const parsed = JSON.parse(encryptedString);
      if (parsed.__unencrypted) {
        if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'development') {
          console.error('[Crypto] Dados não criptografados detectados em produção');
        }
        return parsed.data as T;
      }
      // Pode ser um JSON válido que foi salvo incorretamente
      return parsed as T;
    }

    if (!isCryptoAvailable()) {
      throw new Error('Web Crypto API não disponível');
    }

    const key = await getOrCreateDeviceKey();
    return await decryptWithKey<T>(key, encryptedString);
  } catch (error) {
    console.error('[Crypto] Erro ao descriptografar:', error);
    throw new Error('Falha ao descriptografar dados');
  }
}

/**
 * Verifica se a criptografia está disponível no navegador
 */
export function isCryptoAvailable(): boolean {
  return !!(
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    typeof crypto.getRandomValues === 'function'
  );
}

/**
 * Limpa a chave de criptografia da memória (usado no logout)
 * Não remove o salt nem o device_id para manter consistência entre sessões
 */
export async function clearEncryptionKey(): Promise<void> {
  cachedKey = null;
}

/**
 * Força rotação da chave (incrementa versão)
 * Útil quando há suspeita de comprometimento
 */
export async function rotateKey(): Promise<void> {
  keyVersion++;
  cachedKey = null;

  // Atualizar valor de verificação com nova versão
  const key = await getOrCreateDeviceKey();
  const testData = { check: 'integrity', version: keyVersion, timestamp: Date.now() };
  const encrypted = await encryptWithKey(key, testData);
  localStorage.setItem(CRYPTO_KEY_CHECK, encrypted);

  console.log(`[Crypto] Chave rotacionada para versão ${keyVersion}`);
}

/**
 * Obtém a versão atual da chave
 */
export function getKeyVersion(): number {
  return keyVersion;
}

/**
 * Verifica se há uma chave válida em cache
 */
export function hasValidKey(): boolean {
  return cachedKey !== null;
}

/**
 * Hash de dados usando SHA-256 (para checksums, não para senhas)
 */
export async function hashData(data: string): Promise<string> {
  try {
    if (!isCryptoAvailable()) {
      // Fallback: usar hash simples para desenvolvimento/testes
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `fallback-${Math.abs(hash).toString(16)}`;
    }
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    // Fallback em caso de erro
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fallback-${Math.abs(hash).toString(16)}`;
  }
}
