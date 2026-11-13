import { FEED_REGISTRY, parseRssXml } from './newsAggregator';
import { sendWebPush, PushSubscriptionData, VapidKeys } from './webPush';
import { NewsCategory, NewsItem } from '../src/types';
import quotesData from '../src/data/quotes.json';

export interface Env {
  DAILY_KV?: KVNamespace;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

const DEFAULT_VAPID_KEYS = {
  // Par de claves VAPID generadas para desarrollo inicial (se pueden sobreescribir via wrangler secret)
  publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  privateKey: 'uu-v8G7v...placeholder...', // En producción se define en Cloudflare secrets
  subject: 'mailto:daily-admin@pagpersonal.local'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Obtener clave pública VAPID
      if (path === '/api/push/vapid-public-key') {
        const publicKey = env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_KEYS.publicKey;
        return new Response(JSON.stringify({ publicKey }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      // 2. Agregador de Noticias
      if (path === '/api/news') {
        const categoryParam = (url.searchParams.get('category') || 'bolivia') as NewsCategory;
        const feeds = FEED_REGISTRY[categoryParam] || FEED_REGISTRY.bolivia;

        // Intentar leer de caché KV si está disponible (15 minutos)
        const cacheKey = `NEWS_CACHE_${categoryParam}`;
        if (env.DAILY_KV) {
          const cachedNews = await env.DAILY_KV.get(cacheKey, 'json');
          if (cachedNews) {
            return new Response(JSON.stringify({ category: categoryParam, items: cachedNews }), {
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
            });
          }
        }

        const allItems: NewsItem[] = [];

        await Promise.allSettled(
          feeds.map(async feed => {
            try {
              const res = await fetch(feed.url, {
                headers: { 'User-Agent': 'DailyApp-NewsFetcher/1.0 (+https://github.com/)' }
              });
              if (res.ok) {
                const xmlText = await res.text();
                const parsed = parseRssXml(xmlText, feed.source, categoryParam, feed.categoryLabel);
                allItems.push(...parsed);
              }
            } catch (err) {
              console.error(`Error fetching feed ${feed.url}:`, err);
            }
          })
        );

        // Deduplicar por URL y título similar
        const seenUrls = new Set<string>();
        const uniqueItems = allItems.filter(item => {
          if (seenUrls.has(item.url)) return false;
          seenUrls.add(item.url);
          return true;
        });

        // Ordenar por fecha descendente y limitar a 8 noticias
        uniqueItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        const selectedItems = uniqueItems.slice(0, 8);

        // Guardar en KV si está disponible (expira en 15 minutos = 900s)
        if (env.DAILY_KV && selectedItems.length > 0) {
          await env.DAILY_KV.put(cacheKey, JSON.stringify(selectedItems), { expirationTtl: 900 });
        }

        return new Response(JSON.stringify({ category: categoryParam, items: selectedItems }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      // 3. Registrar suscripción Push
      if (path === '/api/push/subscribe' && request.method === 'POST') {
        const body = await request.json() as {
          subscription: PushSubscriptionData;
          settings?: { timezone?: string; morningTime?: string; middayTime?: string; eveningTime?: string };
        };

        if (!body.subscription || !body.subscription.endpoint) {
          return new Response(JSON.stringify({ error: 'Suscripción inválida' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }

        if (env.DAILY_KV) {
          const endpointHash = await hashString(body.subscription.endpoint);
          const record = {
            ...body.subscription,
            settings: body.settings || { timezone: 'America/La_Paz' },
            updatedAt: new Date().toISOString()
          };
          await env.DAILY_KV.put(`SUB:${endpointHash}`, JSON.stringify(record));
        }

        return new Response(JSON.stringify({ success: true, message: 'Suscripción registrada correctamente' }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      // 4. Enviar notificación de prueba
      if (path === '/api/push/test' && request.method === 'POST') {
        const body = await request.json() as { subscription: PushSubscriptionData };
        if (!body.subscription) {
          return new Response(JSON.stringify({ error: 'Falta objeto de suscripción' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }

        const vapid: VapidKeys = {
          publicKey: env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_KEYS.publicKey,
          privateKey: env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_KEYS.privateKey,
          subject: env.VAPID_SUBJECT || DEFAULT_VAPID_KEYS.subject
        };

        const testPayload = {
          title: 'Daily • Prueba de Notificación',
          body: '¡Tu dispositivo está configurado correctamente para recibir los resúmenes de Daily!',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: { url: '/', type: 'test' }
        };

        const pushRes = await sendWebPush(body.subscription, testPayload, vapid);

        return new Response(JSON.stringify({
          success: pushRes.ok,
          status: pushRes.status,
          statusText: pushRes.statusText
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  },

  // 5. Automatización con Cron Trigger
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    if (!env.DAILY_KV) return;

    const vapid: VapidKeys = {
      publicKey: env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_KEYS.publicKey,
      privateKey: env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_KEYS.privateKey,
      subject: env.VAPID_SUBJECT || DEFAULT_VAPID_KEYS.subject
    };

    // Listar todas las suscripciones almacenadas
    const list = await env.DAILY_KV.list({ prefix: 'SUB:' });
    const now = new Date();

    for (const key of list.keys) {
      const subRecord = await env.DAILY_KV.get(key.name, 'json') as any;
      if (!subRecord || !subRecord.endpoint) continue;

      const tz = subRecord.settings?.timezone || 'America/La_Paz';
      
      // Obtener hora actual en la zona horaria del usuario
      const timeInTz = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);

      const [currentHour, currentMin] = timeInTz.split(':').map(Number);
      const currentMinutesOfDay = currentHour * 60 + currentMin;

      // Comprobar horarios configurados (+/- 15 minutos)
      const morningTarget = parseTimeToMinutes(subRecord.settings?.morningTime || '07:00');
      const middayTarget = parseTimeToMinutes(subRecord.settings?.middayTime || '12:30');
      const eveningTarget = parseTimeToMinutes(subRecord.settings?.eveningTime || '19:00');

      let notificationType: 'morning' | 'midday' | 'evening' | null = null;

      if (Math.abs(currentMinutesOfDay - morningTarget) <= 15) {
        notificationType = 'morning';
      } else if (Math.abs(currentMinutesOfDay - middayTarget) <= 15) {
        notificationType = 'midday';
      } else if (Math.abs(currentMinutesOfDay - eveningTarget) <= 15) {
        notificationType = 'evening';
      }

      if (notificationType) {
        const payload = generateNotificationPayload(notificationType);
        try {
          await sendWebPush(subRecord, payload, vapid);
        } catch (e) {
          console.error(`Error enviando notificación push a ${key.name}:`, e);
        }
      }
    }
  }
};

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function generateNotificationPayload(type: 'morning' | 'midday' | 'evening') {
  const randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)];

  if (type === 'morning') {
    return {
      title: 'Daily • Resumen de la Mañana',
      body: `Buenos días. Clima actualizado en La Paz. Frase del día: "${randomQuote.author}: ${randomQuote.quote.slice(0, 70)}..."`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: '/', type: 'morning' }
    };
  } else if (type === 'midday') {
    return {
      title: 'Daily • Actualización del Mediodía',
      body: 'Consulta el clima de la tarde y las novedades destacadas de Bolivia y tecnología.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: '/', type: 'midday' }
    };
  } else {
    return {
      title: 'Daily • Resumen de la Tarde',
      body: 'Repasa los acontecimientos más relevantes del día y la idea para reflexionar.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: '/', type: 'evening' }
    };
  }
}

async function hashString(str: string): Promise<string> {
  const enc = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(hashBuf));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
