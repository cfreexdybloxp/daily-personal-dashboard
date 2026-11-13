import { StorageService } from '../services/storage';
import { subscribeToPush, sendTestNotification, getNotificationPermission, isPushSupported } from '../api/push';
import defaultCities from '../data/defaultCities.json';
import { CityLocation, AppTheme } from '../types';

export class SettingsModal {
  private overlay: HTMLElement;
  private onPreferencesUpdated: () => void;

  constructor(overlay: HTMLElement, onPreferencesUpdated: () => void) {
    this.overlay = overlay;
    this.onPreferencesUpdated = onPreferencesUpdated;
  }

  public open(): void {
    this.render();
    this.overlay.classList.add('open');
  }

  public close(): void {
    this.overlay.classList.remove('open');
  }

  public render(): void {
    const prefs = StorageService.getPreferences();
    const permStatus = getNotificationPermission();
    const pushSupported = isPushSupported();

    this.overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-header">
          <div class="modal-title">Configuración & Personalización</div>
          <button id="close-settings-btn" class="icon-btn" title="Cerrar ajustes">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Selector de Tema Visual -->
        <div class="setting-group">
          <label class="setting-label">Atmósfera y Tema Visual</label>
          <div class="theme-options-grid">
            <div class="theme-card-option ${prefs.theme === 'purple-glass' ? 'active' : ''}" data-theme-val="purple-glass">
              <div class="theme-swatch" style="background: linear-gradient(135deg, #7c3aed, #8b5cf6);"></div>
              <span style="font-size: 0.75rem; font-weight: 700;">Púrpura Glass</span>
              <span style="font-size: 0.65rem; color: var(--text-muted);">Estilo Mockup</span>
            </div>

            <div class="theme-card-option ${prefs.theme === 'dynamic-blue' ? 'active' : ''}" data-theme-val="dynamic-blue">
              <div class="theme-swatch" style="background: linear-gradient(135deg, #0284c7, #38bdf8);"></div>
              <span style="font-size: 0.75rem; font-weight: 700;">Azul Cielo</span>
              <span style="font-size: 0.65rem; color: var(--text-muted);">Reactivo al Clima</span>
            </div>

            <div class="theme-card-option ${prefs.theme === 'dynamic-night' ? 'active' : ''}" data-theme-val="dynamic-night">
              <div class="theme-swatch" style="background: linear-gradient(135deg, #0f172a, #1e293b);"></div>
              <span style="font-size: 0.75rem; font-weight: 700;">Noche Zafiro</span>
              <span style="font-size: 0.65rem; color: var(--text-muted);">Cielo Nocturno</span>
            </div>
          </div>
        </div>

        <!-- Ciudad Meteorológica -->
        <div class="setting-group">
          <label class="setting-label">Ubicación del Clima</label>
          <select id="city-select" class="setting-select">
            ${defaultCities.map(c => `
              <option value="${c.id}" ${prefs.selectedCity.id === c.id ? 'selected' : ''}>
                ${c.name}, ${c.country} (${c.elevation ? c.elevation + ' m' : ''})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Sistema de Notificaciones Web Push -->
        <div class="setting-group" style="border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 1rem; background: rgba(255, 255, 255, 0.08);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span style="font-weight: 800; font-size: 0.88rem;">Notificaciones Push Automáticas</span>
            </div>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${permStatus === 'granted' ? '#4ade80' : permStatus === 'denied' ? '#f87171' : 'var(--text-muted)'};">
              ${permStatus === 'granted' ? '● Activas' : permStatus === 'denied' ? '● Bloqueadas' : '○ No configuradas'}
            </span>
          </div>

          <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.85rem;">
            Avisos reales en segundo plano desde el servidor Cloudflare, incluso con la aplicación cerrada.
          </p>

          ${!pushSupported ? `
            <div style="font-size: 0.75rem; color: #f87171; background: rgba(239, 68, 68, 0.15); padding: 0.5rem; border-radius: 8px;">
              Este navegador no soporta Web Push. En Android, utiliza Google Chrome o Samsung Internet.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              <button id="enable-push-btn" class="${permStatus === 'granted' ? 'secondary-btn' : 'primary-btn'}">
                ${permStatus === 'granted' ? 'Renovar Permisos de Notificación' : 'Activar Notificaciones en mi Teléfono'}
              </button>

              <button id="test-push-btn" class="secondary-btn" ${permStatus !== 'granted' ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                <span>Enviar Notificación de Prueba</span>
              </button>
            </div>
          `}

          <!-- Horarios de los 3 Avisos -->
          <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <span style="font-size: 0.76rem; font-weight: 800; color: #ffffff;">Horarios de Resumen Diario:</span>
            
            <div class="setting-control-row">
              <span style="font-size: 0.8rem;">Mañana (Clima + Titular + Frase)</span>
              <input type="time" id="morning-time-input" value="${prefs.notifications.morningTime}" style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; padding: 0.25rem 0.5rem; border-radius: 6px;">
            </div>

            <div class="setting-control-row">
              <span style="font-size: 0.8rem;">Mediodía (Pronóstico + Novedades)</span>
              <input type="time" id="midday-time-input" value="${prefs.notifications.middayTime}" style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; padding: 0.25rem 0.5rem; border-radius: 6px;">
            </div>

            <div class="setting-control-row">
              <span style="font-size: 0.8rem;">Tarde (Resumen del Día + Idea)</span>
              <input type="time" id="evening-time-input" value="${prefs.notifications.eveningTime}" style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; padding: 0.25rem 0.5rem; border-radius: 6px;">
            </div>
          </div>

          <div id="push-status-msg" style="margin-top: 0.6rem; font-size: 0.75rem; min-height: 18px;"></div>
        </div>

        <!-- Módulos Visibles -->
        <div class="setting-group">
          <label class="setting-label">Módulos en Pantalla Principal</label>
          <div style="display: flex; flex-direction: column; gap: 0.45rem;">
            <label class="setting-control-row">
              <span>Clima y Pronóstico 4 Momentos</span>
              <input type="checkbox" id="toggle-weather" ${prefs.enabledSections.weather ? 'checked' : ''}>
            </label>
            <label class="setting-control-row">
              <span>Pensamiento Filosófico del Día</span>
              <input type="checkbox" id="toggle-quote" ${prefs.enabledSections.quote ? 'checked' : ''}>
            </label>
            <label class="setting-control-row">
              <span>Una Idea para Hoy</span>
              <input type="checkbox" id="toggle-curiosity" ${prefs.enabledSections.curiosity ? 'checked' : ''}>
            </label>
            <label class="setting-control-row">
              <span>Noticias Seleccionadas</span>
              <input type="checkbox" id="toggle-news" ${prefs.enabledSections.news ? 'checked' : ''}>
            </label>
          </div>
        </div>

        <!-- Limpiar Caché -->
        <div style="margin-top: 1rem;">
          <button id="clear-cache-btn" class="secondary-btn" style="width: 100%;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            <span>Limpiar Caché y Forzar Sincronización</span>
          </button>
        </div>
      </div>
    `;

    // Event listeners
    this.overlay.querySelector('#close-settings-btn')?.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Cambio de tema
    this.overlay.querySelectorAll('.theme-card-option').forEach(card => {
      card.addEventListener('click', (e) => {
        const themeVal = (e.currentTarget as HTMLElement).getAttribute('data-theme-val') as AppTheme;
        if (themeVal) {
          const currentPrefs = StorageService.getPreferences();
          currentPrefs.theme = themeVal;
          StorageService.savePreferences(currentPrefs);
          document.body.setAttribute('data-theme', themeVal);
          this.render();
          this.onPreferencesUpdated();
        }
      });
    });

    // Cambio de ciudad
    this.overlay.querySelector('#city-select')?.addEventListener('change', (e) => {
      const cityId = (e.target as HTMLSelectElement).value;
      const selected = defaultCities.find(c => c.id === cityId);
      if (selected) {
        const currentPrefs = StorageService.getPreferences();
        currentPrefs.selectedCity = selected as CityLocation;
        StorageService.savePreferences(currentPrefs);
        this.onPreferencesUpdated();
      }
    });

    // Activar Push
    this.overlay.querySelector('#enable-push-btn')?.addEventListener('click', async () => {
      const statusEl = this.overlay.querySelector('#push-status-msg');
      if (statusEl) statusEl.innerHTML = '<span style="color: var(--accent);">Configurando suscripción...</span>';
      
      const res = await subscribeToPush();
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: ${res.success ? '#4ade80' : '#f87171'};">${res.message}</span>`;
      }
      setTimeout(() => this.render(), 1500);
    });

    // Prueba de Push
    this.overlay.querySelector('#test-push-btn')?.addEventListener('click', async () => {
      const statusEl = this.overlay.querySelector('#push-status-msg');
      if (statusEl) statusEl.innerHTML = '<span style="color: var(--accent);">Enviando notificación de prueba...</span>';
      
      const res = await sendTestNotification();
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: ${res.success ? '#4ade80' : '#f87171'};">${res.message}</span>`;
      }
    });

    // Horarios
    const saveTimes = () => {
      const morningVal = (this.overlay.querySelector('#morning-time-input') as HTMLInputElement)?.value;
      const middayVal = (this.overlay.querySelector('#midday-time-input') as HTMLInputElement)?.value;
      const eveningVal = (this.overlay.querySelector('#evening-time-input') as HTMLInputElement)?.value;

      const currentPrefs = StorageService.getPreferences();
      if (morningVal) currentPrefs.notifications.morningTime = morningVal;
      if (middayVal) currentPrefs.notifications.middayTime = middayVal;
      if (eveningVal) currentPrefs.notifications.eveningTime = eveningVal;
      StorageService.savePreferences(currentPrefs);
    };

    this.overlay.querySelector('#morning-time-input')?.addEventListener('change', saveTimes);
    this.overlay.querySelector('#midday-time-input')?.addEventListener('change', saveTimes);
    this.overlay.querySelector('#evening-time-input')?.addEventListener('change', saveTimes);

    // Módulos visibles
    const toggleSections = () => {
      const currentPrefs = StorageService.getPreferences();
      currentPrefs.enabledSections.weather = (this.overlay.querySelector('#toggle-weather') as HTMLInputElement)?.checked ?? true;
      currentPrefs.enabledSections.quote = (this.overlay.querySelector('#toggle-quote') as HTMLInputElement)?.checked ?? true;
      currentPrefs.enabledSections.curiosity = (this.overlay.querySelector('#toggle-curiosity') as HTMLInputElement)?.checked ?? true;
      currentPrefs.enabledSections.news = (this.overlay.querySelector('#toggle-news') as HTMLInputElement)?.checked ?? true;
      StorageService.savePreferences(currentPrefs);
      this.onPreferencesUpdated();
    };

    this.overlay.querySelector('#toggle-weather')?.addEventListener('change', toggleSections);
    this.overlay.querySelector('#toggle-quote')?.addEventListener('change', toggleSections);
    this.overlay.querySelector('#toggle-curiosity')?.addEventListener('change', toggleSections);
    this.overlay.querySelector('#toggle-news')?.addEventListener('change', toggleSections);

    // Limpiar caché
    this.overlay.querySelector('#clear-cache-btn')?.addEventListener('click', () => {
      localStorage.removeItem('daily_weather_cache_v1');
      localStorage.removeItem('daily_news_cache_v1');
      alert('Caché local borrada exitosamente.');
      window.location.reload();
    });
  }
}
