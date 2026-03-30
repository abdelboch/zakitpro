# LinkedIn Integration

This directory contains the LinkedIn API integration for automated content posting from zakitpro.com articles.

## Architecture

```
linkedin/
├── transformer.ts    # Content transformation (blog → LinkedIn)
├── auth.ts          # OAuth2 authentication (TODO)
├── client.ts        # LinkedIn API wrapper (TODO)
└── templates.ts     # Post templates (TODO)
```

## Content Transformer

The `transformer.ts` module converts blog articles (MDX) into LinkedIn-optimized posts.

### Features

- **Auto-generation**: Extracts key points and creates engaging LinkedIn posts
- **Custom text**: Supports custom LinkedIn text via frontmatter
- **Character limits**: Respects LinkedIn's 3000 char limit, targets 1300 for engagement
- **Hashtag extraction**: Converts article tags to LinkedIn hashtags
- **Validation**: Checks post length and provides warnings

### Usage

#### Basic Transformation

```typescript
import { transformArticleToLinkedIn } from './transformer';

const post = transformArticleToLinkedIn(
  frontmatter,  // Article frontmatter with title, date, etc.
  content,      // Article MDX content
  'article-slug' // URL slug
);

console.log(post.text);
console.log(`Characters: ${post.characterCount}/3000`);
```

#### Custom LinkedIn Text (Frontmatter)

Add LinkedIn metadata to your article frontmatter:

```yaml
---
title: "Your Article Title"
publishDate: 2026-03-30
linkedin:
  autoPost: false
  customText: |
    Your custom LinkedIn post text here.

    This will be used instead of auto-generation.
  hashtags: ["DesktopEngineering", "ITOps", "AI"]
---
```

#### Test the Transformer

```bash
npx tsx test-transformer.ts
```

This will test the transformer with the existing article and show preview output.

### LinkedIn Post Format

Generated posts follow this structure:

```
[Hook - attention-grabbing first paragraph]

[Key points - bulleted list if available]

[Call-to-action with article link]

[Hashtags]
```

**Example output:**

```
Driver updates are one of the easiest ways to create a messy outage.

I just published a practical workflow on AI-assisted driver update approval.

The short version:
- gather the full driver packet first
- make AI compare old vs new metadata
- force AI to argue against the approval

Full article: https://zakitpro.com/articles/ai-driver-update-review

#DesktopEngineering #WindowsUpdate #Intune #AI
```

### Character Limits

- **LinkedIn limit**: 3000 characters (hard limit)
- **Recommended**: 1300 characters (better engagement)
- **Transformer default**: Targets 1300 characters

### Hashtag Rules

- **Maximum**: 5 hashtags (LinkedIn best practice: 3-5)
- **Format**: Removes spaces and special characters
- **Priority**: Use `linkedin.hashtags` from frontmatter, otherwise convert from article `tags`

### Transformation Logic

1. **Check for custom text**: If `linkedin.customText` exists in frontmatter, use it
2. **Extract hook**: Find the first substantial paragraph (problem statement)
3. **Extract key points**: Look for bullet points or numbered lists
4. **Build CTA**: Add article link with clear call-to-action
5. **Add hashtags**: Convert tags or use custom hashtags
6. **Validate**: Check character count and warn if > 1300 chars

### Options

```typescript
interface TransformOptions {
  maxLength?: number;         // Default: 1300
  includeHashtags?: boolean;  // Default: true
  includeUrl?: boolean;       // Default: true
  tone?: 'professional' | 'conversational'; // Default: 'conversational'
}
```

### Validation

```typescript
import { validatePostLength } from './transformer';

const validation = validatePostLength(post.text);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

**Validation checks:**
- Empty post detection
- 3000 character hard limit
- 1300 character soft limit (warning)

### Preview

```typescript
import { previewPost } from './transformer';

console.log(previewPost(post));
```

**Output:**

```
┌─────────────────────────────────────────────┐
│ LinkedIn Post Preview                       │
│ Characters: 705/3000 (✓)                   │
└─────────────────────────────────────────────┘

[Post text here...]

