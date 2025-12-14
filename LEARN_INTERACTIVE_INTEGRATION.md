# Learn Interactive - Integration Guide

Quick guide for integrating the Learn Interactive module into your existing pages.

## Step-by-Step Integration

### Step 1: Build the Assets

Compile the SCSS and JavaScript files:

```bash
# If using a build system (e.g., webpack, gulp)
npm run build

# Or compile manually
# SCSS
sass assets/src/scss/learn-interactive.scss assets/dist/css/learn-interactive.css

# JS (already in IIFE, no compilation needed)
cp static/src/js/learn-interactive.js static/dist/js/learn-interactive.js
```

### Step 2: Add to HTML Templates

Add to your learn page template (e.g., `layouts/_default/learn.html` or similar):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Existing head content -->

  <!-- Add Learn Interactive CSS -->
  <link rel="stylesheet" href="/assets/dist/css/learn-interactive.css">
</head>
<body data-article-id="{{ .File.BaseFileName }}">

  <!-- Your content here -->

  <!-- Add Learn Interactive JS before closing body tag -->
  <script src="/static/dist/js/learn-interactive.js"></script>
</body>
</html>
```

### Step 3: Add Progress Tracking to Articles

In your article template:

```html
<!-- Add at the top of the article -->
<section class="progress-container" data-article-id="{{ .File.BaseFileName }}">
  <div class="progress-header">
    <h3>Your Progress</h3>
    <span class="progress-text">0%</span>
  </div>
  <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-fill" style="width: 0%"></div>
  </div>
</section>

<!-- Wrap main content -->
<div class="article-content">
  {{ .Content }}
</div>
```

### Step 4: Add to Article List Pages

Update your article cards to show progress:

```html
<div class="article-card" data-article-id="{{ .File.BaseFileName }}">
  <!-- Completion badge (hidden until complete) -->
  <div class="completion-badge" aria-hidden="true">Completed</div>

  <!-- Existing card content -->
  <div class="article-icon">{{ .Params.icon }}</div>
  <h2>{{ .Title }}</h2>
  <p class="article-desc">{{ .Description }}</p>

  <!-- Add progress indicator -->
  <div class="learn-card-progress">
    <div class="card-progress-bar">
      <div class="card-progress-fill" style="width: 0%"></div>
    </div>
    <div class="card-progress-text">0% complete</div>
  </div>

  <!-- Existing meta -->
  <div class="article-meta">
    <span class="read-time">{{ .ReadingTime }} min read</span>
  </div>
</div>
```

## Component Examples

### Adding a Quiz

Create a quiz in your markdown or HTML:

```html
<form class="quiz-container" data-quiz-id="bitcoin-basics-quiz" data-article-id="{{ .File.BaseFileName }}">
  <div class="quiz-header">
    <h3>Test Your Knowledge</h3>
    <p class="quiz-subtitle">How well do you understand Bitcoin?</p>
    <span class="quiz-previous-score"></span>
  </div>

  <div class="quiz-question" data-correct="b">
    <div class="question-text">
      <span class="question-number">1.</span>
      <span>What is the block time for Bitcoin?</span>
    </div>
    <div class="quiz-options">
      <div class="quiz-option">
        <input type="radio" id="q1a" name="question-0" value="a">
        <label for="q1a">5 minutes</label>
      </div>
      <div class="quiz-option">
        <input type="radio" id="q1b" name="question-0" value="b">
        <label for="q1b">10 minutes</label>
      </div>
      <div class="quiz-option">
        <input type="radio" id="q1c" name="question-0" value="c">
        <label for="q1c">15 minutes</label>
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

### Adding Code Examples

Wrap code blocks with the `.code-example` class:

```html
<div class="code-example">
  <pre><code class="language-javascript">// Generate a Bitcoin address
const bitcoin = require('bitcoinjs-lib');
const keyPair = bitcoin.ECPair.makeRandom();
const { address } = bitcoin.payments.p2pkh({
  pubkey: keyPair.publicKey
});
console.log('Address:', address);</code></pre>
</div>
```

### Adding Expandable Sections

Create collapsible sections:

```html
<div class="expandable-section">
  <button class="section-toggle" aria-expanded="false">
    <h3 class="section-title">Advanced Topics</h3>
    <span class="toggle-icon">▼</span>
  </button>
  <div class="section-content">
    <div class="section-inner">
      <p>This content is hidden until expanded.</p>
      <!-- More content -->
    </div>
  </div>
</div>
```

### Adding Highlight Boxes

Use for tips, warnings, and important info:

```html
<!-- Tip -->
<div class="interactive-highlight tip">
  <div class="highlight-title">Pro Tip</div>
  <p>Always backup your seed phrase in multiple secure locations.</p>
</div>

<!-- Warning -->
<div class="interactive-highlight warning">
  <div class="highlight-title">Important</div>
  <p>Transaction fees can be high during network congestion.</p>
</div>

<!-- Info -->
<div class="interactive-highlight">
  <div class="highlight-title">Did You Know?</div>
  <p>Bitcoin uses SHA-256 cryptographic hashing.</p>
</div>

<!-- Danger -->
<div class="interactive-highlight danger">
  <div class="highlight-title">Security Alert</div>
  <p>Never share your private keys with anyone!</p>
</div>
```

## Hugo Shortcodes (Recommended)

Create these shortcodes in `layouts/shortcodes/` for easier content authoring:

