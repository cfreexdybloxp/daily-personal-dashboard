import { StorageService } from '../services/storage';

export class SavedArticlesView {
  private container: HTMLElement;
  private onArticleRemoved: () => void;

  constructor(container: HTMLElement, onArticleRemoved: () => void) {
    this.container = container;
    this.onArticleRemoved = onArticleRemoved;
  }

  public render(): void {
    const prefs = StorageService.getPreferences();
    const articles = prefs.savedArticles || [];

    if (articles.length === 0) {
      this.container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div class="card-header">
            <span class="card-label">Artículos Guardados</span>
          </div>
          <div class="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.5rem; color: var(--text-muted);"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            <p>Aún no has guardado noticias para leer después.</p>
            <p style="font-size: 0.75rem; margin-top: 0.25rem;">Toca el icono de marcador en cualquier noticia para guardarla aquí.</p>
          </div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-label">Artículos Guardados</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">(${articles.length})</span>
          </div>
        </div>

        <div class="news-list">
          ${articles.map(item => `
            <article class="news-card">
              <div class="news-meta">
                <span class="news-source-tag">${item.source} • ${item.categoryLabel}</span>
                <button class="remove-saved-btn icon-btn" data-id="${item.id}" title="Eliminar de guardados" style="width: 26px; height: 26px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-title">
                ${item.title}
              </a>

              <p class="news-summary">${item.summary}</p>

              <div class="news-actions">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-read-link">
                  <span>Abrir artículo completo</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.remove-saved-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          const currentPrefs = StorageService.getPreferences();
          currentPrefs.savedArticles = currentPrefs.savedArticles.filter(a => a.id !== id);
          StorageService.savePreferences(currentPrefs);
          this.render();
          this.onArticleRemoved();
        }
      });
    });
  }
}
