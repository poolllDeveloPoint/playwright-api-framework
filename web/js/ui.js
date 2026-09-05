/**
 * ArticleHub DOM UI Components & Renderers
 */

import { state } from './state.js';

export const ui = {
  /**
   * Display interactive floating toast notification
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <span style="font-size: 1.1rem;">${icon}</span>
      <div style="flex: 1;">${this.escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3500);
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Format ISO UTC date to readable format
   */
  formatDate(isoString) {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  },

  /**
   * Update the Navigation Bar auth states
   */
  renderNavbar() {
    const navActions = document.getElementById('nav-actions');
    if (!navActions) return;

    if (state.isLoggedIn()) {
      const user = state.user;
      const initial = (user.username || 'U').charAt(0).toUpperCase();
      navActions.innerHTML = `
        <button id="btn-new-article" class="btn btn-primary btn-sm">
          <span>✍️ Write Article</span>
        </button>
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-left: 0.5rem; background: rgba(255,255,255,0.05); padding: 0.25rem 0.75rem; border-radius: var(--radius-full); border: 1px solid var(--border-color);">
          <div class="author-avatar" style="width: 28px; height: 28px; font-size: 0.75rem;">
            ${user.image ? `<img src="${this.escapeHtml(user.image)}" alt="${this.escapeHtml(user.username)}" />` : initial}
          </div>
          <span style="font-size: 0.85rem; font-weight: 600;">${this.escapeHtml(user.username)}</span>
        </div>
        <button id="btn-logout" class="btn btn-outline btn-sm" title="Log out">
          <span>Log out</span>
        </button>
      `;
    } else {
      navActions.innerHTML = `
        <button id="btn-open-login" class="btn btn-outline btn-sm">Sign In</button>
        <button id="btn-open-register" class="btn btn-primary btn-sm">Sign Up</button>
      `;
    }
  },

  /**
   * Update feed tab navigation based on authentication
   */
  renderTabs() {
    const tabNav = document.getElementById('feed-tabs');
    if (!tabNav) return;

    const myArticlesTab = state.isLoggedIn()
      ? `<button class="tab-btn ${state.currentTab === 'my-articles' ? 'active' : ''}" data-tab="my-articles">
           <span>📂 My Articles & Drafts</span>
         </button>`
      : '';

    tabNav.innerHTML = `
      <button class="tab-btn ${state.currentTab === 'global' ? 'active' : ''}" data-tab="global">
        <span>🌐 Global Feed</span>
      </button>
      ${myArticlesTab}
    `;

    // Active filter indicator
    const filterContainer = document.getElementById('active-filter-container');
    if (filterContainer) {
      if (state.selectedTag) {
        filterContainer.innerHTML = `
          <div class="active-filter-badge">
            <span>Tag: #${this.escapeHtml(state.selectedTag)}</span>
            <button id="btn-clear-tag" class="filter-clear-btn" title="Clear filter">✕</button>
          </div>
        `;
      } else {
        filterContainer.innerHTML = '';
      }
    }
  },

  /**
   * Render list of articles or empty state
   */
  renderArticles() {
    const listEl = document.getElementById('articles-container');
    if (!listEl) return;

    if (state.articles.length === 0) {
      listEl.innerHTML = `
        <div class="state-box">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📄</div>
          <h3>No articles found</h3>
          <p>${state.selectedTag ? `No articles tagged with #${this.escapeHtml(state.selectedTag)}` : 'Be the first to write and share an article!'}</p>
        </div>
      `;
      this.renderPagination();
      return;
    }

    const currentUsername = state.getCurrentUsername();

    listEl.innerHTML = state.articles
      .map((art) => {
        const isAuthor = currentUsername && art.author?.username === currentUsername;
        const isDraft = art.published === false;
        const initial = (art.author?.username || 'A').charAt(0).toUpperCase();

        const statusBadge = isDraft
          ? `<span class="badge-status badge-draft">📝 Draft</span>`
          : `<span class="badge-status badge-published">✨ Published</span>`;

        const actionButtons = isAuthor
          ? `
            <div class="card-actions">
              ${
                isDraft
                  ? `<button class="btn btn-success btn-sm btn-publish-action" data-slug="${this.escapeHtml(art.slug)}">
                       🚀 Publish Now
                     </button>`
                  : ''
              }
              <button class="btn btn-outline btn-sm btn-edit-action" data-slug="${this.escapeHtml(art.slug)}">
                ✏️ Edit
              </button>
              <button class="btn btn-danger-outline btn-sm btn-delete-action" data-slug="${this.escapeHtml(art.slug)}">
                🗑️ Delete
              </button>
            </div>
          `
          : '';

        const tagsHtml = (art.tagList || [])
          .map((t) => `<span class="tag-pill" data-tag="${this.escapeHtml(t)}">#${this.escapeHtml(t)}</span>`)
          .join('');

        return `
          <article class="article-card" id="article-${this.escapeHtml(art.slug)}">
            <div class="card-top">
              <div class="author-meta">
                <div class="author-avatar">
                  ${art.author?.image ? `<img src="${this.escapeHtml(art.author.image)}" alt="${this.escapeHtml(art.author.username)}" />` : initial}
                </div>
                <div class="author-info">
                  <span class="author-name">${this.escapeHtml(art.author?.username || 'Anonymous')}</span>
                  <span class="article-date">${this.formatDate(art.createdAt)}</span>
                </div>
              </div>
              <div>${statusBadge}</div>
            </div>

            <h2 class="article-title">${this.escapeHtml(art.title)}</h2>
            <p class="article-desc">${this.escapeHtml(art.description || art.body || '')}</p>

            <div class="card-bottom">
              <div class="tag-list">${tagsHtml}</div>
              ${actionButtons}
            </div>
          </article>
        `;
      })
      .join('');

    this.renderPagination();
  },

  /**
   * Render pagination buttons
   */
  renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    const total = state.articlesCount;
    const limit = state.limit;
    const offset = state.offset;
    
    if (total <= limit && offset === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';

    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit) || 1;

    const info = document.getElementById('pagination-info');
    if (info) {
      info.textContent = `Page ${currentPage} of ${totalPages} (${total} articles)`;
    }

    const prevBtn = document.getElementById('btn-page-prev');
    const nextBtn = document.getElementById('btn-page-next');

    if (prevBtn) {
      prevBtn.disabled = offset === 0;
      prevBtn.onclick = () => state.setPage(offset - limit);
    }
    if (nextBtn) {
      nextBtn.disabled = offset + limit >= total;
      nextBtn.onclick = () => state.setPage(offset + limit);
    }
  },

  /**
   * Render popular tags sidebar cloud
   */
  renderTags() {
    const container = document.getElementById('tag-cloud-container');
    if (!container) return;

    if (state.tags.length === 0) {
      container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">No tags available</span>`;
      return;
    }

    container.innerHTML = state.tags
      .map(
        (t) => `
        <button class="tag-pill" data-tag="${this.escapeHtml(t)}">
          #${this.escapeHtml(t)}
        </button>
      `
      )
      .join('');
  },

  /**
   * Render diagnostic bar cache status and latency
   */
  renderDiagnostic({ status, latency }) {
    const pill = document.getElementById('diag-cache-pill');
    const latencyEl = document.getElementById('diag-latency');
    if (!pill) return;

    pill.className = 'cache-pill';
    if (status === 'HIT') {
      pill.classList.add('hit');
      pill.textContent = 'HIT (Redis)';
    } else if (status === 'MISS') {
      pill.classList.add('miss');
      pill.textContent = 'MISS (Postgres)';
    } else {
      pill.classList.add('none');
      pill.textContent = status || 'DIRECT';
    }

    if (latencyEl) {
      latencyEl.textContent = `${latency}ms`;
    }
  },

  /**
   * Open a modal dialog by id
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
    }
  },

  /**
   * Close a modal dialog by id
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  },

  /**
   * Show validation error on a specific form element
   */
  showFormError(elementId, message) {
    const errEl = document.getElementById(elementId);
    if (errEl) {
      errEl.textContent = message;
      errEl.classList.add('show');
    }
  },

  /**
   * Hide validation error
   */
  hideFormError(elementId) {
    const errEl = document.getElementById(elementId);
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.remove('show');
    }
  },
};
