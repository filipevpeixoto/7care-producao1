/**
 * QueueService unit tests
 * Tests enqueue, process, retries, DLQ management, and stats.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import SUT
import { QueueService } from '../services/queueService';

describe('QueueService', () => {
  let queue: QueueService<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new QueueService<string>({ maxAttempts: 3, retryDelayMs: 0, processingTimeoutMs: 5000 });
  });

  describe('enqueue()', () => {
    it('adds an item and returns an id', () => {
      const id = queue.enqueue('task-1');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('increments queue size', () => {
      expect(queue.size()).toBe(0);

      queue.enqueue('task-1');
      expect(queue.size()).toBe(1);

      queue.enqueue('task-2');
      expect(queue.size()).toBe(2);
    });
  });

  describe('size()', () => {
    it('returns 0 for empty queue', () => {
      expect(queue.size()).toBe(0);
    });

    it('tracks queue size accurately', () => {
      queue.enqueue('a');
      queue.enqueue('b');
      queue.enqueue('c');

      expect(queue.size()).toBe(3);
    });
  });

  describe('setProcessor() and process()', () => {
    it('processes all items in the queue', async () => {
      const processed: string[] = [];
      queue.setProcessor(async (data) => {
        processed.push(data);
      });

      queue.enqueue('item-1');
      queue.enqueue('item-2');
      queue.enqueue('item-3');

      await queue.process();

      expect(processed).toEqual(['item-1', 'item-2', 'item-3']);
      expect(queue.size()).toBe(0);
    });

    it('does nothing when no processor is set', async () => {
      queue.enqueue('item-1');

      await queue.process();

      // Queue items remain since no processor
      expect(queue.size()).toBe(1);
    });

    it('does nothing on empty queue', async () => {
      const processor = vi.fn().mockResolvedValue(undefined);
      queue.setProcessor(processor);

      await queue.process();

      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('retry behavior', () => {
    it('retries failed items up to maxAttempts', async () => {
      let callCount = 0;
      const failingQueue = new QueueService<string>({ maxAttempts: 3, retryDelayMs: 0, processingTimeoutMs: 5000 });

      failingQueue.setProcessor(async (data) => {
        callCount++;
        if (callCount < 3) {
          throw new Error(`fail ${callCount}`);
        }
        // succeed on 3rd call
      });

      failingQueue.enqueue('retry-me');
      await failingQueue.process();

      // Should have been called 3 times (2 fails + 1 success)
      expect(callCount).toBe(3);
      expect(failingQueue.getDeadLetterQueue()).toHaveLength(0);
    });

    it('moves items to DLQ after exceeding maxAttempts', async () => {
      const alwaysFailQueue = new QueueService<string>({ maxAttempts: 2, retryDelayMs: 0, processingTimeoutMs: 5000 });

      alwaysFailQueue.setProcessor(async () => {
        throw new Error('always fails');
      });

      alwaysFailQueue.enqueue('doomed');
      await alwaysFailQueue.process();

      expect(alwaysFailQueue.getDeadLetterQueue()).toHaveLength(1);
      expect(alwaysFailQueue.getDeadLetterQueue()[0].error).toBe('always fails');
    });
  });

  describe('getDeadLetterQueue()', () => {
    it('returns empty array when no failures', () => {
      expect(queue.getDeadLetterQueue()).toEqual([]);
    });

    it('returns items that exceeded max attempts', async () => {
      const failQueue = new QueueService<string>({ maxAttempts: 1, retryDelayMs: 0, processingTimeoutMs: 5000 });
      failQueue.setProcessor(async () => {
        throw new Error('boom');
      });

      failQueue.enqueue('fail-1');
      failQueue.enqueue('fail-2');
      await failQueue.process();

      const dlq = failQueue.getDeadLetterQueue();
      expect(dlq).toHaveLength(2);
    });
  });

  describe('retryFromDLQ()', () => {
    it('reprocesses a DLQ item successfully', async () => {
      let attempt = 0;
      const retryQueue = new QueueService<string>({ maxAttempts: 1, retryDelayMs: 0, processingTimeoutMs: 5000 });

      retryQueue.setProcessor(async (data) => {
        attempt++;
        if (attempt === 1) throw new Error('first fail');
        return `processed: ${data}`;
      });

      retryQueue.enqueue('retry-item');
      await retryQueue.process();

      expect(retryQueue.getDeadLetterQueue()).toHaveLength(1);
      const dlqItem = retryQueue.getDeadLetterQueue()[0];

      const result = await retryQueue.retryFromDLQ(dlqItem.id);

      expect(result).toBe('processed: retry-item');
      expect(retryQueue.getDeadLetterQueue()).toHaveLength(0);
    });

    it('returns null for non-existent DLQ item', async () => {
      queue.setProcessor(async () => {});
      const result = await queue.retryFromDLQ('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('retryAllFromDLQ()', () => {
    it('batch reprocesses all DLQ items', async () => {
      let processCount = 0;
      const batchQueue = new QueueService<string>({ maxAttempts: 1, retryDelayMs: 0, processingTimeoutMs: 5000 });

      batchQueue.setProcessor(async () => {
        processCount++;
        if (processCount <= 2) throw new Error('initial fail');
        return 'ok';
      });

      batchQueue.enqueue('a');
      batchQueue.enqueue('b');
      await batchQueue.process();

      expect(batchQueue.getDeadLetterQueue()).toHaveLength(2);

      // Now processor succeeds
      batchQueue.setProcessor(async () => 'success');

      const result = await batchQueue.retryAllFromDLQ();

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(batchQueue.getDeadLetterQueue()).toHaveLength(0);
    });

    it('reports mixed success and failure', async () => {
      let callIdx = 0;
      const mixedQueue = new QueueService<string>({ maxAttempts: 1, retryDelayMs: 0, processingTimeoutMs: 5000 });

      // First pass: all fail
      mixedQueue.setProcessor(async () => {
        throw new Error('fail');
      });

      mixedQueue.enqueue('ok-item');
      mixedQueue.enqueue('bad-item');
      await mixedQueue.process();

      expect(mixedQueue.getDeadLetterQueue()).toHaveLength(2);

      // Retry: first succeeds, second fails again
      mixedQueue.setProcessor(async () => {
        callIdx++;
        if (callIdx === 2) throw new Error('still fails');
        return 'ok';
      });

      const result = await mixedQueue.retryAllFromDLQ();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('getStats()', () => {
    it('returns correct stats for empty queue', () => {
      const stats = queue.getStats();

      expect(stats).toEqual({
        queueSize: 0,
        dlqSize: 0,
        processing: false,
      });
    });

    it('returns correct queue size', () => {
      queue.enqueue('a');
      queue.enqueue('b');

      const stats = queue.getStats();

      expect(stats.queueSize).toBe(2);
      expect(stats.dlqSize).toBe(0);
    });

    it('returns correct dlq size after failures', async () => {
      const failQueue = new QueueService<string>({ maxAttempts: 1, retryDelayMs: 0, processingTimeoutMs: 5000 });
      failQueue.setProcessor(async () => {
        throw new Error('fail');
      });

      failQueue.enqueue('x');
      await failQueue.process();

      const stats = failQueue.getStats();

      expect(stats.dlqSize).toBe(1);
      expect(stats.queueSize).toBe(0);
    });
  });

  describe('clearDeadLetterQueue()', () => {
    it('empties the DLQ', async () => {
      const failQueue = new QueueService<string>({ maxAttempts: 1, retryDelayMs: 0, processingTimeoutMs: 5000 });
      failQueue.setProcessor(async () => {
        throw new Error('fail');
      });

      failQueue.enqueue('a');
      failQueue.enqueue('b');
      await failQueue.process();

      expect(failQueue.getDeadLetterQueue()).toHaveLength(2);

      failQueue.clearDeadLetterQueue();

      expect(failQueue.getDeadLetterQueue()).toHaveLength(0);
      expect(failQueue.getStats().dlqSize).toBe(0);
    });

    it('does nothing on empty DLQ', () => {
      queue.clearDeadLetterQueue();

      expect(queue.getDeadLetterQueue()).toEqual([]);
    });
  });
});