### quiz.html
```html
<form class="quiz-container" data-quiz-id="{{ .Get "id" }}" data-article-id="{{ .Page.File.BaseFileName }}">
  <div class="quiz-header">
    <h3>{{ .Get "title" | default "Test Your Knowledge" }}</h3>
    <p class="quiz-subtitle">{{ .Get "subtitle" }}</p>
    <span class="quiz-previous-score"></span>
  </div>
  {{ .Inner }}
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

### question.html
```html
<div class="quiz-question" data-correct="{{ .Get "correct" }}">
  <div class="question-text">
    <span class="question-number">{{ .Get "number" }}.</span>
    <span>{{ .Get "text" }}</span>
  </div>
  <div class="quiz-options">
    {{ .Inner }}
  </div>
</div>
```

### option.html
```html
{{ $id := printf "q%s%s" (.Get "question") (.Get "value") }}
<div class="quiz-option">
  <input type="radio" id="{{ $id }}" name="question-{{ .Get "question" }}" value="{{ .Get "value" }}">
  <label for="{{ $id }}">{{ .Inner }}</label>
</div>
```

### code.html
```html
<div class="code-example">
  <pre><code{{ with .Get "lang" }} class="language-{{ . }}"{{ end }}>{{ .Inner }}</code></pre>
</div>
```

### expand.html
```html
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

### highlight.html
```html
<div class="interactive-highlight {{ .Get "type" }}">
  <div class="highlight-title">{{ .Get "title" }}</div>
  {{ .Inner | markdownify }}
</div>
```

## Usage in Markdown

With the shortcodes above, you can write clean markdown:

```markdown
---
title: "Bitcoin Basics"
description: "Learn the fundamentals"
---

{{< highlight type="tip" title="Pro Tip" >}}
Always verify addresses before sending Bitcoin.
{{< /highlight >}}

## Understanding Blockchain

{{< expand title="What is a blockchain?" >}}
A blockchain is a distributed ledger technology that records transactions
across multiple computers in a way that makes it nearly impossible to alter
retroactively.
{{< /expand >}}

## Code Example

{{< code lang="javascript" >}}
const bitcoin = require('bitcoinjs-lib');
console.log('Hello Bitcoin!');
{{< /code >}}

## Quiz

{{< quiz id="bitcoin-basics-1" title="Test Your Knowledge" subtitle="How well do you understand Bitcoin?" >}}

{{< question number="1" text="What is the maximum supply of Bitcoin?" correct="b" >}}
{{< option question="0" value="a" >}}100 million{{< /option >}}
{{< option question="0" value="b" >}}21 million{{< /option >}}
{{< option question="0" value="c" >}}Unlimited{{< /option >}}
{{< /question >}}

{{< question number="2" text="Who created Bitcoin?" correct="a" >}}
{{< option question="1" value="a" >}}Satoshi Nakamoto{{< /option >}}
{{< option question="1" value="b" >}}Vitalik Buterin{{< /option >}}
{{< option question="1" value="c" >}}Elon Musk{{< /option >}}
{{< /question >}}

{{< /quiz >}}
```

## Testing Integration

After integration, test these features:

1. **Progress Tracking**
   - Open an article
   - Scroll through the content
   - Verify progress bar updates
   - Reload page - progress should persist

2. **Quizzes**
   - Answer questions
   - Submit quiz
   - Check visual feedback (green/red)
   - View results
   - Try retry button

3. **Code Copy**
   - Click copy button on code examples
   - Verify "Copied!" feedback
   - Paste into editor to confirm

4. **Expandable Sections**
   - Click section toggles
   - Verify smooth animation
   - Navigate to URL with hash (e.g., #section-id)
   - Section should auto-expand

5. **Mobile Testing**
   - Test on mobile devices
   - Verify touch interactions work
   - Check responsive layouts

## Troubleshooting

### Issue: Progress not saving
- Check browser console for errors
- Verify localStorage is enabled
- Check that body has `data-article-id` attribute
- Ensure article content has class `.article-content`

### Issue: Copy button not working
- Requires HTTPS (or localhost)
- Check browser supports Clipboard API
- Fallback should work in older browsers

### Issue: Animations not smooth
- Check browser performance
- Verify CSS is compiled correctly
- Test in different browsers

### Issue: Quiz not grading correctly
- Verify question naming: `question-0`, `question-1`, etc.
- Check `data-correct` attributes match answer values
- Ensure unique IDs for all radio inputs

## Performance Optimization

### Lazy Loading
For pages with many interactive elements, consider lazy loading:

```javascript
// Only initialize when interactive section is visible
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Initialize component
      LearnInteractive.quiz.init(entry.target);
      observer.unobserve(entry.target);
    }
  });
});

document.querySelectorAll('.quiz-container').forEach(quiz => {
  observer.observe(quiz);
});
```

### Bundle Size
The module is lightweight:
- JavaScript: ~18KB unminified (~6KB minified + gzipped)
- CSS: ~14KB unminified (~4KB minified + gzipped)

## Browser Compatibility

Tested and working in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Mobile Chrome (Android 8+)

## Next Steps

1. Integrate files into your build system
2. Add to page templates
3. Create Hugo shortcodes (optional but recommended)
4. Write content using the components
5. Test thoroughly in multiple browsers
6. Deploy and monitor user engagement

## Support

Refer to:
- `LEARN_INTERACTIVE_README.md` - Full documentation
- `LEARN_INTERACTIVE_EXAMPLE.html` - Working examples
- Browser console for JavaScript errors
- Network tab for asset loading issues
