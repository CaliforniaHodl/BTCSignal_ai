// ***********************************************************
// This file is processed and loaded automatically before test files.
// Use it to put global configuration and behavior that modifies Cypress.
// ***********************************************************

// Import commands.js
import './commands'

// Prevent Cypress from failing on uncaught exceptions from the app
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore common errors that don't affect tests
  if (err.message.includes('ResizeObserver loop')) {
    return false
  }
  if (err.message.includes('Non-Error promise rejection')) {
    return false
  }
  // Return false to prevent the error from failing the test
  return false
})

// Log test start
beforeEach(() => {
  cy.log(`Starting test: ${Cypress.currentTest.title}`)
})

// Clear localStorage between tests (optional - uncomment if needed)
// beforeEach(() => {
//   cy.clearLocalStorage()
// })
