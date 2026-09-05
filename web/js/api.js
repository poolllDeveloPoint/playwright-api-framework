/**
 * ArticleHub Web API Client
 * Manages HTTP communication with the REST API, JWT handling, and cache diagnostics.
 */

// Dynamically use origin if served on port 3001, otherwise fallback to default mock API port
const API_BASE_URL = window.location.port === '3001'
  ? `${window.location.origin}/api`
  : 'http://localhost:3001/api';

export class ApiClient {
  constructor() {
    this.token = localStorage.getItem('articlehub_token') || null;
    this.lastCacheStatus = 'NONE';
    this.lastLatencyMs = 0;
    this.listeners = [];
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('articlehub_token', token);
    } else {
      localStorage.removeItem('articlehub_token');
    }
  }

  getToken() {
    return this.token;
  }

  onDiagnosticUpdate(callback) {
    this.listeners.push(callback);
  }

  notifyDiagnostic(status, latency) {
    this.lastCacheStatus = status;
    this.lastLatencyMs = latency;
    this.listeners.forEach((fn) => fn({ status, latency }));
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      // REQ-AUTH-02: Protected endpoint access control via Token <jwt>
      headers['Authorization'] = `Token ${this.token}`;
    }

    const startTime = performance.now();
    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err) {
      this.notifyDiagnostic('ERR', 0);
      throw new Error(`Unable to connect to API server at ${API_BASE_URL}. Please ensure the server is running.`);
    }

    const latency = Math.round(performance.now() - startTime);
    const cacheHeader = response.headers.get('X-Cache');
    this.notifyDiagnostic(cacheHeader || 'DIRECT', latency);

    // 204 No Content for DELETE
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(response.statusText || 'API Request Failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /* ========================================================================
     1. Authentication & Users (REQ-AUTH, REQ-USR)
     ======================================================================== */

  async login(email, password) {
    // REQ-AUTH-01
    const res = await this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ user: { email, password } }),
    });
    if (res?.user?.token) {
      this.setToken(res.user.token);
    }
    return res.user;
  }

  async register(username, email, password) {
    // REQ-USR-01, REQ-USR-02
    const res = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify({ user: { username, email, password } }),
    });
    if (res?.user?.token) {
      this.setToken(res.user.token);
    }
    return res.user;
  }

  async logout() {
    // REQ-AUTH-03: Server-side token revocation in Redis
    try {
      if (this.token) {
        await this.request('/users/logout', { method: 'POST' });
      }
    } finally {
      this.setToken(null);
    }
  }

  /* ========================================================================
     2. Article Management (REQ-ART, REQ-CACHE)
     ======================================================================== */

  async getArticles({ limit = 10, offset = 0, tag, author } = {}) {
    // REQ-ART-01, REQ-CACHE-01
    const query = new URLSearchParams();
    query.set('limit', limit);
    query.set('offset', offset);
    if (tag) query.set('tag', tag);
    if (author) query.set('author', author);

    return this.request(`/articles?${query.toString()}`, { method: 'GET' });
  }

  async getArticle(slug) {
    // REQ-ART-05
    return this.request(`/articles/${encodeURIComponent(slug)}`, { method: 'GET' });
  }

  async createArticle({ title, description, body, tagList = [], published = false }) {
    // REQ-ART-02, REQ-ART-05, REQ-CACHE-02
    return this.request('/articles', {
      method: 'POST',
      body: JSON.stringify({
        article: { title, description, body, tagList, published },
      }),
    });
  }

  async updateArticle(slug, { title, description, body, tagList, published }) {
    // REQ-ART-03, REQ-CACHE-02
    return this.request(`/articles/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify({
        article: { title, description, body, tagList, published },
      }),
    });
  }

  async deleteArticle(slug) {
    // REQ-ART-04, REQ-CACHE-02
    return this.request(`/articles/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    });
  }

  async publishArticle(slug) {
    // REQ-ART-05: Publish endpoint & cache invalidation
    return this.request(`/articles/${encodeURIComponent(slug)}/publish`, {
      method: 'POST',
    });
  }

  /* ========================================================================
     3. Taxonomy & Health (REQ-TAG)
     ======================================================================== */

  async getTags() {
    // REQ-TAG-01
    const res = await this.request('/tags', { method: 'GET' });
    return res.tags || [];
  }

  async checkHealth() {
    return this.request('/health', { method: 'GET' });
  }
}

export const api = new ApiClient();
