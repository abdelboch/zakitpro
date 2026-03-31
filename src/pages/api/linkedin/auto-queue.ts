/**
 * LinkedIn Auto-Queue API Endpoint
 *
 * POST /api/linkedin/auto-queue
 *
 * Scans articles for linkedin.autoPost: true and adds them to the queue.
 * This endpoint should be called by CI/CD after deployment or manually.
 *
 * Query parameters:
 * - article: Optional article slug to queue (e.g., ?article=ai-driver-update-review)
 * - dryRun: If true, don't actually queue posts (e.g., ?dryRun=true)
 *
 * Phase 2.3 - Automated Queueing
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { transformArticleToLinkedIn } from '../../../lib/linkedin/transformer';
import { MemoryQueueStorage } from '../../../lib/linkedin/queue';

// TODO: Replace MemoryQueueStorage with VercelKVQueueStorage in production
const queueStorage = new MemoryQueueStorage();

export const POST: APIRoute = async ({ url, request }) => {
  try {
    // Optional: Verify secret for security
    const secret = request.headers.get('x-auto-queue-secret');
    const expectedSecret = import.meta.env.AUTO_QUEUE_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid auto-queue secret',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const specificArticle = url.searchParams.get('article');
    const dryRun = url.searchParams.get('dryRun') === 'true';

    // Get all articles
    const allArticles = await getCollection('articles');

    let queued = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{ slug: string; status: string; message?: string }> = [];

    for (const article of allArticles) {
      const { slug, data } = article;

      // Skip if specific article requested and this isn't it
      if (specificArticle && slug !== specificArticle) {
        continue;
      }

      // Skip draft articles
      if (data.draft) {
        results.push({ slug, status: 'skipped', message: 'Draft article' });
        skipped++;
        continue;
      }

      // Skip if autoPost not enabled
      if (!data.linkedin?.autoPost) {
        results.push({ slug, status: 'skipped', message: 'autoPost not enabled' });
        skipped++;
        continue;
      }

      try {
        // Render article content
        const { Content } = await article.render();

        // Transform to LinkedIn post
        const linkedInPost = transformArticleToLinkedIn(
          {
            title: data.title,
            publishDate: data.publishedAt,
            tags: data.tags,
            linkedin: data.linkedin,
          },
          '', // We'll use the MDX content directly via transformer
          slug
        );

        // Validate length
        if (linkedInPost.text.length > 3000) {
          results.push({
            slug,
            status: 'error',
            message: `Post too long (${linkedInPost.text.length} chars)`,
          });
          errors++;
          continue;
        }

        if (dryRun) {
          results.push({
            slug,
            status: 'dry-run',
            message: `Would queue (${linkedInPost.text.length} chars)`,
          });
        } else {
          // Add to queue
          await queueStorage.addToQueue({
            articleSlug: slug,
            text: linkedInPost.text,
            visibility: 'PUBLIC',
            status: 'pending',
            scheduledTime: data.linkedin?.scheduledTime,
            maxAttempts: 3,
          });

          results.push({
            slug,
            status: 'queued',
            message: `Queued (${linkedInPost.text.length} chars)`,
          });
          queued++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          slug,
          status: 'error',
          message: errorMessage,
        });
        errors++;
      }
    }

    return new Response(JSON.stringify({
      success: errors === 0,
      dryRun,
      summary: {
        queued,
        skipped,
        errors,
        total: allArticles.length,
      },
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auto-queue error:', error);

    return new Response(JSON.stringify({
      error: 'Failed to process auto-queue',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
