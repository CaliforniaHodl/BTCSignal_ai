// AI Chart Analysis JavaScript
(function() {
  // Check if user has unlocked posts
  function hasUnlockedPosts() {
    const unlocked = localStorage.getItem('unlockedPosts');
    if (!unlocked) return false;
    try {
      const posts = JSON.parse(unlocked);
      return Array.isArray(posts) && posts.length > 0;
    } catch {
      return false;
    }
  }

  // Initialize page
  function init() {
    const lockedDiv = document.getElementById('analyze-locked');
    const contentDiv = document.getElementById('analyze-content');

    if (!lockedDiv || !contentDiv) return;

    if (hasUnlockedPosts()) {
      lockedDiv.style.display = 'none';
      contentDiv.style.display = 'block';
      setupUploader();
    } else {
      lockedDiv.style.display = 'flex';
      contentDiv.style.display = 'none';
    }
  }

  // Setup file uploader
  function setupUploader() {
    const uploadBox = document.getElementById('upload-box');
    const previewBox = document.getElementById('preview-box');
    const previewImage = document.getElementById('preview-image');
    const fileInput = document.getElementById('chart-input');
    const removeBtn = document.getElementById('remove-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const newAnalysisBtn = document.getElementById('new-analysis-btn');

    let selectedFile = null;

    // Click to upload
    uploadBox.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
      uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadBox.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    // Handle file selection
    function handleFile(file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showError('Please upload a PNG, JPG, or WEBP image');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
      }

      selectedFile = file;
      hideError();

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadBox.style.display = 'none';
        previewBox.style.display = 'block';
        analyzeBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }

    // Remove file
    removeBtn.addEventListener('click', () => {
      selectedFile = null;
      previewImage.src = '';
      previewBox.style.display = 'none';
      uploadBox.style.display = 'flex';
      analyzeBtn.disabled = true;
      fileInput.value = '';
    });

    // Analyze button
    analyzeBtn.addEventListener('click', async () => {
      if (!selectedFile) return;
      await analyzeChart(selectedFile);
    });

    // New analysis button
    newAnalysisBtn.addEventListener('click', () => {
      document.getElementById('results-section').style.display = 'none';
      removeBtn.click();
    });
  }

  // Analyze chart via API
  async function analyzeChart(file) {
    const analyzeBtn = document.getElementById('analyze-btn');
    const btnText = analyzeBtn.querySelector('.btn-text');
    const btnLoading = analyzeBtn.querySelector('.btn-loading');
    const resultsSection = document.getElementById('results-section');

    // Show loading state
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';
    analyzeBtn.disabled = true;
    hideError();

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      // Include auth headers for server-side validation
      const authHeaders = {};
      if (typeof BTCSAIAccess !== 'undefined') {
        const recoveryCode = BTCSAIAccess.getRecoveryCode();
        const sessionToken = BTCSAIAccess.getSessionToken();
        if (recoveryCode) authHeaders['X-Recovery-Code'] = recoveryCode;
        if (sessionToken) authHeaders['X-Session-Token'] = sessionToken;
      }

      // Call API
      const response = await fetch('/.netlify/functions/analyze-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        throw new Error('Authentication required. Please purchase access.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Display results
      displayResults(data);
      resultsSection.style.display = 'block';
      resultsSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      console.error('Analysis error:', error);
      showError(error.message || 'Failed to analyze chart. Please try again.');
    } finally {
      // Reset button
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      analyzeBtn.disabled = false;
    }
  }

  // Convert file to base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data URL prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Display analysis results
  function displayResults(data) {
    document.getElementById('trend-result').innerHTML = formatResult(data.trend);
    document.getElementById('levels-result').innerHTML = formatResult(data.levels);
    document.getElementById('patterns-result').innerHTML = formatResult(data.patterns);
    document.getElementById('setup-result').innerHTML = formatResult(data.setup);
    document.getElementById('full-analysis').innerHTML = formatResult(data.fullAnalysis);
  }

  // Format result text with markdown-like styling
  function formatResult(text) {
    if (!text) return '-';
    // Convert newlines to <br>
    let formatted = text.replace(/\n/g, '<br>');
    // Bold text between **
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Bullet points
    formatted = formatted.replace(/^- /gm, '&bull; ');
    return formatted;
  }

  // Show error message
  function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = errorDiv.querySelector('.error-text');
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
  }

  // Hide error message
  function hideError() {
    document.getElementById('error-message').style.display = 'none';
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
