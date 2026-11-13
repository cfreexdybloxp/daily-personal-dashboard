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

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar fecha en el encabezado
  updateHeaderDate();

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

  // 3. Instanciar Componentes
  const weatherWidget = new WeatherWidget(weatherSec);
  const quoteWidget = new QuoteWidget(quoteSec);
  const curiosityWidget = new CuriosityWidget(curiositySec);
  const newsWidget = new NewsWidget(newsSec);

  const savedArticlesView = new SavedArticlesView(savedSec, () => {
    // Al eliminar un artículo desde guardados, refrescar vista de noticias por si estaba visible
    newsWidget.render();
  });

  const settingsModal = new SettingsModal(settingsModalOverlay, () => {
    // Cuando se actualizan preferencias (ciudad o módulos visibles)
    applyPreferences();
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

  // 6. Botón de cabecera de ajustes
  openSettingsHeaderBtn.addEventListener('click', () => {
    bottomNav.setTab('settings');
    settingsModal.open();
  });

  // 7. Render inicial
  applyPreferences();
  weatherWidget.load();
  quoteWidget.render();
  curiosityWidget.render();
  newsWidget.loadCategory('bolivia');
  bottomNav.render();

  // 8. Registrar Service Worker para PWA y Web Push
  registerServiceWorker();

  // 9. Comprobar refresco inteligente al volver a la pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateHeaderDate();
      // Refresco silencioso si los datos han expirado
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
    // Capitalizar primera letra: ej. "Jue, 13 nov"
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}
