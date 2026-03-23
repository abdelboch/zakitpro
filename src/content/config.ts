import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.string(),
    updatedAt: z.string().optional(),
    pillar: z.enum(['troubleshooting', 'scripting', 'deployment', 'security', 'packaging', 'career', 'ai']),
    difficulty: z.enum(['junior', 'mid', 'senior']),
    type: z.enum(['war-story', 'deep-dive', 'how-to', 'script-drop', 'error-reference', 'opinion', 'career-guide']),
    tags: z.array(z.string()).default([]),
    seriesId: z.string().optional(),
    seriesPart: z.number().optional(),
    draft: z.boolean().default(false)
  })
});

const scripts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    language: z.enum(['powershell', 'cmd', 'batch', 'registry']),
    pillar: z.enum(['troubleshooting', 'scripting', 'deployment', 'security', 'packaging', 'career', 'ai']),
    publishedAt: z.string(),
    draft: z.boolean().default(false)
  })
});

const series = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    publishedAt: z.string(),
    pillar: z.enum(['troubleshooting', 'scripting', 'deployment', 'security', 'packaging', 'career', 'ai'])
  })
});

const tools = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    category: z.enum(['docker', 'storage', 'monitoring', 'automation', 'media', 'backup', 'passwords', 'vpn', 'logging', 'documentation']),
    website: z.string().url(),
    github: z.string().url().optional(),
    stars: z.string().optional(),
    license: z.string().optional(),
    affiliateUrl: z.string().url().optional().or(z.literal('')),
    affiliateProgram: z.string().optional(),
    commission: z.string().optional(),
    selfHosted: z.boolean().default(true),
    publishedAt: z.string(),
    draft: z.boolean().default(false)
  })
});

export const collections = {
  articles,
  scripts,
  series,
  tools
};
