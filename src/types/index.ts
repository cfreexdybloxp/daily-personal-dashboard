export interface CityLocation {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
}

export interface DayMomentForecast {
  timeLabel: 'Mañana' | 'Mediodía' | 'Tarde' | 'Noche';
  hour: number;
  temperature: number;
  apparentTemperature?: number;
  weatherCode: number;
  description: string;
  precipitationProbability: number;
  iconName: string;
}

export interface WeatherData {
  city: CityLocation;
  currentTemp: number;
  apparentTemp: number;
  tempMax: number;
  tempMin: number;
  precipitationProb: number;
  windSpeed: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  moments: DayMomentForecast[];
  lastUpdated: string;
  isStale?: boolean;
}

export type NewsCategory = 'bolivia' | 'tech' | 'world' | 'science' | 'culture';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: NewsCategory;
  categoryLabel: string;
  publishedAt: string;
  updatedAt?: string;
  imageUrl?: string;
}

export interface PhilosophicalQuote {
  id: number;
  author: string;
  work: string;
  source: string;
  quote: string;
  reflection: string;
}

export interface DailyCuriosity {
  id: number;
  title: string;
  category: string;
  explanation: string;
  source: string;
}

export interface NotificationSettings {
  enabled: boolean;
  morningTime: string; // "07:00"
  middayTime: string;  // "12:30"
  eveningTime: string; // "19:00"
  morningEnabled: boolean;
  middayEnabled: boolean;
  eveningEnabled: boolean;
  selectedDays: number[]; // [0,1,2,3,4,5,6] (0 = Sunday)
  timezone: string;
}

export type AppTheme = 'purple-glass' | 'dynamic-blue' | 'dynamic-night';

export interface UserPreferences {
  selectedCity: CityLocation;
  theme: AppTheme;
  notifications: NotificationSettings;
  preferredCategories: NewsCategory[];
  enabledSections: {
    weather: boolean;
    quote: boolean;
    curiosity: boolean;
    news: boolean;
  };
  savedArticles: NewsItem[];
}
