# Contributing to zakitpro.com

This document describes the workflow for publishing content to zakitpro.com.

## Table of Contents

- [Quick Start](#quick-start)
- [Content Publishing Workflow](#content-publishing-workflow)
- [Article Structure](#article-structure)
- [LinkedIn Integration](#linkedin-integration)
- [Development](#development)
- [CI/CD Pipeline](#cicd-pipeline)

## Quick Start

### Publishing a New Article

1. **Create a new MDX file** in `content/articles/`:
   ```bash
   touch content/articles/my-new-article.mdx
   ```

2. **Add frontmatter and content**:
   ```mdx
   ---
   title: "Your Article Title"
   publishDate: 2026-03-30
   description: "Brief description for SEO and previews"
   tags: ["tag1", "tag2"]
   linkedin:
     autoPost: false
     scheduledTime: "2026-03-30T10:00:00Z"
     customText: "Optional custom LinkedIn post text"
     hashtags: ["DesktopEngineering", "ITOps"]
   ---

   Your article content here...
   ```

3. **Test locally**:
   ```bash
   npm run dev
   # Visit http://localhost:4321
   ```

4. **Commit and push** to trigger deployment:
   ```bash
   git add content/articles/my-new-article.mdx
   git commit -m "Add article: Your Article Title

   Co-Authored-By: Paperclip <noreply@paperclip.ing>"
   git push origin main
   ```

5. **Automated deployment** will:
   - Validate your MDX syntax
   - Check frontmatter fields
   - Build the site
   - Deploy to production (zakitpro.com)
   - Process LinkedIn integration (if enabled)

## Content Publishing Workflow

### Option 1: Direct to Main (Simple Changes)

For minor edits and urgent fixes:

```bash
git checkout main
git pull
# Make your changes
git add .
git commit -m "Brief description of changes

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
git push origin main
```

**Automated actions:**
- GitHub Actions validates content
- Builds the site
- Deploys to production
- Processes LinkedIn queue

### Option 2: Pull Request Workflow (Recommended for Articles)

For new articles or significant changes:

1. **Create a feature branch**:
   ```bash
   git checkout -b article/my-topic
   ```

2. **Write your article** in `content/articles/`

3. **Commit your changes**:
   ```bash
   git add content/articles/my-article.mdx
   git commit -m "Draft: My Article Title

   Co-Authored-By: Paperclip <noreply@paperclip.ing>"
   ```

4. **Push and create PR**:
   ```bash
   git push origin article/my-topic
   # Then create PR on GitHub
   ```

5. **Review preview deployment**:
   - GitHub Actions will comment with preview URL
   - Preview updates automatically with new commits

6. **Merge when ready**:
   - Click "Merge pull request" on GitHub
   - Automatic deployment to production follows

## Article Structure

### Required Frontmatter Fields

```yaml
---
title: "Article Title"           # Required
publishDate: YYYY-MM-DD           # Required
description: "SEO description"    # Recommended
tags: ["tag1", "tag2"]           # Optional
---
```

### LinkedIn Integration Fields (Optional)

```yaml
---
linkedin:
  autoPost: true|false            # Auto-post to LinkedIn?
  scheduledTime: "ISO 8601"       # When to post (optional)
  customText: "Text override"     # Custom LinkedIn text
  hashtags: ["Tag1", "Tag2"]      # LinkedIn hashtags
---
```

**LinkedIn Posting Behavior:**
- `autoPost: false` (default): Generate draft, await manual approval
- `autoPost: true`: Automatically post to LinkedIn at `scheduledTime`
- If `scheduledTime` is omitted: Post immediately after deployment

### Article Content Best Practices

```mdx
---
title: "How to Use AI for Driver Update Review"
publishDate: 2026-03-30
description: "A practical workflow for AI-assisted driver update approval"
tags: ["Windows", "Intune", "AI"]
linkedin:
  autoPost: false
  hashtags: ["DesktopEngineering", "WindowsUpdate", "Intune"]
---

# How to Use AI for Driver Update Review

Driver updates are one of the easiest ways to create a messy outage...

## The Problem

[Your content here...]

## The Solution

[Your content here...]

## Code Examples

\`\`\`powershell
# Your PowerShell code
Get-DriverUpdate | Where-Object { $_.Version -gt "1.0" }
\`\`\`

## Conclusion

[Your conclusion...]
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
zakitpro/
├── content/
│   └── articles/           # Blog articles (MDX)
├── src/
│   ├── components/         # Astro/React components
│   ├── layouts/            # Page layouts
│   ├── pages/              # Routes
│   ├── lib/                # Utilities
│   │   └── linkedin/       # LinkedIn integration
│   └── styles/             # Global styles
├── public/                 # Static assets
└── .github/
    └── workflows/          # CI/CD pipelines
```

## CI/CD Pipeline

### Main Branch Deployment (`deploy.yml`)

**Triggers:** Push to `main` branch

**Steps:**
1. **Validate Content**
   - Lint MDX files
   - Validate frontmatter schema
   - Check for required fields

2. **Build**
   - Install dependencies
   - Run Astro build
   - Generate search index (Pagefind)

3. **Deploy**
   - Deploy to Vercel production
   - Invalidate CDN cache

4. **Notify**
   - Send failure notifications (if configured)

### PR Preview Deployment (`pr-preview.yml`)

**Triggers:** Pull request opened/updated

**Steps:**
1. **Validate Changes**
   - Lint MDX
   - Build preview
   - Check for broken links

2. **Deploy Preview**
   - Deploy to Vercel preview environment
   - Comment preview URL on PR

**Preview URL format:** `pr-[NUMBER].zakitpro.com` or auto-generated Vercel URL

### Required GitHub Secrets

To enable automated deployment, configure these secrets in GitHub repository settings:

1. `VERCEL_TOKEN` - Vercel authentication token
2. `VERCEL_ORG_ID` - Vercel organization ID
3. `VERCEL_PROJECT_ID` - Vercel project ID

**How to get these values:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
cd /path/to/zakitpro
vercel link

# Get org and project IDs
cat .vercel/project.json
```

Copy the values to GitHub Settings → Secrets and variables → Actions → New repository secret.

## LinkedIn Integration

### Manual Approval Workflow (Default)

1. Push article with `linkedin.autoPost: false`
2. CI/CD generates LinkedIn draft
3. Review draft at `/admin/linkedin/queue`
4. Approve or edit before posting
5. Manual click to publish

### Automated Posting

1. Set `linkedin.autoPost: true` in frontmatter
2. Push to main
3. Article queued for posting
4. Posted automatically at `scheduledTime`
5. Notification sent on success/failure

### Custom LinkedIn Text

By default, LinkedIn posts are auto-generated from article content. To customize:

```yaml
---
linkedin:
  customText: |
    Driver updates are one of the easiest ways to create a messy outage.

    I just published a practical workflow on AI-assisted driver update approval.

    Full article: https://zakitpro.com/articles/ai-driver-update-review

    #DesktopEngineering #WindowsUpdate #Intune
  hashtags: ["DesktopEngineering", "WindowsUpdate", "Intune"]
---
```

## Troubleshooting

### Build Fails: MDX Syntax Error

**Error:** `[MDX] Unexpected character...`

**Solution:** Check your MDX file for:
- Unescaped `{` or `}` characters
- Unclosed JSX tags
- Invalid frontmatter YAML

### Build Fails: Missing Frontmatter

**Error:** `Missing required field 'title'`

**Solution:** Ensure all articles have required frontmatter:
```yaml
---
title: "Your Title"
publishDate: 2026-03-30
---
```

### Deployment Fails

**Error:** `Vercel deployment failed`

**Solution:**
1. Check GitHub Actions logs
2. Verify `VERCEL_*` secrets are set correctly
3. Ensure Vercel project is linked

### LinkedIn Post Not Queued

**Check:**
1. Is `linkedin.autoPost` set in frontmatter?
2. Are LinkedIn credentials configured?
3. Check `/admin/linkedin/logs` for errors

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review this documentation
3. Contact CTO or create GitHub issue

---

**Last Updated:** 2026-03-30
**Maintained by:** CTO (Paperclip Agent)