─────────────────────────────────────────────
Hashtags: DesktopEngineering, ITOps, AI
Article URL: https://zakitpro.com/articles/your-article
─────────────────────────────────────────────
```

## LinkedIn API Integration (TODO)

### Authentication (auth.ts)

OAuth 2.0 implementation for LinkedIn API access.

**Planned features:**
- 3-legged OAuth flow
- Token storage in Vercel KV
- Automatic token refresh
- Scope: `w_member_social` for posting

### API Client (client.ts)

LinkedIn API wrapper with rate limiting and error handling.

**Planned features:**
- POST /rest/posts endpoint
- Rate limiting (100 posts/day)
- Retry logic with exponential backoff
- Error handling and logging

### Templates (templates.ts)

Reusable LinkedIn post templates.

**Planned templates:**
- Article announcement
- Quick tip
- Series post
- Poll/question

## Workflow

### Manual Posting (Current)

1. Write article in MDX
2. Run transformer: `npx tsx test-transformer.ts`
3. Copy generated LinkedIn text
4. Paste into LinkedIn manually

### Automated Posting (Phase 2 - In Progress)

1. Write article with `linkedin` frontmatter
2. Push to main branch
3. CI/CD builds and deploys
4. If `autoPost: true`, article is queued for LinkedIn
5. Cron job processes queue and posts via API
6. Confirmation notification sent

### Approval Workflow (Phase 2 - Planned)

1. Write article with `autoPost: false` (default)
2. Push to main
3. System generates LinkedIn draft
4. Admin reviews at `/admin/linkedin/queue`
5. Click "Approve" to post
6. Posted to LinkedIn with confirmation

## Configuration

### Frontmatter Schema

```yaml
---
title: string (required)
publishDate: string (required, YYYY-MM-DD)
description: string (optional, for SEO)
tags: string[] (optional, converted to hashtags)
linkedin:
  autoPost: boolean (default: false)
  scheduledTime: string (optional, ISO 8601 format)
  customText: string (optional, overrides auto-generation)
  hashtags: string[] (optional, overrides tag conversion)
---
```

### Environment Variables (Phase 2)

```bash
# LinkedIn OAuth2
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://zakitpro.com/api/linkedin/callback

# Vercel KV (for token storage and queue)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
```

## Testing

### Unit Tests (TODO)

```bash
npm test src/lib/linkedin/transformer.test.ts
```

### Integration Tests (TODO)

```bash
npm test src/lib/linkedin/integration.test.ts
```

### Manual Testing

```bash
# Test transformer
npx tsx test-transformer.ts

# Test with different articles
npx tsx test-transformer.ts content/articles/your-article.mdx

# Test LinkedIn API (when implemented)
npx tsx test-linkedin-api.ts
```

## Roadmap

### Phase 2.1: Content Transformation ✅ COMPLETE
- [x] Transformer implementation
- [x] Frontmatter schema
- [x] Character limit handling
- [x] Hashtag extraction
- [x] Validation
- [x] Preview functionality
- [x] Test script

### Phase 2.2: LinkedIn API (In Progress)
- [ ] OAuth2 authentication flow
- [ ] Token storage (Vercel KV)
- [ ] LinkedIn API client
- [ ] Posts API integration
- [ ] Rate limiting
- [ ] Error handling

### Phase 2.3: Automation (Planned)
- [ ] Queue system (Vercel KV)
- [ ] Cron job for processing queue
- [ ] Automated posting on git push
- [ ] Admin dashboard
- [ ] Manual approval workflow

### Phase 2.4: Monitoring (Planned)
- [ ] Post success/failure tracking
- [ ] LinkedIn analytics integration
- [ ] Error notifications
- [ ] Weekly metrics report

## Troubleshooting

### Transformer generates short posts

**Cause:** Article doesn't have bullet points or clear structure.

**Solution:**
- Add bullet points or numbered lists to your article
- Or provide custom LinkedIn text in frontmatter

### Post exceeds 1300 characters

**Cause:** Too many bullet points or verbose hook.

**Solution:**
- Use `maxLength` option: `transformArticleToLinkedIn(frontmatter, content, slug, { maxLength: 800 })`
- Provide custom text in frontmatter
- Simplify article structure

### Hashtags not appearing

**Cause:** No tags in frontmatter.

**Solution:**
- Add `tags: ["tag1", "tag2"]` to frontmatter
- Or add `linkedin.hashtags` for custom hashtags

## Resources

- [LinkedIn Marketing API Docs](https://learn.microsoft.com/en-us/linkedin/marketing/)
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- [LinkedIn OAuth 2.0](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)

---

**Status:** Phase 2.1 Complete - Transformer ready for testing
**Next:** Phase 2.2 - LinkedIn API OAuth implementation
