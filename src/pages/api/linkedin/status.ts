/**
 * LinkedIn Authentication Status Endpoint
 *
 * GET /api/linkedin/status
 *
 * Returns current authentication status and token info.
 */

import type { APIRoute } from 'astro';
import { createLinkedInAuth, MemoryTokenStorage } from '../../../lib/linkedin/auth';

export const GET: APIRoute = async () => {
  try {
    // TODO: Replace MemoryTokenStorage with VercelKVTokenStorage in production
    const storage = new MemoryTokenStorage();
    const auth = createLinkedInAuth(storage);

    const isAuthenticated = await auth.isAuthenticated();
    const tokenExpiry = await auth.getTokenExpiry();

    return new Response(JSON.stringify({
      authenticated: isAuthenticated,
      tokenExpiry: tokenExpiry ? {
        expiresAt: new Date(tokenExpiry.expiresAt).toISOString(),
        expiresInSeconds: tokenExpiry.expiresInSeconds,
        expiresInDays: Math.floor(tokenExpiry.expiresInSeconds / (24 * 60 * 60)),
        isExpired: tokenExpiry.isExpired,
      } : null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('LinkedIn status error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to get status',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
