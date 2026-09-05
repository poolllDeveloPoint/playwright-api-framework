/**
 * ArticleHub Web Client State Management
 */

class AppState {
  constructor() {
    const savedUser = localStorage.getItem('articlehub_user');
    this.user = savedUser ? JSON.parse(savedUser) : null;
    this.currentTab = 'global'; // 'global' | 'my-articles'
    this.selectedTag = null;
    this.articles = [];
    this.articlesCount = 0;
    this.tags = [];
    this.limit = 6;
    this.offset = 0;
    this.listeners = [];
  }

  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem('articlehub_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('articlehub_user');
    }
    this.emitChange('user');
  }

  isLoggedIn() {
    return !!this.user;
  }

  getCurrentUsername() {
    return this.user?.username || null;
  }

  setTab(tab) {
    this.currentTab = tab;
    this.selectedTag = null; // Clear tag filter when changing tabs
    this.offset = 0;
    this.emitChange('feed');
  }

  setTag(tag) {
    this.selectedTag = tag;
    this.offset = 0;
    this.emitChange('feed');
  }

  clearTag() {
    this.selectedTag = null;
    this.offset = 0;
    this.emitChange('feed');
  }

  setArticles(articles, count) {
    this.articles = articles || [];
    this.articlesCount = count || 0;
    this.emitChange('articles');
  }

  setTags(tags) {
    this.tags = tags || [];
    this.emitChange('tags');
  }

  setPage(newOffset) {
    this.offset = Math.max(0, newOffset);
    this.emitChange('feed');
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  emitChange(property) {
    this.listeners.forEach((fn) => fn(property, this));
  }
}

export const state = new AppState();
