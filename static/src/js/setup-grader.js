// Setup Grader - Multi-Timeframe Chart Analysis
(function() {
  'use strict';

  // State
  var selectedFile = null;
  var selectedUrl = '';
  var selectedTimeframe = '4H';
  var selectedBias = '';
  var analysisHistory = [];

  // TradingView URL pattern
  var TV_URL_PATTERN = /^https?:\/\/(www\.)?tradingview\.com\/(chart|x)\/[a-zA-Z0-9]+/;

  // Grade colors
  var GRADE_COLORS = {
    'A+': '#00ff88',
    'A': '#3fb950',
    'B+': '#7ee787',
    'B': '#f7931a',
    'C+': '#f0883e',
    'C': '#f85149',
    'D': '#da3633',
    'F': '#8b0000'
  };

  // Initialize
  function init() {
    // Check premium access
    if (typeof BTCSAIAccess !== 'undefined' && !BTCSAIAccess.hasAllAccess()) {
      showPaywall();
      return;
    }

    setupUploader();
    setupTimeframeSelector();
    setupBiasSelector();
    loadHistory();
  }

  // Show paywall for non-premium users
  function showPaywall() {
    var content = document.getElementById('grader-content');
    var paywall = document.getElementById('grader-paywall');
    if (content) content.style.display = 'none';
    if (paywall) paywall.style.display = 'flex';
  }

  // Setup file uploader with drag & drop
  function setupUploader() {
    var uploadBox = document.getElementById('upload-box');
    var previewBox = document.getElementById('preview-box');
    var previewImage = document.getElementById('preview-image');
    var fileInput = document.getElementById('chart-input');
    var removeBtn = document.getElementById('remove-btn');
    var gradeBtn = document.getElementById('grade-btn');
    var urlInput = document.getElementById('url-input');
    var urlPreview = document.getElementById('url-preview');
    var urlDisplay = document.getElementById('url-display');

    if (!uploadBox || !fileInput) return;

    // URL input handling
    if (urlInput) {
      urlInput.addEventListener('input', function(e) {
        var url = e.target.value.trim();
        if (TV_URL_PATTERN.test(url)) {
          selectedUrl = url;
          selectedFile = null;
          if (uploadBox) uploadBox.style.display = 'none';
          if (previewBox) previewBox.style.display = 'none';
          if (urlPreview) {
            urlPreview.style.display = 'block';
            if (urlDisplay) urlDisplay.textContent = url;
          }
          if (gradeBtn) gradeBtn.disabled = false;
        } else if (url === '') {
          selectedUrl = '';
          if (urlPreview) urlPreview.style.display = 'none';
          if (!selectedFile) {
            if (uploadBox) uploadBox.style.display = 'flex';
            if (gradeBtn) gradeBtn.disabled = true;
          }
        }
      });

      urlInput.addEventListener('paste', function(e) {
        setTimeout(function() {
          urlInput.dispatchEvent(new Event('input'));
        }, 0);
      });
    }

    // Click to upload
    uploadBox.addEventListener('click', function() {
      fileInput.click();
    });

    // Drag and drop
    uploadBox.addEventListener('dragover', function(e) {
      e.preventDefault();
      uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', function() {
      uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', function(e) {
      e.preventDefault();
      uploadBox.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    // Remove button
    if (removeBtn) {
      removeBtn.addEventListener('click', function() {
        resetUpload();
      });
    }

    // Grade button
    if (gradeBtn) {
      gradeBtn.addEventListener('click', function() {
        if (selectedFile) {
          gradeSetup();
        }
      });
    }
  }

  // Handle file selection
  function handleFile(file) {
    var validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a PNG, JPG, or WEBP image', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be less than 10MB', 'error');
      return;
    }

    selectedFile = file;

    var reader = new FileReader();
    reader.onload = function(e) {
      var previewImage = document.getElementById('preview-image');
      var uploadBox = document.getElementById('upload-box');
      var previewBox = document.getElementById('preview-box');
      var gradeBtn = document.getElementById('grade-btn');

      if (previewImage) previewImage.src = e.target.result;
      if (uploadBox) uploadBox.style.display = 'none';
      if (previewBox) previewBox.style.display = 'block';
      if (gradeBtn) gradeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  // Reset upload state
  function resetUpload() {
    selectedFile = null;
    selectedUrl = '';
    var previewImage = document.getElementById('preview-image');
    var uploadBox = document.getElementById('upload-box');
    var previewBox = document.getElementById('preview-box');
    var gradeBtn = document.getElementById('grade-btn');
    var fileInput = document.getElementById('chart-input');
    var urlInput = document.getElementById('url-input');
    var urlPreview = document.getElementById('url-preview');
    var resultsSection = document.getElementById('results-section');

    if (previewImage) previewImage.src = '';
    if (uploadBox) uploadBox.style.display = 'flex';
    if (previewBox) previewBox.style.display = 'none';
    if (urlPreview) urlPreview.style.display = 'none';
    if (gradeBtn) gradeBtn.disabled = true;
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    if (resultsSection) resultsSection.style.display = 'none';
  }

  // Setup timeframe selector
  function setupTimeframeSelector() {
    var buttons = document.querySelectorAll('.tf-btn');
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        buttons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedTimeframe = btn.dataset.tf;
      });
    });
  }

  // Setup bias selector
  function setupBiasSelector() {
    var buttons = document.querySelectorAll('.bias-btn');
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        buttons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedBias = btn.dataset.bias;
      });
    });
  }

  // Grade the setup
  async function gradeSetup() {
    if (!selectedFile && !selectedUrl) return;

    var gradeBtn = document.getElementById('grade-btn');
    var btnText = gradeBtn.querySelector('.btn-text');
    var btnLoading = gradeBtn.querySelector('.btn-loading');

    // Show loading
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline-flex';
    if (gradeBtn) gradeBtn.disabled = true;

    // Update loading text for URL (takes longer)
    if (selectedUrl && btnLoading) {
      btnLoading.innerHTML = '<span class="spinner"></span> Capturing chart...';
    }

    try {
      // Get auth headers
      var authHeaders = {};
      if (typeof BTCSAIAccess !== 'undefined') {
        var recoveryCode = BTCSAIAccess.getRecoveryCode();
        var sessionToken = BTCSAIAccess.getSessionToken();
        if (recoveryCode) authHeaders['X-Recovery-Code'] = recoveryCode;
        if (sessionToken) authHeaders['X-Session-Token'] = sessionToken;
      }

      // Build request body - either image or URL
      var requestBody = {
        timeframe: selectedTimeframe,
        bias: selectedBias || null
      };

      if (selectedFile) {
        var base64 = await fileToBase64(selectedFile);
        requestBody.image = base64;
        requestBody.mimeType = selectedFile.type;
      } else if (selectedUrl) {
        requestBody.url = selectedUrl;
      }

      var response = await fetch('/.netlify/functions/analyze-setup', {
        method: 'POST',
        headers: Object.assign({
          'Content-Type': 'application/json'
        }, authHeaders),
        body: JSON.stringify(requestBody)
      });

      if (response.status === 401) {
        showPaywall();
        throw new Error('Authentication required');
      }

      var data = await response.json();

      // Handle rate limit for URL screenshots
      if (response.status === 429) {
        var resetIn = data.hint || 'Try again later';
        showToast('URL limit reached: ' + resetIn, 'warning');
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Show remaining URL captures if applicable
      if (selectedUrl && data.remaining !== undefined) {
        showToast('URL captures remaining today: ' + data.remaining, 'info');
      }

      displayResults(data);
      saveToHistory(data);

    } catch (error) {
      console.error('Grade error:', error);
      showToast(error.message || 'Failed to grade setup', 'error');
    } finally {
      if (btnText) btnText.style.display = 'inline';
      if (btnLoading) btnLoading.style.display = 'none';
      if (gradeBtn) gradeBtn.disabled = false;
    }
  }

  // Convert file to base64
  function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Display results
  function displayResults(data) {
    var resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;

    // Escape helper
    var escape = typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml : function(s) { return s || ''; };

    // Main score
    var scoreEl = document.getElementById('main-score');
    var gradeEl = document.getElementById('main-grade');
    var scoreCircle = document.getElementById('score-circle');

    if (scoreEl) scoreEl.textContent = data.score || 0;
    if (gradeEl) {
      gradeEl.textContent = data.grade || 'C';
      gradeEl.style.color = GRADE_COLORS[data.grade] || '#f7931a';
    }
    if (scoreCircle) {
      var pct = (data.score || 0) / 100;
      scoreCircle.style.background = 'conic-gradient(' + (GRADE_COLORS[data.grade] || '#f7931a') + ' ' + (pct * 360) + 'deg, #2d333b ' + (pct * 360) + 'deg)';
    }

    // Breakdown bars
    var breakdown = data.breakdown || {};
    updateBreakdownBar('trend-bar', 'trend-score', breakdown.trend_clarity, 20);
    updateBreakdownBar('levels-bar', 'levels-score', breakdown.key_levels, 20);
    updateBreakdownBar('pattern-bar', 'pattern-score', breakdown.pattern_quality, 20);
    updateBreakdownBar('rr-bar', 'rr-score', breakdown.risk_reward, 20);
    updateBreakdownBar('timing-bar', 'timing-score', breakdown.entry_timing, 20);

    // Timeframe alignment
    var higherTF = data.higher_tf || {};
    var lowerTF = data.lower_tf || {};

    updateTFAlignment('higher-tf-status', 'higher-tf-note', higherTF);
    updateTFAlignment('lower-tf-status', 'lower-tf-note', lowerTF);

    // Bias check
    var biasCheck = data.bias_check || {};
    var biasStatus = document.getElementById('bias-status');
    var biasWarning = document.getElementById('bias-warning');

    if (biasStatus) {
      if (biasCheck.aligned) {
        biasStatus.textContent = 'Bias aligned with chart';
        biasStatus.className = 'status-aligned';
      } else {
        biasStatus.textContent = 'Bias conflicts with chart';
        biasStatus.className = 'status-conflict';
      }
    }
    if (biasWarning) {
      if (biasCheck.warning) {
        biasWarning.textContent = escape(biasCheck.warning);
        biasWarning.style.display = 'block';
      } else {
        biasWarning.style.display = 'none';
      }
    }

    // Verdict
    var verdictEl = document.getElementById('verdict-text');
    if (verdictEl) verdictEl.textContent = escape(data.verdict || 'No verdict available');

    // Actionable
    var actionEl = document.getElementById('action-badge');
    if (actionEl) {
      actionEl.textContent = data.actionable || 'WAIT';
      actionEl.className = 'action-badge action-' + (data.actionable || 'wait').toLowerCase();
    }

    // Improvements
    var improvementsEl = document.getElementById('improvements-list');
    if (improvementsEl && data.improvements) {
      improvementsEl.innerHTML = data.improvements.map(function(item) {
        return '<li>' + escape(item) + '</li>';
      }).join('');
    }

    // Invalidation
    var invalidationEl = document.getElementById('invalidation-level');
    if (invalidationEl) {
      invalidationEl.textContent = escape(data.invalidation || 'Not specified');
    }

    // Show results
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Update breakdown bar
  function updateBreakdownBar(barId, scoreId, value, max) {
    var bar = document.getElementById(barId);
    var score = document.getElementById(scoreId);
    var pct = ((value || 0) / max) * 100;

    if (bar) {
      bar.style.width = pct + '%';
      bar.style.background = getScoreColor(value, max);
    }
    if (score) {
      score.textContent = (value || 0) + '/' + max;
    }
  }

  // Get color based on score
  function getScoreColor(value, max) {
    var pct = (value || 0) / max;
    if (pct >= 0.85) return '#3fb950';
    if (pct >= 0.70) return '#7ee787';
    if (pct >= 0.55) return '#f7931a';
    if (pct >= 0.40) return '#f0883e';
    return '#f85149';
  }

  // Update timeframe alignment display
  function updateTFAlignment(statusId, noteId, tfData) {
    var statusEl = document.getElementById(statusId);
    var noteEl = document.getElementById(noteId);
    var escape = typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml : function(s) { return s || ''; };

    if (statusEl) {
      var alignment = tfData.alignment || 'NEUTRAL';
      statusEl.textContent = alignment;
      statusEl.className = 'tf-status tf-' + alignment.toLowerCase();
    }
    if (noteEl) {
      noteEl.textContent = escape(tfData.note || '');
    }
  }

  // Save to history
  function saveToHistory(data) {
    var history = JSON.parse(localStorage.getItem('setupGraderHistory') || '[]');
    history.unshift({
      score: data.score,
      grade: data.grade,
      timeframe: data.timeframe,
      actionable: data.actionable,
      timestamp: new Date().toISOString()
    });
    // Keep last 20
    history = history.slice(0, 20);
    localStorage.setItem('setupGraderHistory', JSON.stringify(history));
    updateHistoryDisplay(history);
  }

  // Load history
  function loadHistory() {
    var history = JSON.parse(localStorage.getItem('setupGraderHistory') || '[]');
    updateHistoryDisplay(history);
  }

  // Update history display
  function updateHistoryDisplay(history) {
    var container = document.getElementById('history-list');
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = '<p class="no-history">No grades yet. Upload a chart to get started!</p>';
      return;
    }

    container.innerHTML = history.map(function(item) {
      var date = new Date(item.timestamp);
      var timeAgo = getTimeAgo(date);
      return '<div class="history-item">' +
        '<span class="history-grade" style="color: ' + (GRADE_COLORS[item.grade] || '#f7931a') + '">' + item.grade + '</span>' +
        '<span class="history-score">' + item.score + '/100</span>' +
        '<span class="history-tf">' + item.timeframe + '</span>' +
        '<span class="history-action action-' + (item.actionable || 'wait').toLowerCase() + '">' + item.actionable + '</span>' +
        '<span class="history-time">' + timeAgo + '</span>' +
      '</div>';
    }).join('');
  }

  // Get time ago string
  function getTimeAgo(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  // Show toast notification
  function showToast(message, type) {
    if (typeof Toast !== 'undefined') {
      Toast.show(message, type);
    } else {
      console.log('[' + type + ']', message);
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
