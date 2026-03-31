/**
 * LinkedIn Queue Item Management Endpoint
 *
 * GET /api/linkedin/queue/[id] - Get queued post
 * PATCH /api/linkedin/queue/[id] - Update queued post
 * DELETE /api/linkedin/queue/[id] - Remove from queue
 *
 * Phase 2.3 - Queue System
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { MemoryQueueStorage } from '../../../../lib/linkedin/queue';

// TODO: Replace MemoryQueueStorage with VercelKVQueueStorage in production
const queueStorage = new MemoryQueueStorage();

/**
 * GET - Retrieve queued post
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({
        error: 'Missing post ID',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const post = await queueStorage.getQueuedPost(id);

    if (!post) {
      return new Response(JSON.stringify({
        error: 'Post not found',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      post,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Queue GET [id] error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to get queued post',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * PATCH - Update queued post
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({
        error: 'Missing post ID',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { text, visibility, status, scheduledTime } = body;

    // Validate text length if provided
    if (text && text.length > 3000) {
      return new Response(JSON.stringify({
        error: 'Text exceeds LinkedIn character limit (3000)',
        characterCount: text.length,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate status if provided
    const validStatuses = ['pending', 'processing', 'posted', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return new Response(JSON.stringify({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
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

    const updates: any = {};
    if (text !== undefined) updates.text = text;
    if (visibility !== undefined) updates.visibility = visibility;
    if (status !== undefined) updates.status = status;
    if (scheduledTime !== undefined) updates.scheduledTime = scheduledTime;

    const updatedPost = await queueStorage.updateQueuedPost(id, updates);

    return new Response(JSON.stringify({
      success: true,
      post: updatedPost,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Queue PATCH [id] error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;

    return new Response(JSON.stringify({
      error: 'Failed to update queued post',
      message,
    }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * DELETE - Remove from queue
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({
        error: 'Missing post ID',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if post exists
    const post = await queueStorage.getQueuedPost(id);
    if (!post) {
      return new Response(JSON.stringify({
        error: 'Post not found',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await queueStorage.removeFromQueue(id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Post removed from queue',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Queue DELETE [id] error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to remove from queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
