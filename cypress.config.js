const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Base URL for the Hugo dev server
    baseUrl: 'http://localhost:1313',

    // Spec file patterns
    specPattern: [
      'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/api/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/unit/**/*.cy.{js,jsx,ts,tsx}'
    ],

    // Support file
    supportFile: 'cypress/support/e2e.js',

    // Fixtures folder
    fixturesFolder: 'cypress/fixtures',

    // Screenshots and videos
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    video: false, // Disable video by default for speed

    // Viewport (desktop default)
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    pageLoadTimeout: 30000,

    // Retries for flaky test prevention
    retries: {
      runMode: 2,
      openMode: 0
    },

    // Environment variables
    env: {
      // API base for Netlify functions
      apiUrl: '/.netlify/functions',

      // Test admin credentials
      adminSecret: 'satoshi2024',

      // Mock data flags
      useMockData: true
    },

    setupNodeEvents(on, config) {
      // Node event listeners here

      // Log task for debugging
      on('task', {
        log(message) {
          console.log(message)
          return null
        }
      })

      return config
    }
  },

  // Component testing (optional, for future use)
  component: {
    devServer: {
      framework: 'vanilla',
      bundler: 'webpack'
    }
  }
})
