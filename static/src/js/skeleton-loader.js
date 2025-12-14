// Skeleton Loader System
// Sprint 7: Loading States & Skeletons
// Provides smooth loading experiences across the site

(function() {
  'use strict';

  // Configuration
  const SKELETON_CLASS = 'skeleton';
  const LOADING_CLASS = 'is-loading';
  const LOADED_CLASS = 'is-loaded';
  const MIN_LOADING_TIME = 300; // Minimum time to show skeleton (prevents flashing)

  // Skeleton templates for common components
  const TEMPLATES = {
    // Price display skeleton
    price: `<span class="skeleton skeleton-price"></span>`,

    // Text line skeleton
    text: `<div class="skeleton skeleton-text"></div>`,
    textSm: `<div class="skeleton skeleton-text skeleton-text-sm"></div>`,
    textMd: `<div class="skeleton skeleton-text skeleton-text-md"></div>`,

    // Card skeleton
    card: `
      <div class="skeleton-card-wrapper">
        <div class="skeleton skeleton-text skeleton-text-sm" style="width: 100px; margin-bottom: 8px;"></div>
        <div class="skeleton skeleton-text skeleton-text-lg"></div>
        <div class="skeleton skeleton-text skeleton-text-md" style="margin-top: 12px;"></div>
      </div>
    `,

    // Chart skeleton
    chart: `<div class="skeleton skeleton-chart"></div>`,

    // Stat card skeleton
    stat: `
      <div class="skeleton-quick-stat">
        <div class="skeleton skeleton-label"></div>
        <div class="skeleton skeleton-value"></div>
      </div>
    `,

    // Table row skeleton
    tableRow: `
      <tr class="skeleton-row">
        <td><div class="skeleton skeleton-text" style="width: 80px;"></div></td>
        <td><div class="skeleton skeleton-text" style="width: 60px;"></div></td>
        <td><div class="skeleton skeleton-text" style="width: 100px;"></div></td>
        <td><div class="skeleton skeleton-badge"></div></td>
      </tr>
    `,

    // Signal card skeleton
    signal: `
      <div class="skeleton-signal">
        <div class="skeleton skeleton-badge" style="width: 80px; height: 24px;"></div>
        <div class="skeleton skeleton-text" style="width: 120px; margin-top: 8px;"></div>
        <div class="skeleton skeleton-text skeleton-text-sm" style="margin-top: 4px;"></div>
      </div>
    `,

    // Alert item skeleton
    alert: `
      <div class="skeleton-alert" style="display: flex; gap: 12px; padding: 12px;">
        <div class="skeleton" style="width: 40px; height: 40px; border-radius: 8px;"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
          <div class="skeleton skeleton-text skeleton-text-sm" style="margin-top: 4px;"></div>
        </div>
      </div>
    `
  };

  // Track loading states
  const loadingStates = new Map();

  /**
   * Show skeleton loading state for an element
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} template - Template type from TEMPLATES
   * @param {number} count - Number of skeleton items to show
   */
  function show(element, template = 'text', count = 1) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    // Store original content
    const originalContent = el.innerHTML;
    loadingStates.set(el, {
      originalContent,
      startTime: Date.now()
    });

    // Add loading class
    el.classList.add(LOADING_CLASS);
    el.classList.remove(LOADED_CLASS);

    // Insert skeleton content
    const templateHtml = TEMPLATES[template] || TEMPLATES.text;
    el.innerHTML = Array(count).fill(templateHtml).join('');

    // Announce loading state for accessibility
    el.setAttribute('aria-busy', 'true');
  }

  /**
   * Hide skeleton and restore/update content
   * @param {HTMLElement|string} element - Element or selector
   * @param {string|null} newContent - New content (null to restore original)
   */
  function hide(element, newContent = null) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    const state = loadingStates.get(el);
    if (!state) {
      el.classList.remove(LOADING_CLASS);
      el.classList.add(LOADED_CLASS);
      if (newContent !== null) el.innerHTML = newContent;
      return;
    }

    // Ensure minimum loading time to prevent flashing
    const elapsed = Date.now() - state.startTime;
    const delay = Math.max(0, MIN_LOADING_TIME - elapsed);

    setTimeout(() => {
      el.classList.remove(LOADING_CLASS);
      el.classList.add(LOADED_CLASS);
      el.innerHTML = newContent !== null ? newContent : state.originalContent;
      el.setAttribute('aria-busy', 'false');
      loadingStates.delete(el);
    }, delay);
  }

  /**
   * Show skeleton for multiple elements
   * @param {string} selector - CSS selector for elements
   * @param {string} template - Template type
   */
  function showAll(selector, template = 'text') {
    document.querySelectorAll(selector).forEach(el => show(el, template));
  }

  /**
   * Hide skeleton for multiple elements
   * @param {string} selector - CSS selector for elements
   */
  function hideAll(selector) {
    document.querySelectorAll(selector).forEach(el => hide(el));
  }

  /**
   * Create inline skeleton element
   * @param {string} template - Template type
   * @returns {HTMLElement}
   */
  function create(template = 'text') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = TEMPLATES[template] || TEMPLATES.text;
    return wrapper.firstElementChild;
  }

  /**
   * Wrap async operation with skeleton loading
   * @param {HTMLElement|string} element - Element to show skeleton in
   * @param {Function} asyncFn - Async function to execute
   * @param {string} template - Template type
   * @returns {Promise} - Result of asyncFn
   */
  async function wrap(element, asyncFn, template = 'text') {
    show(element, template);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      hide(element);
    }
  }

  /**
   * Apply skeleton to page sections during initial load
   */
  function initPageSkeletons() {
    // Find elements with data-skeleton attribute
    document.querySelectorAll('[data-skeleton]').forEach(el => {
      const template = el.dataset.skeleton || 'text';
      const count = parseInt(el.dataset.skeletonCount) || 1;
      show(el, template, count);
    });
  }

  /**
   * Register custom skeleton template
   * @param {string} name - Template name
   * @param {string} html - Template HTML
   */
  function registerTemplate(name, html) {
    TEMPLATES[name] = html;
  }

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageSkeletons);
  } else {
    initPageSkeletons();
  }

  // Expose public API
  window.SkeletonLoader = {
    show,
    hide,
    showAll,
    hideAll,
    create,
    wrap,
    registerTemplate,
    templates: TEMPLATES
  };

})();
