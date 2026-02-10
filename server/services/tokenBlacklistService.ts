/**
 * Token Blacklist Service
 *
 * Mantém lista de tokens JWT revogados (logout).
 * Com JWT de 15min, a blacklist precisa reter tokens por no máximo 15min.
 * Usa Map em memória com limpeza automática — adequado para single-instance.
 */

import { logger } from '../utils/logger';

interface BlacklistedToken {
  token: string;
  expiresAt: number; // timestamp em ms
}

class TokenBlacklistService {
  private blacklist: Map<string, BlacklistedToken> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Limpar tokens expirados a cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Adiciona um token à blacklist (chamado no logout)
   * @param token - JWT token string
   * @param expiresInMs - Tempo até o token expirar naturalmente (default: 15min)
   */
  add(token: string, expiresInMs: number = 15 * 60 * 1000): void {
    const expiresAt = Date.now() + expiresInMs;
    this.blacklist.set(token, { token, expiresAt });
    logger.info(`Token adicionado à blacklist (total: ${this.blacklist.size})`);
  }

  /**
   * Verifica se um token está na blacklist
   */
  isBlacklisted(token: string): boolean {
    const entry = this.blacklist.get(token);
    if (!entry) return false;

    // Se já expirou, remover e retornar false
    if (Date.now() > entry.expiresAt) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Remove tokens expirados da blacklist
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
   * Retorna o tamanho atual da blacklist (para monitoramento)
   */
  get size(): number {
    return this.blacklist.size;
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
  }
}

// Singleton
export const tokenBlacklist = new TokenBlacklistService();
