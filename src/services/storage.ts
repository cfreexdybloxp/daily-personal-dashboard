import { UserPreferences, WeatherData, NewsItem, CityLocation } from '../types';
import defaultCities from '../data/defaultCities.json';

const PREFERENCES_KEY = 'daily_user_preferences_v1';
const WEATHER_CACHE_KEY = 'daily_weather_cache_v1';
const NEWS_CACHE_KEY = 'daily_news_cache_v1';

export const defaultPreferences: UserPreferences = {
  selectedCity: (defaultCities[0] as CityLocation) || {
    id: 'lapaz',
    name: 'La Paz',
    country: 'Bolivia',
    latitude: -16.5000,
    longitude: -68.1500,
    elevation: 3640,
    timezone: 'America/La_Paz'
  },
  theme: 'purple-glass',
  notifications: {
    enabled: false,
    morningTime: '07:00',
    middayTime: '12:30',
    eveningTime: '19:00',
    morningEnabled: true,
    middayEnabled: true,
    eveningEnabled: true,
    selectedDays: [1, 2, 3, 4, 5, 6, 0], // Every day
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/La_Paz'
  },
  preferredCategories: ['bolivia', 'tech', 'world', 'science', 'culture'],
  enabledSections: {
    weather: true,
    quote: true,
    curiosity: true,
    news: true
  },
  savedArticles: []
};

export const StorageService = {
  getPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(PREFERENCES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...defaultPreferences,
          ...parsed,
          notifications: {
            ...defaultPreferences.notifications,
            ...(parsed.notifications || {})
          },
          enabledSections: {
            ...defaultPreferences.enabledSections,
            ...(parsed.enabledSections || {})
          }
        };
      }
    } catch (e) {
      console.warn('Error reading preferences from storage', e);
    }
    return defaultPreferences;
  },

  savePreferences(prefs: UserPreferences): void {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('Error saving preferences', e);
    }
  },

  getWeatherCache(): { data: WeatherData; timestamp: number } | null {
    try {
      const item = localStorage.getItem(WEATHER_CACHE_KEY);
      if (item) {
        return JSON.parse(item);
      }
    } catch (e) {
      console.warn('Error reading weather cache', e);
    }
    return null;
  },

  saveWeatherCache(data: WeatherData): void {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Error saving weather cache', e);
    }
  },

  getNewsCache(): { items: Record<string, NewsItem[]>; timestamp: number } | null {
    try {
      const item = localStorage.getItem(NEWS_CACHE_KEY);
      if (item) {
        return JSON.parse(item);
      }
    } catch (e) {
      console.warn('Error reading news cache', e);
    }
    return null;
  },

  saveNewsCache(items: Record<string, NewsItem[]>): void {
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
        items,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Error saving news cache', e);
    }
  },

  toggleSaveArticle(article: NewsItem): boolean {
    const prefs = this.getPreferences();
    const exists = prefs.savedArticles.some(a => a.id === article.id || a.url === article.url);
    if (exists) {
      prefs.savedArticles = prefs.savedArticles.filter(a => a.id !== article.id && a.url !== article.url);
    } else {
      prefs.savedArticles.unshift(article);
    }
    this.savePreferences(prefs);
    return !exists;
  },

  isArticleSaved(idOrUrl: string): boolean {
    const prefs = this.getPreferences();
    return prefs.savedArticles.some(a => a.id === idOrUrl || a.url === idOrUrl);
  }
};
