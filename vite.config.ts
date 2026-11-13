import { defineConfig } from 'vite';
import { FEED_REGISTRY, parseRssXml } from './worker/newsAggregator';
import { NewsCategory } from './src/types';

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  plugins: [
    {
      name: 'daily-dev-news-api',
      configureServer(server) {
        server.middlewares.use('/api/news', async (req, res) => {
          handleNewsRequest(req, res);
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/news', async (req, res) => {
          handleNewsRequest(req, res);
        });
      }
    }
  ]
});

async function handleNewsRequest(req: any, res: any) {
  try {
    const url = new URL(req.url, 'http://localhost:3000');
    const categoryParam = (url.searchParams.get('category') || 'bolivia') as NewsCategory;
    const feeds = FEED_REGISTRY[categoryParam] || FEED_REGISTRY.bolivia;

    const allItems: any[] = [];
    await Promise.allSettled(
      feeds.map(async feed => {
        try {
          const feedRes = await fetch(feed.url, {
            headers: { 'User-Agent': 'DailyApp-Local/1.0' }
          });
          if (feedRes.ok) {
            const xmlText = await feedRes.text();
            const parsed = parseRssXml(xmlText, feed.source, categoryParam, feed.categoryLabel);
            allItems.push(...parsed);
          }
        } catch (e) {
          console.error('Error fetching feed in dev proxy:', feed.url, e);
        }
      })
    );

    const seenUrls = new Set<string>();
    const unique = allItems.filter(item => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const selected = unique.slice(0, 8);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ category: categoryParam, items: selected }));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
}
