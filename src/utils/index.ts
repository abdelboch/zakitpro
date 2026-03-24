// Shared constants
export const pillarNames: Record<string, string> = {
  troubleshooting: 'Windows Troubleshooting',
  scripting: 'Scripting & Automation',
  deployment: 'Deployment & Imaging',
  security: 'Endpoint Security',
  packaging: 'App Packaging',
  career: 'Career & Craft',
  ai: 'AI-Augmented Engineering'
};

export const pillarDescriptions: Record<string, string> = {
  troubleshooting: 'Boot failures, BSOD, event log forensics, profile corruption, error codes',
  scripting: 'PowerShell, Graph API, task automation, scheduled jobs',
  deployment: 'Autopilot, WinPE, MDT, driver injection, provisioning',
  security: 'CIS benchmarks, LAPS, Defender for Endpoint, BitLocker, Conditional Access',
  packaging: 'Win32/Intune packaging, PSADT, silent installs, detection rules',
  career: 'Career progression, lab setup, cert roadmaps, documentation, tooling',
  ai: 'AI workflows for endpoint engineering, prompt ops, AI-assisted troubleshooting, and governance'
};

export const difficultyColors: Record<string, string> = {
  junior: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  mid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  senior: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

export const difficultyLabels: Record<string, string> = {
  junior: 'Junior (1-3 years)',
  mid: 'Mid-Level (3-5 years)',
  senior: 'Senior (5+ years)'
};

export const typeLabels: Record<string, string> = {
  'war-story': 'War Story',
  'deep-dive': 'Deep Dive',
  'how-to': 'How-To',
  'script-drop': 'Script Drop',
  'error-reference': 'Error Reference',
  'opinion': 'Opinion',
  'career-guide': 'Career Guide'
};

// Reading time utility
export function calculateReadingTime(content: string): string {
  // Strip MDX/HTML tags
  const text = content
    .replace(/<[^>]*>/g, '')
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .trim();

  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  const minutes = Math.ceil(words / 200);

  if (minutes < 1) {
    return '< 1 min read';
  }

  return `${minutes} min read`;
}

// Format date utility
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

interface Article {
  pillar: string;
  slug: string;
  draft?: boolean;
  tags?: string[];
  publishedAt: string;
}

// Get related articles
export function getRelatedArticles(
  currentArticle: Article,
  allArticles: Article[],
  limit: number = 3
): Article[] {
  const { pillar, tags, slug } = currentArticle;

  // Same pillar, excluding current
  const samePillar = allArticles.filter(
    (a: Article) => a.pillar === pillar && a.slug !== slug && !a.draft
  );

  // Score by tag overlap
  const scored = samePillar.map((article: Article) => {
    const tagOverlap = article.tags?.filter((tag: string) => tags?.includes(tag)).length || 0;
    return { ...article, score: tagOverlap };
  });

  // Sort by score, then date
  scored.sort((a: Article & { score: number }, b: Article & { score: number }) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Fill from other pillars if needed
  const results: Article[] = scored.slice(0, limit) as Article[];

  if (results.length < limit) {
    const otherPillar = allArticles
      .filter((a: Article) => a.slug !== slug && !a.draft && a.pillar !== pillar)
      .map((article: Article) => {
        const tagOverlap = article.tags?.filter((tag: string) => tags?.includes(tag)).length || 0;
        return { ...article, score: tagOverlap };
      })
      .sort((a: Article & { score: number }, b: Article & { score: number }) => b.score - a.score)
      .slice(0, limit - results.length);

    results.push(...(otherPillar as Article[]));
  }

  return results.slice(0, limit);
}
