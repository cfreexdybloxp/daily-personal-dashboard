import { NewsCategory, NewsItem } from '../types';
import { fetchNews } from '../api/news';
import { StorageService } from '../services/storage';

export class NewsWidget {
  private container: HTMLElement;
  private currentCategory: NewsCategory = 'bolivia';
  private newsItems: NewsItem[] = [];
  private isLoading = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async loadCategory(category: NewsCategory, force = false): Promise<void> {
    this.currentCategory = category;
    this.isLoading = true;
    this.render();

    try {
      this.newsItems = await fetchNews(category, force);
    } catch (err) {
      console.error('Error cargando noticias:', err);
      this.newsItems = [];
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  public render(): void {
    const categories: Array<{ id: NewsCategory; label: string }> = [
      { id: 'bolivia', label: 'Bolivia y Local' },
      { id: 'tech', label: 'Tecnología e IA' },
      { id: 'world', label: 'Internacional' },
      { id: 'science', label: 'Ciencia' },
      { id: 'culture', label: 'Cultura' }
    ];

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div class="card-header" style="margin-bottom: 0;">
          <div class="card-title-group">
            <span class="card-label">Noticias Seleccionadas</span>
          </div>
          <button id="refresh-news-btn" class="card-action-btn" title="Refrescar noticias">
            <span>Actualizar</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          </button>
        </div>

        <!-- Barra de Categorías -->
        <div class="category-scroll">
          ${categories.map(c => `
            <button class="category-chip ${this.currentCategory === c.id ? 'active' : ''}" data-category="${c.id}">
              ${c.label}
            </button>
          `).join('')}
        </div>

        <!-- Contenedor de Noticias -->
        ${this.isLoading ? `
          <div class="card">
            <div class="loading-box">
              <div class="spinner"></div>
              <span>Consultando fuentes periodísticas verificadas...</span>
            </div>
          </div>
        ` : this.newsItems.length === 0 ? `
          <div class="empty-state">
            <p>No se encontraron noticias recientes para esta categoría en este momento.</p>
            <button id="retry-news-btn" class="secondary-btn" style="margin-top: 0.6rem;">Reintentar carga</button>
          </div>
        ` : `
          <div class="news-list">
            ${this.newsItems.map(item => this.renderNewsCard(item)).join('')}
          </div>
        `}
      </div>
    `;

    // Event listeners
    this.container.querySelectorAll('.category-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = (e.currentTarget as HTMLElement).getAttribute('data-category') as NewsCategory;
        if (cat && cat !== this.currentCategory) {
          this.loadCategory(cat);
        }
      });
    });

    this.container.querySelector('#refresh-news-btn')?.addEventListener('click', () => {
      this.loadCategory(this.currentCategory, true);
    });

    this.container.querySelector('#retry-news-btn')?.addEventListener('click', () => {
      this.loadCategory(this.currentCategory, true);
    });

    // Delegar clicks en marcadores de noticias
    this.container.querySelectorAll('.news-bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const id = target.getAttribute('data-id');
        const item = this.newsItems.find(n => n.id === id);
        if (item) {
          const isSaved = StorageService.toggleSaveArticle(item);
          target.classList.toggle('saved', isSaved);
          target.innerHTML = isSaved ? getBookmarkSvg(true) : getBookmarkSvg(false);
        }
      });
    });
  }

  private renderNewsCard(item: NewsItem): string {
    const isSaved = StorageService.isArticleSaved(item.id);
    const pubDate = new Date(item.publishedAt);
    const timeFormatted = formatRelativeTime(pubDate);

    return `
      <article class="news-card">
        <div class="news-meta">
          <div class="news-source-tag">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span>${item.source}</span>
          </div>
          <span class="news-time">${timeFormatted}</span>
        </div>

        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-title">
          ${item.title}
        </a>

        <p class="news-summary">${item.summary}</p>

        <div class="news-actions">
          <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-read-link">
            <span>Leer en la fuente</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <button class="news-bookmark-btn ${isSaved ? 'saved' : ''}" data-id="${item.id}" title="${isSaved ? 'Quitar de guardados' : 'Guardar noticia'}">
            ${getBookmarkSvg(isSaved)}
          </button>
        </div>
      </article>
    `;
  }
}

function getBookmarkSvg(filled: boolean): string {
  if (filled) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
}

function formatRelativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Hace un momento';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  return `Hace ${diffDays} días`;
}
