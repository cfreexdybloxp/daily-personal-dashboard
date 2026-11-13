import './style.css';
import { WeatherWidget } from './components/WeatherWidget';
import { QuoteWidget } from './components/QuoteWidget';
import { CuriosityWidget } from './components/CuriosityWidget';
import { NewsWidget } from './components/NewsWidget';
import { SavedArticlesView } from './components/SavedArticlesView';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { SettingsModal } from './components/SettingsModal';
import { StorageService } from './services/storage';
import { registerServiceWorker } from './api/push';
import { AppTheme } from './types';

// Definición de temas a nivel de módulo (fuera de DOMContentLoaded para evitar Temporal Dead Zone)
const THEME_CYCLE: Array<{ id: AppTheme; label: string; icon: string; metaColor: string }> = [
  { id: 'purple-glass', label: 'Púrpura', icon: '💜', metaColor: '#7c3aed' },
  { id: 'dynamic-blue', label: 'Azul Cielo', icon: '💙', metaColor: '#0284c7' },
  { id: 'dynamic-night', label: 'Noche', icon: '🌙', metaColor: '#0f172a' }
];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Aplicar fecha y tema inmediatamente
  updateHeaderDate();
  applyThemeState();

  // 2. Elementos DOM
  const weatherSec = document.getElementById('weather-section')!;
  const quoteSec = document.getElementById('quote-section')!;
  const curiositySec = document.getElementById('curiosity-section')!;
  const newsSec = document.getElementById('news-section')!;
  const savedSec = document.getElementById('saved-section')!;
  const mainContent = document.getElementById('main-content')!;
  const bottomNavContainer = document.getElementById('bottom-nav-container')!;
  const settingsModalOverlay = document.getElementById('settings-modal-overlay')!;
  const openSettingsHeaderBtn = document.getElementById('open-settings-header-btn')!;
  const quickThemeToggleBtn = document.getElementById('quick-theme-toggle-btn')!;

  // 3. Instanciar Componentes
  const weatherWidget = new WeatherWidget(weatherSec);
  const quoteWidget = new QuoteWidget(quoteSec);
  const curiosityWidget = new CuriosityWidget(curiositySec);
  const newsWidget = new NewsWidget(newsSec);

  const savedArticlesView = new SavedArticlesView(savedSec, () => {
    newsWidget.render();
  });

  const settingsModal = new SettingsModal(settingsModalOverlay, () => {
    applyPreferences();
    applyThemeState();
    weatherWidget.load(true);
  });

  const bottomNav = new BottomNav(bottomNavContainer, (tab: ActiveTab) => {
    handleNavigation(tab);
  });

  // 4. Navegación entre vistas
  function handleNavigation(tab: ActiveTab) {
    if (tab === 'today') {
      mainContent.style.display = 'flex';
      savedSec.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'news') {
      mainContent.style.display = 'flex';
      savedSec.style.display = 'none';
      newsSec.scrollIntoView({ behavior: 'smooth' });
    } else if (tab === 'saved') {
      mainContent.style.display = 'none';
      savedSec.style.display = 'block';
      savedArticlesView.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'settings') {
      settingsModal.open();
    }
  }

  // 5. Aplicar visibilidad de módulos según preferencias
  function applyPreferences() {
    const prefs = StorageService.getPreferences();
    weatherSec.style.display = prefs.enabledSections.weather ? 'block' : 'none';
    quoteSec.style.display = prefs.enabledSections.quote ? 'block' : 'none';
    curiositySec.style.display = prefs.enabledSections.curiosity ? 'block' : 'none';
    newsSec.style.display = prefs.enabledSections.news ? 'block' : 'none';
  }

  // 6. Aplicar estado del tema
  function applyThemeState() {
    const prefs = StorageService.getPreferences();
    const currentTheme = prefs.theme || 'purple-glass';
    document.body.setAttribute('data-theme', currentTheme);

    const themeObj = THEME_CYCLE.find(t => t.id === currentTheme) || THEME_CYCLE[0];
    const btnIcon = document.getElementById('theme-btn-icon');
    const btnLabel = document.getElementById('theme-btn-label');
    if (btnIcon) btnIcon.textContent = themeObj.icon;
    if (btnLabel) btnLabel.textContent = themeObj.label;

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', themeObj.metaColor);
  }

  quickThemeToggleBtn.addEventListener('click', () => {
    const prefs = StorageService.getPreferences();
    const currentIndex = THEME_CYCLE.findIndex(t => t.id === prefs.theme);
    const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
    
    prefs.theme = nextTheme.id;
    StorageService.savePreferences(prefs);
    applyThemeState();
  });

  // 7. Botón de cabecera de ajustes
  openSettingsHeaderBtn.addEventListener('click', () => {
    bottomNav.setTab('settings');
    settingsModal.open();
  });

  // 8. Render inicial
  applyPreferences();
  weatherWidget.load();
  quoteWidget.render();
  curiosityWidget.render();
  newsWidget.loadCategory('bolivia');
  bottomNav.render();

  // 9. Registrar Service Worker para PWA y Web Push
  registerServiceWorker();

  // 10. Refresco inteligente
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateHeaderDate();
      weatherWidget.load(false);
    }
  });
});

function updateHeaderDate() {
  const dateEl = document.getElementById('current-date-pill');
  if (dateEl) {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('es-BO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(now);
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}
