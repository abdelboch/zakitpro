# zakitpro.com

IT Desktop Engineering blog featuring technical articles, PowerShell scripts, and career guides.

🌐 **Live Site:** [zakitpro.com](https://zakitpro.com)

## Features

- ⚡ **Fast**: Built with Astro for optimal performance
- 🎨 **Modern Design**: Tailwind CSS for responsive, clean UI
- 📝 **MDX Content**: Rich markdown with React components
- 🔍 **Search**: Pagefind integration for fast, client-side search
- 🤖 **CI/CD**: Automated deployment via GitHub Actions
- 🔗 **LinkedIn Integration**: Auto-post articles to LinkedIn (coming soon)
- 📊 **Analytics**: Privacy-friendly analytics with Plausible (planned)

## Tech Stack

- **Framework:** [Astro 5.x](https://astro.build)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **Content:** MDX with frontmatter
- **Search:** [Pagefind](https://pagefind.app)
- **Hosting:** [Vercel](https://vercel.com)
- **CI/CD:** GitHub Actions

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/zakopenc/zakitpro.git
cd zakitpro

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:4321
```

### Project Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview production build locally |

## Publishing Content

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the complete content publishing workflow.

### Quick Publish

1. Create article in `content/articles/my-article.mdx`
2. Add frontmatter:
   ```yaml
   ---
   title: "Article Title"
   publishDate: 2026-03-30
   description: "Brief description"
   tags: ["tag1", "tag2"]
   ---
   ```
3. Write content in markdown/MDX
4. Push to `main` branch
5. Automated deployment handles the rest!

## CI/CD Pipeline

Automated workflows handle validation, building, and deployment:

- **Push to `main`**: Validates → Builds → Deploys to production
- **Pull Requests**: Validates → Builds → Deploys to preview environment

### Setup GitHub Actions

Follow [.github/SETUP.md](./.github/SETUP.md) to configure:
- Vercel deployment credentials
- GitHub secrets
- Workflow permissions

## Project Structure

```
zakitpro/
├── content/
│   └── articles/           # Blog articles (MDX files)
├── src/
│   ├── components/         # Reusable components
│   ├── layouts/            # Page layouts
│   ├── pages/              # Routes and pages
│   ├── lib/                # Utility functions
│   │   └── linkedin/       # LinkedIn integration (planned)
│   └── styles/             # Global styles
├── public/                 # Static assets (images, fonts, etc.)
├── .github/
│   ├── workflows/          # CI/CD pipeline definitions
│   └── SETUP.md            # GitHub Actions setup guide
├── astro.config.mjs        # Astro configuration
├── tailwind.config.mjs     # Tailwind configuration
├── package.json            # Dependencies and scripts
├── CONTRIBUTING.md         # Content publishing guide
└── README.md               # This file
```

## Content Guidelines

### Article Frontmatter

Required fields:
```yaml
---
title: "Your Article Title"
publishDate: 2026-03-30
---
```

Recommended fields:
```yaml
---
title: "Your Article Title"
publishDate: 2026-03-30
description: "SEO-friendly description (150-160 chars)"
tags: ["Desktop Engineering", "PowerShell", "Windows"]
---
```

### LinkedIn Integration (Coming Soon)

Optional frontmatter for LinkedIn auto-posting:
```yaml
---
linkedin:
  autoPost: false              # Enable auto-posting
  scheduledTime: "2026-03-30T10:00:00Z"  # When to post
  customText: "Custom LinkedIn post text"
  hashtags: ["DesktopEngineering", "ITOps"]
---
```

## Roadmap

### ✅ Phase 1: Foundation (Complete)
- [x] Astro site setup
- [x] Tailwind CSS styling
- [x] MDX content system
- [x] Vercel hosting
- [x] Search functionality
- [x] CI/CD pipeline

### 🚧 Phase 2: LinkedIn Integration (In Progress)
- [ ] LinkedIn OAuth2 authentication
- [ ] Content transformer (blog → LinkedIn)
- [ ] Automated posting queue
- [ ] Admin dashboard

### 📋 Phase 3: Content Pipeline (Planned)
- [ ] Content validation improvements
- [ ] Staging environment
- [ ] Preview system for LinkedIn posts

### 📊 Phase 4: Analytics & Monitoring (Planned)
- [ ] Plausible Analytics integration
- [ ] Sentry error tracking
- [ ] Performance monitoring
- [ ] Weekly metrics reports

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test locally: `npm run dev`
5. Commit with descriptive message
6. Push and create a Pull Request

## License

© 2026 zakitpro.com - All rights reserved

## Support

- **Issues:** [GitHub Issues](https://github.com/zakopenc/zakitpro/issues)
- **Discussions:** [GitHub Discussions](https://github.com/zakopenc/zakitpro/discussions)

---

Built with ❤️ using [Astro](https://astro.build) and automated with [Paperclip](https://paperclip.ing)
