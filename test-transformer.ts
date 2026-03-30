/**
 * Test script for LinkedIn content transformer
 *
 * Usage: npx tsx test-transformer.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  transformArticleToLinkedIn,
  validatePostLength,
  previewPost,
  type ArticleFrontmatter
} from './src/lib/linkedin/transformer';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the existing article
const articlePath = path.join(__dirname, 'content/articles/ai-sccm-client-troubleshooting.mdx');
const articleContent = fs.readFileSync(articlePath, 'utf-8');

// Parse frontmatter (simple regex-based parser for testing)
const frontmatterMatch = articleContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!frontmatterMatch) {
  console.error('Failed to parse frontmatter');
  process.exit(1);
}

const frontmatterText = frontmatterMatch[1];
const content = frontmatterMatch[2];

// Parse YAML-like frontmatter (simplified)
const frontmatter: ArticleFrontmatter = {
  title: '',
  publishDate: '',
  tags: []
};

frontmatterText.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split(':');
  const value = valueParts.join(':').trim();

  if (key === 'title') {
    frontmatter.title = value.replace(/['"]/g, '');
  } else if (key === 'publishDate') {
    frontmatter.publishDate = value.replace(/['"]/g, '');
  } else if (key === 'description') {
    frontmatter.description = value.replace(/['"]/g, '');
  }
});

// Set article slug
const articleSlug = 'ai-sccm-client-troubleshooting';

console.log('='.repeat(60));
console.log('LINKEDIN CONTENT TRANSFORMER TEST');
console.log('='.repeat(60));
console.log('\nArticle:', frontmatter.title);
console.log('Slug:', articleSlug);
console.log('\n');

// Test 1: Auto-generated post (default)
console.log('TEST 1: Auto-generated post\n');
const post1 = transformArticleToLinkedIn(frontmatter, content, articleSlug);
console.log(previewPost(post1));

const validation1 = validatePostLength(post1.text);
console.log('\nValidation:');
console.log('- Valid:', validation1.valid);
if (validation1.errors.length > 0) {
  validation1.errors.forEach(err => console.log(`- ${err}`));
}

// Test 2: Custom text from frontmatter (simulated)
console.log('\n\n' + '='.repeat(60));
console.log('TEST 2: Custom LinkedIn text\n');

const customFrontmatter: ArticleFrontmatter = {
  ...frontmatter,
  linkedin: {
    customText: `Driver updates are one of the easiest ways to create a messy outage with a perfectly clean-looking approval record.

I just published a practical workflow on AI-assisted driver update approval review for desktop engineers.

The short version:
- gather the full driver packet first
- make AI compare old vs new metadata
- force AI to argue against the approval
- pilot by model family, not vibes
- write rollback notes before rollout

That is the difference between a controlled pilot and spending Friday afternoon chasing dock, Wi-Fi, or graphics issues.`,
    hashtags: ['DesktopEngineering', 'WindowsUpdate', 'Intune', 'EndpointManagement', 'AI', 'ITOps']
  }
};

const post2 = transformArticleToLinkedIn(customFrontmatter, content, articleSlug);
console.log(previewPost(post2));

const validation2 = validatePostLength(post2.text);
console.log('\nValidation:');
console.log('- Valid:', validation2.valid);
if (validation2.errors.length > 0) {
  validation2.errors.forEach(err => console.log(`- ${err}`));
}

// Test 3: Professional tone
console.log('\n\n' + '='.repeat(60));
console.log('TEST 3: Professional tone\n');

const post3 = transformArticleToLinkedIn(
  frontmatter,
  content,
  articleSlug,
  { tone: 'professional', maxLength: 800 }
);
console.log(previewPost(post3));

console.log('\n' + '='.repeat(60));
console.log('TESTS COMPLETE');
console.log('='.repeat(60));
