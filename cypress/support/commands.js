// ***********************************************
// Custom Cypress Commands for BTC Signal AI
// ***********************************************

// ==========================================
// ACCESS & AUTHENTICATION COMMANDS
// ==========================================

/**
 * Grant premium access for testing
 * @param {string} tier - 'hourly' | 'daily' | 'weekly' | 'monthly'
 * @param {number} durationMs - Optional custom duration in milliseconds
 */
Cypress.Commands.add('grantAccess', (tier = 'daily', durationMs = null) => {
  const durations = {
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000
  }

  const duration = durationMs || durations[tier] || durations.daily
  const timestamp = Date.now()

  // Generate salt (matching access-manager.js logic)
  const generateSalt = (ts, dur) => {
    const base = ts + ':' + dur + ':btcsai2024'
    let hash = 0
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  const token = {
    tier: tier,
    timestamp: timestamp,
    duration: duration,
    salt: generateSalt(timestamp, duration),
    purchasedAt: timestamp
  }

  cy.window().then((win) => {
    win.localStorage.setItem('btcsai_access', JSON.stringify(token))
  })

  cy.log(`Granted ${tier} access for ${duration / 1000 / 60} minutes`)
})

/**
 * Grant access with recovery code and session token (full setup)
 */
Cypress.Commands.add('grantFullAccess', (tier = 'daily') => {
  cy.grantAccess(tier)

  // Add recovery code
  const recoveryCode = 'BTCSIG-TEST-CODE-1234'
  const sessionToken = 'test_session_' + Date.now()

  cy.window().then((win) => {
    win.localStorage.setItem('btcsai_recovery_code', recoveryCode)
    win.localStorage.setItem('btcsai_session_token', sessionToken)
  })

  cy.log(`Granted full access with recovery code: ${recoveryCode}`)
})

/**
 * Enable admin mode (bypasses all paywalls)
 */
Cypress.Commands.add('enableAdmin', () => {
  cy.window().then((win) => {
    win.localStorage.setItem('btcsai_admin', 'satoshi2024')
  })
  cy.log('Admin mode enabled')
})

/**
 * Disable admin mode
 */
Cypress.Commands.add('disableAdmin', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('btcsai_admin')
  })
  cy.log('Admin mode disabled')
})

/**
 * Clear all access (logout)
 */
Cypress.Commands.add('clearAccess', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('btcsai_access')
    win.localStorage.removeItem('btcsai_recovery_code')
    win.localStorage.removeItem('btcsai_session_token')
    win.localStorage.removeItem('btcsai_admin')
    win.localStorage.removeItem('btcsai_unlocked_posts')
  })
  cy.log('All access cleared')
})

/**
 * Unlock a specific post
 */
Cypress.Commands.add('unlockPost', (postId) => {
  cy.window().then((win) => {
    const posts = JSON.parse(win.localStorage.getItem('btcsai_unlocked_posts') || '[]')
    if (!posts.includes(postId)) {
      posts.push(postId)
      win.localStorage.setItem('btcsai_unlocked_posts', JSON.stringify(posts))
    }
  })
  cy.log(`Unlocked post: ${postId}`)
})

// ==========================================
// ASSERTION COMMANDS
// ==========================================

/**
 * Assert that paywall/premium gate is visible
 */
Cypress.Commands.add('shouldShowPaywall', () => {
  cy.get('[class*="gate"], [class*="paywall"], [class*="locked"]').should('be.visible')
})

/**
 * Assert that premium content is visible (not behind paywall)
 */
Cypress.Commands.add('shouldShowContent', () => {
  cy.get('[class*="premium-content"], [id="premium-content"]').should('be.visible')
})

/**
 * Assert element contains price format ($XX,XXX)
 */
Cypress.Commands.add('shouldShowPrice', { prevSubject: true }, (subject) => {
  cy.wrap(subject).invoke('text').should('match', /\$[\d,]+/)
})

/**
 * Assert element contains percentage
 */
Cypress.Commands.add('shouldShowPercentage', { prevSubject: true }, (subject) => {
  cy.wrap(subject).invoke('text').should('match', /[\d.]+%/)
})

// ==========================================
// API MOCKING COMMANDS
// ==========================================

/**
 * Mock market data API responses
 */
