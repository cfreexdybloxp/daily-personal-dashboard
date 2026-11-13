import { WeatherData } from '../types';
import { fetchWeather } from '../api/weather';
import { StorageService } from '../services/storage';

export class WeatherWidget {
  private container: HTMLElement;
  private weatherData: WeatherData | null = null;
  private isLoading = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async load(force = false): Promise<void> {
    const prefs = StorageService.getPreferences();
    this.isLoading = true;
    this.render();

    try {
      this.weatherData = await fetchWeather(prefs.selectedCity, force);
    } catch (err) {
      console.error('Error cargando el clima:', err);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  public render(): void {
    if (this.isLoading && !this.weatherData) {
      this.container.innerHTML = `
        <div class="card">
          <div class="loading-box">
            <div class="spinner"></div>
            <span>Consultando Open-Meteo para el pronóstico...</span>
          </div>
        </div>
      `;
      return;
    }

    if (!this.weatherData) {
      this.container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <p>No se pudo obtener información del clima en este momento.</p>
            <button id="retry-weather-btn" class="secondary-btn" style="margin-top: 0.5rem;">Reintentar</button>
          </div>
        </div>
      `;
      this.container.querySelector('#retry-weather-btn')?.addEventListener('click', () => this.load(true));
      return;
    }

    const d = this.weatherData;
    const currentHour = new Date().getHours();

    // Determinar cuál es el momento actual
    // Mañana: 6 a 11, Mediodía: 11 a 15, Tarde: 15 a 19, Noche: 19 a 6
    const getActiveMoment = (hour: number) => {
      if (hour >= 6 && hour < 11) return 'Mañana';
      if (hour >= 11 && hour < 15) return 'Mediodía';
      if (hour >= 15 && hour < 19) return 'Tarde';
      return 'Noche';
    };
    const activeMoment = getActiveMoment(currentHour);

    this.container.innerHTML = `
      <div class="card weather-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-label">Pronóstico Meteorológico</span>
            ${d.isStale ? '<span class="stale-badge">Datos previos (offline)</span>' : ''}
          </div>
          <button id="refresh-weather-btn" class="card-action-btn" title="Actualizar clima">
            <span>${d.lastUpdated}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          </button>
        </div>

        <div class="weather-hero">
          <div class="weather-primary">
            <div class="weather-temp">${d.currentTemp}°</div>
            <div class="weather-temp-unit">C</div>
            <div class="weather-desc-box">
              <div class="weather-city-line">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${d.city.name}, ${d.city.country}</span>
              </div>
              <div class="weather-condition">${d.weatherDescription}</div>
            </div>
          </div>
          <div class="weather-icon-wrap">
            ${getWeatherSvg(d.weatherIcon)}
          </div>
        </div>

        <div class="weather-metrics">
          <div class="metric-item">
            <span class="metric-label">Sensación</span>
            <span class="metric-value">${d.apparentTemp}°C</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Máx / Mín</span>
            <span class="metric-value">${d.tempMax}° / ${d.tempMin}°</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Lluvia</span>
            <span class="metric-value">${d.precipitationProb}%</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Viento</span>
            <span class="metric-value">${d.windSpeed} km/h</span>
          </div>
        </div>

        <div class="weather-moments">
          ${d.moments.map(m => `
            <div class="moment-col ${m.timeLabel === activeMoment ? 'active' : ''}">
              <span class="moment-name">${m.timeLabel}</span>
              <div style="color: var(--accent); margin: 0.1rem 0;">
                ${getWeatherSvg(m.iconName, 18)}
              </div>
              <span class="moment-temp">${m.temperature}°</span>
              <span class="moment-precip">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                ${m.precipitationProbability}%
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelector('#refresh-weather-btn')?.addEventListener('click', () => {
      this.load(true);
    });
  }
}

function getWeatherSvg(iconName: string, size = 32): string {
  switch (iconName) {
    case 'sun':
    case 'sun-medium':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
    case 'cloud-sun':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`;
    case 'cloud-rain':
    case 'cloud-rain-wind':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m9.2 22 3-7"/><path d="m9 13-3 7"/><path d="m17 13-3 7"/></svg>`;
    case 'cloud-drizzle':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1"/><path d="M8 14v1"/><path d="M12 21v1"/><path d="M12 16v1"/><path d="M16 19v1"/><path d="M16 14v1"/></svg>`;
    case 'cloud-lightning':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>`;
    case 'snowflake':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/></svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
  }
}
