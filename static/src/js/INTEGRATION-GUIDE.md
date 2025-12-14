# Keyboard Shortcuts - Integration Guide

## Quick Start (5 minutes)

### Step 1: Add CSS to your HTML template

Add this line in the `<head>` section of your HTML:

```html
<link rel="stylesheet" href="/static/src/css/keyboard-shortcuts.css">
```

### Step 2: Add JavaScript before closing `</body>`

```html
<!-- Dependencies (optional but recommended) -->
<script src="/static/src/js/security-utils.js"></script>
<script src="/static/src/js/shared.js"></script>
<script src="/static/src/js/toast.js"></script>

<!-- Keyboard Shortcuts -->
<script src="/static/src/js/keyboard-shortcuts.js"></script>
```

### Step 3: That's it!

The keyboard shortcuts system will automatically initialize. Users can press `?` to see available shortcuts.

---

## Integration Examples

### Example 1: Basic HTML Page

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page - BTCSignal.ai</title>

  <!-- CSS -->
  <link rel="stylesheet" href="/static/src/css/shared.css">
  <link rel="stylesheet" href="/static/src/css/keyboard-shortcuts.css">
</head>
<body>
  <main>
    <!-- Your content here -->
  </main>

  <!-- JavaScript -->
  <script src="/static/src/js/shared.js"></script>
  <script src="/static/src/js/toast.js"></script>
  <script src="/static/src/js/keyboard-shortcuts.js"></script>
</body>
</html>
```

### Example 2: Hugo Template

If you're using Hugo, add to your base template:

```html
{{ define "main" }}
  <!-- Your content -->
{{ end }}

{{ define "scripts" }}
  <script src="/static/src/js/shared.js"></script>
  <script src="/static/src/js/toast.js"></script>
  <script src="/static/src/js/keyboard-shortcuts.js"></script>

  <!-- Page-specific scripts -->
  {{ block "page-scripts" . }}{{ end }}
{{ end }}
```

### Example 3: Dashboard Integration

For dashboard pages, add custom shortcuts:

```html
<script src="/static/src/js/keyboard-shortcuts.js"></script>
<script>
  // Add dashboard-specific shortcuts
  KeyboardShortcuts.register({
    key: 'r',
    description: 'Refresh data',
    action: () => {
      refreshDashboardData();
      Toast.info('Refreshing data...');
    }
  });

  KeyboardShortcuts.register({
    key: 'e',
    chord: 'g',
    description: 'Go to Exchange',
    action: () => window.location.href = '/exchange/'
  });
</script>
```

---

## Custom Shortcuts for Specific Pages

### Alert Page Shortcuts

```javascript
// /alerts/ page
KeyboardShortcuts.register({
  key: 'n',
  description: 'New alert',
  action: () => openNewAlertModal()
});

KeyboardShortcuts.register({
  key: 't',
  chord: 'g',
  description: 'Toggle all alerts',
  action: () => toggleAllAlerts()
});
```

### Chart Page Shortcuts

```javascript
// /charts/ page
KeyboardShortcuts.register({
  key: '1',
  description: 'Switch to 1H timeframe',
  action: () => setTimeframe('1h')
});

KeyboardShortcuts.register({
  key: '4',
  description: 'Switch to 4H timeframe',
  action: () => setTimeframe('4h')
});

KeyboardShortcuts.register({
  key: 'f',
  description: 'Toggle fullscreen',
  action: () => toggleFullscreen()
});
```

### Search/Filter Shortcuts

```javascript
// Pages with search functionality
KeyboardShortcuts.register({
  key: '/',
  description: 'Focus search',
  action: () => {
    const searchInput = document.querySelector('#search-input');
    if (searchInput) searchInput.focus();
  }
});

KeyboardShortcuts.register({
  key: 'f',
  modifiers: ['ctrl'],
  description: 'Open filter panel',
  action: () => toggleFilterPanel()
});
```

---

## Advanced Integration Patterns

### Pattern 1: Conditional Shortcuts

Register shortcuts only when certain conditions are met:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Only add editor shortcuts if editor exists
  const editor = document.querySelector('#editor');

  if (editor) {
    KeyboardShortcuts.register({
      key: 's',
      modifiers: ['ctrl'],
      description: 'Save document',
      action: () => saveDocument()
    });

    KeyboardShortcuts.register({
      key: 'b',
      modifiers: ['ctrl'],
      description: 'Bold text',
      action: () => applyBold()
    });
  }
});
```

### Pattern 2: Modal-Specific Shortcuts

```javascript
function openModal() {
  const modal = document.querySelector('#my-modal');
  modal.classList.add('show');

  // Register modal-specific shortcut
  KeyboardShortcuts.register({
    key: 'Enter',
    description: 'Submit modal',
    action: () => submitModal()
  });
}

function closeModal() {
  const modal = document.querySelector('#my-modal');
  modal.classList.remove('show');

  // Unregister modal shortcut
  const id = KeyboardShortcuts._generateId({ key: 'Enter' });
  KeyboardShortcuts.unregister(id);
}
```

### Pattern 3: Feature Toggles

