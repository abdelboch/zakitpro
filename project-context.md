# Zakitpro Project Context

**Last updated:** 2026-04-02

## Product Overview

Zakitpro.com is a technical blog for desktop engineers covering:
- **Microsoft Intune** (device management, Autopilot, conditional access)
- **Microsoft Entra ID** (identity, SSO, MFA, hybrid sync)
- **PowerShell** (automation, scripting, tooling)
- **Endpoint security** (compliance, threat protection, DLP)
- **AI tooling** (AI integration in IT workflows, productivity)
- **Career content** (11 AI certifications, IT career guidance)

**Content strategy:** SEO-driven technical tutorials + career guidance for desktop IT professionals

**Current stage:** Published blog with article library, automated publishing via Penny (cron agent), LinkedIn cross-posting via Linky (cron agent)

**Revenue goal:** Not primary revenue driver — supports personal brand, WorthApply credibility, consulting pipeline

## Technology Stack

### Frontend
- **Framework:** Astro + MDX
- **Styling:** Custom CSS
- **Deployment:** Vercel
- **Content:** MDX files in `/src/content/blog/`

### Build Pipeline
- **Content format:** MDX with YAML frontmatter
- **Build:** `npm run build`
- **Output:** `dist/`
- **Site generation:** Astro static site generation

### Automated Publishing
- **Penny** (blog publisher cron agent)
  - Researches topics from `/cron/zakitpro_published_topics.json`
  - Writes SEO-optimized MDX articles
  - Commits to GitHub
  - Cron: Tue/Thu 9 PM
  - Delivers to: abdelboch@gmail.com
  - Cron ID: b9c26724399c

- **Linky** (LinkedIn autoposter cron agent)
  - Converts articles to LinkedIn posts
  - Posts to https://linkedin.com/in/abderrazak-elbouchikhi/
  - Cron: M/W/F 8:15 PM
  - Delivers to: abdelboch@gmail.com
  - Cron ID: 929cfb99424e

## Content Structure

### Frontmatter Schema
```yaml
title: "Article Title"
slug: "article-slug"
description: "SEO description (150-160 chars)"
publishedAt: "YYYY-MM-DD"
pillar: "intune" | "entra-id" | "powershell" | "endpoint-security" | "ai-tooling" | "career"
difficulty: "beginner" | "intermediate" | "advanced"
type: "tutorial" | "guide" | "concept" | "troubleshooting" | "career"
tags: ["tag1", "tag2", "tag3"]
draft: false
```

### Pillar Content Areas
1. **Intune** — device management, Autopilot, compliance policies, app deployment
2. **Entra ID** — identity management, SSO, conditional access, RBAC
3. **PowerShell** — automation scripts, modules, best practices
4. **Endpoint Security** — threat protection, DLP, compliance
5. **AI Tooling** — AI in IT workflows, productivity tools
6. **Career** — certifications, skill development, career paths

### Published Topics Tracking
- **File:** `/cron/zakitpro_published_topics.json`
- **Purpose:** Prevents Penny from republishing same topics
- **Format:** Array of topic strings
- **Updated:** Automatically by Penny after each successful publish

## Design System

### Brand
- Professional IT/enterprise aesthetic
- Clean, readable, tutorial-focused
- Code syntax highlighting
- Technical diagrams/screenshots where helpful

### Typography
- Clear hierarchy for tutorials
- Code blocks with syntax highlighting
- Heading structure for scannability

## SEO Strategy

### Technical SEO
- Sitemap generated
- Robots.txt configured
- Meta tags per article
- Canonical URLs
- Structured data (Article schema)

### Content SEO
- **Long-tail keywords:** "how to configure Intune Autopilot", "PowerShell script for Entra ID sync"
- **Pillar pages** for each main topic area
- **Internal linking** between related articles
- **Code examples** for developer search intent

### Target Audience SEO
- Desktop engineers
- Intune/Entra ID administrators
- IT professionals transitioning to cloud/modern management
- People searching for specific error codes/troubleshooting

## Important Conventions

### Content Voice
- **Authoritative but approachable**
- **Tutorial-first** (step-by-step when applicable)
- **Assume intermediate IT knowledge** (not beginner-beginner)
- **Real-world context** (not just theory)

### Code Examples
- Always include working PowerShell examples
- Explain what each command does
- Include error handling where relevant
- Test scripts before publishing

### Publishing Workflow
1. Penny researches + writes article
2. Article committed to GitHub
3. Vercel auto-deploys
4. Linky converts to LinkedIn post
5. LinkedIn post published
6. Email confirmation sent

### Article Structure (Typical)
```
# Title (H1)

## Introduction
Brief context, what problem this solves

## Prerequisites
What reader needs to know/have first

## Step-by-Step Guide
### Step 1: ...
### Step 2: ...
(etc.)

## Common Issues & Troubleshooting
Known gotchas

## Conclusion
Recap + next steps
```

