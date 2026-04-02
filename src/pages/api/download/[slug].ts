import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';

export const prerender = false;

const downloads = {
  '50-ai-prompts-for-desktop-engineers': {
    fileName: '50-ai-prompts-for-desktop-engineers.pdf',
    path: new URL('../../../downloads/50-ai-prompts-for-desktop-engineers.pdf', import.meta.url),
  },
  'ai-output-validation-checklist-for-endpoint-teams': {
    fileName: 'ai-output-validation-checklist-for-endpoint-teams.pdf',
    path: new URL('../../../downloads/ai-output-validation-checklist-for-endpoint-teams.pdf', import.meta.url),
  },
  'copilot-intune-ai-playbook': {
    fileName: 'copilot-intune-ai-playbook.pdf',
    path: new URL('../../../downloads/copilot-intune-ai-playbook.pdf', import.meta.url),
  },
  'ai-powered-powershell-automation': {
    fileName: 'ai-powered-powershell-automation.pdf',
    path: new URL('../../../downloads/ai-powered-powershell-automation.pdf', import.meta.url),
  },
} satisfies Record<string, { fileName: string; path: URL }>;

export const GET: APIRoute = async ({ params, cookies }) => {
  if (cookies.get('ai_toolkit_access')?.value !== 'granted') {
    return new Response('Access denied', { status: 403 });
  }

  const slug = params.slug ?? '';
  const asset = downloads[slug];

  if (!asset) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const pdf = await readFile(asset.path);

    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asset.fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Toolkit download error:', error);
    return new Response('File unavailable', { status: 500 });
  }
};