```javascript
let advancedMode = false;

function toggleAdvancedMode() {
  advancedMode = !advancedMode;

  if (advancedMode) {
    // Register advanced shortcuts
    KeyboardShortcuts.register({
      key: 'x',
      modifiers: ['ctrl', 'shift'],
      description: 'Export advanced report',
      action: () => exportAdvancedReport()
    });
  } else {
    // Unregister advanced shortcuts
    const id = KeyboardShortcuts._generateId({
      key: 'x',
      modifiers: ['ctrl', 'shift']
    });
    KeyboardShortcuts.unregister(id);
  }
}
```

---

## Adding Hints to UI Elements

Show users that shortcuts are available:

### Method 1: Tooltip

```html
<button
  id="save-btn"
  title="Save (Ctrl+S)"
  onclick="save()">
  Save
</button>
```

### Method 2: Visual Hint

```html
<button onclick="refresh()">
  Refresh
  <kbd>R</kbd>
</button>

<style>
button kbd {
  margin-left: 8px;
  padding: 2px 6px;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
```

### Method 3: Help Link

```html
<div class="toolbar">
  <button onclick="KeyboardShortcuts.showHelp()" class="help-btn">
    <span>⌨️</span> Keyboard Shortcuts
  </button>
</div>
```

---

## Testing Your Integration

### 1. Verify Initialization

Open browser console and check:

```javascript
console.log(typeof KeyboardShortcuts); // Should be "object"
console.log(KeyboardShortcuts.isEnabled()); // Should be true
console.log(KeyboardShortcuts.getShortcuts().length); // Should be > 0
```

### 2. Test Default Shortcuts

- Press `?` - Should open help modal
- Press `Escape` - Should close help modal
- Press `G` then `H` - Should navigate to home
- Press `Ctrl/Cmd + K` - Should show command palette notification

### 3. Test Custom Shortcuts

```javascript
// Register a test shortcut
KeyboardShortcuts.register({
  key: 't',
  description: 'Test shortcut',
  action: () => console.log('Test shortcut works!')
});

// Press 't' and check console
```

### 4. Verify Help Modal

- Open help modal (`?`)
- Check that all shortcuts are listed
- Verify keyboard navigation works
- Test Escape to close

---

## Common Issues & Solutions

### Issue: Shortcuts not working

**Solution:**
1. Check if JavaScript file is loaded: `typeof KeyboardShortcuts`
2. Check if enabled: `KeyboardShortcuts.isEnabled()`
3. Make sure you're not in an input field
4. Check browser console for errors

### Issue: Conflicts with existing shortcuts

**Solution:**
Choose different keys or use modifiers:
```javascript
// Instead of just 's'
KeyboardShortcuts.register({
  key: 's',
  modifiers: ['ctrl', 'shift'], // Add more modifiers
  description: 'Special save',
  action: () => specialSave()
});
```

### Issue: Help modal not showing

**Solution:**
1. Verify CSS is loaded: Check in DevTools > Elements
2. Check for z-index conflicts
3. Verify modal isn't hidden by other elements

### Issue: Chord shortcuts timing out

**Solution:**
The default timeout is 1 second. If you need longer:
```javascript
// Note: This requires modifying the source
// Or press keys faster within 1 second
```

---

## Performance Considerations

### Lazy Loading

For pages that might not use shortcuts:

```javascript
// Only load if user shows interest
let shortcutsLoaded = false;

function loadShortcuts() {
  if (shortcutsLoaded) return;

  const script = document.createElement('script');
  script.src = '/static/src/js/keyboard-shortcuts.js';
  document.body.appendChild(script);

  shortcutsLoaded = true;
}

// Load on first interaction
document.addEventListener('keydown', loadShortcuts, { once: true });
```

### Conditional Loading

```javascript
// Only load on desktop
if (window.innerWidth >= 768) {
  loadShortcutsScript();
}
```

---

## Best Practices

### 1. Don't Overuse Shortcuts
- Only add shortcuts for frequently used actions
- Avoid conflicts with browser shortcuts
- Keep it simple and memorable

### 2. Document Your Shortcuts
- Always include descriptions
- Update help modal as you add shortcuts
- Consider adding a help icon in your UI

### 3. Use Consistent Patterns
- `G + letter` for navigation
- `Ctrl/Cmd + letter` for actions
- Numbers for quick selections
- Escape always closes/cancels

### 4. Test Across Platforms
- Test on Mac (Cmd) and Windows/Linux (Ctrl)
- Verify mobile behavior
- Check different keyboard layouts

### 5. Make Them Discoverable
- Add hints in UI
- Mention in onboarding
- Show in help documentation

---

## Next Steps

1. Add keyboard shortcuts to your most-used pages
2. Monitor which shortcuts users actually use
3. Gather feedback and iterate
4. Consider adding a command palette UI
5. Add customization options for power users

---

## Support

For issues or questions:
- Check the README: `/static/src/js/keyboard-shortcuts-README.md`
- View demo: `/static/keyboard-shortcuts-demo.html`
- Check browser console for errors

## Version

Current version: 1.0.0 (Sprint 13)
