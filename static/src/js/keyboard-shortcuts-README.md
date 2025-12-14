# Keyboard Shortcuts System

A comprehensive keyboard shortcuts system for BTCSignal.ai with vim-style chord detection and an accessible help modal.

## Features

- **Default Navigation Shortcuts**: Vim-style two-key shortcuts (G+H for home, G+D for dashboard, etc.)
- **Command Palette**: Quick access with Ctrl/Cmd+K
- **Modal Controls**: Escape to close any modal
- **Chord Detection**: Support for two-key sequences with visual feedback
- **Help Modal**: Press ? to see all available shortcuts
- **Custom Shortcuts**: Easy API to register your own shortcuts
- **Accessible**: Full keyboard navigation with focus trapping
- **Cross-platform**: Works on Mac (Cmd), Windows/Linux (Ctrl)

## Installation

### 1. Include the JavaScript file

```html
<script src="/static/src/js/keyboard-shortcuts.js"></script>
```

### 2. Include the CSS file

```html
<link rel="stylesheet" href="/static/src/css/keyboard-shortcuts.css">
```

### 3. Dependencies (Optional)

The keyboard shortcuts system works standalone, but integrates nicely with:

- `toast.js` - For notification feedback
- `shared.js` - For debug logging
- `security-utils.js` - For XSS protection in help modal

## Default Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `G` then `H` | Go to Home |
| `G` then `D` | Go to Dashboard |
| `G` then `A` | Go to Alerts |
| `G` then `C` | Go to Charts |
| `Escape` | Close modals |
| `?` (Shift + /) | Show shortcuts help modal |

## Usage

### Basic Usage

The keyboard shortcuts system initializes automatically when the page loads. No setup required!

```javascript
// The system is automatically available as window.KeyboardShortcuts
```

### Registering Custom Shortcuts

#### Simple Shortcut (Single Key)

```javascript
KeyboardShortcuts.register({
  key: 's',
  description: 'Search',
  action: () => {
    console.log('Search triggered!');
  }
});
```

#### Shortcut with Modifiers

```javascript
KeyboardShortcuts.register({
  key: 's',
  modifiers: ['ctrl', 'meta'], // Ctrl on Windows/Linux, Cmd on Mac
  description: 'Save document',
  action: () => {
    console.log('Saving...');
  }
});
```

#### Chord Shortcut (Vim-style)

```javascript
KeyboardShortcuts.register({
  key: 'p',
  chord: 'g', // First press G, then P
  description: 'Go to Profile',
  action: () => {
    window.location.href = '/profile/';
  }
});
```

#### Shortcut with Shift

```javascript
KeyboardShortcuts.register({
  key: 'n',
  shift: true, // Requires Shift+N
  description: 'New item',
  action: () => {
    console.log('Creating new item');
  }
});
```

### Unregistering Shortcuts

```javascript
// Generate the shortcut ID first
const id = KeyboardShortcuts._generateId({
  key: 's',
  modifiers: ['ctrl']
});

// Unregister it
KeyboardShortcuts.unregister(id);
```

### Enabling/Disabling Shortcuts

```javascript
// Disable all shortcuts temporarily
KeyboardShortcuts.disable();

// Re-enable shortcuts
KeyboardShortcuts.enable();

// Check if enabled
if (KeyboardShortcuts.isEnabled()) {
  console.log('Shortcuts are active');
}
```

### Showing the Help Modal

```javascript
// Programmatically show help modal
KeyboardShortcuts.showHelp();

// Hide help modal
KeyboardShortcuts.hideHelp();
```

### Getting All Shortcuts

```javascript
const shortcuts = KeyboardShortcuts.getShortcuts();
console.log('Total shortcuts:', shortcuts.length);

shortcuts.forEach(shortcut => {
  console.log(shortcut.description, shortcut.key);
});
```

## API Reference

### KeyboardShortcuts.register(shortcut)

Register a new keyboard shortcut.

**Parameters:**
- `shortcut` (Object):
  - `key` (string, required): The main key (e.g., 'a', 'Escape', 'Enter')
  - `modifiers` (Array, optional): Modifiers like `['ctrl', 'meta', 'alt']`
  - `chord` (string, optional): First key in a two-key sequence
  - `shift` (boolean, optional): Whether Shift is required
  - `description` (string, required): Human-readable description
  - `action` (Function, required): Function to call when triggered
  - `global` (boolean, optional): Whether to trigger in input fields

