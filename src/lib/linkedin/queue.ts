/**
 * LinkedIn Post Queue System
 *
 * Phase 2.3 - Manages queued LinkedIn posts with Vercel KV storage.
 *
 * Features:
 * - Add posts to queue
 * - Process queue with rate limiting
 * - Schedule posts for future publishing
 * - Retry failed posts
 * - Track post status (pending, posted, failed)
 */

export interface QueuedPost {
  id: string;
  articleSlug: string;
  text: string;
  visibility: 'PUBLIC' | 'CONNECTIONS';
  status: 'pending' | 'processing' | 'posted' | 'failed';
  scheduledTime?: string; // ISO 8601 timestamp
  createdAt: string;
  updatedAt: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  postedId?: string; // LinkedIn post ID after successful posting
}

export interface QueueStorage {
  // Queue operations
  addToQueue(post: Omit<QueuedPost, 'id' | 'createdAt' | 'updatedAt' | 'attempts'>): Promise<QueuedPost>;
  getQueue(): Promise<QueuedPost[]>;
  getQueuedPost(id: string): Promise<QueuedPost | null>;
  updateQueuedPost(id: string, updates: Partial<QueuedPost>): Promise<QueuedPost>;
  removeFromQueue(id: string): Promise<void>;

  // Query operations
  getPendingPosts(limit?: number): Promise<QueuedPost[]>;
  getScheduledPosts(before: Date): Promise<QueuedPost[]>;
  getFailedPosts(): Promise<QueuedPost[]>;
}

/**
 * In-memory queue storage for development
 */
export class MemoryQueueStorage implements QueueStorage {
  private queue: Map<string, QueuedPost> = new Map();

  async addToQueue(post: Omit<QueuedPost, 'id' | 'createdAt' | 'updatedAt' | 'attempts'>): Promise<QueuedPost> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const queuedPost: QueuedPost = {
      ...post,
      id,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
    };

