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
      this.applyWeatherAttribute();
    } catch (err) {
      console.error('Error cargando el clima:', err);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private applyWeatherAttribute(): void {
    if (!this.weatherData) return;
    const code = this.weatherData.weatherCode;
    let state = 'clouds';
    if (code === 0 || code === 1) state = 'clear';
    else if (code >= 51 && code <= 99) state = 'rain';
    document.body.setAttribute('data-weather', state);
  }

  public render(): void {
    if (this.isLoading && !this.weatherData) {
      this.container.innerHTML = `
        <div class="card weather-card">
          <div class="loading-box">
            <div class="spinner"></div>
            <span>Conectando con Open-Meteo...</span>
          </div>
        </div>
      `;
      return;
    }

    if (!this.weatherData) {
      this.container.innerHTML = `
        <div class="card weather-card">
          <div class="empty-state">
            <p>No se pudo sincronizar la información del clima.</p>
            <button id="retry-weather-btn" class="secondary-btn" style="margin-top: 0.6rem;">Reintentar</button>
          </div>
        </div>
      `;
      this.container.querySelector('#retry-weather-btn')?.addEventListener('click', () => this.load(true));
      return;
    }

    const d = this.weatherData;
    const currentHour = new Date().getHours();

    // Saludo dinámico según hora del día
    let greeting = 'Buenos días';
    let greetingIcon = '☀️';
    if (currentHour >= 12 && currentHour < 19) {
      greeting = 'Buenas tardes';
      greetingIcon = '🌤️';
    } else if (currentHour >= 19 || currentHour < 6) {
      greeting = 'Buenas noches';
      greetingIcon = '🌙';
    }

    // Consejo contextual vivo según clima
    let weatherAdvice = '✨ Jornada serena para avanzar';
    if (d.precipitationProb >= 60) {
      weatherAdvice = '☔ Alta probabilidad de lluvia, lleva paraguas';
    } else if (d.currentTemp <= 9) {
      weatherAdvice = '🧣 Frío andino en La Paz, buen momento para abrigo';
    } else if (d.weatherCode <= 1 && currentHour >= 6 && currentHour < 18) {
      weatherAdvice = '☀️ Día despejado, aprovecha la luz natural matutina';
    }

    const getActiveMoment = (hour: number) => {
      if (hour >= 6 && hour < 11) return 'Mañana';
      if (hour >= 11 && hour < 15) return 'Mediodía';
      if (hour >= 15 && hour < 19) return 'Tarde';
      return 'Noche';
    };
    const activeMoment = getActiveMoment(currentHour);

    this.container.innerHTML = `
      <div class="card weather-card">
        <!-- Saludo Personal y Ubicación -->
        <div class="weather-greeting-bar">
          <div class="weather-greeting">
            <span>${greetingIcon}</span>
            <span>${greeting}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <div class="weather-city-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${d.city.name}</span>
            </div>

            <button id="refresh-weather-btn" class="card-action-btn" title="Actualizar clima">
              <span>${d.lastUpdated}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            </button>
          </div>
        </div>

        ${d.isStale ? '<div style="text-align: center; margin-bottom: 0.4rem;"><span style="background: rgba(251, 191, 36, 0.2); color: #fde047; font-weight: 700; padding: 0.15rem 0.55rem; border-radius: 99px; font-size: 0.65rem;">● Modo Offline (Datos Previos)</span></div>' : ''}

        <!-- Héroe Central -->
        <div class="weather-hero-center">
          <div class="weather-icon-giant">
            ${renderWeatherIllustration(d.weatherCode)}
          </div>

          <div class="weather-temp-giant">
            <span>${d.currentTemp}</span>
            <span class="weather-temp-symbol">°</span>
          </div>

          <div class="weather-condition-badge">
            ${d.weatherDescription}
          </div>

          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 0.1rem;">
            Máx: ${d.tempMax}° • Mín: ${d.tempMin}°
          </div>

          <!-- Píldora de Consejo Vivo -->
          <div class="weather-advice-pill">
            <span>${weatherAdvice}</span>
          </div>
        </div>

        <!-- Pastilla de 3 Métricas Flotantes -->
        <div class="weather-metrics-pill-container">
          <div class="weather-metric-col">
            <div class="metric-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </div>
            <span class="metric-val">${d.precipitationProb}%</span>
            <span class="metric-sub">Lluvia</span>
          </div>

          <div class="weather-metric-col">
            <div class="metric-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
            </div>
            <span class="metric-val">${d.apparentTemp}°C</span>
            <span class="metric-sub">Sensación</span>
          </div>

          <div class="weather-metric-col">
            <div class="metric-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
            </div>
            <span class="metric-val">${d.windSpeed} km/h</span>
            <span class="metric-sub">Viento</span>
          </div>
        </div>

        <!-- 4 Momentos del Día -->
        <div>
          <div class="weather-moments-title">
            <span>Pronóstico del Día</span>
            <span style="font-size: 0.65rem; font-weight: 500;">4 Fases</span>
          </div>

          <div class="weather-moments">
            ${d.moments.map(m => `
              <div class="moment-col ${m.timeLabel === activeMoment ? 'active' : ''}">
                <span class="moment-name">${m.timeLabel}</span>
                <div style="margin: 0.1rem 0;">
                  ${renderSmallMomentSvg(m.iconName)}
                </div>
                <span class="moment-temp">${m.temperature}°</span>
                <span class="moment-precip">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                  ${m.precipitationProbability}%
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#refresh-weather-btn')?.addEventListener('click', () => {
      this.load(true);
    });
  }
}

