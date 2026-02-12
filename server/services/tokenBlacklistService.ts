/**
 * Token Blacklist Service
 *
 * Mantém lista de tokens JWT revogados (logout).
 * Com JWT de 15min, a blacklist precisa reter tokens por no máximo 15min.
 *
 * Usa Redis quando REDIS_URL está configurado para persistência distribuída.
 * Fallback para Map em memória — adequado para single-instance.
 */

import { logger } from '../utils/logger';

interface BlacklistedToken {
  token: string;
  expiresAt: number; // timestamp em ms
}

class TokenBlacklistService {
  private blacklist: Map<string, BlacklistedToken> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private redisClient: {
    set(key: string, value: string, options?: { PX: number }): Promise<unknown>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<unknown>;
    quit(): Promise<unknown>;
  } | null = null;
  private redisConnected = false;

  constructor() {
    // Limpar tokens expirados a cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);

    // Tentar conectar ao Redis para blacklist distribuída
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    try {
       
      const { createClient } = require('redis');
      const client = createClient({ url: redisUrl });

      client.on('error', (err: Error) => {
        if (this.redisConnected) {
          logger.warn(`Token blacklist Redis error: ${err.message}`);
          this.redisConnected = false;
        }
      });

      client.on('connect', () => {
        this.redisConnected = true;
        logger.info('✅ Token blacklist: usando Redis distribuído');
      });

      await client.connect();
      this.redisClient = client;
    } catch (err) {
      logger.info('📦 Token blacklist: usando store em memória (Redis não disponível)');
    }
  }

  /**
   * Adiciona um token à blacklist (chamado no logout)
   * @param token - JWT token string
   * @param expiresInMs - Tempo até o token expirar naturalmente (default: 15min)
   */
  async add(token: string, expiresInMs: number = 15 * 60 * 1000): Promise<void> {
    const expiresAt = Date.now() + expiresInMs;

    // Sempre adicionar ao in-memory (resposta rápida)
    this.blacklist.set(token, { token, expiresAt });

    // Também adicionar ao Redis se disponível (distribuído)
    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.set(`7care:blacklist:${token}`, '1', { PX: expiresInMs });
      } catch {
        // Fallback silencioso para in-memory
      }
    }

    logger.info(`Token adicionado à blacklist (in-memory: ${this.blacklist.size})`);
  }

  /**
   * Verifica se um token está na blacklist
   */
  async isBlacklisted(token: string): Promise<boolean> {
    // Verificar in-memory primeiro (mais rápido)
    const entry = this.blacklist.get(token);
    if (entry) {
      if (Date.now() > entry.expiresAt) {
        this.blacklist.delete(token);
      } else {
        return true;
      }
    }

    // Verificar Redis se disponível (para tokens blacklisted por outra instance)
    if (this.redisConnected && this.redisClient) {
      try {
        const result = await this.redisClient.get(`7care:blacklist:${token}`);
        return result !== null;
      } catch {
        // Fallback silencioso
      }
    }

    return false;
  }

  /**
   * Remove tokens expirados da blacklist em memória
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.blacklist) {
      if (now > entry.expiresAt) {
        this.blacklist.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.info(`Blacklist cleanup: ${removed} tokens expirados removidos (restam: ${this.blacklist.size})`);
    }
  }

  /**
   * Retorna o tamanho atual da blacklist em memória (para monitoramento)
   */
  get size(): number {
    return this.blacklist.size;
  }

  get usingRedis(): boolean {
    return this.redisConnected;
  }

  /**
   * Para o cleanup interval (para testes)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.blacklist.clear();
    if (this.redisClient) {
      this.redisClient.quit().catch(() => {});
      this.redisClient = null;
    }
  }
}

// Singleton
export const tokenBlacklist = new TokenBlacklistService();