**Returns:** void

### KeyboardShortcuts.unregister(id)

Unregister a keyboard shortcut by ID.

**Parameters:**
- `id` (string): The shortcut ID (use `_generateId` to create)

**Returns:** void

### KeyboardShortcuts.showHelp()

Show the keyboard shortcuts help modal.

**Returns:** void

### KeyboardShortcuts.hideHelp()

Hide the keyboard shortcuts help modal.

**Returns:** void

### KeyboardShortcuts.enable()

Enable keyboard shortcuts globally.

**Returns:** void

### KeyboardShortcuts.disable()

Disable keyboard shortcuts globally.

**Returns:** void

### KeyboardShortcuts.isEnabled()

Check if keyboard shortcuts are currently enabled.

**Returns:** boolean

### KeyboardShortcuts.getShortcuts()

Get all registered shortcuts.

**Returns:** Array of shortcut objects

## Advanced Examples

### Contextual Shortcuts

```javascript
// Only enable certain shortcuts when a specific element is visible
const editorShortcuts = [];

function enableEditorMode() {
  KeyboardShortcuts.register({
    key: 's',
    modifiers: ['ctrl'],
    description: 'Save in editor',
    action: () => saveEditor()
  });

  KeyboardShortcuts.register({
    key: 'b',
    modifiers: ['ctrl'],
    description: 'Bold text',
    action: () => applyBold()
  });
}

function disableEditorMode() {
  // Unregister editor-specific shortcuts
  editorShortcuts.forEach(id => {
    KeyboardShortcuts.unregister(id);
  });
}
```

### Integration with Toast Notifications

```javascript
KeyboardShortcuts.register({
  key: 'n',
  modifiers: ['ctrl'],
  description: 'Create new post',
  action: () => {
    if (typeof Toast !== 'undefined') {
      Toast.info('Creating new post...');
    }
    createNewPost();
  }
});
```

### Navigation Shortcuts with Confirmation

```javascript
KeyboardShortcuts.register({
  key: 'q',
  modifiers: ['ctrl'],
  description: 'Quit and return to dashboard',
  action: () => {
    if (typeof Toast !== 'undefined' && Toast.confirm) {
      Toast.confirm(
        'Are you sure you want to quit?',
        () => window.location.href = '/dashboard/'
      );
    } else {
      if (confirm('Are you sure you want to quit?')) {
        window.location.href = '/dashboard/';
      }
    }
  }
});
```

## Styling

The keyboard shortcuts system uses CSS custom properties for theming:

```css
/* Customize the chord indicator */
.chord-indicator {
  --chord-bg: var(--bg-card);
  --chord-border: var(--bitcoin-orange);
  --chord-color: var(--bitcoin-orange);
}

/* Customize the help modal */
.shortcuts-modal {
  --modal-bg: var(--bg-card);
  --modal-border: var(--border-color);
}
```

## Accessibility

- **Keyboard Navigation**: All shortcuts are keyboard-accessible by design
- **Focus Trapping**: Help modal traps focus within itself
- **Screen Readers**: Help modal has proper ARIA labels
- **Escape Key**: Always available to close modals
- **High Contrast**: Supports high contrast mode
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Troubleshooting

### Shortcuts not working

1. Check if shortcuts are enabled: `KeyboardShortcuts.isEnabled()`
2. Make sure you're not in an input field (unless shortcut has `global: true`)
3. Check browser console for errors
4. Verify the JavaScript file is loaded: `typeof KeyboardShortcuts`

### Chord shortcuts timing out

The chord timeout is 1 second by default. If you press the second key too slowly, the chord will reset. Look for the chord indicator in the bottom-right corner.

### Conflicts with browser shortcuts

Some browser shortcuts (like Ctrl+T) cannot be overridden. Choose keys that don't conflict with common browser shortcuts.

## Demo

View the interactive demo at: `/static/keyboard-shortcuts-demo.html`

## License

Part of the BTCSignal.ai project.

## Credits

Built with inspiration from:
- GitHub's keyboard shortcuts
- Vim's modal editing
- Linear's command palette
