// Accessible Toast Notification System
// Replaces browser alert() with WCAG-compliant notifications

(function() {
  'use strict';

  // Create toast container if it doesn't exist
  function getToastContainer() {
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  // Show toast notification
  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;

    var container = getToastContainer();
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    var iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    // Escape message to prevent XSS
    var safeMessage = typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml(message) : message;
    toast.innerHTML = '<span class="toast-icon" aria-hidden="true">' + (iconMap[type] || 'ℹ') + '</span>' +
      '<span class="toast-message">' + safeMessage + '</span>' +
      '<button class="toast-close" aria-label="Dismiss notification" type="button">&times;</button>';

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(function() {
      toast.classList.add('toast-visible');
    });

    // Close button
    var closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', function() {
      dismissToast(toast);
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(function() {
        dismissToast(toast);
      }, duration);
    }

    return toast;
  }

  function dismissToast(toast) {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    setTimeout(function() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // Accessible confirm modal
  function showConfirm(message, onConfirm, onCancel) {
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'confirm-title');

    // Escape message to prevent XSS
    var safeConfirmMsg = typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml(message) : message;
    overlay.innerHTML = '<div class="confirm-modal">' +
      '<p id="confirm-title" class="confirm-message">' + safeConfirmMsg + '</p>' +
      '<div class="confirm-buttons">' +
      '<button class="confirm-btn confirm-btn-cancel" type="button">Cancel</button>' +
      '<button class="confirm-btn confirm-btn-confirm" type="button">Continue</button>' +
      '</div></div>';

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    var confirmBtn = overlay.querySelector('.confirm-btn-confirm');
    var cancelBtn = overlay.querySelector('.confirm-btn-cancel');

    // Focus the confirm button
    setTimeout(function() {
      confirmBtn.focus();
    }, 100);

    function close(result) {
      overlay.classList.add('confirm-hiding');
      document.body.classList.remove('modal-open');
      setTimeout(function() {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 200);
      return result;
    }

    confirmBtn.addEventListener('click', function() {
      close(true);
      if (onConfirm) onConfirm();
    });

    cancelBtn.addEventListener('click', function() {
      close(false);
      if (onCancel) onCancel();
    });

    // Close on Escape
    overlay.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        close(false);
        if (onCancel) onCancel();
      }
    });

    // Trap focus within modal
    overlay.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        var focusable = overlay.querySelectorAll('button');
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    return overlay;
  }

  // Export to window
  window.Toast = {
    show: showToast,
    success: function(msg, duration) { return showToast(msg, 'success', duration); },
    error: function(msg, duration) { return showToast(msg, 'error', duration); },
    warning: function(msg, duration) { return showToast(msg, 'warning', duration); },
    info: function(msg, duration) { return showToast(msg, 'info', duration); },
    confirm: showConfirm
  };

})();
