import { StorageService } from '../services/storage';
import { subscribeToPush, sendTestNotification, getNotificationPermission, isPushSupported } from '../api/push';
import defaultCities from '../data/defaultCities.json';
import { CityLocation } from '../types';

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
          <div class="modal-title">Configuración Personal</div>
          <button id="close-settings-btn" class="icon-btn" title="Cerrar ajustes">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
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
        <div class="setting-group" style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.85rem; background: var(--bg-surface-elevated);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span style="font-weight: 700; font-size: 0.85rem;">Notificaciones Push Automáticas</span>
            </div>
            <span style="font-size: 0.7rem; font-weight: 600; color: ${permStatus === 'granted' ? 'var(--success)' : permStatus === 'denied' ? 'var(--danger)' : 'var(--text-muted)'};">
              ${permStatus === 'granted' ? '● Activas' : permStatus === 'denied' ? '● Bloqueadas' : '○ No configuradas'}
            </span>
          </div>

          <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            Avisos reales en segundo plano desde el servidor Cloudflare, incluso con la aplicación cerrada.
          </p>

          ${!pushSupported ? `
            <div style="font-size: 0.75rem; color: var(--danger); background: rgba(239, 68, 68, 0.1); padding: 0.5rem; border-radius: 6px;">
              Este navegador no soporta Web Push. En Android, utiliza Google Chrome o Samsung Internet.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              <button id="enable-push-btn" class="${permStatus === 'granted' ? 'secondary-btn' : 'primary-btn'}">
                ${permStatus === 'granted' ? 'Renovar Permisos de Notificación' : 'Activar Notificaciones en mi Teléfono'}
              </button>

              <button id="test-push-btn" class="secondary-btn" ${permStatus !== 'granted' ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                <span>Enviar Notificación de Prueba</span>
              </button>
            </div>
          `}

          <!-- Horarios de los 3 Avisos -->
          <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.45rem;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary);">Horarios de Resumen:</span>
            
            <div class="setting-control-row">
              <span style="font-size: 0.78rem;">Mañana (Clima + Titular + Frase)</span>
              <input type="time" id="morning-time-input" value="${prefs.notifications.morningTime}" style="background: var(--bg-base); border: 1px solid var(--border); color: var(--text-primary); padding: 0.2rem 0.4rem; border-radius: 4px;">
            </div>

            <div class="setting-control-row">
              <span style="font-size: 0.78rem;">Mediodía (Pronóstico + Noticias)</span>
              <input type="time" id="midday-time-input" value="${prefs.notifications.middayTime}" style="background: var(--bg-base); border: 1px solid var(--border); color: var(--text-primary); padding: 0.2rem 0.4rem; border-radius: 4px;">
            </div>

            <div class="setting-control-row">
              <span style="font-size: 0.78rem;">Tarde (Resumen del Día + Idea)</span>
              <input type="time" id="evening-time-input" value="${prefs.notifications.eveningTime}" style="background: var(--bg-base); border: 1px solid var(--border); color: var(--text-primary); padding: 0.2rem 0.4rem; border-radius: 4px;">
            </div>
          </div>

          <div id="push-status-msg" style="margin-top: 0.6rem; font-size: 0.72rem; min-height: 18px;"></div>
        </div>

        <!-- Secciones Visibles -->
        <div class="setting-group">
          <label class="setting-label">Módulos en Pantalla Principal</label>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
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

        <!-- Mantenimiento de Caché -->
        <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <button id="clear-cache-btn" class="secondary-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
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
        statusEl.innerHTML = `<span style="color: ${res.success ? 'var(--success)' : 'var(--danger)'};">${res.message}</span>`;
      }
      setTimeout(() => this.render(), 1500);
    });

    // Prueba de Push
    this.overlay.querySelector('#test-push-btn')?.addEventListener('click', async () => {
      const statusEl = this.overlay.querySelector('#push-status-msg');
      if (statusEl) statusEl.innerHTML = '<span style="color: var(--accent);">Enviando notificación de prueba...</span>';
      
      const res = await sendTestNotification();
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: ${res.success ? 'var(--success)' : 'var(--danger)'};">${res.message}</span>`;
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
      alert('Caché local borrada exitosamente. La aplicación se recargará con datos frescos.');
      window.location.reload();
    });
  }
}
