/**
 * ArticleHub Web Client Main Application Controller
 * Wires state, API calls, event listeners, and UI components together.
 */

import { api } from './api.js';
import { state } from './state.js';
import { ui } from './ui.js';

class App {
  constructor() {
    this.editingSlug = null;
  }

  async init() {
    console.log('[ArticleHub Web] Initializing client application...');

    // 1. Hook state and diagnostic subscriptions
    api.onDiagnosticUpdate((diag) => ui.renderDiagnostic(diag));

    state.subscribe((prop) => {
      if (prop === 'user') {
        ui.renderNavbar();
        ui.renderTabs();
        this.loadArticles();
      } else if (prop === 'feed') {
        ui.renderTabs();
        this.loadArticles();
      } else if (prop === 'articles') {
        ui.renderArticles();
      } else if (prop === 'tags') {
        ui.renderTags();
      }
    });

    // 2. Setup DOM event listeners
    this.bindEvents();

    // 3. Initial UI render
    ui.renderNavbar();
    ui.renderTabs();

    // 4. Load initial data
    await Promise.allSettled([this.loadTags(), this.loadArticles()]);
  }

  /* ========================================================================
     Data Fetching
     ======================================================================== */

  async loadArticles() {
    const listEl = document.getElementById('articles-container');
    if (listEl) {
      listEl.innerHTML = `
        <div class="state-box">
          <div class="spinner"></div>
          <p>Loading articles...</p>
        </div>
      `;
    }

    try {
      const params = {
        limit: state.limit,
        offset: state.offset,
      };

      if (state.selectedTag) {
        params.tag = state.selectedTag;
      }

      if (state.currentTab === 'my-articles' && state.isLoggedIn()) {
        params.author = state.getCurrentUsername();
      }

      const res = await api.getArticles(params);
      state.setArticles(res.articles, res.articlesCount);
    } catch (err) {
      console.error('[loadArticles] Error:', err);
      ui.showToast(err.message || 'Failed to load articles.', 'error');
      if (listEl) {
        listEl.innerHTML = `
          <div class="state-box">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
            <h3>Unable to load articles</h3>
            <p>${ui.escapeHtml(err.message)}</p>
            <button class="btn btn-outline btn-sm" style="margin-top: 1rem;" onclick="location.reload()">Reload Page</button>
          </div>
        `;
      }
    }
  }

  async loadTags() {
    try {
      const tags = await api.getTags();
      state.setTags(tags);
    } catch (err) {
      console.warn('[loadTags] Failed loading tags:', err.message);
    }
  }

  /* ========================================================================
     Event Binding
     ======================================================================== */

