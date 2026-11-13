import { NewsCategory, NewsItem } from '../types';
import { StorageService } from '../services/storage';

const FALLBACK_FEEDS: Record<NewsCategory, { url: string; source: string; categoryLabel: string }> = {
  bolivia: {
    url: 'https://news.google.com/rss?hl=es-419&gl=BO&ceid=BO:es-419',
    source: 'Prensa Bolivia (Verificado)',
    categoryLabel: 'Bolivia y Local'
  },
  tech: {
    url: 'https://feeds.weblogssl.com/xataka2',
    source: 'Xataka',
    categoryLabel: 'Tecnología e IA'
  },
  world: {
    url: 'https://feeds.bbci.co.uk/mundo/rss.xml',
    source: 'BBC News Mundo',
    categoryLabel: 'Internacional'
  },
  science: {
    url: 'https://www.agenciasinc.es/esl/rss/feed/noticias',
    source: 'Agencia SINC',
    categoryLabel: 'Ciencia y Descubrimientos'
  },
  culture: {
    url: 'https://historia.nationalgeographic.com.es/medio/rss/historia.xml',
    source: 'National Geographic Historia',
    categoryLabel: 'Cultura y Curiosidades'
  }
};

export async function fetchNews(category: NewsCategory = 'bolivia', forceRefresh = false): Promise<NewsItem[]> {
  const cached = StorageService.getNewsCache();
  const TWENTY_MINUTES = 20 * 60 * 1000;

  if (!forceRefresh && cached && cached.items[category] && cached.items[category].length > 0 && Date.now() - cached.timestamp < TWENTY_MINUTES) {
    return cached.items[category];
  }

  // 1. Intentar primero con la API de Cloudflare Worker / Vite dev server
  try {
    const res = await fetch(`/api/news?category=${category}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        saveCategoryToCache(category, data.items);
        return data.items;
      }
    }
  } catch {
    // Continuar a los siguientes fallbacks
  }

  // 2. Respaldo vía rss2json (CORS abierto, alta compatibilidad en cliente)
  try {
    const feed = FALLBACK_FEEDS[category] || FALLBACK_FEEDS.bolivia;
    const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
    
    const res = await fetch(rss2jsonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
        const parsedItems: NewsItem[] = data.items.slice(0, 8).map((item: any, idx: number) => {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = item.description || item.title;
          const cleanSummary = (tempDiv.textContent || tempDiv.innerText || '').slice(0, 160).trim();

          return {
            id: `${category}-${idx}-${item.title.slice(0, 15)}`,
            title: item.title,
            summary: cleanSummary ? `${cleanSummary}...` : item.title,
            url: item.link,
            source: feed.source,
            category,
            categoryLabel: feed.categoryLabel,
            publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
          };
        });

        saveCategoryToCache(category, parsedItems);
        return parsedItems;
      }
    }
  } catch (err) {
    console.warn('Fallo en respaldo rss2json:', err);
  }

  // 3. Respaldo en caché previo
  if (cached && cached.items[category] && cached.items[category].length > 0) {
    return cached.items[category];
  }

  return [];
}

function saveCategoryToCache(category: NewsCategory, items: NewsItem[]) {
  const current = StorageService.getNewsCache() || { items: {}, timestamp: Date.now() };
  current.items[category] = items;
  current.timestamp = Date.now();
  StorageService.saveNewsCache(current.items);
}