    this.queue.set(id, queuedPost);
    return queuedPost;
  }

  async getQueue(): Promise<QueuedPost[]> {
    return Array.from(this.queue.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async getQueuedPost(id: string): Promise<QueuedPost | null> {
    return this.queue.get(id) || null;
  }

  async updateQueuedPost(id: string, updates: Partial<QueuedPost>): Promise<QueuedPost> {
    const existing = this.queue.get(id);
    if (!existing) {
      throw new Error(`Queued post ${id} not found`);
    }

    const updated: QueuedPost = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.queue.set(id, updated);
    return updated;
  }

  async removeFromQueue(id: string): Promise<void> {
    this.queue.delete(id);
  }

  async getPendingPosts(limit?: number): Promise<QueuedPost[]> {
    const pending = Array.from(this.queue.values())
      .filter((post) => post.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return limit ? pending.slice(0, limit) : pending;
  }

  async getScheduledPosts(before: Date): Promise<QueuedPost[]> {
    return Array.from(this.queue.values())
      .filter(
        (post) =>
          post.status === 'pending' &&
          post.scheduledTime &&
          new Date(post.scheduledTime) <= before
      )
      .sort((a, b) => {
        const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0;
        const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0;
        return timeA - timeB;
      });
  }

  async getFailedPosts(): Promise<QueuedPost[]> {
    return Array.from(this.queue.values())
      .filter((post) => post.status === 'failed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

/**
 * Vercel KV queue storage for production
 */
export class VercelKVQueueStorage implements QueueStorage {
  private kv: any; // @vercel/kv instance

  constructor(kv: any) {
    this.kv = kv;
  }

  private queueKey(id: string): string {
    return `linkedin:queue:${id}`;
  }

  private queueIndexKey(): string {
    return 'linkedin:queue:index';
  }

  async addToQueue(post: Omit<QueuedPost, 'id' | 'createdAt' | 'updatedAt' | 'attempts'>): Promise<QueuedPost> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const queuedPost: QueuedPost = {
      ...post,
      id,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
    };

    // Store post
    await this.kv.set(this.queueKey(id), JSON.stringify(queuedPost));

    // Add to index
    await this.kv.sadd(this.queueIndexKey(), id);

    return queuedPost;
  }

  async getQueue(): Promise<QueuedPost[]> {
    const ids = await this.kv.smembers(this.queueIndexKey());
    if (!ids || ids.length === 0) {
      return [];
    }

    const posts = await Promise.all(
      ids.map(async (id: string) => {
        const data = await this.kv.get(this.queueKey(id));
        return data ? JSON.parse(data) : null;
      })
    );

    return posts.filter(Boolean).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async getQueuedPost(id: string): Promise<QueuedPost | null> {
    const data = await this.kv.get(this.queueKey(id));
    return data ? JSON.parse(data) : null;
  }

  async updateQueuedPost(id: string, updates: Partial<QueuedPost>): Promise<QueuedPost> {
    const existing = await this.getQueuedPost(id);
    if (!existing) {
      throw new Error(`Queued post ${id} not found`);
    }

    const updated: QueuedPost = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.kv.set(this.queueKey(id), JSON.stringify(updated));
    return updated;
  }

  async removeFromQueue(id: string): Promise<void> {
    await this.kv.del(this.queueKey(id));
    await this.kv.srem(this.queueIndexKey(), id);
  }

  async getPendingPosts(limit?: number): Promise<QueuedPost[]> {
    const allPosts = await this.getQueue();
    const pending = allPosts
      .filter((post) => post.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return limit ? pending.slice(0, limit) : pending;
  }

  async getScheduledPosts(before: Date): Promise<QueuedPost[]> {
    const allPosts = await this.getQueue();
    return allPosts
      .filter(
        (post) =>
          post.status === 'pending' &&
          post.scheduledTime &&
          new Date(post.scheduledTime) <= before
      )
      .sort((a, b) => {
        const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0;
        const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0;
        return timeA - timeB;
      });
  }

  async getFailedPosts(): Promise<QueuedPost[]> {
    const allPosts = await this.getQueue();
    return allPosts
      .filter((post) => post.status === 'failed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

/**
 * Queue processor - processes pending posts
 */
export class QueueProcessor {
  private storage: QueueStorage;
  private postFunction: (text: string, visibility: 'PUBLIC' | 'CONNECTIONS') => Promise<{ id: string }>;

  constructor(
    storage: QueueStorage,
    postFunction: (text: string, visibility: 'PUBLIC' | 'CONNECTIONS') => Promise<{ id: string }>
  ) {
    this.storage = storage;
    this.postFunction = postFunction;
  }

  /**
   * Process scheduled posts that are due
   */
  async processScheduledPosts(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const now = new Date();
    const duePosts = await this.storage.getScheduledPosts(now);

    let succeeded = 0;
    let failed = 0;

    for (const post of duePosts) {
      await this.processPost(post);
      const updated = await this.storage.getQueuedPost(post.id);
      if (updated?.status === 'posted') {
        succeeded++;
      } else if (updated?.status === 'failed') {
        failed++;
      }
    }

    return {
      processed: duePosts.length,
      succeeded,
      failed,
    };
  }

  /**
   * Process a single queued post
   */
  async processPost(post: QueuedPost): Promise<void> {
    // Update status to processing
    await this.storage.updateQueuedPost(post.id, {
      status: 'processing',
      attempts: post.attempts + 1,
    });

    try {
      // Attempt to post
      const result = await this.postFunction(post.text, post.visibility);

      // Mark as posted
      await this.storage.updateQueuedPost(post.id, {
        status: 'posted',
        postedId: result.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      if (post.attempts + 1 >= post.maxAttempts) {
        // Max attempts reached, mark as failed
        await this.storage.updateQueuedPost(post.id, {
          status: 'failed',
          lastError: errorMessage,
        });
      } else {
        // Reset to pending for retry
        await this.storage.updateQueuedPost(post.id, {
          status: 'pending',
          lastError: errorMessage,
        });
      }

      throw error;
    }
  }

  /**
   * Retry all failed posts
   */
  async retryFailedPosts(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const failedPosts = await this.storage.getFailedPosts();

    let succeeded = 0;
    let failed = 0;

    for (const post of failedPosts) {
      // Reset to pending with increased attempts
      await this.storage.updateQueuedPost(post.id, {
        status: 'pending',
        attempts: 0, // Reset attempts for retry
      });

      try {
        await this.processPost(post);
        succeeded++;
      } catch (error) {
        failed++;
      }
    }

    return {
      processed: failedPosts.length,
      succeeded,
      failed,
    };
  }
}

/**
 * Create a queue processor
 */
export function createQueueProcessor(
  storage: QueueStorage,
  postFunction: (text: string, visibility: 'PUBLIC' | 'CONNECTIONS') => Promise<{ id: string }>
): QueueProcessor {
  return new QueueProcessor(storage, postFunction);
}