## Business Rules

### Content Ownership
- All content is original
- Code examples are tested/working
- No plagiarism/copying from official docs
- Proper attribution when referencing external sources

### Automation Boundaries
- **Penny writes drafts** — human reviews before major policy/security topics
- **Linky autoposts** — LinkedIn posts are auto-published (monitor for tone/errors)
- **Topics vetted** — published topics list prevents duplication

### Career Content
- 11 AI certifications documented at `/career/`
- Certifications are real/verified
- Career advice based on real IT experience (20+ years)

## Deployment

- **Platform:** Vercel
- **GitHub repo:** zakopenc/zakitpro
- **Branch:** main auto-deploys
- **Build command:** `npm run build`
- **Output directory:** `dist/`
- **Framework preset:** Astro

### Vercel Configuration
- **Framework:** Astro
- **Root directory:** blank (repo root)
- **Build command:** `npm run build`
- **Output directory:** `dist`

### Environment Variables
None required (static site, no APIs)

## Automated Agents

### Penny (Blog Publisher)
- **Purpose:** Autonomous blog content creation
- **Cron schedule:** Tue/Thu 9 PM
- **Skill:** `zakitpro-blog-publisher`
- **Process:**
  1. Load published topics from `/cron/zakitpro_published_topics.json`
  2. Research new topic in target pillar areas
  3. Write SEO-optimized MDX article with proper frontmatter
  4. Commit to GitHub
  5. Update published topics JSON
  6. Email confirmation

### Linky (LinkedIn Autoposter)
- **Purpose:** Convert articles to LinkedIn posts
- **Cron schedule:** M/W/F 8:15 PM
- **Skill:** `linkedin-article-post-publisher`
- **LinkedIn profile:** https://linkedin.com/in/abderrazak-elbouchikhi/
- **Process:**
  1. Find recent zakitpro articles
  2. Convert to LinkedIn post format
  3. Post via LinkedIn OAuth API
  4. Email confirmation

### Email Confirmations
- **Recipient:** abdelboch@gmail.com
- **Purpose:** Verify cron jobs ran successfully
- **Alerts:** Email notification on failure

## Known Issues / Tech Debt

1. **No analytics configured** — can't see which articles get traffic
2. **No search functionality** — readers can't search blog
3. **Limited multimedia** — most articles are text-only (opportunity for screenshots/diagrams)
4. **No newsletter** — could capture email subscribers for recurring traffic
5. **No comments** — no reader engagement/questions capture

## AI Agent Guidelines

### When working on Zakitpro:

1. **Content creation:** Use Penny skill or follow Penny's patterns (SEO-optimized, tutorial-focused)
2. **LinkedIn posts:** Use Linky skill or LinkedIn OAuth posting workflow
3. **New articles:** Always update `/cron/zakitpro_published_topics.json`
4. **Code examples:** Test PowerShell scripts before publishing
5. **Frontmatter:** Follow exact schema (required fields, valid enum values)

### Before publishing articles:
- Check `/cron/zakitpro_published_topics.json` to avoid duplication
- Verify frontmatter is complete and valid
- Ensure pillar/difficulty/type are correct
- Add 3-5 relevant tags
- Set `draft: false` when ready to publish

### SEO guidelines:
- Title: 50-60 chars, keyword-front-loaded
- Description: 150-160 chars, includes primary keyword
- Slug: lowercase, hyphens, includes keyword
- Internal links to related articles
- H2/H3 structure for scannability

### Career content:
- Real certifications only
- Link to credential verification where possible
- Practical advice based on real experience
- Frame AI certs as skill validation, not just resume padding

## Testing

- **Manual review** of Penny-generated articles recommended for:
  - Security/compliance topics
  - Breaking changes to Microsoft products
  - High-stakes troubleshooting advice
- **LinkedIn posts:** Monitor first few auto-posts to ensure tone/formatting is good
- **Build verification:** `npm run build` should pass before merge

## Contact / Ownership

- **Owner:** Zak (abdelboch@gmail.com)
- **GitHub:** zakopenc/zakitpro
- **Live site:** https://zakitpro.com
- **LinkedIn:** https://linkedin.com/in/abderrazak-elbouchikhi/
- **Automated agents:** Penny (blog), Linky (LinkedIn)

## Integration with Other Projects

- **WorthApply:** Zakitpro establishes IT credibility → increases trust for WorthApply
- **Career content:** 11 AI certifications showcased at WorthApply `/career/` page
- **Cross-linking:** Career advice articles can link to WorthApply for job search tools
- **SEO synergy:** IT professional audience may overlap with job search audience
