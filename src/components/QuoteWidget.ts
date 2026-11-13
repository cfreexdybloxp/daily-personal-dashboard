import { PhilosophicalQuote } from '../types';
import quotesData from '../data/quotes.json';

export class QuoteWidget {
  private container: HTMLElement;
  private currentIndex: number;

  constructor(container: HTMLElement) {
    this.container = container;
    // Seleccionar determinista por día del año
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    this.currentIndex = dayOfYear % quotesData.length;
  }

  public render(): void {
    const q: PhilosophicalQuote = quotesData[this.currentIndex];

    this.container.innerHTML = `
      <div class="card quote-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-label">Pensamiento del Día</span>
          </div>
          <div style="display: flex; gap: 0.3rem;">
            <button id="prev-quote-btn" class="card-action-btn" title="Frase anterior">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button id="next-quote-btn" class="card-action-btn" title="Siguiente frase">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        <div class="quote-text">
          "${q.quote}"
        </div>

        <div class="quote-author-bar">
          <div class="quote-author">${q.author}</div>
          <div class="quote-work">${q.work}</div>
        </div>

        <div style="font-size: 0.68rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          <strong>Fuente:</strong> ${q.source}
        </div>

        <div class="quote-reflection-box">
          <div class="reflection-title">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span>Interpretación práctica para hoy</span>
          </div>
          <p class="reflection-text">${q.reflection}</p>
        </div>
      </div>
    `;

    this.container.querySelector('#prev-quote-btn')?.addEventListener('click', () => {
      this.currentIndex = (this.currentIndex - 1 + quotesData.length) % quotesData.length;
      this.render();
    });

    this.container.querySelector('#next-quote-btn')?.addEventListener('click', () => {
      this.currentIndex = (this.currentIndex + 1) % quotesData.length;
      this.render();
    });
  }
}
