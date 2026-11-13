import { DailyCuriosity } from '../types';
import curiositiesData from '../data/curiosities.json';

export class CuriosityWidget {
  private container: HTMLElement;
  private currentIndex: number;

  constructor(container: HTMLElement) {
    this.container = container;
    const now = new Date();
    const day = now.getDate();
    this.currentIndex = day % curiositiesData.length;
  }

  public render(): void {
    const c: DailyCuriosity = curiositiesData[this.currentIndex];

    this.container.innerHTML = `
      <div class="card curiosity-card">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-label">Una Idea para Hoy</span>
          </div>
          <span style="font-size: 0.7rem; color: var(--text-muted); background: var(--bg-surface-elevated); padding: 0.15rem 0.5rem; border-radius: 12px;">
            ${c.category}
          </span>
        </div>

        <div class="curiosity-title">${c.title}</div>
        <p class="curiosity-text">${c.explanation}</p>

        <div class="curiosity-footer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
          <span><strong>Referencia:</strong> ${c.source}</span>
        </div>
      </div>
    `;
  }
}
