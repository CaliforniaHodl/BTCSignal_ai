// BTC Signal AI - Error Tracking System
// Lightweight error tracking solution for production monitoring
// Captures JS errors, promise rejections, and console.error calls

const BTCErrors = (function() {
  'use strict';

  // ========== CONFIGURATION ==========

  const MAX_ERRORS = 50; // Store last 50 errors
  const STORAGE_KEY = 'btcsai_error_log';
  const DEBUG = window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                localStorage.getItem('BTCSAI_DEBUG') === 'true';

  // Error severity levels
  const SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  // ========== STATE ==========

  let errorLog = [];
  let errorCount = {};
  let isInitialized = false;

  // ========== INITIALIZATION ==========

  /**
   * Initialize error tracking system
   */
  function init() {
    if (isInitialized) return;

    // Load existing errors from localStorage
    loadErrorLog();

    // Setup error handlers
    setupWindowErrorHandler();
    setupUnhandledRejectionHandler();
    setupConsoleErrorInterceptor();

    isInitialized = true;

    if (DEBUG) {
      console.log('[BTCErrors] Error tracking initialized. Access logs via BTCErrors.view()');
    }
  }

  /**
   * Load error log from localStorage
   */
  function loadErrorLog() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        errorLog = data.errors || [];
        errorCount = data.counts || {};
      }
    } catch (e) {
      // localStorage might be disabled or corrupted
      errorLog = [];
      errorCount = {};
    }
  }

  /**
   * Save error log to localStorage
   */
  function saveErrorLog() {
    try {
      // Keep only the last MAX_ERRORS entries
      if (errorLog.length > MAX_ERRORS) {
        errorLog = errorLog.slice(-MAX_ERRORS);
      }

      const data = {
        errors: errorLog,
        counts: errorCount,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage might be full or disabled
      if (DEBUG) {
        console.warn('[BTCErrors] Failed to save error log:', e.message);
      }
    }
  }

  // ========== ERROR HANDLERS ==========

  /**
   * Setup window.onerror handler for uncaught JavaScript errors
   */
  function setupWindowErrorHandler() {
    const originalHandler = window.onerror;

    window.onerror = function(message, source, lineno, colno, error) {
      // Capture the error
      captureError({
        type: 'uncaught_error',
        message: message,
        source: source,
        line: lineno,
        column: colno,
        stack: error ? error.stack : null,
        severity: SEVERITY.HIGH
      });

      // Call original handler if it exists
      if (originalHandler && typeof originalHandler === 'function') {
        return originalHandler.apply(this, arguments);
      }

      // Return false to allow default error handling
      return false;
    };
  }

  /**
   * Setup unhandledrejection handler for promise rejections
   */
  function setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', function(event) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : null;

      captureError({
        type: 'unhandled_rejection',
        message: message,
        stack: stack,
        severity: SEVERITY.MEDIUM
      });

      if (DEBUG) {
        console.error('[BTCErrors] Unhandled promise rejection:', reason);
      }
    });
  }

  /**
   * Setup console.error interceptor
   */
  function setupConsoleErrorInterceptor() {
    const originalConsoleError = console.error;

    console.error = function(...args) {
      // Build error message from arguments
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message;
        } else if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      // Get stack trace if available
      let stack = null;
      for (let arg of args) {
        if (arg instanceof Error && arg.stack) {
          stack = arg.stack;
          break;
        }
      }

      // Capture the error
      captureError({
        type: 'console_error',
        message: message,
        stack: stack,
        severity: SEVERITY.LOW
      });

      // Call original console.error
      originalConsoleError.apply(console, args);
    };
  }

  // ========== ERROR CAPTURE ==========

  /**
   * Capture and store an error
   * @param {Object} errorData - Error information
   */
  function captureError(errorData) {
    const error = {
      id: generateErrorId(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      ...errorData
    };

    // Track error frequency
    const errorKey = getErrorKey(error);
    if (!errorCount[errorKey]) {
      errorCount[errorKey] = {
        count: 0,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        message: error.message,
        type: error.type
      };
    }
    errorCount[errorKey].count++;
    errorCount[errorKey].lastSeen = error.timestamp;

    // Add frequency to error object
    error.frequency = errorCount[errorKey].count;

    // Add to log
    errorLog.push(error);

    // Save to localStorage
    saveErrorLog();

    // Log to console in development
    if (DEBUG) {
      console.error('[BTCErrors] Captured error:', error);
    }
  }

  /**
   * Generate unique error ID
   * @returns {string}
   */
  function generateErrorId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate error key for frequency tracking
   * @param {Object} error
   * @returns {string}
   */
  function getErrorKey(error) {
    // Create key from type + message + first line of stack
    let key = error.type + '::' + error.message;

    if (error.stack) {
      // Extract first meaningful line from stack trace
      const stackLines = error.stack.split('\n');
      if (stackLines.length > 1) {
        key += '::' + stackLines[1].trim();
      }
    } else if (error.source && error.line) {
      key += '::' + error.source + ':' + error.line;
    }

    return key;
  }

  // ========== PUBLIC API - ERROR LOGGING ==========

  /**
   * Manually log an error
   * @param {string|Error} error - Error message or Error object
   * @param {Object} context - Additional context
   * @param {string} severity - Error severity level
   */
  function logError(error, context = {}, severity = SEVERITY.MEDIUM) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;

    captureError({
      type: 'manual',
      message: message,
      stack: stack,
      context: context,
      severity: severity
    });
  }

  /**
   * Log a warning (lower severity)
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  function logWarning(message, context = {}) {
    captureError({
      type: 'warning',
      message: String(message),
      context: context,
      severity: SEVERITY.LOW
    });
  }

  /**
   * Log a critical error
   * @param {string|Error} error - Error message or Error object
   * @param {Object} context - Additional context
   */
  function logCritical(error, context = {}) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;

    captureError({
      type: 'critical',
      message: message,
      stack: stack,
      context: context,
      severity: SEVERITY.CRITICAL
    });
  }

  // ========== USER-FRIENDLY ERROR DISPLAY ==========

  /**
   * Show user-friendly error message
   * @param {string} message - User-friendly error message
   * @param {Object} technicalError - Technical error details (optional)
   */
  function showUserError(message, technicalError = null) {
    // Log the technical error if provided
    if (technicalError) {
      logError(technicalError, { userMessage: message });
    }

    // Show user-friendly message using Toast if available
    if (typeof Toast !== 'undefined' && Toast.error) {
      Toast.error(message, 5000);
    } else {
      // Fallback to alert if Toast is not available
      alert(message);
    }
  }

  /**
   * Show user-friendly warning message
   * @param {string} message - User-friendly warning message
   */
  function showUserWarning(message) {
    if (typeof Toast !== 'undefined' && Toast.warning) {
      Toast.warning(message, 4000);
    } else {
      alert(message);
    }
  }

  // ========== ADMIN ERROR VIEWER ==========

  /**
   * View error log in console (admin-only)
   * @param {Object} options - Viewing options
   */
  function viewErrors(options = {}) {
    const {
      limit = 20,
      type = null,
      severity = null,
      since = null
    } = options;

    // Filter errors
    let filtered = [...errorLog];

    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }

    if (since) {
      const sinceDate = new Date(since);
      filtered = filtered.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    filtered = filtered.slice(0, limit);

    // Display in console
    console.group('%c[BTCErrors] Error Log', 'color: #f7931a; font-weight: bold; font-size: 14px;');
    console.log('%cTotal errors stored:', 'font-weight: bold;', errorLog.length);
    console.log('%cShowing:', 'font-weight: bold;', filtered.length);
    console.log('');

    filtered.forEach((error, index) => {
      const color = getSeverityColor(error.severity);
      console.groupCollapsed(
        `%c[${index + 1}] ${error.type.toUpperCase()} - ${error.message.substring(0, 80)}`,
        `color: ${color}; font-weight: bold;`
      );
      console.log('%cTimestamp:', 'font-weight: bold;', error.timestamp);
      console.log('%cURL:', 'font-weight: bold;', error.pathname);
      console.log('%cSeverity:', 'font-weight: bold;', error.severity);
      console.log('%cFrequency:', 'font-weight: bold;', error.frequency);

      if (error.stack) {
        console.log('%cStack trace:', 'font-weight: bold;');
        console.log(error.stack);
      }

      if (error.context) {
        console.log('%cContext:', 'font-weight: bold;', error.context);
      }

      console.log('%cFull error:', 'font-weight: bold;', error);
      console.groupEnd();
    });

    console.groupEnd();

    // Return filtered errors for further processing
    return filtered;
  }

  /**
   * Get color for severity level
   * @param {string} severity
   * @returns {string}
   */
  function getSeverityColor(severity) {
    switch (severity) {
      case SEVERITY.CRITICAL:
        return '#dc3545'; // Red
      case SEVERITY.HIGH:
        return '#fd7e14'; // Orange
      case SEVERITY.MEDIUM:
        return '#ffc107'; // Yellow
      case SEVERITY.LOW:
        return '#17a2b8'; // Blue
      default:
        return '#6c757d'; // Gray
    }
  }

  /**
   * View error statistics
   */
  function viewStats() {
    console.group('%c[BTCErrors] Statistics', 'color: #f7931a; font-weight: bold; font-size: 14px;');

    // Total errors
    console.log('%cTotal errors logged:', 'font-weight: bold;', errorLog.length);

    // Errors by type
    const byType = {};
    errorLog.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });
    console.log('%cErrors by type:', 'font-weight: bold;', byType);

    // Errors by severity
    const bySeverity = {};
    errorLog.forEach(e => {
      bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
    });
    console.log('%cErrors by severity:', 'font-weight: bold;', bySeverity);

    // Most frequent errors
    const frequent = Object.entries(errorCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    console.log('%cTop 10 most frequent errors:', 'font-weight: bold;');
    frequent.forEach(([key, data]) => {
      console.log(`${data.count}x - ${data.type}: ${data.message.substring(0, 80)}`);
    });

    console.groupEnd();
  }

  /**
   * Clear error log
   * @param {boolean} confirm - Require confirmation
   */
  function clearErrors(confirm = true) {
    if (confirm) {
      const confirmed = window.confirm('Are you sure you want to clear all error logs? This cannot be undone.');
      if (!confirmed) return;
    }

    errorLog = [];
    errorCount = {};
    saveErrorLog();

    console.log('%c[BTCErrors] Error log cleared', 'color: #28a745; font-weight: bold;');
  }

  /**
   * Export error log as JSON
   * @returns {Object}
   */
  function exportErrors() {
    const data = {
      errors: errorLog,
      counts: errorCount,
      exported: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console
    console.log('%c[BTCErrors] Error log exported', 'color: #28a745; font-weight: bold;');
    console.log('Copy this data:', JSON.stringify(data, null, 2));

    // Also create downloadable JSON file
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'btcsai-errors-' + Date.now() + '.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    return data;
  }

  /**
   * Get error summary for dashboard
   * @returns {Object}
   */
  function getSummary() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = errorLog.filter(e => new Date(e.timestamp) >= last24h);

    return {
      total: errorLog.length,
      last24h: recent.length,
      byType: errorLog.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {}),
      bySeverity: errorLog.reduce((acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
      }, {}),
      topErrors: Object.entries(errorCount)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([key, data]) => ({
          message: data.message,
          type: data.type,
          count: data.count,
          firstSeen: data.firstSeen,
          lastSeen: data.lastSeen
        }))
    };
  }

  // ========== INITIALIZATION ON LOAD ==========

  // Initialize immediately (before other scripts)
  init();

  // ========== PUBLIC API ==========

  return {
    // Error logging
    logError: logError,
    logWarning: logWarning,
    logCritical: logCritical,

    // User-friendly error display
    showUserError: showUserError,
    showUserWarning: showUserWarning,

    // Admin viewing (console commands)
    view: viewErrors,
    stats: viewStats,
    clear: clearErrors,
    export: exportErrors,
    summary: getSummary,

    // Severity levels (for manual logging)
    SEVERITY: SEVERITY,

    // State access (read-only)
    getLog: function() { return [...errorLog]; },
    getCount: function() { return { ...errorCount }; }
  };
})();

// Export for global use
if (typeof window !== 'undefined') {
  window.BTCErrors = BTCErrors;
}
