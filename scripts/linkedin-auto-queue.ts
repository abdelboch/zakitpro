#!/usr/bin/env tsx
/**
 * LinkedIn Auto-Queue Script
 *
 * Scans articles for linkedin.autoPost: true and adds them to the queue.
 *
 * Usage:
 *   npx tsx scripts/linkedin-auto-queue.ts
 *   npx tsx scripts/linkedin-auto-queue.ts --article ai-driver-update-review
 *   npx tsx scripts/linkedin-auto-queue.ts --dry-run
 *
 * This script is intended to run:
 * 1. After git push (in CI/CD)
 * 2. Manually for testing
 * 3. As a cron job to catch any missed articles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface ArticleFrontmatter {
  title: string;
  publishDate: string;
  tags?: string[];
  linkedin?: {
    autoPost?: boolean;
    customText?: string;
    hashtags?: string[];
    scheduledTime?: string;
  };
}

interface QueuedPost {
  articleSlug: string;
  text: string;
  visibility: 'PUBLIC' | 'CONNECTIONS';
  scheduledTime?: string;
  maxAttempts: number;
}

/**
 * Transform article to LinkedIn post
 */
function transformArticleToLinkedIn(
  frontmatter: ArticleFrontmatter,
  content: string,
  slug: string
): string {
  // If custom text exists, use it
  if (frontmatter.linkedin?.customText) {
    return frontmatter.linkedin.customText.trim();
  }

  // Auto-generate from content
  const lines = content.split('\n').filter(line => line.trim());

  // Find hook (first substantial paragraph)
  const hook = lines.find(line =>
    line.length > 50 &&
    !line.startsWith('#') &&
    !line.startsWith('```') &&
    !line.startsWith('[') &&
    !line.startsWith('!')
  ) || '';

  // Find bullet points
  const bullets = lines
    .filter(line => line.trim().match(/^[-*]\s+/))
    .map(line => line.trim().replace(/^[-*]\s+/, '- '))
    .slice(0, 5);

  // Build CTA
  const articleUrl = `https://zakitpro.com/articles/${slug}`;
  const cta = `\n\nFull article: ${articleUrl}`;

  // Build hashtags
  const hashtags = (frontmatter.linkedin?.hashtags || frontmatter.tags || [])
    .slice(0, 5)
    .map(tag => `#${tag.replace(/\s+/g, '')}`)
    .join(' ');

  // Assemble post
  const parts = [hook];
  if (bullets.length > 0) {
    parts.push('\n\n' + bullets.join('\n'));
  }
  parts.push(cta);
  if (hashtags) {
    parts.push('\n\n' + hashtags);
  }

  return parts.join('');
}

/**
 * Get all article files
 */
function getArticleFiles(articlesDir: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  }

  walk(articlesDir);
  return files;
}

/**
 * Parse article and check if it should be queued
 */
function parseArticle(filePath: string): {
  shouldQueue: boolean;
  slug: string;
  frontmatter: ArticleFrontmatter;
  content: string;
} | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    const frontmatter = data as ArticleFrontmatter;

    // Get slug from filename
    const slug = path.basename(filePath, '.mdx');

    // Check if autoPost is true
    const shouldQueue = frontmatter.linkedin?.autoPost === true;

    return {
      shouldQueue,
      slug,
      frontmatter,
      content,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Add post to queue via API
 */
async function addToQueue(post: QueuedPost, apiUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/api/linkedin/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to add to queue:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const specificArticle = args.find(arg => arg.startsWith('--article='))?.split('=')[1];
  const apiUrl = process.env.SITE_URL || 'http://localhost:4321';

  console.log('LinkedIn Auto-Queue Script');
  console.log('===========================');
  console.log(`API URL: ${apiUrl}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  if (specificArticle) {
    console.log(`Targeting: ${specificArticle}`);
  }
  console.log('');

  // Find articles directory
  const articlesDir = path.join(projectRoot, 'content', 'articles');
  if (!fs.existsSync(articlesDir)) {
    console.error(`Articles directory not found: ${articlesDir}`);
    process.exit(1);
  }

  // Get all article files
  const articleFiles = getArticleFiles(articlesDir);
  console.log(`Found ${articleFiles.length} article(s)\n`);

  let queued = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of articleFiles) {
    const parsed = parseArticle(filePath);
    if (!parsed) {
      errors++;
      continue;
    }

    const { shouldQueue, slug, frontmatter, content } = parsed;

    // Skip if specific article requested and this isn't it
    if (specificArticle && slug !== specificArticle) {
      continue;
    }

    if (!shouldQueue) {
      console.log(`⊘ ${slug}: autoPost not enabled, skipping`);
      skipped++;
      continue;
    }

    // Transform to LinkedIn post
    const linkedInText = transformArticleToLinkedIn(frontmatter, content, slug);

    if (linkedInText.length > 3000) {
      console.error(`✗ ${slug}: Post too long (${linkedInText.length} chars), skipping`);
      errors++;
      continue;
    }

    const post: QueuedPost = {
      articleSlug: slug,
      text: linkedInText,
      visibility: 'PUBLIC',
      scheduledTime: frontmatter.linkedin?.scheduledTime,
      maxAttempts: 3,
    };

    if (isDryRun) {
      console.log(`⊙ ${slug}: Would add to queue (${linkedInText.length} chars)`);
      if (frontmatter.linkedin?.scheduledTime) {
        console.log(`  Scheduled: ${frontmatter.linkedin.scheduledTime}`);
      }
    } else {
      const success = await addToQueue(post, apiUrl);
      if (success) {
        console.log(`✓ ${slug}: Added to queue (${linkedInText.length} chars)`);
        queued++;
      } else {
        console.error(`✗ ${slug}: Failed to add to queue`);
        errors++;
      }
    }
  }

  console.log('\n===========================');
  console.log(`Queued: ${queued}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
