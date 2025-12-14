# Learn Interactive Module

Enhanced interactive learning features for the BTCSignal.ai education section.

## Overview

This module provides a comprehensive set of interactive components for creating engaging educational content:

- **Progress Tracking**: Automatic scroll-based progress tracking with localStorage persistence
- **Quiz Component**: Interactive quizzes with instant feedback and score tracking
- **Code Examples**: Syntax-highlighted code blocks with one-click copy functionality
- **Expandable Sections**: Collapsible content sections for better content organization
- **Completion Badges**: Visual indicators for completed articles and milestones

## Files

```
static/src/js/learn-interactive.js          - Main JavaScript module (IIFE pattern)
assets/src/scss/learn-interactive.scss      - Component styles
LEARN_INTERACTIVE_EXAMPLE.html             - Complete usage examples
LEARN_INTERACTIVE_README.md                - This documentation
```

## Installation

### 1. Include the CSS

```html
<link rel="stylesheet" href="/assets/dist/css/learn-interactive.css">
```

### 2. Include the JavaScript

```html
<script src="/static/dist/js/learn-interactive.js"></script>
```

The module initializes automatically on DOM ready.

## Components

### 1. Progress Tracking

Automatically tracks user progress as they scroll through articles.

#### HTML Structure

```html
<body data-article-id="unique-article-id">
  <section class="progress-container" data-article-id="unique-article-id">
    <div class="progress-header">
      <h3>Your Progress</h3>
      <span class="progress-text">0%</span>
    </div>
    <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-fill" style="width: 0%"></div>
    </div>
  </section>

  <div class="article-content">
    <!-- Your article content here -->
  </div>
</body>
```

#### JavaScript API

```javascript
// Save progress manually
LearnInteractive.progress.saveProgress('article-id', 50);

// Mark article as complete
LearnInteractive.progress.markComplete('article-id');

// Check if completed
const isComplete = LearnInteractive.progress.isCompleted('article-id');

// Get all progress
const allProgress = LearnInteractive.progress.getProgress();

// Reset all progress (with confirmation)
LearnInteractive.progress.reset();
```

#### Features

- Automatic scroll-based progress calculation
- localStorage persistence across sessions
- Progress bar animation with shimmer effect
- Auto-completion at 95% scroll
- Progress synced across multiple UI elements

---

### 2. Quiz Component

Interactive multiple-choice quizzes with instant feedback.

#### HTML Structure

```html
<form class="quiz-container" data-quiz-id="unique-quiz-id" data-article-id="article-id">
  <div class="quiz-header">
    <h3>Test Your Knowledge</h3>
    <p class="quiz-subtitle">See how well you understand the topic</p>
    <span class="quiz-previous-score"></span>
  </div>

  <!-- Question -->
  <div class="quiz-question" data-correct="b">
    <div class="question-text">
      <span class="question-number">1.</span>
      <span>What is the maximum supply of Bitcoin?</span>
    </div>
    <div class="quiz-options">
      <div class="quiz-option">
        <input type="radio" id="q1a" name="question-0" value="a">
        <label for="q1a">100 million BTC</label>
      </div>
      <div class="quiz-option">
        <input type="radio" id="q1b" name="question-0" value="b">
        <label for="q1b">21 million BTC</label>
      </div>
    </div>
  </div>

  <div class="quiz-actions">
    <button type="submit" class="quiz-submit">Submit Quiz</button>
  </div>

  <div class="quiz-results">
    <h4>Quiz Results</h4>
    <div class="quiz-score">0/0</div>
    <p class="quiz-message"></p>
    <button type="button" class="quiz-retry">Try Again</button>
  </div>
</form>
```

#### Question Naming Convention

- Name inputs as `question-0`, `question-1`, etc. (zero-indexed)
- Set `data-correct` attribute on `.quiz-question` to the correct answer value
- Use values `a`, `b`, `c`, `d` for answer options

#### Scoring

- **90%+**: "Excellent! You have mastered this topic!"
- **70-89%**: "Great job! You passed the quiz."
- **50-69%**: "Not bad, but you might want to review the material."
- **<50%**: "Keep learning! Review the material and try again."

#### Features

- Instant visual feedback (green for correct, red for incorrect)
- Score tracking in localStorage (keeps best score)
- Auto-marks article complete if score >= 70%
- Retry functionality
- Previous best score display
- Accessible form controls

---

### 3. Code Examples with Copy Button

Code blocks with one-click copy functionality.

#### HTML Structure

```html
<div class="code-example">
  <pre><code>// Your code here
const bitcoin = require('bitcoinjs-lib');
console.log('Hello Bitcoin!');</code></pre>
</div>
```

#### Features

- Automatic copy button injection
- Visual feedback on copy success/failure
- Fallback for browsers without Clipboard API
- Syntax highlighting compatible (use with highlight.js)
- Mobile-optimized (icon only on small screens)

