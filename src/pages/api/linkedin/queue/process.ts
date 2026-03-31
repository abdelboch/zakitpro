/**
 * LinkedIn Queue Processor Endpoint
 *
 * POST /api/linkedin/queue/process - Process scheduled posts
 *
 * This endpoint should be called by a cron job to process scheduled posts.
 *
 * Phase 2.3 - Queue System
 */

import type { APIRoute } from 'astro';
import { MemoryQueueStorage, createQueueProcessor } from '../../../../lib/linkedin/queue';
import { createLinkedInAuth, MemoryTokenStorage } from '../../../../lib/linkedin/auth';
import { createLinkedInClient } from '../../../../lib/linkedin/client';

// TODO: Replace MemoryQueueStorage with VercelKVQueueStorage in production
const queueStorage = new MemoryQueueStorage();

// TODO: Replace MemoryTokenStorage with VercelKVTokenStorage in production
const authStorage = new MemoryTokenStorage();

/**
 * POST - Process scheduled posts
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Optional: Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = import.meta.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid cron secret',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check authentication
    const auth = createLinkedInAuth(authStorage);
    const isAuthenticated = await auth.isAuthenticated();

    if (!isAuthenticated) {
      return new Response(JSON.stringify({
        error: 'Not authenticated',
        message: 'LinkedIn authentication required to process queue',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create LinkedIn client
    const client = createLinkedInClient(auth);

    // Create queue processor
    const processor = createQueueProcessor(queueStorage, async (text, visibility) => {
      const result = await client.postTextWithRetry(text, visibility);
      return { id: result.id };
    });

    // Process scheduled posts
    const result = await processor.processScheduledPosts();

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Queue process error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to process queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
