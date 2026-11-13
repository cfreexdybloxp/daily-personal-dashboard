import { CityLocation, WeatherData, DayMomentForecast } from '../types';
import { StorageService } from '../services/storage';

export function interpretWeatherCode(code: number): { description: string; icon: string } {
  switch (code) {
    case 0:
      return { description: 'Cielo despejado', icon: 'sun' };
    case 1:
      return { description: 'Mayormente soleado', icon: 'sun-medium' };
    case 2:
      return { description: 'Parcialmente nublado', icon: 'cloud-sun' };
    case 3:
      return { description: 'Nublado', icon: 'cloud' };
    case 45:
    case 48:
      return { description: 'Niebla / Neblina', icon: 'cloud-fog' };
    case 51:
    case 53:
    case 55:
      return { description: 'Llovizna ligera', icon: 'cloud-drizzle' };
    case 61:
    case 63:
    case 65:
      return { description: 'Lluvia', icon: 'cloud-rain' };
    case 71:
    case 73:
    case 75:
      return { description: 'Nevada', icon: 'snowflake' };
    case 80:
    case 81:
    case 82:
      return { description: 'Chubascos', icon: 'cloud-rain-wind' };
    case 95:
    case 96:
    case 99:
      return { description: 'Tormenta eléctrica', icon: 'cloud-lightning' };
    default:
      return { description: 'Variable', icon: 'cloud' };
  }
}

export async function fetchWeather(city: CityLocation, forceRefresh = false): Promise<WeatherData> {
  const cached = StorageService.getWeatherCache();
  const ONE_HOUR = 60 * 60 * 1000;

  // Si tenemos caché reciente y es la misma ciudad y no se fuerza refresco
  if (
    !forceRefresh &&
    cached &&
    cached.data.city.id === city.id &&
    Date.now() - cached.timestamp < ONE_HOUR
  ) {
    return cached.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const data = await response.json();

    const currentTemp = Math.round(data.current?.temperature_2m ?? 0);
    const apparentTemp = Math.round(data.current?.apparent_temperature ?? currentTemp);
    const tempMax = Math.round(data.daily?.temperature_2m_max?.[0] ?? currentTemp);
    const tempMin = Math.round(data.daily?.temperature_2m_min?.[0] ?? currentTemp);
    const precipitationProb = data.hourly?.precipitation_probability?.[new Date().getHours()] ?? Math.round((data.current?.precipitation || 0) * 10);
    const windSpeed = Math.round(data.current?.wind_speed_10m ?? 0);
    const weatherCode = data.current?.weather_code ?? 0;
    const { description: weatherDescription, icon: weatherIcon } = interpretWeatherCode(weatherCode);

    // Calcular los 4 momentos del día: Mañana (08:00), Mediodía (12:00), Tarde (16:00), Noche (20:00)
    const momentsConfig: Array<{ label: 'Mañana' | 'Mediodía' | 'Tarde' | 'Noche'; hour: number }> = [
      { label: 'Mañana', hour: 8 },
      { label: 'Mediodía', hour: 12 },
      { label: 'Tarde', hour: 16 },
      { label: 'Noche', hour: 20 }
    ];

    const moments: DayMomentForecast[] = momentsConfig.map(m => {
      const temp = Math.round(data.hourly?.temperature_2m?.[m.hour] ?? currentTemp);
      const appTemp = Math.round(data.hourly?.apparent_temperature?.[m.hour] ?? temp);
      const code = data.hourly?.weather_code?.[m.hour] ?? weatherCode;
      const precip = Math.round(data.hourly?.precipitation_probability?.[m.hour] ?? 0);
      const { description, icon } = interpretWeatherCode(code);

      return {
        timeLabel: m.label,
        hour: m.hour,
        temperature: temp,
        apparentTemperature: appTemp,
        weatherCode: code,
        description,
        precipitationProbability: precip,
        iconName: icon
      };
    });

    const now = new Date();
    const formattedDate = new Intl.DateTimeFormat('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    const weatherResult: WeatherData = {
      city,
      currentTemp,
      apparentTemp,
      tempMax,
      tempMin,
      precipitationProb,
      windSpeed,
      weatherCode,
      weatherDescription,
      weatherIcon,
      moments,
      lastUpdated: formattedDate,
      isStale: false
    };

    StorageService.saveWeatherCache(weatherResult);
    return weatherResult;
  } catch (err) {
    console.warn('Fallo al obtener datos meteorológicos de Open-Meteo, revisando caché:', err);

    // Si falló pero tenemos datos en caché, devolverlos indicando que están obsoletos
    if (cached) {
      return {
        ...cached.data,
        isStale: true
      };
    }

    throw new Error('No se pudo conectar con el servicio meteorológico ni se cuenta con datos previos.');
  }
}