#### Clipboard Feedback

- Default: 📋 Copy
- Success: ✓ Copied! (green, 2 seconds)
- Error: ✗ Failed (red, 2 seconds)

---

### 4. Expandable Sections

Collapsible content sections for better organization.

#### HTML Structure

```html
<div class="expandable-section">
  <button class="section-toggle" aria-expanded="false">
    <h3 class="section-title">Section Title</h3>
    <span class="toggle-icon">▼</span>
  </button>
  <div class="section-content">
    <div class="section-inner">
      <!-- Section content here -->
      <p>Hidden content that expands on click</p>
    </div>
  </div>
</div>
```

#### JavaScript API

```javascript
// Toggle a section
const section = document.querySelector('.expandable-section');
LearnInteractive.sections.toggle(section);

// Expand a section
LearnInteractive.sections.expand(section);
```

#### Features

- Smooth expand/collapse animations
- Auto-expand from URL hash navigation
- Keyboard accessible
- Hover effects
- Unlimited nesting support

#### URL Hash Navigation

Automatically expands sections when navigating to anchors:

```html
<div class="expandable-section">
  <button class="section-toggle">Advanced Topics</button>
  <div class="section-content">
    <div class="section-inner">
      <h4 id="lightning-network">Lightning Network</h4>
      <!-- Content -->
    </div>
  </div>
</div>

<!-- Navigate to /article#lightning-network -->
<!-- Section auto-expands and scrolls to heading -->
```

---

### 5. Completion Badge

Visual indicator for completed content.

#### HTML Structure

```html
<div class="completion-badge" aria-hidden="true">
  Completed
</div>
```

#### In Article Cards

```html
<div class="article-card" data-article-id="article-id">
  <div class="completion-badge" aria-hidden="true">Completed</div>
  <!-- Card content -->
</div>
```

#### Features

- Automatically shows when article is marked complete
- Fade-in animation
- Checkmark icon
- Green badge styling
- Positioned absolutely on cards

---

### 6. Interactive Highlights

Styled callout boxes for tips, warnings, and important information.

#### HTML Structure

```html
<!-- Tip (Green) -->
<div class="interactive-highlight tip">
  <div class="highlight-title">Pro Tip</div>
  <p>Always verify addresses before sending Bitcoin.</p>
</div>

<!-- Warning (Orange) -->
<div class="interactive-highlight warning">
  <div class="highlight-title">Important</div>
  <p>Never share your private keys with anyone.</p>
</div>

<!-- Info (Blue) - Default -->
<div class="interactive-highlight">
  <div class="highlight-title">Did You Know?</div>
  <p>Bitcoin's difficulty adjusts every 2,016 blocks.</p>
</div>

<!-- Danger (Red) -->
<div class="interactive-highlight danger">
  <div class="highlight-title">Security Alert</div>
  <p>Phishing attacks targeting crypto users are common.</p>
</div>
```

#### Types

- **Default** (blue): General information, facts
- **tip** (green): Helpful advice, best practices
- **warning** (orange): Important notices, cautions
- **danger** (red): Security alerts, critical warnings

---

## Data Storage

All data is stored in localStorage for persistence across sessions.

### Storage Keys

```javascript
btcsignal_learn_progress       // Article progress tracking
btcsignal_quiz_scores          // Quiz scores
btcsignal_completed_sections   // Completed article IDs
```

### Data Structures

