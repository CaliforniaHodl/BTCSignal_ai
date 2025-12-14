// Learn Interactive - Progress tracking, quizzes, and interactive learning elements
(function() {
  'use strict';

  // Storage keys
  const STORAGE_KEYS = {
    PROGRESS: 'btcsignal_learn_progress',
    QUIZ_SCORES: 'btcsignal_quiz_scores',
    COMPLETED_SECTIONS: 'btcsignal_completed_sections'
  };

  // Initialize progress tracking
  const ProgressTracker = {
    /**
     * Get all progress data
     * @returns {Object} Progress data
     */
    getProgress: function() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS)) || {};
      } catch (e) {
        console.error('Error loading progress:', e);
        return {};
      }
    },

    /**
     * Save progress for an article
     * @param {string} articleId - Unique article identifier
     * @param {number} percentage - Progress percentage (0-100)
     */
    saveProgress: function(articleId, percentage) {
      const progress = this.getProgress();
      progress[articleId] = {
        percentage: Math.min(100, Math.max(0, percentage)),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
      this.updateProgressUI(articleId, percentage);
    },

    /**
     * Mark an article as completed
     * @param {string} articleId - Unique article identifier
     */
    markComplete: function(articleId) {
      this.saveProgress(articleId, 100);
      const completed = this.getCompleted();
      if (!completed.includes(articleId)) {
        completed.push(articleId);
        localStorage.setItem(STORAGE_KEYS.COMPLETED_SECTIONS, JSON.stringify(completed));
      }
      this.showCompletionBadge(articleId);
    },

    /**
     * Get list of completed articles
     * @returns {Array} Array of completed article IDs
     */
    getCompleted: function() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_SECTIONS)) || [];
      } catch (e) {
        console.error('Error loading completed sections:', e);
        return [];
      }
    },

    /**
     * Check if an article is completed
     * @param {string} articleId - Unique article identifier
     * @returns {boolean} True if completed
     */
    isCompleted: function(articleId) {
      return this.getCompleted().includes(articleId);
    },

    /**
     * Update progress UI elements
     * @param {string} articleId - Unique article identifier
     * @param {number} percentage - Progress percentage
     */
    updateProgressUI: function(articleId, percentage) {
      const progressBars = document.querySelectorAll(`[data-article-id="${articleId}"] .progress-fill`);
      progressBars.forEach(bar => {
        bar.style.width = percentage + '%';
        bar.setAttribute('aria-valuenow', percentage);
      });

      const progressTexts = document.querySelectorAll(`[data-article-id="${articleId}"] .progress-text`);
      progressTexts.forEach(text => {
        text.textContent = Math.round(percentage) + '%';
      });
    },

    /**
     * Show completion badge for an article
     * @param {string} articleId - Unique article identifier
     */
    showCompletionBadge: function(articleId) {
      const badges = document.querySelectorAll(`[data-article-id="${articleId}"] .completion-badge`);
      badges.forEach(badge => {
        badge.classList.add('show');
        badge.setAttribute('aria-hidden', 'false');
      });
    },

    /**
     * Initialize progress indicators for all articles on the page
     */
    initializeAll: function() {
      const progress = this.getProgress();
      const completed = this.getCompleted();

      Object.keys(progress).forEach(articleId => {
        this.updateProgressUI(articleId, progress[articleId].percentage);
      });

      completed.forEach(articleId => {
        this.showCompletionBadge(articleId);
      });
    },

    /**
     * Reset all progress (for testing/admin purposes)
     */
    reset: function() {
      if (confirm('Are you sure you want to reset all learning progress?')) {
        localStorage.removeItem(STORAGE_KEYS.PROGRESS);
        localStorage.removeItem(STORAGE_KEYS.COMPLETED_SECTIONS);
        localStorage.removeItem(STORAGE_KEYS.QUIZ_SCORES);
        location.reload();
      }
    }
  };

  // Quiz component
  const QuizManager = {
    activeQuiz: null,

    /**
     * Initialize a quiz
     * @param {HTMLElement} quizElement - The quiz container element
     */
    init: function(quizElement) {
      const quizId = quizElement.dataset.quizId;
      const questions = this.parseQuestions(quizElement);

      quizElement.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitQuiz(quizElement, quizId, questions);
      });

      // Load previous score if exists
      this.loadPreviousScore(quizElement, quizId);
    },

    /**
     * Parse quiz questions from the DOM
     * @param {HTMLElement} quizElement - The quiz container element
     * @returns {Array} Array of question objects
     */
    parseQuestions: function(quizElement) {
      const questions = [];
      const questionElements = quizElement.querySelectorAll('.quiz-question');

      questionElements.forEach((qEl, index) => {
        const correctAnswer = qEl.dataset.correct;
        questions.push({
          index,
          correctAnswer,
          element: qEl
        });
      });

      return questions;
    },

    /**
     * Submit and grade a quiz
     * @param {HTMLElement} quizElement - The quiz container element
     * @param {string} quizId - Unique quiz identifier
     * @param {Array} questions - Array of question objects
     */
    submitQuiz: function(quizElement, quizId, questions) {
      let correct = 0;
      const formData = new FormData(quizElement);

      questions.forEach(question => {
        const userAnswer = formData.get(`question-${question.index}`);
        const isCorrect = userAnswer === question.correctAnswer;

        if (isCorrect) {
          correct++;
        }

        // Visual feedback
        this.markQuestion(question.element, userAnswer, question.correctAnswer);
      });

      const score = Math.round((correct / questions.length) * 100);
      this.showResults(quizElement, score, correct, questions.length);
      this.saveScore(quizId, score);

      // Mark article as complete if quiz passed (>= 70%)
      if (score >= 70) {
        const articleId = quizElement.dataset.articleId;
        if (articleId) {
          ProgressTracker.markComplete(articleId);
        }
      }
    },

    /**
     * Mark a question as correct or incorrect
     * @param {HTMLElement} questionEl - The question element
     * @param {string} userAnswer - User's selected answer
     * @param {string} correctAnswer - The correct answer
     */
    markQuestion: function(questionEl, userAnswer, correctAnswer) {
      const options = questionEl.querySelectorAll('.quiz-option');

      options.forEach(option => {
        const input = option.querySelector('input');
        const value = input.value;

        option.classList.remove('correct', 'incorrect');

        if (value === correctAnswer) {
          option.classList.add('correct');
        } else if (value === userAnswer && value !== correctAnswer) {
          option.classList.add('incorrect');
        }

        // Disable further selection
        input.disabled = true;
      });
    },

    /**
     * Show quiz results
     * @param {HTMLElement} quizElement - The quiz container element
     * @param {number} score - Score percentage
     * @param {number} correct - Number of correct answers
     * @param {number} total - Total number of questions
     */
    showResults: function(quizElement, score, correct, total) {
      const resultsEl = quizElement.querySelector('.quiz-results');
      if (!resultsEl) return;

      const scoreEl = resultsEl.querySelector('.quiz-score');
      const messageEl = resultsEl.querySelector('.quiz-message');
      const retryBtn = resultsEl.querySelector('.quiz-retry');

      scoreEl.textContent = `${correct}/${total} (${score}%)`;

      // Set message based on score
      let message = '';
      let messageClass = '';
      if (score >= 90) {
        message = 'Excellent! You have mastered this topic!';
        messageClass = 'excellent';
      } else if (score >= 70) {
        message = 'Great job! You passed the quiz.';
        messageClass = 'good';
      } else if (score >= 50) {
        message = 'Not bad, but you might want to review the material.';
        messageClass = 'fair';
      } else {
        message = 'Keep learning! Review the material and try again.';
        messageClass = 'poor';
      }

      messageEl.textContent = message;
      messageEl.className = 'quiz-message ' + messageClass;

      resultsEl.classList.add('show');

      // Setup retry button
      if (retryBtn) {
        retryBtn.onclick = () => this.resetQuiz(quizElement);
      }

      // Hide submit button
      const submitBtn = quizElement.querySelector('.quiz-submit');
      if (submitBtn) {
        submitBtn.style.display = 'none';
      }
    },

    /**
     * Reset a quiz for retaking
     * @param {HTMLElement} quizElement - The quiz container element
     */
    resetQuiz: function(quizElement) {
      // Reset all options
      const options = quizElement.querySelectorAll('.quiz-option');
      options.forEach(option => {
        option.classList.remove('correct', 'incorrect');
        const input = option.querySelector('input');
        input.disabled = false;
        input.checked = false;
      });

      // Hide results
      const resultsEl = quizElement.querySelector('.quiz-results');
      if (resultsEl) {
        resultsEl.classList.remove('show');
      }

      // Show submit button
      const submitBtn = quizElement.querySelector('.quiz-submit');
      if (submitBtn) {
        submitBtn.style.display = 'block';
      }

      // Scroll to quiz
      quizElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Save quiz score
     * @param {string} quizId - Unique quiz identifier
     * @param {number} score - Score percentage
     */
    saveScore: function(quizId, score) {
      try {
        const scores = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZ_SCORES)) || {};
        if (!scores[quizId] || score > scores[quizId].score) {
          scores[quizId] = {
            score,
            date: new Date().toISOString()
          };
          localStorage.setItem(STORAGE_KEYS.QUIZ_SCORES, JSON.stringify(scores));
        }
      } catch (e) {
        console.error('Error saving quiz score:', e);
      }
    },

    /**
     * Load and display previous quiz score
     * @param {HTMLElement} quizElement - The quiz container element
     * @param {string} quizId - Unique quiz identifier
     */
    loadPreviousScore: function(quizElement, quizId) {
      try {
        const scores = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZ_SCORES)) || {};
        if (scores[quizId]) {
          const badge = quizElement.querySelector('.quiz-previous-score');
          if (badge) {
            badge.textContent = `Previous best: ${scores[quizId].score}%`;
            badge.style.display = 'inline-block';
          }
        }
      } catch (e) {
        console.error('Error loading previous score:', e);
      }
    },

    /**
     * Initialize all quizzes on the page
     */
    initializeAll: function() {
      const quizzes = document.querySelectorAll('.quiz-container');
      quizzes.forEach(quiz => this.init(quiz));
    }
  };

  // Code example copy functionality
  const CodeExamples = {
    /**
     * Initialize copy buttons for code examples
     */
    init: function() {
      const codeBlocks = document.querySelectorAll('.code-example');

      codeBlocks.forEach(block => {
        // Create copy button if it doesn't exist
        if (!block.querySelector('.copy-button')) {
          const copyBtn = this.createCopyButton();
          block.appendChild(copyBtn);
        }
      });
    },

    /**
     * Create a copy button element
     * @returns {HTMLElement} Copy button element
     */
    createCopyButton: function() {
      const button = document.createElement('button');
      button.className = 'copy-button';
      button.innerHTML = '<span class="copy-icon">📋</span><span class="copy-text">Copy</span>';
      button.setAttribute('aria-label', 'Copy code to clipboard');

      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.copyCode(button);
      });

      return button;
    },

    /**
     * Copy code to clipboard
     * @param {HTMLElement} button - The copy button that was clicked
     */
    copyCode: async function(button) {
      const codeBlock = button.closest('.code-example');
      const code = codeBlock.querySelector('code');

      if (!code) return;

      const textToCopy = code.textContent;

      try {
        await navigator.clipboard.writeText(textToCopy);
        this.showCopyFeedback(button, true);
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
          document.execCommand('copy');
          this.showCopyFeedback(button, true);
        } catch (e) {
          this.showCopyFeedback(button, false);
        }

        document.body.removeChild(textarea);
      }
    },

    /**
     * Show visual feedback after copy attempt
     * @param {HTMLElement} button - The copy button
     * @param {boolean} success - Whether the copy was successful
     */
    showCopyFeedback: function(button, success) {
      const icon = button.querySelector('.copy-icon');
      const text = button.querySelector('.copy-text');

      const originalIcon = icon.textContent;
      const originalText = text.textContent;

      if (success) {
        icon.textContent = '✓';
        text.textContent = 'Copied!';
        button.classList.add('copied');
      } else {
        icon.textContent = '✗';
        text.textContent = 'Failed';
        button.classList.add('error');
      }

      setTimeout(() => {
        icon.textContent = originalIcon;
        text.textContent = originalText;
        button.classList.remove('copied', 'error');
      }, 2000);
    }
  };

  // Expandable sections
  const ExpandableSections = {
    /**
     * Initialize expandable sections
     */
    init: function() {
      const sections = document.querySelectorAll('.expandable-section');

      sections.forEach(section => {
        const toggle = section.querySelector('.section-toggle');
        if (toggle) {
          toggle.addEventListener('click', () => this.toggle(section));
        }
      });

      // Auto-expand sections from URL hash
      this.handleHashNavigation();
      window.addEventListener('hashchange', () => this.handleHashNavigation());
    },

    /**
     * Toggle an expandable section
     * @param {HTMLElement} section - The section to toggle
     */
    toggle: function(section) {
      const content = section.querySelector('.section-content');
      const toggle = section.querySelector('.section-toggle');
      const isExpanded = section.classList.contains('expanded');

      if (isExpanded) {
        section.classList.remove('expanded');
        content.style.maxHeight = '0';
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        section.classList.add('expanded');
        content.style.maxHeight = content.scrollHeight + 'px';
        toggle.setAttribute('aria-expanded', 'true');
      }
    },

    /**
     * Expand a specific section
     * @param {HTMLElement} section - The section to expand
     */
    expand: function(section) {
      if (!section.classList.contains('expanded')) {
        this.toggle(section);
      }
    },

    /**
     * Handle URL hash navigation to auto-expand sections
     */
    handleHashNavigation: function() {
      const hash = window.location.hash;
      if (!hash) return;

      const target = document.querySelector(hash);
      if (!target) return;

      const section = target.closest('.expandable-section');
      if (section) {
        this.expand(section);
        // Scroll to target after expanding
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  };

  // Scroll progress tracker for articles
  const ScrollProgress = {
    /**
     * Initialize scroll progress tracking
     */
    init: function() {
      const article = document.querySelector('.article-content');
      if (!article) return;

      const articleId = document.body.dataset.articleId;
      if (!articleId) return;

      let ticking = false;

      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            this.updateProgress(article, articleId);
            ticking = false;
          });
          ticking = true;
        }
      });

      // Initial update
      this.updateProgress(article, articleId);
    },

    /**
     * Update scroll progress
     * @param {HTMLElement} article - The article content element
     * @param {string} articleId - Article identifier
     */
    updateProgress: function(article, articleId) {
      const rect = article.getBoundingClientRect();
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrolled = -rect.top;
      const total = articleHeight - windowHeight;

      const percentage = Math.max(0, Math.min(100, (scrolled / total) * 100));

      ProgressTracker.saveProgress(articleId, percentage);

      // Auto-complete if scrolled to the end
      if (percentage >= 95) {
        ProgressTracker.markComplete(articleId);
      }
    }
  };

  // Public API for external access
  window.LearnInteractive = {
    progress: ProgressTracker,
    quiz: QuizManager,
    code: CodeExamples,
    sections: ExpandableSections,
    scroll: ScrollProgress
  };

  // Initialize all components when DOM is ready
  function init() {
    ProgressTracker.initializeAll();
    QuizManager.initializeAll();
    CodeExamples.init();
    ExpandableSections.init();
    ScrollProgress.init();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
