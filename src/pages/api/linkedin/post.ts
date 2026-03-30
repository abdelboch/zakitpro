/**
 * LinkedIn Post Creation Endpoint
 *
 * POST /api/linkedin/post
 * Body: { text: string, visibility?: 'PUBLIC' | 'CONNECTIONS' }
 *
 * Creates a new LinkedIn post.
 */

import type { APIRoute } from 'astro';
import { createLinkedInAuth, MemoryTokenStorage } from '../../../lib/linkedin/auth';
import { createLinkedInClient } from '../../../lib/linkedin/client';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { text, visibility = 'PUBLIC' } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({
        error: 'Missing or invalid text field',
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

    // TODO: Replace MemoryTokenStorage with VercelKVTokenStorage in production
    const storage = new MemoryTokenStorage();
    const auth = createLinkedInAuth(storage);

    // Check authentication
    const isAuthenticated = await auth.isAuthenticated();
    if (!isAuthenticated) {
      return new Response(JSON.stringify({
        error: 'Not authenticated',
        message: 'Please authenticate with LinkedIn first',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create client and post
    const client = createLinkedInClient(auth);
    const result = await client.postTextWithRetry(text, visibility);

    return new Response(JSON.stringify({
      success: true,
      post: {
        id: result.id,
        createdAt: result.createdAt,
        commentary: result.commentary,
      },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('LinkedIn post error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to create LinkedIn post',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
