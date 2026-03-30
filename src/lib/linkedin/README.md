# LinkedIn Integration

This directory contains the LinkedIn API integration for automated content posting from zakitpro.com articles.

## Architecture

```
linkedin/
├── transformer.ts    # Content transformation (blog → LinkedIn) ✅
├── auth.ts          # OAuth2 authentication ✅
├── client.ts        # LinkedIn API wrapper ✅
└── templates.ts     # Post templates (TODO)
```

**API Routes:**
```
src/pages/api/linkedin/
├── auth.ts          # OAuth authorization redirect ✅
├── callback.ts      # OAuth callback handler ✅
├── post.ts          # Create LinkedIn post ✅
└── status.ts        # Check auth status ✅
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

## OAuth2 Authentication

The `auth.ts` module handles LinkedIn OAuth 2.0 authentication.

### Features

- **3-legged OAuth flow**: Authorization code grant
- **Token storage**: Interface for Vercel KV or in-memory storage
- **Token management**: Automatic expiry checking
- **Secure**: CSRF protection with state parameter
- **Scopes**: `w_member_social`, `openid`, `profile`

### Usage

#### Initialize Auth Client

```typescript
import { createLinkedInAuth, MemoryTokenStorage } from './auth';

// Development (in-memory)
const storage = new MemoryTokenStorage();
const auth = createLinkedInAuth(storage);

// Production (Vercel KV)
import { kv } from '@vercel/kv';
import { VercelKVTokenStorage } from './auth';

const storage = new VercelKVTokenStorage(kv);
const auth = createLinkedInAuth(storage);
```

#### OAuth Flow

```typescript
// 1. Redirect to LinkedIn authorization
const authUrl = auth.getAuthorizationUrl(state);
// Redirect user to authUrl

// 2. Handle callback (in API route)
const tokens = await auth.exchangeCodeForToken(code);
// Tokens are automatically stored

// 3. Check authentication
const isAuth = await auth.isAuthenticated();

// 4. Get access token
const token = await auth.getAccessToken();
```

#### Token Management

```typescript
// Check token expiry
const expiry = await auth.getTokenExpiry();
if (expiry) {
  console.log(`Token expires in ${expiry.expiresInSeconds}s`);
  console.log(`Token expires at ${new Date(expiry.expiresAt)}`);
}

// Logout (revoke tokens)
await auth.revokeTokens();
```

### API Routes

**Initiate OAuth:**
```
GET /api/linkedin/auth
```
Redirects to LinkedIn authorization page.

**OAuth Callback:**
```
GET /api/linkedin/callback?code=...&state=...
```
Exchanges authorization code for access token.

**Check Status:**
```
GET /api/linkedin/status
```
Returns authentication status and token info.

## LinkedIn API Client

The `client.ts` module provides a wrapper for the LinkedIn Posts API.

### Features

- **Posts API**: Create, read, delete posts
- **Rate limiting**: Tracks and respects 100 posts/day limit
- **Retry logic**: Exponential backoff on failures
- **Error handling**: Typed errors with status codes
- **Auto-authentication**: Uses OAuth tokens from auth module

### Usage

#### Initialize Client

```typescript
import { createLinkedInClient } from './client';
import { createLinkedInAuth, MemoryTokenStorage } from './auth';

const auth = createLinkedInAuth(new MemoryTokenStorage());
const client = createLinkedInClient(auth);
```

#### Create a Post

```typescript
// Simple text post
const post = await client.postText('Hello LinkedIn!', 'PUBLIC');
console.log('Posted:', post.id);

// With retry
const post = await client.postTextWithRetry('Important update!');
```

#### Get Profile

```typescript
const profile = await client.getProfile();
console.log('User:', profile.name);
console.log('LinkedIn ID:', profile.sub);
```

#### Check Rate Limits

```typescript
const rateLimit = client.getRateLimitInfo();
console.log(`Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);

if (client.isApproachingRateLimit(10)) {
  console.warn('Approaching rate limit!');
}
```

#### Error Handling

```typescript
import { LinkedInAPIError } from './client';

try {
  await client.postText('...');
} catch (error) {
  if (error instanceof LinkedInAPIError) {
    console.error(`API Error ${error.status}:`, error.message);
  }
}
```

### API Routes

**Create Post:**
```
POST /api/linkedin/post
Body: { text: string, visibility?: 'PUBLIC' | 'CONNECTIONS' }
```

Example:
```bash
curl -X POST http://localhost:4321/api/linkedin/post \
  -H 'Content-Type: application/json' \
  -d '{"text": "Hello from zakitpro.com!"}'
```

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

### Phase 2.2: LinkedIn API ✅ COMPLETE
- [x] OAuth2 authentication flow
- [x] Token storage (Vercel KV interface)
- [x] LinkedIn API client
- [x] Posts API integration
- [x] Rate limiting
- [x] Error handling
- [x] API routes (auth, callback, post, status)

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
