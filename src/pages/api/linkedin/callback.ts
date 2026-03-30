/**
 * LinkedIn OAuth Callback Endpoint
 *
 * GET /api/linkedin/callback?code=...&state=...
 *
 * Handles OAuth callback from LinkedIn, exchanges code for access token.
 */

import type { APIRoute } from 'astro';
import { createLinkedInAuth, MemoryTokenStorage } from '../../../lib/linkedin/auth';

export const GET: APIRoute = async ({ url, redirect }) => {
  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return redirect(`/admin/linkedin?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || '')}`, 302);
    }

    // Validate required parameters
    if (!code) {
      return new Response(JSON.stringify({
        error: 'Missing authorization code',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: Validate state parameter against stored value (CSRF protection)
    if (state) {
      console.log('OAuth state:', state);
    }

    // Exchange code for tokens
    // TODO: Replace MemoryTokenStorage with VercelKVTokenStorage in production
    const storage = new MemoryTokenStorage();
    const auth = createLinkedInAuth(storage);

    const tokens = await auth.exchangeCodeForToken(code);

    console.log('LinkedIn authentication successful');
    console.log('Token expires at:', new Date(tokens.expiresAt).toISOString());

    // Redirect to admin dashboard
    return redirect('/admin/linkedin?success=true', 302);
  } catch (error) {
    console.error('LinkedIn callback error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return redirect(`/admin/linkedin?error=auth_failed&message=${encodeURIComponent(errorMessage)}`, 302);
  }
};
