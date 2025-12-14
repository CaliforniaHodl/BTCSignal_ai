// Keyboard Shortcuts System for BTCSignal.ai
// Provides vim-style keyboard navigation and command palette

const KeyboardShortcuts = (function() {
  'use strict';

  // ========== STATE ==========

  let shortcuts = new Map();
  let chordBuffer = null;
  let chordTimeout = null;
  const CHORD_TIMEOUT_MS = 1000; // Time window for chord detection
  let enabled = true;
  let helpModalVisible = false;

  // ========== DEFAULT SHORTCUTS ==========

  const DEFAULT_SHORTCUTS = [
    // Command palette
    {
      key: 'k',
      modifiers: ['ctrl', 'meta'], // Ctrl on Windows/Linux, Cmd on Mac
      description: 'Quick search / Command palette',
      action: () => openCommandPalette(),
      global: true
    },

    // Navigation - Vim-style two-key shortcuts (G + key)
    {
      key: 'h',
      chord: 'g',
      description: 'Go to Home',
      action: () => navigateTo('/'),
      global: true
    },
    {
      key: 'd',
      chord: 'g',
      description: 'Go to Dashboard',
      action: () => navigateTo('/dashboard/'),
      global: true
    },
    {
      key: 'a',
      chord: 'g',
      description: 'Go to Alerts',
      action: () => navigateTo('/alerts/'),
      global: true
    },
    {
      key: 'c',
      chord: 'g',
      description: 'Go to Charts',
      action: () => navigateTo('/charts/'),
      global: true
    },

    // Modal controls
    {
      key: 'Escape',
      description: 'Close modals / Cancel',
      action: () => closeTopModal(),
      global: true
    },

    // Help
    {
      key: '?',
      shift: true, // Shift+/ = ?
      description: 'Show keyboard shortcuts help',
      action: () => showHelp(),
      global: true
    }
  ];

  // ========== INITIALIZATION ==========

  function init() {
    // Register default shortcuts
    DEFAULT_SHORTCUTS.forEach(shortcut => {
      registerShortcut(shortcut);
    });

    // Set up global keyboard listener
    document.addEventListener('keydown', handleKeyDown, true);

    // Log initialization in debug mode
    if (typeof BTCSAIShared !== 'undefined') {
      BTCSAIShared.debug('KeyboardShortcuts initialized with', shortcuts.size, 'shortcuts');
    }
  }

  // ========== SHORTCUT REGISTRATION ==========

  /**
   * Register a keyboard shortcut
   * @param {Object} shortcut - { key, modifiers?, chord?, shift?, description, action, global? }
   */
  function registerShortcut(shortcut) {
    if (!shortcut.key || !shortcut.action) {
      console.warn('Invalid shortcut:', shortcut);
      return;
    }

    const id = generateShortcutId(shortcut);
    shortcuts.set(id, {
      ...shortcut,
      id: id
    });
  }

  /**
   * Unregister a keyboard shortcut
   * @param {string} id - Shortcut ID (from generateShortcutId)
   */
  function unregisterShortcut(id) {
    shortcuts.delete(id);
  }

  /**
   * Generate unique ID for a shortcut
   */
  function generateShortcutId(shortcut) {
    const parts = [];

    if (shortcut.chord) {
      parts.push(`chord:${shortcut.chord}`);
    }

    if (shortcut.modifiers && shortcut.modifiers.length > 0) {
      parts.push(...shortcut.modifiers.sort());
    }

    if (shortcut.shift) {
      parts.push('shift');
    }

    parts.push(shortcut.key.toLowerCase());

    return parts.join('+');
  }

  // ========== EVENT HANDLING ==========

  function handleKeyDown(e) {
    // Don't intercept if shortcuts are disabled
    if (!enabled) return;

    // Don't intercept if user is typing in an input/textarea
    const target = e.target;
    const isInput = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable;

    // Allow Escape and Ctrl/Cmd+K even in inputs
    const isGlobalShortcut = e.key === 'Escape' ||
                              ((e.ctrlKey || e.metaKey) && e.key === 'k');

    if (isInput && !isGlobalShortcut) return;

    // Check for chord shortcuts first
    if (chordBuffer) {
      handleChordKey(e);
      return;
    }

    // Check if this key starts a chord
    const startsChord = checkForChordStart(e);
    if (startsChord) {
      e.preventDefault();
      return;
    }

    // Check for direct shortcuts
    const shortcut = findMatchingShortcut(e);
    if (shortcut) {
      e.preventDefault();
      e.stopPropagation();

      try {
        shortcut.action(e);
      } catch (error) {
        console.error('Shortcut action failed:', error);
      }
    }
  }

  /**
   * Check if key starts a chord sequence
   */
  function checkForChordStart(e) {
    // Only check single keys without modifiers for chord starts
    if (e.ctrlKey || e.metaKey || e.altKey) return false;

    const key = e.key.toLowerCase();

    // Check if any shortcuts use this as a chord
    for (let [id, shortcut] of shortcuts) {
      if (shortcut.chord && shortcut.chord.toLowerCase() === key) {
        // Start chord buffer
        chordBuffer = key;

        // Clear any existing timeout
        if (chordTimeout) {
          clearTimeout(chordTimeout);
        }

        // Set timeout to clear chord buffer
        chordTimeout = setTimeout(() => {
          chordBuffer = null;
          chordTimeout = null;
        }, CHORD_TIMEOUT_MS);

        // Show visual feedback
        showChordIndicator(key);

        return true;
      }
    }

    return false;
  }

  /**
   * Handle second key in a chord sequence
   */
  function handleChordKey(e) {
    const key = e.key.toLowerCase();

    // Build chord shortcut ID
    const chordId = `chord:${chordBuffer}+${key}`;

    // Find matching chord shortcut
    const shortcut = shortcuts.get(chordId);

    // Clear chord buffer and timeout
    clearChordBuffer();

    if (shortcut) {
      e.preventDefault();
      e.stopPropagation();

      try {
        shortcut.action(e);
      } catch (error) {
        console.error('Chord shortcut action failed:', error);
      }
    }
  }

  /**
   * Find shortcut matching the key event
   */
  function findMatchingShortcut(e) {
    const key = e.key.toLowerCase();

    for (let [id, shortcut] of shortcuts) {
      // Skip chord shortcuts
      if (shortcut.chord) continue;

      // Check key match
      if (shortcut.key.toLowerCase() !== key) continue;

      // Check shift modifier
      if (shortcut.shift && !e.shiftKey) continue;
      if (!shortcut.shift && shortcut.key !== key && e.shiftKey) continue;

      // Check modifiers (ctrl, meta, alt)
      if (shortcut.modifiers && shortcut.modifiers.length > 0) {
        const hasCtrl = shortcut.modifiers.includes('ctrl') && e.ctrlKey;
        const hasMeta = shortcut.modifiers.includes('meta') && e.metaKey;
        const hasAlt = shortcut.modifiers.includes('alt') && e.altKey;

        // At least one modifier must match
        if (!hasCtrl && !hasMeta && !hasAlt) continue;
      } else {
        // No modifiers required, make sure none are pressed
        if (e.ctrlKey || e.metaKey || e.altKey) continue;
      }

      return shortcut;
    }

    return null;
  }

  /**
   * Clear chord buffer and timeout
   */
  function clearChordBuffer() {
    chordBuffer = null;
    if (chordTimeout) {
      clearTimeout(chordTimeout);
      chordTimeout = null;
    }
    hideChordIndicator();
  }

  // ========== VISUAL FEEDBACK ==========

  function showChordIndicator(key) {
    let indicator = document.getElementById('chord-indicator');

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'chord-indicator';
      indicator.className = 'chord-indicator';
      document.body.appendChild(indicator);
    }

    indicator.textContent = key.toUpperCase();
    indicator.style.display = 'block';

    // Trigger animation
    requestAnimationFrame(() => {
      indicator.classList.add('visible');
    });
  }

  function hideChordIndicator() {
    const indicator = document.getElementById('chord-indicator');
    if (indicator) {
      indicator.classList.remove('visible');
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 200);
    }
  }

  // ========== ACTIONS ==========

  function navigateTo(path) {
    window.location.href = path;
  }

  function closeTopModal() {
    // Close help modal if visible
    if (helpModalVisible) {
      hideHelp();
      return;
    }

    // Try to close Bootstrap modal
    const modals = document.querySelectorAll('.modal.show');
    if (modals.length > 0) {
      const topModal = modals[modals.length - 1];
      const closeBtn = topModal.querySelector('.close, .btn-close, [data-dismiss="modal"]');
      if (closeBtn) {
        closeBtn.click();
        return;
      }
    }

    // Try to close confirm overlay
    const confirmOverlay = document.querySelector('.confirm-overlay');
    if (confirmOverlay) {
      const cancelBtn = confirmOverlay.querySelector('.confirm-btn-cancel');
      if (cancelBtn) {
        cancelBtn.click();
        return;
      }
    }

    // Try to close any element with data-keyboard-close
    const closeableElements = document.querySelectorAll('[data-keyboard-close]');
    if (closeableElements.length > 0) {
      closeableElements[closeableElements.length - 1].style.display = 'none';
    }
  }

  function openCommandPalette() {
    // Show toast notification (command palette not implemented yet)
    if (typeof Toast !== 'undefined') {
      Toast.info('Command palette coming soon! Use ? to see all shortcuts.');
    } else {
      alert('Command palette coming soon! Press ? to see all shortcuts.');
    }
  }

  // ========== HELP MODAL ==========

  function showHelp() {
    if (helpModalVisible) return;

    const modal = createHelpModal();
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    helpModalVisible = true;

    // Focus the close button
    setTimeout(() => {
      const closeBtn = modal.querySelector('.shortcuts-modal-close');
      if (closeBtn) closeBtn.focus();
    }, 100);

    // Trap focus within modal
    modal.addEventListener('keydown', trapFocus);
  }

  function hideHelp() {
    const modal = document.getElementById('shortcuts-help-modal');
    if (modal) {
      modal.classList.add('hiding');
      document.body.classList.remove('modal-open');

      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 200);
    }

    helpModalVisible = false;
  }

  function createHelpModal() {
    const modal = document.createElement('div');
    modal.id = 'shortcuts-help-modal';
    modal.className = 'shortcuts-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'shortcuts-modal-title');

    // Group shortcuts by category
    const groups = {
      'Navigation': [],
      'Commands': [],
      'Controls': []
    };

    shortcuts.forEach(shortcut => {
      if (shortcut.chord) {
        groups['Navigation'].push(shortcut);
      } else if (shortcut.modifiers && shortcut.modifiers.length > 0) {
        groups['Commands'].push(shortcut);
      } else {
        groups['Controls'].push(shortcut);
      }
    });

    let html = `
      <div class="shortcuts-modal">
        <div class="shortcuts-modal-header">
          <h2 id="shortcuts-modal-title">Keyboard Shortcuts</h2>
          <button class="shortcuts-modal-close" aria-label="Close shortcuts help" type="button">&times;</button>
        </div>
        <div class="shortcuts-modal-body">
    `;

    // Render each group
    Object.entries(groups).forEach(([category, items]) => {
      if (items.length === 0) return;

      html += `<div class="shortcuts-group">`;
      html += `<h3 class="shortcuts-group-title">${category}</h3>`;
      html += `<div class="shortcuts-list">`;

      items.forEach(shortcut => {
        html += `
          <div class="shortcut-item">
            <div class="shortcut-keys">
              ${renderShortcutKeys(shortcut)}
            </div>
            <div class="shortcut-description">${escapeHtml(shortcut.description)}</div>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    html += `
        </div>
        <div class="shortcuts-modal-footer">
          <p class="shortcuts-tip">Tip: Press <kbd>Escape</kbd> to close this dialog</p>
        </div>
      </div>
    `;

    modal.innerHTML = html;

    // Add close button handler
    const closeBtn = modal.querySelector('.shortcuts-modal-close');
    closeBtn.addEventListener('click', hideHelp);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideHelp();
      }
    });

    return modal;
  }

  function renderShortcutKeys(shortcut) {
    let keys = [];

    // Chord
    if (shortcut.chord) {
      keys.push(`<kbd>${shortcut.chord.toUpperCase()}</kbd>`);
      keys.push(`<span class="shortcuts-then">then</span>`);
    }

    // Modifiers
    if (shortcut.modifiers && shortcut.modifiers.length > 0) {
      // Use platform-appropriate modifier names
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      shortcut.modifiers.forEach(mod => {
        if (mod === 'meta' && !isMac) return; // Skip Cmd on non-Mac
        if (mod === 'ctrl' && isMac) return; // Skip Ctrl on Mac (use Cmd)

        const label = mod === 'meta' ? '\u2318' : // ⌘
                     mod === 'ctrl' ? 'Ctrl' :
                     mod === 'alt' ? 'Alt' : mod;
        keys.push(`<kbd>${label}</kbd>`);
      });
    }

    // Shift
    if (shortcut.shift) {
      keys.push(`<kbd>Shift</kbd>`);
    }

    // Main key
    const keyLabel = shortcut.key === ' ' ? 'Space' :
                     shortcut.key.length === 1 ? shortcut.key.toUpperCase() :
                     shortcut.key;
    keys.push(`<kbd>${escapeHtml(keyLabel)}</kbd>`);

    return keys.join(' ');
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;

    const modal = document.getElementById('shortcuts-help-modal');
    if (!modal) return;

    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ========== UTILITIES ==========

  function escapeHtml(text) {
    if (typeof SecurityUtils !== 'undefined' && SecurityUtils.escapeHtml) {
      return SecurityUtils.escapeHtml(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Enable/disable shortcuts globally
   */
  function setEnabled(state) {
    enabled = !!state;
  }

  /**
   * Check if shortcuts are enabled
   */
  function isEnabled() {
    return enabled;
  }

  /**
   * Get all registered shortcuts
   */
  function getShortcuts() {
    return Array.from(shortcuts.values());
  }

  // ========== PUBLIC API ==========

  const api = {
    // Registration
    register: registerShortcut,
    unregister: unregisterShortcut,

    // Help modal
    showHelp: showHelp,
    hideHelp: hideHelp,

    // State
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    isEnabled: isEnabled,

    // Query
    getShortcuts: getShortcuts,

    // Internal (exposed for testing)
    _generateId: generateShortcutId,
    _clearChordBuffer: clearChordBuffer
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return api;
})();

// Export to window
if (typeof window !== 'undefined') {
  window.KeyboardShortcuts = KeyboardShortcuts;
}