Cypress.Commands.add('mockMarketData', () => {
  // Mock Coinbase price
  cy.intercept('GET', '**/api.coinbase.com/**', {
    fixture: 'prices.json'
  }).as('coinbasePrice')

  // Mock CoinGecko
  cy.intercept('GET', '**/api.coingecko.com/**', {
    fixture: 'market-data.json'
  }).as('coingeckoData')

  // Mock Fear & Greed
  cy.intercept('GET', '**/api.alternative.me/**', {
    fixture: 'fear-greed.json'
  }).as('fearGreed')

  cy.log('Market data mocked')
})

/**
 * Mock Netlify function responses
 */
Cypress.Commands.add('mockNetlifyFunctions', () => {
  // Mock create-invoice
  cy.intercept('POST', '**/.netlify/functions/create-invoice', {
    statusCode: 200,
    body: {
      payment_request: 'lnbc1000n1test...',
      payment_hash: 'test_hash_123',
      qr_code: 'https://example.com/qr.png',
      tier: 'daily',
      amount: 10000,
      expires_at: Date.now() + 600000
    }
  }).as('createInvoice')

  // Mock check-payment (not paid by default)
  cy.intercept('POST', '**/.netlify/functions/check-payment', {
    statusCode: 200,
    body: { paid: false }
  }).as('checkPayment')

  // Mock store-access
  cy.intercept('POST', '**/.netlify/functions/store-access', {
    statusCode: 200,
    body: {
      success: true,
      recoveryCode: 'BTCSIG-TEST-MOCK-1234',
      sessionToken: 'mock_session_token',
      tier: 'daily',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  }).as('storeAccess')

  // Mock recover-access
  cy.intercept('POST', '**/.netlify/functions/recover-access', {
    statusCode: 200,
    body: {
      success: true,
      tier: 'daily',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      remainingMs: 24 * 60 * 60 * 1000,
      recoveryCode: 'BTCSIG-TEST-MOCK-1234',
      sessionToken: 'mock_session_token'
    }
  }).as('recoverAccess')

  // Mock validate-session
  cy.intercept('POST', '**/.netlify/functions/validate-session', {
    statusCode: 200,
    body: { valid: true }
  }).as('validateSession')

  // Mock liquidity-prediction
  cy.intercept('GET', '**/.netlify/functions/liquidity-prediction', {
    fixture: 'predictions.json'
  }).as('liquidityPrediction')

  cy.log('Netlify functions mocked')
})

/**
 * Mock payment as successful
 */
Cypress.Commands.add('mockPaymentSuccess', () => {
  cy.intercept('POST', '**/.netlify/functions/check-payment', {
    statusCode: 200,
    body: {
      paid: true,
      payment_hash: 'test_hash_123',
      details: {
        amount: 10000,
        time: Date.now()
      }
    }
  }).as('checkPaymentSuccess')

  cy.log('Payment mocked as successful')
})

// ==========================================
// NAVIGATION COMMANDS
// ==========================================

/**
 * Visit page and wait for it to load
 */
Cypress.Commands.add('visitAndWait', (url, options = {}) => {
  cy.visit(url, options)
  cy.get('body').should('be.visible')
  // Wait for any initial API calls to complete
  cy.wait(500)
})

/**
 * Navigate using header menu
 */
Cypress.Commands.add('navigateTo', (linkText) => {
  cy.get('nav, header').contains(linkText).click()
})

// ==========================================
// UTILITY COMMANDS
// ==========================================

/**
 * Wait for element to have non-loading text
 */
Cypress.Commands.add('waitForData', { prevSubject: true }, (subject) => {
  cy.wrap(subject)
    .should('not.contain', 'Loading')
    .and('not.contain', '--')
    .and('not.be.empty')
})

/**
 * Check if element is in viewport
 */
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  cy.wrap(subject).then($el => {
    const rect = $el[0].getBoundingClientRect()
    expect(rect.top).to.be.lessThan(Cypress.config('viewportHeight'))
    expect(rect.bottom).to.be.greaterThan(0)
  })
})

/**
 * Set viewport to mobile
 */
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport(375, 667)
  cy.log('Viewport set to mobile (375x667)')
})

/**
 * Set viewport to tablet
 */
Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport(768, 1024)
  cy.log('Viewport set to tablet (768x1024)')
})

/**
 * Set viewport to desktop
 */
Cypress.Commands.add('setDesktopViewport', () => {
  cy.viewport(1280, 720)
  cy.log('Viewport set to desktop (1280x720)')
})
