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
