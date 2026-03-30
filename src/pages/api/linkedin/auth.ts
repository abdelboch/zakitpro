/**
 * LinkedIn OAuth Authorization Endpoint
 *
 * GET /api/linkedin/auth
 *
 * Redirects user to LinkedIn authorization page.
 */

import type { APIRoute } from 'astro';
import { createLinkedInAuth, MemoryTokenStorage } from '../../../lib/linkedin/auth';

export const GET: APIRoute = async ({ redirect }) => {
  try {
    // TODO: Replace MemoryTokenStorage with VercelKVTokenStorage in production
    const storage = new MemoryTokenStorage();
    const auth = createLinkedInAuth(storage);

    // Generate random state for CSRF protection
    const state = crypto.randomUUID();

    // TODO: Store state in session/cookie for validation in callback

    const authUrl = auth.getAuthorizationUrl(state);

    return redirect(authUrl, 302);
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to initiate LinkedIn authorization',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