#### Progress Data
```json
{
  "bitcoin-basics-intro": {
    "percentage": 75,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Quiz Scores
```json
{
  "bitcoin-basics-quiz-1": {
    "score": 100,
    "date": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Completed Sections
```json
["bitcoin-basics-intro", "advanced-trading-strategies"]
```

---

## Accessibility

The module follows WCAG 2.1 AA accessibility standards:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Focus Indicators**: Clear focus outlines on all interactive elements
- **Color Contrast**: All text meets 4.5:1 contrast ratio
- **Reduced Motion**: Respects `prefers-reduced-motion` media query
- **Semantic HTML**: Proper use of headings, buttons, and forms

### Keyboard Shortcuts

- **Tab**: Navigate through interactive elements
- **Enter/Space**: Activate buttons and toggle sections
- **Arrow Keys**: Navigate within quiz options (with radio buttons)

---

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Clipboard API**: Fallback for older browsers
- **localStorage**: Required (graceful degradation on errors)
- **CSS Grid/Flexbox**: Required for layout
- **ES6 Features**: IIFE pattern, arrow functions, async/await

---

## Performance Considerations

### Scroll Performance
- Uses `requestAnimationFrame` for scroll tracking
- Throttles scroll events to prevent excessive updates
- Minimal DOM manipulation

### Storage Performance
- Lazy loading of progress data
- Only updates localStorage when values change
- Error handling for storage quota exceeded

### Animation Performance
- CSS transforms for smooth animations
- GPU-accelerated properties (transform, opacity)
- Reduced motion support for accessibility

---

## Customization

### CSS Variables

Override these variables to customize appearance:

```css
:root {
  --bitcoin-orange: #f7931a;
  --bitcoin-gold: #ffb800;
  --green: #3fb950;
  --red: #f85149;
  --blue: #58a6ff;
  --bg-card: #161b22;
  --bg-dark: #0d1117;
  --border-color: #30363d;
  --text-primary: #e6edf3;
  --text-secondary: #8d96a0;
}
```

### Extending Functionality

The module exposes a global `LearnInteractive` object:

```javascript
// Add custom behavior
document.addEventListener('DOMContentLoaded', function() {
  // Hook into progress updates
  const originalSaveProgress = LearnInteractive.progress.saveProgress;
  LearnInteractive.progress.saveProgress = function(articleId, percentage) {
    originalSaveProgress.call(this, articleId, percentage);
    // Custom logic here
    console.log('Progress updated:', articleId, percentage);
  };
});
```

---

## Integration with Hugo

### Shortcodes

Create Hugo shortcodes for easy content authoring:

#### Quiz Shortcode
```html
<!-- layouts/shortcodes/quiz.html -->
<form class="quiz-container" data-quiz-id="{{ .Get "id" }}" data-article-id="{{ .Page.File.BaseFileName }}">
  {{ .Inner }}
</form>
```

Usage:
```markdown
{{< quiz id="bitcoin-basics-1" >}}
<!-- Quiz content -->
{{< /quiz >}}
```

#### Code Example Shortcode
```html
<!-- layouts/shortcodes/code.html -->
<div class="code-example">
  <pre><code class="{{ .Get "lang" }}">{{ .Inner }}</code></pre>
</div>
```

Usage:
```markdown
{{< code lang="javascript" >}}
const bitcoin = require('bitcoinjs-lib');
{{< /code >}}
```

#### Expandable Section Shortcode
```html
<!-- layouts/shortcodes/expand.html -->
<div class="expandable-section">
  <button class="section-toggle" aria-expanded="false">
    <h3 class="section-title">{{ .Get "title" }}</h3>
    <span class="toggle-icon">▼</span>
  </button>
  <div class="section-content">
    <div class="section-inner">
      {{ .Inner | markdownify }}
    </div>
  </div>
</div>
```

Usage:
```markdown
{{< expand title="Advanced Topics" >}}
Content here supports **markdown**.
{{< /expand >}}
```

---

## Testing

### Manual Testing Checklist

- [ ] Progress tracking updates on scroll
- [ ] Progress persists across page reloads
- [ ] Quizzes grade correctly
- [ ] Quiz retry functionality works
- [ ] Code copy button works in all browsers
- [ ] Expandable sections animate smoothly
- [ ] URL hash navigation expands sections
- [ ] Completion badges appear when articles complete
- [ ] All components work on mobile devices
- [ ] Keyboard navigation works for all components
- [ ] Screen readers can access all content

### Browser Testing

Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Mobile Chrome (Android)

---

## Common Issues

### Progress Not Saving

**Issue**: Progress resets on page reload
**Solution**: Check browser localStorage settings. Some privacy modes block localStorage.

### Copy Button Not Working

**Issue**: Copy button shows "Failed" error
**Solution**: Clipboard API requires HTTPS. Use fallback on local development.

### Sections Not Expanding

**Issue**: Expandable sections don't animate
**Solution**: Ensure max-height is being calculated. Check console for JavaScript errors.

### Quiz Not Grading

**Issue**: Quiz shows 0/0 score
**Solution**: Verify question naming (`question-0`, `question-1`) and `data-correct` attributes match answer values.

---

## Future Enhancements

Potential additions for future versions:

- [ ] Gamification: Points, streaks, leaderboards
- [ ] Social sharing: Share quiz scores, progress
- [ ] Study mode: Flashcards, spaced repetition
- [ ] Progress sync: Cross-device sync with backend
- [ ] Advanced quizzes: Multiple select, fill-in-the-blank
- [ ] Interactive diagrams: Clickable, animated visuals
- [ ] Video integration: Track video watch progress
- [ ] Achievement system: Badges for milestones
- [ ] Note-taking: Inline annotations
- [ ] Bookmarks: Save sections for later

---

## License

Part of the BTCSignal.ai project. All rights reserved.

---

## Support

For issues or questions:
1. Check this documentation
2. Review `LEARN_INTERACTIVE_EXAMPLE.html` for usage examples
3. Inspect browser console for errors
4. Verify HTML structure matches examples

---

## Changelog

### Version 1.0.0 (Sprint 15)
- Initial release
- Progress tracking with localStorage
- Interactive quiz component
- Code examples with copy button
- Expandable sections
- Completion badges
- Interactive highlights
- Full accessibility support
- Responsive design