function renderWeatherIllustration(code: number): string {
  const isNight = new Date().getHours() >= 19 || new Date().getHours() < 6;

  // Lluvia o Chubascos
  if (code >= 51 && code <= 99) {
    return `
      <svg width="74" height="74" viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
            <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0.85" />
          </linearGradient>
          <linearGradient id="rainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#67e8f9" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>
        <path d="M38 72 L32 84" stroke="url(#rainGrad)" stroke-width="4" stroke-linecap="round" />
        <path d="M52 74 L46 86" stroke="url(#rainGrad)" stroke-width="4" stroke-linecap="round" />
        <path d="M66 72 L60 84" stroke="url(#rainGrad)" stroke-width="4" stroke-linecap="round" />
        <path d="M32 66 C22 66 14 58 14 48 C14 39 20 32 29 30 C32 18 43 10 56 10 C70 10 81 20 83 34 C89 36 94 42 94 50 C94 59 86 66 76 66 Z" fill="url(#cloudGrad)" />
        <circle cx="34" cy="44" r="10" fill="#ffffff" opacity="0.35" />
      </svg>
    `;
  }

  // Despejado
  if (code === 0 || code === 1) {
    if (isNight) {
      return `
        <svg width="74" height="74" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a" />
              <stop offset="100%" stop-color="#f59e0b" />
            </linearGradient>
          </defs>
          <path d="M64 22 C45 23 30 38 30 58 C30 76 43 90 60 92 C42 90 28 75 28 56 C28 37 42 22 64 22 Z" fill="url(#moonGrad)" />
          <circle cx="75" cy="35" r="2.2" fill="#ffffff" opacity="0.9" />
          <circle cx="82" cy="55" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="22" cy="30" r="1.8" fill="#ffffff" opacity="0.8" />
        </svg>
      `;
    }
    return `
      <svg width="74" height="74" viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="50%" stop-color="#fbbf24" />
            <stop offset="100%" stop-color="#f59e0b" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="24" fill="url(#sunGrad)" />
      </svg>
    `;
  }

  // Nublado
  return `
    <svg width="74" height="74" viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="sunPartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
        <linearGradient id="cloudVolume" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96" />
          <stop offset="100%" stop-color="#e2e8f0" stop-opacity="0.85" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="34" r="16" fill="url(#sunPartGrad)" />
      <path d="M30 66 C20 66 12 58 12 48 C12 39 18 32 27 30 C30 18 41 10 54 10 C68 10 79 20 81 34 C87 36 92 42 92 50 C92 59 84 66 74 66 Z" fill="url(#cloudVolume)" />
      <circle cx="34" cy="44" r="9" fill="#ffffff" opacity="0.4" />
    </svg>
  `;
}

function renderSmallMomentSvg(iconName: string): string {
  switch (iconName) {
    case 'sun':
    case 'sun-medium':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" stroke-width="2.2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
    case 'cloud-rain':
    case 'cloud-rain-wind':
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2.2"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m9.2 22 3-7"/><path d="m9 13-3 7"/><path d="m17 13-3 7"/></svg>`;
    default:
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 0 1 0 9Z"/></svg>`;
  }
}