  bindEvents() {
    // Nav actions delegation
    const navActions = document.getElementById('nav-actions');
    if (navActions) {
      navActions.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.id === 'btn-open-login') {
          ui.hideFormError('login-error');
          document.getElementById('form-login')?.reset();
          ui.openModal('modal-login');
        } else if (btn.id === 'btn-open-register') {
          ui.hideFormError('register-error');
          document.getElementById('form-register')?.reset();
          ui.openModal('modal-register');
        } else if (btn.id === 'btn-logout') {
          this.handleLogout();
        } else if (btn.id === 'btn-new-article') {
          this.editingSlug = null;
          document.getElementById('modal-article-title').textContent = 'Write New Article';
          document.getElementById('form-article')?.reset();
          ui.hideFormError('article-form-error');
          ui.openModal('modal-article');
        }
      });
    }

    // Modal Close Buttons
    document.querySelectorAll('.modal-close, [data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) modal.classList.remove('open');
      });
    });

    // Feed Tabs Click
    const feedTabs = document.getElementById('feed-tabs');
    if (feedTabs) {
      feedTabs.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;
        const tab = tabBtn.dataset.tab;
        if (tab && tab !== state.currentTab) {
          state.setTab(tab);
        }
      });
    }

    // Clear tag button
    const activeFilterContainer = document.getElementById('active-filter-container');
    if (activeFilterContainer) {
      activeFilterContainer.addEventListener('click', (e) => {
        if (e.target.closest('#btn-clear-tag')) {
          state.clearTag();
        }
      });
    }

    // Tag Cloud Click (in Sidebar)
    const tagCloud = document.getElementById('tag-cloud-container');
    if (tagCloud) {
      tagCloud.addEventListener('click', (e) => {
        const tagPill = e.target.closest('.tag-pill');
        if (!tagPill) return;
        const tag = tagPill.dataset.tag;
        if (tag) {
          state.setTag(tag);
        }
      });
    }

    // Tag click on Article Card
    const articlesContainer = document.getElementById('articles-container');
    if (articlesContainer) {
      articlesContainer.addEventListener('click', async (e) => {
        // Tag Pill clicked
        const tagPill = e.target.closest('.tag-pill');
        if (tagPill) {
          const tag = tagPill.dataset.tag;
          if (tag) state.setTag(tag);
          return;
        }

        // Publish Action
        const pubBtn = e.target.closest('.btn-publish-action');
        if (pubBtn) {
          const slug = pubBtn.dataset.slug;
          if (slug) this.handlePublishArticle(slug);
          return;
        }

        // Edit Action
        const editBtn = e.target.closest('.btn-edit-action');
        if (editBtn) {
          const slug = editBtn.dataset.slug;
          if (slug) this.handleEditArticle(slug);
          return;
        }

        // Delete Action
        const delBtn = e.target.closest('.btn-delete-action');
        if (delBtn) {
          const slug = delBtn.dataset.slug;
          if (slug) this.handleDeleteArticle(slug);
          return;
        }
      });
    }

    // Form Submissions
    this.bindFormEvents();
  }

  bindFormEvents() {
    // 1. Login Form
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        ui.hideFormError('login-error');

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
          const user = await api.login(email, password);
          state.setUser(user);
          ui.closeModal('modal-login');
          ui.showToast(`Welcome back, ${user.username}!`, 'success');
        } catch (err) {
          const msg = this.extractErrorMessage(err) || 'Invalid email or password.';
          ui.showFormError('login-error', msg);
        }
      });
    }

    // 2. Register Form
    const formRegister = document.getElementById('form-register');
    const usernameInput = document.getElementById('reg-username');

    if (usernameInput) {
      usernameInput.addEventListener('input', () => {
        const len = usernameInput.value.trim().length;
        const hint = document.getElementById('reg-username-hint');
        if (len > 0 && (len < 3 || len > 20)) {
          hint.style.color = 'var(--accent-rose)';
          hint.textContent = `Username length: ${len}/20 (Must be between 3 and 20 characters)`;
        } else {
          hint.style.color = 'var(--text-muted)';
          hint.textContent = 'Must be between 3 and 20 characters.';
        }
      });
    }

    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        ui.hideFormError('register-error');

        const username = usernameInput.value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;

        // Client boundary pre-validation
        if (username.length < 3 || username.length > 20) {
          ui.showFormError('register-error', 'Username must be between 3 and 20 characters.');
          return;
        }

        try {
          const user = await api.register(username, email, password);
          state.setUser(user);
          ui.closeModal('modal-register');
          ui.showToast(`Welcome to ArticleHub, ${user.username}!`, 'success');
        } catch (err) {
          const msg = this.extractErrorMessage(err) || 'Failed to create account. Please check your inputs.';
          ui.showFormError('register-error', msg);
        }
      });
    }

    // 3. Article Form
    const formArticle = document.getElementById('form-article');
    if (formArticle) {
      formArticle.addEventListener('submit', async (e) => {
        e.preventDefault();
        ui.hideFormError('article-form-error');

        const title = document.getElementById('art-title').value.trim();
        const description = document.getElementById('art-desc').value.trim();
        const body = document.getElementById('art-body').value.trim();
        const rawTags = document.getElementById('art-tags').value.trim();
        const published = document.getElementById('art-published').checked;

        const tagList = rawTags
          ? rawTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
          : [];

        try {
          if (this.editingSlug) {
            // Update Article
            await api.updateArticle(this.editingSlug, {
              title,
              description,
              body,
              tagList,
              published,
            });
            ui.showToast('Article updated successfully!', 'success');
          } else {
            // Create Article
            await api.createArticle({
              title,
              description,
              body,
              tagList,
              published,
            });
            ui.showToast(
              published ? 'Article published successfully!' : 'Article saved as Draft.',
              'success'
            );
          }

          ui.closeModal('modal-article');
          await Promise.all([this.loadArticles(), this.loadTags()]);
        } catch (err) {
          const msg = this.extractErrorMessage(err) || 'Failed to save article.';
          ui.showFormError('article-form-error', msg);
        }
      });
    }
  }

  /* ========================================================================
     Action Handlers
     ======================================================================== */

  async handleLogout() {
    try {
      await api.logout();
      state.setUser(null);
      ui.showToast('You have been logged out.', 'info');
    } catch (err) {
      state.setUser(null);
      ui.showToast('Logged out.', 'info');
    }
  }

  async handlePublishArticle(slug) {
    if (!confirm('Are you sure you want to publish this article?')) return;

    try {
      await api.publishArticle(slug);
      ui.showToast('Article published successfully!', 'success');
      await this.loadArticles();
    } catch (err) {
      ui.showToast(this.extractErrorMessage(err) || 'Failed to publish article.', 'error');
    }
  }

  async handleEditArticle(slug) {
    const article = state.articles.find((a) => a.slug === slug);
    if (!article) return;

    this.editingSlug = slug;
    document.getElementById('modal-article-title').textContent = 'Edit Article';
    document.getElementById('art-title').value = article.title || '';
    document.getElementById('art-desc').value = article.description || '';
    document.getElementById('art-body').value = article.body || '';
    document.getElementById('art-tags').value = (article.tagList || []).join(', ');
    document.getElementById('art-published').checked = !!article.published;
    ui.hideFormError('article-form-error');

    ui.openModal('modal-article');
  }

  async handleDeleteArticle(slug) {
    if (!confirm('Are you sure you want to permanently delete this article?')) return;

    try {
      await api.deleteArticle(slug);
      ui.showToast('Article permanently deleted.', 'success');
      await Promise.all([this.loadArticles(), this.loadTags()]);
    } catch (err) {
      ui.showToast(this.extractErrorMessage(err) || 'Failed to delete article.', 'error');
    }
  }

  extractErrorMessage(err) {
    if (err.data?.errors) {
      const entries = Object.entries(err.data.errors);
      return entries
        .map(([field, messages]) => `${field} ${(messages || []).join(', ')}`)
        .join('; ');
    }
    return err.message || null;
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
