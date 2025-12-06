// Security Utilities - XSS Prevention
// Add to pages that handle user input or API responses

(function() {
  'use strict';

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} str - The string to escape
   * @returns {string} - Escaped string safe for innerHTML
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Escape an array of strings
   * @param {Array} arr - Array of strings to escape
   * @returns {Array} - Array of escaped strings
   */
  function escapeArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function(item) {
      return escapeHtml(item);
    });
  }

  /**
   * Safely set innerHTML with escaped content
   * @param {Element} el - The element to set
   * @param {string} html - The HTML content (will be escaped)
   */
  function safeInnerHTML(el, html) {
    if (!el) return;
    el.innerHTML = escapeHtml(html);
  }

  /**
   * Create safe HTML from template with escaped values
   * @param {string} template - HTML template with {key} placeholders
   * @param {Object} values - Values to interpolate (will be escaped)
   * @returns {string} - Safe HTML string
   */
  function safeTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, function(match, key) {
      return values.hasOwnProperty(key) ? escapeHtml(values[key]) : match;
    });
  }

  /**
   * Validate and sanitize URL (prevent javascript: protocol)
   * @param {string} url - URL to validate
   * @returns {string|null} - Safe URL or null if invalid
   */
  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;

    var trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')) {
      return null;
    }

    return url;
  }

  // Export to window
  window.SecurityUtils = {
    escapeHtml: escapeHtml,
    escapeArray: escapeArray,
    safeInnerHTML: safeInnerHTML,
    safeTemplate: safeTemplate,
    sanitizeUrl: sanitizeUrl
  };

})();
