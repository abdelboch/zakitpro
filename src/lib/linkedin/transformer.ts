/**
 * LinkedIn Content Transformer
 *
 * Converts blog articles (MDX) to LinkedIn-optimized post format.
 *
 * Key constraints:
 * - LinkedIn character limit: 3000 (but 1300 recommended for engagement)
 * - No HTML/markdown formatting in LinkedIn API
 * - Line breaks are preserved with \n
 * - URLs are auto-linked
 */

export interface ArticleFrontmatter {
  title: string;
  publishDate: string;
  description?: string;
  tags?: string[];
  linkedin?: {
    autoPost?: boolean;
    scheduledTime?: string;
    customText?: string;
    hashtags?: string[];
  };
}

export interface LinkedInPost {
  text: string;
  characterCount: number;
  hashtags: string[];
  articleUrl: string;
}

export interface TransformOptions {
  maxLength?: number; // Default: 1300
  includeHashtags?: boolean; // Default: true
  includeUrl?: boolean; // Default: true
  tone?: 'professional' | 'conversational'; // Default: 'conversational'
}

const DEFAULT_OPTIONS: Required<TransformOptions> = {
  maxLength: 1300,
  includeHashtags: true,
  includeUrl: true,
  tone: 'conversational',
};

/**
 * Transform article content to LinkedIn post format
 */
export function transformArticleToLinkedIn(
  frontmatter: ArticleFrontmatter,
  content: string,
  articleSlug: string,
  options: TransformOptions = {}
): LinkedInPost {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // If custom LinkedIn text is provided, use it
  if (frontmatter.linkedin?.customText) {
    return buildCustomPost(frontmatter, articleSlug, opts);
  }

  // Otherwise, generate from article content
  return generatePost(frontmatter, content, articleSlug, opts);
}

/**
 * Build post from custom frontmatter text
 */
function buildCustomPost(
  frontmatter: ArticleFrontmatter,
  articleSlug: string,
  options: Required<TransformOptions>
): LinkedInPost {
  const customText = frontmatter.linkedin?.customText || '';
  const hashtags = frontmatter.linkedin?.hashtags || extractHashtagsFromTags(frontmatter.tags);
  const articleUrl = `https://zakitpro.com/articles/${articleSlug}`;

  let text = customText;

  // Add article URL if requested
  if (options.includeUrl && !text.includes(articleUrl)) {
    text += `\n\nFull article: ${articleUrl}`;
  }

  // Add hashtags if requested
  if (options.includeHashtags && hashtags.length > 0) {
    const hashtagText = hashtags.map(tag => `#${tag}`).join(' ');
    text += `\n\n${hashtagText}`;
  }

  return {
    text,
    characterCount: text.length,
    hashtags,
    articleUrl,
  };
}

/**
 * Generate LinkedIn post from article content
 */
function generatePost(
  frontmatter: ArticleFrontmatter,
  content: string,
  articleSlug: string,
  options: Required<TransformOptions>
): LinkedInPost {
  const articleUrl = `https://zakitpro.com/articles/${articleSlug}`;
  const hashtags = frontmatter.linkedin?.hashtags || extractHashtagsFromTags(frontmatter.tags);

  // Extract key points from content
  const hook = extractHook(frontmatter, content);
  const keyPoints = extractKeyPoints(content, options.maxLength - hook.length - 200);
  const cta = buildCTA(frontmatter.title, articleUrl);

  // Construct post
  let postParts: string[] = [hook];

  if (keyPoints.length > 0) {
    postParts.push(''); // Blank line
    postParts.push(keyPoints);
  }

  postParts.push(''); // Blank line
  postParts.push(cta);

  // Add hashtags
  if (options.includeHashtags && hashtags.length > 0) {
    postParts.push(''); // Blank line
    postParts.push(hashtags.map(tag => `#${tag}`).join(' '));
  }

  const text = postParts.join('\n');

  return {
    text,
    characterCount: text.length,
    hashtags,
    articleUrl,
  };
}

/**
 * Extract attention-grabbing hook from article
 */
function extractHook(frontmatter: ArticleFrontmatter, content: string): string {
  // Try to find the first paragraph after the title
  const paragraphs = content
    .replace(/^#.*$/gm, '') // Remove headers
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 20); // Filter out short lines

  if (paragraphs.length > 0) {
    const firstPara = paragraphs[0];
    // Trim to a reasonable hook length (~200 chars)
    if (firstPara.length > 200) {
      return firstPara.substring(0, 197) + '...';
    }
    return firstPara;
  }

  // Fallback to description or title
  return frontmatter.description || `New article: ${frontmatter.title}`;
}

/**
 * Extract key points/bullets from article
 */
function extractKeyPoints(content: string, maxLength: number): string {
  // Look for bullet points or numbered lists
  const bulletPattern = /^[-*•]\s+(.+)$/gm;
  const bullets: string[] = [];
  let match;

  while ((match = bulletPattern.exec(content)) !== null && bullets.length < 5) {
    const point = match[1].trim();
    // Clean up markdown formatting
    const cleaned = point
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1'); // Code

    bullets.push(cleaned);
  }

  if (bullets.length === 0) {
    return '';
  }

  // Format as bullet list with a short intro
  const intro = 'The short version:';
  const points = bullets.map(b => `- ${b}`).join('\n');
  const result = `${intro}\n${points}`;

  // Trim if too long
  if (result.length > maxLength) {
    const trimmedBullets = bullets.slice(0, 3);
    return `${intro}\n${trimmedBullets.map(b => `- ${b}`).join('\n')}`;
  }

  return result;
}

/**
 * Build call-to-action with article link
 */
function buildCTA(title: string, articleUrl: string): string {
  return `Full article: ${articleUrl}`;
}

/**
 * Convert article tags to LinkedIn hashtags
 */
function extractHashtagsFromTags(tags?: string[]): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }

  return tags
    .map(tag => {
      // Remove spaces and special characters
      return tag
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9]/g, '');
    })
    .filter(tag => tag.length > 0)
    .slice(0, 5); // LinkedIn best practice: 3-5 hashtags
}

/**
 * Validate LinkedIn post length
 */
export function validatePostLength(text: string): {
  valid: boolean;
  characterCount: number;
  errors: string[];
} {
  const characterCount = text.length;
  const errors: string[] = [];

  if (characterCount === 0) {
    errors.push('Post text is empty');
  }

  if (characterCount > 3000) {
    errors.push(`Post exceeds LinkedIn's 3000 character limit (${characterCount} characters)`);
  }

  if (characterCount > 1300) {
    errors.push(`Warning: Post is longer than recommended 1300 characters (${characterCount} characters). Engagement may be lower.`);
  }

  return {
    valid: errors.filter(e => !e.startsWith('Warning')).length === 0,
    characterCount,
    errors,
  };
}

/**
 * Preview LinkedIn post formatting
 */
export function previewPost(post: LinkedInPost): string {
  return `
┌─────────────────────────────────────────────┐
│ LinkedIn Post Preview                       │
│ Characters: ${post.characterCount}/3000 (${post.characterCount <= 1300 ? '✓' : '⚠'})              │
└─────────────────────────────────────────────┘

${post.text}

─────────────────────────────────────────────
Hashtags: ${post.hashtags.join(', ')}
Article URL: ${post.articleUrl}
─────────────────────────────────────────────
`.trim();
}
