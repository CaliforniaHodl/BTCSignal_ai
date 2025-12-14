# Dashboard Customizer - Sprint 16

A lightweight, vanilla JavaScript module for customizing dashboard widget layouts with drag-and-drop, visibility toggles, and size controls.

## Features

### 1. Drag-and-Drop Widget Reordering
- Uses native HTML5 drag-and-drop API
- Simple CSS Grid-based layout (no external libraries)
- Visual feedback during dragging (opacity, border, scale)
- Touch-friendly for mobile devices

### 2. Widget Visibility Toggles
- Show/hide individual widgets
- Custom toggle switches with smooth animations
- Icons and labels for easy identification
- Instant visual feedback

### 3. Widget Size Options
- Three sizes: Small, Medium (default), Large
- Large widgets span 2 columns in grid
- Responsive design (adjusts on mobile)
- Simple S/M/L button controls

### 4. localStorage Persistence
- Automatically saves layout on changes
- Persists across browser sessions
- Stores: visibility, size, order
- Version-controlled storage format

### 5. Reset Functionality
- One-click reset to default layout
- Confirmation dialog to prevent accidents
- Restores all widgets to original state
- Clears all customizations

### 6. Customization Modal
- Clean, accessible UI
- Organized into sections
- Scrollable for many widgets
- Keyboard accessible
- Overlay with backdrop blur

## Installation

### 1. Include JavaScript

Add to your page's frontmatter or HTML:

```javascript
<script defer src="/static/src/js/dashboard-customizer.js"></script>
```

For Hugo, add to `_index.md`:

```yaml
js: ['dashboard-customizer.js']
```

### 2. Include Styles

The styles are included in `dashboard.scss`. Make sure to compile SCSS:

```scss
@import 'dashboard';
```

### 3. HTML Structure

Your dashboard should have this structure:

```html
<div class="dashboard-header-actions">
  <!-- Customizer button will be added here automatically -->
</div>

<div class="dashboard-grid">
  <div class="widget-card" id="widget-1">
    <div class="widget-header">
      <span class="widget-icon">😱</span>
      <h3>Widget Title</h3>
    </div>
    <div class="widget-value">Value</div>
    <div class="widget-label">Label</div>
  </div>

  <!-- More widgets... -->
</div>
```

## Usage

### Basic Usage

The module initializes automatically on DOM ready:

```javascript
// No initialization needed - it's automatic!
```

### Public API

If you need to control the customizer programmatically:

```javascript
// Open customizer panel
window.DashboardCustomizer.openCustomizer();

// Close customizer panel
window.DashboardCustomizer.closeCustomizer();

// Save current layout
window.DashboardCustomizer.saveLayout();

// Reset to default
window.DashboardCustomizer.resetLayout();

// Toggle specific widget
window.DashboardCustomizer.toggleWidget('widget-id', true); // show
window.DashboardCustomizer.toggleWidget('widget-id', false); // hide

// Resize specific widget
window.DashboardCustomizer.resizeWidget('widget-id', 'small');
window.DashboardCustomizer.resizeWidget('widget-id', 'medium');
window.DashboardCustomizer.resizeWidget('widget-id', 'large');
```

## Configuration

The module uses these default configurations (can be modified in source):

```javascript
const CONFIG = {
  storageKey: 'btcsai_dashboard_layout',
  gridSelector: '.dashboard-grid',
  widgetSelector: '.widget-card',
  sizes: {
    small: 'widget-size-small',
    medium: 'widget-size-medium',
    large: 'widget-size-large'
  }
};
```

## Storage Format

Layout data is stored in localStorage as JSON:

```json
{
  "version": 1,
  "timestamp": 1703001234567,
  "widgets": [
    {
      "id": "widget-fear-greed",
      "visible": true,
      "size": "medium",
      "order": 0
    },
    {
      "id": "widget-funding",
      "visible": false,
      "size": "large",
      "order": 1
    }
  ]
}
```

## CSS Classes

### Widget States

- `.dragging` - Applied during drag operation
- `.drag-over` - Applied to drop target
- `.widget-size-small` - Small widget size
- `.widget-size-medium` - Medium widget size (default)
- `.widget-size-large` - Large widget size (2 columns)

### Customizer Panel

- `.customizer-panel` - Main container
- `.customizer-overlay` - Dark backdrop
- `.customizer-content` - Modal content
- `.customizer-header` - Panel header
- `.customizer-body` - Scrollable content
- `.customizer-footer` - Action buttons
- `.active` - Panel is open

### Body State

- `body.customizer-open` - Prevents scrolling when panel is open

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

Uses these modern APIs:
- HTML5 Drag and Drop
- CSS Grid
- localStorage
- ES6 JavaScript

## Performance Considerations

1. **DOM Updates**: Only modified widgets are updated
2. **Event Delegation**: Efficient event handling
3. **Deferred Loading**: Uses `defer` attribute for script loading
4. **localStorage**: Minimal storage footprint (~1-2KB per layout)

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management
- Confirmation dialogs for destructive actions
- High contrast support

## Responsive Design

- Mobile-first approach
- Touch-friendly controls
- Full-screen modal on mobile
- Grid adapts to screen size
- Large widgets stack on mobile

## Testing

A test file is provided: `dashboard-customizer-test.html`

To test:

1. Open `dashboard-customizer-test.html` in browser
2. Click "Customize Dashboard"
3. Try all features (drag, toggle, resize)
4. Click "Done" to save
5. Refresh page to verify persistence
6. Click "Reset to Default"

## Troubleshooting

### Widgets won't drag
- Ensure widgets have `draggable="true"` attribute (set automatically)
- Check that `.dashboard-grid` exists
- Verify no conflicting drag handlers

### Layout not saving
- Check browser console for errors
- Verify localStorage is enabled
- Check storage quota (unlikely issue)

### Panel doesn't open
- Ensure button was created (check `.dashboard-header-actions` exists)
- Check for JavaScript errors
- Verify all CSS loaded

### Styles not applied
- Compile SCSS to CSS
- Check CSS path in HTML
- Clear browser cache

## Future Enhancements

Possible improvements for future sprints:

1. Import/export layouts as JSON
2. Multiple saved layout presets
3. Widget color themes
4. Animation speed controls
5. Undo/redo functionality
6. Shared layouts via URL
7. Default layouts by user role

## Code Structure

```
dashboard-customizer.js
├── Configuration (CONFIG)
├── State Management (state)
├── Initialization (init)
├── Widget Management
│   ├── initializeWidgets()
│   ├── toggleWidget()
│   └── resizeWidget()
├── Drag & Drop
│   ├── handleDragStart()
│   ├── handleDragEnd()
│   ├── handleDragOver()
│   └── handleDrop()
├── UI Components
│   ├── createCustomizerButton()
│   ├── createCustomizerPanel()
│   ├── populateWidgetToggles()
│   └── populateWidgetSizes()
├── Storage
│   ├── saveLayout()
│   ├── loadLayout()
│   └── applySavedState()
└── Public API (window.DashboardCustomizer)
```

## Dependencies

**None!** This is a pure vanilla JavaScript implementation.

Only requires:
- Modern browser with ES6 support
- CSS Grid support
- localStorage API

## License

Part of BTC Signal AI dashboard suite.

## Author

Created for Sprint 16: Dashboard Customization

## Version History

- v1.0.0 - Initial release
  - Drag-and-drop reordering
  - Show/hide toggles
  - Widget sizing (S/M/L)
  - localStorage persistence
  - Reset functionality
  - Customization modal
