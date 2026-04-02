import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);

    const name = String(params.get('name') ?? '').trim();
    const email = String(params.get('email') ?? '').trim();
    const next = String(params.get('next') ?? '/ai-toolkit/thanks/').trim();

    if (name.length < 2) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Forward to Buttondown API
    const tag = String(params.get('tag') ?? 'ai-toolkit').trim() || 'ai-toolkit';
    const body = new URLSearchParams({ email, tag });
    const res = await fetch('https://buttondown.com/api/emails/embed-subscribe/zakitpro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Subscription failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Redirect to branded thank-you page on success
    return new Response(null, {
      status: 303,
      headers: {
        'Set-Cookie': 'ai_toolkit_access=granted; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax',
        'Location': next,
      },
    });
  } catch (err) {
    console.error('Toolkit subscribe error:', err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
