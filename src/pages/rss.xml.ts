import { getCollection } from 'astro:content';

export async function GET() {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  
  // Sort by date, take 20 most recent
  const sortedArticles = articles
    .sort((a, b) => new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime())
    .slice(0, 20);

  const pillarNames = {
    troubleshooting: 'Windows Troubleshooting',
    scripting: 'Scripting & Automation',
    deployment: 'Deployment & Imaging',
    security: 'Endpoint Security',
    packaging: 'App Packaging',
    career: 'Career & Craft',
  ai: 'AI-Augmented Engineering'
  };

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>zakitpro - IT Desktop Engineering Blog</title>
    <link>https://zakitpro.com</link>
    <description>Technical articles, PowerShell scripts, and career guides for endpoint engineers</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://zakitpro.com/rss.xml" rel="self" type="application/rss+xml"/>
    ${sortedArticles.map(article => `
    <item>
      <title><![CDATA[${article.data.title}]]></title>
      <link>https://zakitpro.com/${article.data.pillar}/${article.slug}/</link>
      <guid isPermaLink="true">https://zakitpro.com/${article.data.pillar}/${article.slug}/</guid>
      <description><![CDATA[${article.data.description}]]></description>
      <pubDate>${new Date(article.data.publishedAt).toUTCString()}</pubDate>
      <category>${pillarNames[article.data.pillar]}</category>
    </item>
    `).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=0, s-maxage=3600'
    }
  });
}
