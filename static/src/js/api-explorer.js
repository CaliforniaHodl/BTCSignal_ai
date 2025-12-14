// BTC Signal AI - API Explorer
// Interactive API testing and documentation interface

(function() {
  'use strict';

  // ========== ENDPOINT DEFINITIONS ==========
  const ENDPOINTS = [
    {
      id: 'market-data',
      name: 'Market Data',
      method: 'GET',
      path: '/.netlify/functions/api-market-data',
      description: 'Get current Bitcoin market data including price, volume, and market cap',
      category: 'Market',
      params: [
        {
          name: 'fields',
          type: 'string',
          required: false,
          description: 'Comma-separated list of fields to return (e.g., "btc,fearGreed,funding")',
          example: 'btc,fearGreed'
        }
      ],
      responseExample: {
        success: true,
        timestamp: '2025-12-13T12:00:00.000Z',
        data: {
          btc: {
            price: 100000,
            priceChange24h: 2.5,
            high24h: 101000,
            low24h: 98000,
            volume24h: 45000000000,
            marketCap: 1950000000000
          }
        }
      }
    },
    {
      id: 'fear-greed',
      name: 'Fear & Greed Index',
      method: 'GET',
      path: '/.netlify/functions/api-fear-greed',
      description: 'Get the current Fear & Greed Index value and historical data',
      category: 'Sentiment',
      params: [],
      responseExample: {
        success: true,
        timestamp: '2025-12-13T12:00:00.000Z',
        data: {
          value: 72,
          label: 'Greed',
          lastUpdate: '2025-12-13T11:00:00.000Z'
        }
      }
    },
    {
      id: 'funding-rates',
      name: 'Funding Rates',
      method: 'GET',
      path: '/.netlify/functions/api-funding',
      description: 'Get perpetual futures funding rates across major exchanges',
      category: 'Derivatives',
      params: [
        {
          name: 'exchange',
          type: 'string',
          required: false,
          description: 'Filter by exchange (binance, bybit, okx, deribit)',
          example: 'binance'
        }
      ],
      responseExample: {
        success: true,
        timestamp: '2025-12-13T12:00:00.000Z',
        data: {
          average: 0.0123,
          exchanges: {
            binance: 0.0100,
            bybit: 0.0145,
            okx: 0.0124
          }
        }
      }
    },
    {
      id: 'open-interest',
      name: 'Open Interest',
      method: 'GET',
      path: '/.netlify/functions/api-open-interest',
      description: 'Get total open interest in BTC perpetual futures',
      category: 'Derivatives',
      params: [],
      responseExample: {
        success: true,
        timestamp: '2025-12-13T12:00:00.000Z',
        data: {
          btc: 550000,
          usd: 55000000000,
          change24h: 2.5
        }
      }
    },
    {
      id: 'liquidations',
      name: 'Liquidations',
      method: 'GET',
      path: '/.netlify/functions/api-liquidations',
      description: 'Get recent liquidation data and upcoming liquidation levels',
      category: 'Derivatives',
      params: [
        {
          name: 'timeframe',
          type: 'string',
          required: false,
          description: 'Time window for liquidation data (1h, 4h, 24h)',
          example: '24h'
        }
      ],
      responseExample: {
        success: true,
        timestamp: '2025-12-13T12:00:00.000Z',
        data: {
          last24h: {
            longs: 125000000,
            shorts: 87000000,
            total: 212000000
          },
          levels: {
            above: [101000, 102500, 105000],
            below: [98000, 96500, 95000]
          }
        }
      }
    },
    {
      id: 'onchain-metrics',
      name: 'On-Chain Metrics',
      method: 'GET',
      path: '/.netlify/functions/api-onchain',
      description: 'Get Bitcoin on-chain metrics like MVRV, NUPL, and exchange flows',
      category: 'On-Chain',
      params: [
        {
          name: 'metrics',
          type: 'string',
          required: false,
          description: 'Comma-separated list of metrics (mvrv, nupl, flows, supply)',
          example: 'mvrv,nupl'
        }
      ],
      responseExample: {
        success: true,
        timestamp: '2025-12-13T12:00:00.000Z',
        data: {
          mvrv: 2.45,
          nupl: 0.65,
          exchangeFlows: {
            netflow24h: -2500,
            inflow: 12000,
            outflow: 14500
          }
        }
      }
    }
  ];

  // ========== STATE ==========
  let currentEndpoint = null;
  let requestParams = [];

  // ========== INITIALIZATION ==========
  function init() {
    renderEndpointsList();
    attachEventListeners();

    // Select first endpoint by default
    if (ENDPOINTS.length > 0) {
      selectEndpoint(ENDPOINTS[0].id);
    }
  }

  // ========== RENDER FUNCTIONS ==========
  function renderEndpointsList() {
    const list = document.getElementById('endpoints-list');
    const countEl = document.getElementById('endpoint-count');

    if (!list) return;

    // Group by category
    const categories = {};
    ENDPOINTS.forEach(endpoint => {
      if (!categories[endpoint.category]) {
        categories[endpoint.category] = [];
      }
      categories[endpoint.category].push(endpoint);
    });

    let html = '';
    Object.keys(categories).forEach(category => {
      html += `<div class="endpoint-category">
        <div class="category-label">${category}</div>
        <div class="category-endpoints">`;

      categories[category].forEach(endpoint => {
        html += `
          <button class="endpoint-item" data-endpoint="${endpoint.id}">
            <span class="endpoint-method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
            <span class="endpoint-name">${endpoint.name}</span>
          </button>`;
      });

      html += `</div></div>`;
    });

    list.innerHTML = html;

    if (countEl) {
      countEl.textContent = ENDPOINTS.length;
    }
  }

  function selectEndpoint(endpointId) {
    const endpoint = ENDPOINTS.find(e => e.id === endpointId);
    if (!endpoint) return;

    currentEndpoint = endpoint;
    requestParams = [];

    // Update UI
    updateActiveEndpoint(endpointId);
    updateRequestBuilder(endpoint);
    updateCodeExamples(endpoint);
    updateEndpointDocs(endpoint);
    clearResponse();
  }

  function updateActiveEndpoint(endpointId) {
    document.querySelectorAll('.endpoint-item').forEach(item => {
      item.classList.toggle('active', item.dataset.endpoint === endpointId);
    });
  }

  function updateRequestBuilder(endpoint) {
    const methodSelect = document.getElementById('request-method');
    const urlInput = document.getElementById('request-url');
    const paramsSection = document.getElementById('query-params-section');
    const bodySection = document.getElementById('request-body-section');

    if (methodSelect) methodSelect.value = endpoint.method;
    if (urlInput) urlInput.value = getFullUrl(endpoint);

    // Show/hide params section
    if (paramsSection) {
      paramsSection.style.display = endpoint.params.length > 0 ? 'block' : 'none';
      if (endpoint.params.length > 0) {
        renderParamsList(endpoint.params);
      }
    }

    // Show/hide body section for POST
    if (bodySection) {
      bodySection.style.display = endpoint.method === 'POST' ? 'block' : 'none';
    }
  }

  function renderParamsList(params) {
    const list = document.getElementById('params-list');
    if (!list) return;

    let html = '';
    params.forEach((param, index) => {
      html += `
        <div class="param-row" data-param-index="${index}">
          <div class="param-info">
            <label class="param-name">
              ${param.name}
              ${param.required ? '<span class="required">*</span>' : '<span class="optional">optional</span>'}
            </label>
            <span class="param-desc">${param.description}</span>
          </div>
          <div class="param-input-wrapper">
            <input
              type="text"
              class="param-input"
              data-param="${param.name}"
              placeholder="${param.example || ''}"
            >
          </div>
        </div>`;
    });

    list.innerHTML = html;
  }

  function updateCodeExamples(endpoint) {
    const url = getFullUrl(endpoint);
    const params = getCurrentParams();
    const fullUrl = params.length > 0 ? `${url}?${params.join('&')}` : url;

    // cURL
    updateCodeBlock('curl-code', generateCurlCode(endpoint, fullUrl));

    // JavaScript
    updateCodeBlock('js-code', generateJavaScriptCode(endpoint, fullUrl));

    // Python
    updateCodeBlock('python-code', generatePythonCode(endpoint, fullUrl));
  }

  function updateCodeBlock(id, code) {
    const block = document.getElementById(id);
    if (block) {
      block.textContent = code;
    }
  }

  function generateCurlCode(endpoint, url) {
    if (endpoint.method === 'GET') {
      return `curl "${url}"`;
    } else {
      const body = document.getElementById('request-body')?.value || '{}';
      return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;
    }
  }

  function generateJavaScriptCode(endpoint, url) {
    if (endpoint.method === 'GET') {
      return `fetch('${url}')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
    } else {
      const body = document.getElementById('request-body')?.value || '{}';
      return `fetch('${url}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${body})
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
    }
  }

  function generatePythonCode(endpoint, url) {
    if (endpoint.method === 'GET') {
      return `import requests

response = requests.get('${url}')
data = response.json()
print(data)`;
    } else {
      const body = document.getElementById('request-body')?.value || '{}';
      return `import requests
import json

response = requests.post('${url}',
    headers={'Content-Type': 'application/json'},
    data=json.dumps(${body}))
data = response.json()
print(data)`;
    }
  }

  function updateEndpointDocs(endpoint) {
    const docsContent = document.getElementById('docs-content');
    if (!docsContent) return;

    let html = `
      <h3>${endpoint.name}</h3>
      <p class="endpoint-description">${endpoint.description}</p>

      <div class="docs-section">
        <h4>Endpoint</h4>
        <code class="endpoint-path">${endpoint.method} ${endpoint.path}</code>
      </div>`;

    if (endpoint.params.length > 0) {
      html += `
        <div class="docs-section">
          <h4>Query Parameters</h4>
          <table class="params-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>`;

      endpoint.params.forEach(param => {
        html += `
          <tr>
            <td><code>${param.name}</code></td>
            <td>${param.type}</td>
            <td>${param.required ? 'Yes' : 'No'}</td>
            <td>${param.description}</td>
          </tr>`;
      });

      html += `</tbody></table></div>`;
    }

    html += `
      <div class="docs-section">
        <h4>Example Response</h4>
        <pre class="example-response"><code class="language-json">${JSON.stringify(endpoint.responseExample, null, 2)}</code></pre>
      </div>`;

    docsContent.innerHTML = html;
  }

  // ========== REQUEST HANDLING ==========
  async function sendRequest() {
    if (!currentEndpoint) return;

    const statusEl = document.getElementById('request-status');
    const responseTimeEl = document.getElementById('response-time');
    const statusBadge = document.getElementById('response-status-badge');
    const responseJson = document.getElementById('response-json');
    const responseEmpty = document.getElementById('response-empty');

    // Update status
    if (statusEl) {
      statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      statusEl.className = 'request-status loading';
    }

    const startTime = Date.now();
    const url = getFullUrl(currentEndpoint);
    const params = getCurrentParams();
    const fullUrl = params.length > 0 ? `${url}?${params.join('&')}` : url;

    try {
      const options = {
        method: currentEndpoint.method
      };

      if (currentEndpoint.method === 'POST') {
        const body = document.getElementById('request-body')?.value;
        if (body) {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = body;
        }
      }

      const response = await fetch(fullUrl, options);
      const data = await response.json();
      const duration = Date.now() - startTime;

      // Display response
      displayResponse(data, response.status, duration);

      // Update status
      if (statusEl) {
        statusEl.innerHTML = '<i class="fas fa-check"></i> Success';
        statusEl.className = 'request-status success';
      }

    } catch (error) {
      const duration = Date.now() - startTime;

      // Display error
      displayResponse({ error: error.message }, 0, duration);

      // Update status
      if (statusEl) {
        statusEl.innerHTML = '<i class="fas fa-times"></i> Error';
        statusEl.className = 'request-status error';
      }
    }
  }

  function displayResponse(data, status, duration) {
    const responseJson = document.getElementById('response-json');
    const responseEmpty = document.getElementById('response-empty');
    const responseTimeEl = document.getElementById('response-time');
    const statusBadge = document.getElementById('response-status-badge');

    if (responseEmpty) responseEmpty.style.display = 'none';
    if (responseJson) {
      responseJson.style.display = 'block';
      const code = responseJson.querySelector('code');
      if (code) {
        code.textContent = JSON.stringify(data, null, 2);
      }
    }

    if (responseTimeEl) {
      responseTimeEl.textContent = `${duration}ms`;
    }

    if (statusBadge) {
      if (status >= 200 && status < 300) {
        statusBadge.textContent = `${status} OK`;
        statusBadge.className = 'response-status success';
      } else if (status === 0) {
        statusBadge.textContent = 'Network Error';
        statusBadge.className = 'response-status error';
      } else {
        statusBadge.textContent = `${status} Error`;
        statusBadge.className = 'response-status error';
      }
    }
  }

  function clearResponse() {
    const responseJson = document.getElementById('response-json');
    const responseEmpty = document.getElementById('response-empty');
    const responseTimeEl = document.getElementById('response-time');
    const statusBadge = document.getElementById('response-status-badge');
    const statusEl = document.getElementById('request-status');

    if (responseEmpty) responseEmpty.style.display = 'flex';
    if (responseJson) responseJson.style.display = 'none';
    if (responseTimeEl) responseTimeEl.textContent = '';
    if (statusBadge) statusBadge.textContent = '';
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'request-status';
    }
  }

  // ========== UTILITY FUNCTIONS ==========
  function getFullUrl(endpoint) {
    return window.location.origin + endpoint.path;
  }

  function getCurrentParams() {
    const params = [];
    document.querySelectorAll('.param-input').forEach(input => {
      if (input.value.trim()) {
        params.push(`${input.dataset.param}=${encodeURIComponent(input.value.trim())}`);
      }
    });
    return params;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (typeof Toast !== 'undefined') {
          Toast.success('Copied to clipboard');
        }
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      if (typeof Toast !== 'undefined') {
        Toast.success('Copied to clipboard');
      }
    }
  }

  // ========== EVENT LISTENERS ==========
  function attachEventListeners() {
    // Endpoint selection
    document.addEventListener('click', (e) => {
      const endpointBtn = e.target.closest('.endpoint-item');
      if (endpointBtn) {
        selectEndpoint(endpointBtn.dataset.endpoint);
      }
    });

    // Send request button
    const sendBtn = document.getElementById('btn-send-request');
    if (sendBtn) {
      sendBtn.addEventListener('click', sendRequest);
    }

    // Reset button
    const resetBtn = document.getElementById('btn-reset-request');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (currentEndpoint) {
          selectEndpoint(currentEndpoint.id);
        }
      });
    }

    // Copy URL button
    const copyUrlBtn = document.getElementById('btn-copy-url');
    if (copyUrlBtn) {
      copyUrlBtn.addEventListener('click', () => {
        const url = document.getElementById('request-url')?.value;
        if (url) copyToClipboard(url);
      });
    }

    // Copy response button
    const copyResponseBtn = document.getElementById('btn-copy-response');
    if (copyResponseBtn) {
      copyResponseBtn.addEventListener('click', () => {
        const code = document.querySelector('#response-json code');
        if (code) copyToClipboard(code.textContent);
      });
    }

    // Code example tabs
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.tab-btn');
      if (tabBtn) {
        const lang = tabBtn.dataset.lang;

        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn === tabBtn);
        });

        // Show corresponding panel
        document.querySelectorAll('.code-panel').forEach(panel => {
          panel.classList.toggle('active', panel.dataset.lang === lang);
        });
      }
    });

    // Copy code buttons
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.btn-copy-code');
      if (copyBtn) {
        const targetId = copyBtn.dataset.target;
        const code = document.getElementById(targetId);
        if (code) copyToClipboard(code.textContent);
      }
    });

    // Update code examples when params change
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('param-input')) {
        if (currentEndpoint) {
          updateCodeExamples(currentEndpoint);
        }
      }
    });

    // Update code examples when body changes
    const bodyInput = document.getElementById('request-body');
    if (bodyInput) {
      bodyInput.addEventListener('input', () => {
        if (currentEndpoint) {
          updateCodeExamples(currentEndpoint);
        }
      });
    }
  }

  // ========== INITIALIZATION ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
