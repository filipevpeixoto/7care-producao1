/**
 * Queue Service with Dead Letter Queue
 * Service para gerenciamento de filas com suporte a DLQ
 */

import { logger } from '../utils/logger';

export interface QueueItem<T = unknown> {
  id: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  processingTimeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<QueueOptions> = {
  maxAttempts: 3,
  retryDelayMs: 5000,
  processingTimeoutMs: 30000,
};

/**
 * Dead Letter Queue para itens que falharam
 */
class DeadLetterQueue<T> {
  private items: Map<string, QueueItem<T>> = new Map();

  add(item: QueueItem<T>): void {
    this.items.set(item.id, {
      ...item,
      lastAttemptAt: new Date(),
    });
    logger.error(`Item ${item.id} moved to DLQ after ${item.attempts} attempts`, {
      error: item.error,
      data: item.data,
    });
  }

  get(id: string): QueueItem<T> | undefined {
    return this.items.get(id);
  }

  getAll(): QueueItem<T>[] {
    return Array.from(this.items.values());
  }

  remove(id: string): boolean {
    return this.items.delete(id);
  }

  clear(): void {
    this.items.clear();
  }

  size(): number {
    return this.items.size;
  }

  /**
   * Reprocessa um item da DLQ
   */
  async retry<R>(id: string, processor: (data: T) => Promise<R>): Promise<R | null> {
    const item = this.items.get(id);
    if (!item) {
      logger.warn(`Item ${id} not found in DLQ`);
      return null;
    }

    try {
      const result = await processor(item.data);
      this.items.delete(id);
      logger.info(`Item ${id} successfully reprocessed from DLQ`);
      return result;
    } catch (error) {
      item.attempts++;
      item.lastAttemptAt = new Date();
      item.error = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to reprocess item ${id} from DLQ`, { error });
      return null;
    }
  }
}

/**
 * Queue Service principal
 */
export class QueueService<T = unknown> {
  private queue: QueueItem<T>[] = [];
  private processing = false;
  private dlq: DeadLetterQueue<T>;
  private options: Required<QueueOptions>;
  private processor?: (data: T) => Promise<unknown>;

  constructor(options?: QueueOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.dlq = new DeadLetterQueue<T>();
  }

  /**
   * Define o processador de itens
   */
  setProcessor(processor: (data: T) => Promise<unknown>): void {
    this.processor = processor;
  }

  /**
   * Adiciona item à fila
   */
  enqueue(data: T, metadata?: Record<string, unknown>): string {
    const id = this.generateId();
    const item: QueueItem<T> = {
      id,
      data,
      attempts: 0,
      maxAttempts: this.options.maxAttempts,
      createdAt: new Date(),
      metadata,
    };
    this.queue.push(item);
    logger.debug(`Item ${id} added to queue`, { queueSize: this.queue.length });
    return id;
  }

  /**
   * Processa a fila
   */
  async process(): Promise<void> {
    if (this.processing || !this.processor) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        await this.processItem(item);
      } catch (error) {
        await this.handleFailure(item, error);
      }
    }

    this.processing = false;
  }

  /**
   * Processa um item individual
   */
  private async processItem(item: QueueItem<T>): Promise<void> {
    if (!this.processor) {
      throw new Error('No processor defined');
    }

    item.attempts++;
    item.lastAttemptAt = new Date();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout')), this.options.processingTimeoutMs);
    });

    await Promise.race([this.processor(item.data), timeoutPromise]);

    logger.debug(`Item ${item.id} processed successfully`);
  }

  /**
   * Trata falha no processamento
   */
  private async handleFailure(item: QueueItem<T>, error: unknown): Promise<void> {
    item.error = error instanceof Error ? error.message : String(error);

    if (item.attempts >= item.maxAttempts) {
      this.dlq.add(item);
    } else {
      // Re-adiciona à fila para retry
      await this.delay(this.options.retryDelayMs * item.attempts);
      this.queue.push(item);
      logger.warn(`Item ${item.id} will be retried (attempt ${item.attempts}/${item.maxAttempts})`);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retorna tamanho da fila
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Retorna itens na DLQ
   */
  getDeadLetterQueue(): QueueItem<T>[] {
    return this.dlq.getAll();
  }

  /**
   * Retorna tamanho da DLQ
   */
  deadLetterQueueSize(): number {
    return this.dlq.size();
  }

  /**
   * Reprocessa item da DLQ
   */
  async retryFromDLQ(id: string): Promise<unknown> {
    if (!this.processor) {
      throw new Error('No processor defined');
    }
    return this.dlq.retry(id, this.processor);
  }

  /**
   * Reprocessa todos os itens da DLQ
   */
  async retryAllFromDLQ(): Promise<{ success: number; failed: number }> {
    if (!this.processor) {
      throw new Error('No processor defined');
    }

    const items = this.dlq.getAll();
    let success = 0;
    let failed = 0;

    for (const item of items) {
      const result = await this.dlq.retry(item.id, this.processor);
      if (result !== null) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Limpa a DLQ
   */
  clearDeadLetterQueue(): void {
    this.dlq.clear();
  }

  /**
   * Retorna estatísticas da fila
   */
  getStats(): {
    queueSize: number;
    dlqSize: number;
    processing: boolean;
  } {
    return {
      queueSize: this.queue.length,
      dlqSize: this.dlq.size(),
      processing: this.processing,
    };
  }
}

// Instância singleton para uso geral
export const queueService = new QueueService();

export default QueueService;
