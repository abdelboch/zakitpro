/**
 * LinkedIn Queue Management Endpoint
 *
 * GET /api/linkedin/queue - Get all queued posts
 * POST /api/linkedin/queue - Add post to queue
 *
 * Phase 2.3 - Queue System
 */

import type { APIRoute } from 'astro';
import { MemoryQueueStorage } from '../../../../lib/linkedin/queue';

// TODO: Replace MemoryQueueStorage with VercelKVQueueStorage in production
const queueStorage = new MemoryQueueStorage();

/**
 * GET - Retrieve queue
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const status = url.searchParams.get('status');

    let posts;
    if (status === 'pending') {
      posts = await queueStorage.getPendingPosts();
    } else if (status === 'failed') {
      posts = await queueStorage.getFailedPosts();
    } else {
      posts = await queueStorage.getQueue();
    }

    return new Response(JSON.stringify({
      success: true,
      count: posts.length,
      posts,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Queue GET error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to get queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * POST - Add to queue
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { articleSlug, text, visibility = 'PUBLIC', scheduledTime, maxAttempts = 3 } = body;

    // Validate required fields
    if (!articleSlug || typeof articleSlug !== 'string') {
      return new Response(JSON.stringify({
        error: 'Missing or invalid articleSlug',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({
        error: 'Missing or invalid text',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate character limit
    if (text.length > 3000) {
      return new Response(JSON.stringify({
        error: 'Text exceeds LinkedIn character limit (3000)',
        characterCount: text.length,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate scheduled time if provided
    if (scheduledTime) {
      const scheduledDate = new Date(scheduledTime);
      if (isNaN(scheduledDate.getTime())) {
        return new Response(JSON.stringify({
          error: 'Invalid scheduledTime format (must be ISO 8601)',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Add to queue
    const queuedPost = await queueStorage.addToQueue({
      articleSlug,
      text,
      visibility,
      status: 'pending',
      scheduledTime,
      maxAttempts,
    });

    return new Response(JSON.stringify({
      success: true,
      post: queuedPost,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Queue POST error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to add to queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
