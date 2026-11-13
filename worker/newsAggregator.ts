import { NewsCategory, NewsItem } from '../src/types';

export const FEED_REGISTRY: Record<NewsCategory, Array<{ url: string; source: string; categoryLabel: string }>> = {
  bolivia: [
    {
      url: 'https://news.google.com/rss?hl=es-419&gl=BO&ceid=BO:es-419',
      source: 'Prensa Bolivia (Agregador Verificado)',
      categoryLabel: 'Bolivia y Local'
    },
    {
      url: 'https://www.lostiempos.com/rss/ultimas-noticias',
      source: 'Los Tiempos',
      categoryLabel: 'Bolivia y Local'
    }
  ],
  tech: [
    {
      url: 'https://feeds.weblogssl.com/xataka2',
      source: 'Xataka',
      categoryLabel: 'Tecnología e IA'
    },
    {
      url: 'https://feeds.weblogssl.com/genbeta',
      source: 'Genbeta',
      categoryLabel: 'Tecnología e IA'
    },
    {
      url: 'https://es.wired.com/feed/rss',
      source: 'Wired en Español',
      categoryLabel: 'Tecnología e IA'
    }
  ],
  world: [
    {
      url: 'https://feeds.bbci.co.uk/mundo/rss.xml',
      source: 'BBC News Mundo',
      categoryLabel: 'Internacional'
    },
    {
      url: 'https://rss.dw.com/rdf/rss-sp-all',
      source: 'Deutsche Welle (DW)',
      categoryLabel: 'Internacional'
    }
  ],
  science: [
    {
      url: 'https://www.agenciasinc.es/esl/rss/feed/noticias',
      source: 'Agencia SINC',
      categoryLabel: 'Ciencia y Descubrimientos'
    },
    {
      url: 'https://www.nationalgeographic.com.es/medio/rss/ciencia.xml',
      source: 'National Geographic Ciencia',
      categoryLabel: 'Ciencia y Descubrimientos'
    }
  ],
  culture: [
    {
      url: 'https://historia.nationalgeographic.com.es/medio/rss/historia.xml',
      source: 'National Geographic Historia',
      categoryLabel: 'Cultura y Curiosidades'
    },
    {
      url: 'https://letraslibres.com/feed/',
      source: 'Letras Libres',
      categoryLabel: 'Cultura y Curiosidades'
    }
  ]
};

// Parser XML ligero y robusto para Cloudflare Workers / Edge Runtime
export function parseRssXml(xmlText: string, defaultSource: string, category: NewsCategory, categoryLabel: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  // Extraer bloques <item> o <entry>
  const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
  const matches = xmlText.match(itemRegex) || [];

  for (const rawItem of matches) {
    const title = extractXmlTag(rawItem, 'title');
    let link = extractXmlTag(rawItem, 'link');
    if (!link) {
      // Buscar href en formato Atom: <link href="..." />
      const hrefMatch = rawItem.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (hrefMatch) link = hrefMatch[1];
    }

    const description = extractXmlTag(rawItem, 'description') || extractXmlTag(rawItem, 'summary') || extractXmlTag(rawItem, 'content');
    const pubDateStr = extractXmlTag(rawItem, 'pubDate') || extractXmlTag(rawItem, 'published') || extractXmlTag(rawItem, 'dc:date');
    const updatedStr = extractXmlTag(rawItem, 'updated') || extractXmlTag(rawItem, 'atom:updated');

    // Intentar extraer fuente si viene indicada en la etiqueta <source>
    const specificSource = extractXmlTag(rawItem, 'source') || defaultSource;

    if (title && link) {
      const cleanTitle = cleanHtmlText(title);
      const cleanSummary = cleanHtmlText(description || cleanTitle).slice(0, 180);

      // Normalizar fecha
      let parsedDate = new Date();
      if (pubDateStr) {
        const d = new Date(pubDateStr);
        if (!isNaN(d.getTime())) parsedDate = d;
      }

      const id = generateHash(`${link}-${cleanTitle}`);

      items.push({
        id,
        title: cleanTitle,
        summary: cleanSummary ? `${cleanSummary}${cleanSummary.length >= 180 ? '...' : ''}` : cleanTitle,
        url: link.trim(),
        source: cleanHtmlText(specificSource),
        category,
        categoryLabel,
        publishedAt: parsedDate.toISOString(),
        updatedAt: updatedStr ? new Date(updatedStr).toISOString() : undefined
      });
    }
  }

  return items;
}

function extractXmlTag(xml: string, tag: string): string {
  // Manejar CDATA y etiquetas simples
  const regex = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/(?:[a-zA-Z0-9]+:)?${tag}>`, 'i');
  const match = xml.match(regex);
  if (match) {
    return (match[1] || match[2] || '').trim();
  }
  return '';
}

function cleanHtmlText(str: string): string {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '') // Eliminar tags HTML
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
