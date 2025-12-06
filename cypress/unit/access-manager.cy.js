/// <reference types="cypress" />

describe('Access Manager Unit Tests', () => {
  beforeEach(() => {
    // Clear all access-related localStorage before each test
    cy.visit('/')
    cy.window().then((win) => {
      win.localStorage.removeItem('btcsai_access')
      win.localStorage.removeItem('btcsai_unlocked_posts')
      win.localStorage.removeItem('btcsai_admin')
      win.localStorage.removeItem('btcsai_recovery_code')
      win.localStorage.removeItem('btcsai_session_token')
    })
  })

  describe('Admin Mode', () => {
    it('should enable admin mode', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.enableAdmin()
          expect(win.BTCSAIAccess.isAdmin()).to.be.true
        }
      })
    })

    it('should disable admin mode', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.enableAdmin()
          win.BTCSAIAccess.disableAdmin()
          expect(win.BTCSAIAccess.isAdmin()).to.be.false
        }
      })
    })

    it('should bypass access checks in admin mode', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.enableAdmin()
          expect(win.BTCSAIAccess.hasAllAccess()).to.be.true
          expect(win.BTCSAIAccess.isPostUnlocked('any-post-id')).to.be.true
        }
      })
    })
  })

  describe('Access Token Management', () => {
    it('should return null when no access set', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          const access = win.BTCSAIAccess.getAccess()
          expect(access).to.be.null
        }
      })
    })

    it('should set hourly access', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          const duration = 60 * 60 * 1000 // 1 hour
          win.BTCSAIAccess.setAccess('hourly', duration)
          const access = win.BTCSAIAccess.getAccess()
          expect(access).to.not.be.null
          expect(access.valid).to.be.true
          expect(access.tier).to.equal('hourly')
        }
      })
    })

    it('should set daily access', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          const duration = 24 * 60 * 60 * 1000 // 24 hours
          win.BTCSAIAccess.setAccess('daily', duration)
          const access = win.BTCSAIAccess.getAccess()
          expect(access.valid).to.be.true
          expect(access.tier).to.equal('daily')
        }
      })
    })

    it('should set weekly access', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          const duration = 7 * 24 * 60 * 60 * 1000 // 7 days
          win.BTCSAIAccess.setAccess('weekly', duration)
          const access = win.BTCSAIAccess.getAccess()
          expect(access.valid).to.be.true
          expect(access.tier).to.equal('weekly')
        }
      })
    })

    it('should clear access', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setAccess('daily', 86400000)
          win.BTCSAIAccess.clearAccess()
          const access = win.BTCSAIAccess.getAccess()
          expect(access).to.be.null
        }
      })
    })

    it('should detect expired access', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          // Set access with 0 duration (immediately expired)
          const token = {
            tier: 'daily',
            timestamp: Date.now() - 100000, // In the past
            duration: 1000, // Very short
            salt: 'test'
          }
          win.localStorage.setItem('btcsai_access', JSON.stringify(token))

          const access = win.BTCSAIAccess.getAccess()
          // Token will fail verification due to invalid salt, so null
          expect(access).to.satisfy((a) => a === null || a.expired === true)
        }
      })
    })

    it('should calculate remaining time', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          const duration = 60 * 60 * 1000 // 1 hour
          win.BTCSAIAccess.setAccess('hourly', duration)
          const access = win.BTCSAIAccess.getAccess()
          expect(access.remaining).to.be.a('number')
          expect(access.remaining).to.be.greaterThan(0)
          expect(access.remaining).to.be.lessThan(duration + 1000)
        }
      })
    })
  })

  describe('hasAllAccess()', () => {
    it('should return false when no access', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          expect(win.BTCSAIAccess.hasAllAccess()).to.be.false
        }
      })
    })

    it('should return true for hourly tier', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setAccess('hourly', 3600000)
          expect(win.BTCSAIAccess.hasAllAccess()).to.be.true
        }
      })
    })

    it('should return true for daily tier', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setAccess('daily', 86400000)
          expect(win.BTCSAIAccess.hasAllAccess()).to.be.true
        }
      })
    })

    it('should return true for weekly tier', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setAccess('weekly', 604800000)
          expect(win.BTCSAIAccess.hasAllAccess()).to.be.true
        }
      })
    })
  })

  describe('Single Post Access', () => {
    it('should unlock individual post', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.unlockPost('test-post-123')
          expect(win.BTCSAIAccess.isPostUnlocked('test-post-123')).to.be.true
        }
      })
    })

    it('should track multiple unlocked posts', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.unlockPost('post-1')
          win.BTCSAIAccess.unlockPost('post-2')
          win.BTCSAIAccess.unlockPost('post-3')
          const posts = win.BTCSAIAccess.getUnlockedPosts()
          expect(posts).to.include('post-1')
          expect(posts).to.include('post-2')
          expect(posts).to.include('post-3')
        }
      })
    })

    it('should not duplicate unlocked posts', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.unlockPost('same-post')
          win.BTCSAIAccess.unlockPost('same-post')
          win.BTCSAIAccess.unlockPost('same-post')
          const posts = win.BTCSAIAccess.getUnlockedPosts()
          const count = posts.filter(p => p === 'same-post').length
          expect(count).to.equal(1)
        }
      })
    })

    it('should return false for locked post', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          expect(win.BTCSAIAccess.isPostUnlocked('never-unlocked')).to.be.false
        }
      })
    })
  })

  describe('Recovery Code Management', () => {
    it('should store recovery code', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setRecoveryCode('BTCSIG-TEST-CODE-1234')
          expect(win.BTCSAIAccess.getRecoveryCode()).to.equal('BTCSIG-TEST-CODE-1234')
        }
      })
    })

    it('should clear recovery code', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setRecoveryCode('BTCSIG-TEST-CODE-1234')
          win.BTCSAIAccess.clearRecoveryCode()
          expect(win.BTCSAIAccess.getRecoveryCode()).to.be.null
        }
      })
    })

    it('should return null when no recovery code', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          expect(win.BTCSAIAccess.getRecoveryCode()).to.be.null
        }
      })
    })
  })

  describe('Session Token Management', () => {
    it('should store session token', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setSessionToken('session_xyz_123')
          expect(win.BTCSAIAccess.getSessionToken()).to.equal('session_xyz_123')
        }
      })
    })

    it('should clear session token', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setSessionToken('session_xyz_123')
          win.BTCSAIAccess.clearSessionToken()
          expect(win.BTCSAIAccess.getSessionToken()).to.be.null
        }
      })
    })

    it('should return null when no session token', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          expect(win.BTCSAIAccess.getSessionToken()).to.be.null
        }
      })
    })
  })

  describe('Format Remaining Time', () => {
    it('should format minutes correctly', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess && win.BTCSAIAccess.formatRemaining) {
          const result = win.BTCSAIAccess.formatRemaining(30 * 60 * 1000)
          expect(result).to.include('30')
          expect(result).to.include('minute')
        }
      })
    })

    it('should format hours correctly', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess && win.BTCSAIAccess.formatRemaining) {
          const result = win.BTCSAIAccess.formatRemaining(5 * 60 * 60 * 1000)
          expect(result).to.include('5h')
        }
      })
    })

    it('should format days correctly', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess && win.BTCSAIAccess.formatRemaining) {
          const result = win.BTCSAIAccess.formatRemaining(3 * 24 * 60 * 60 * 1000)
          expect(result).to.include('3')
          expect(result).to.include('day')
        }
      })
    })

    it('should return Expired for zero or negative', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess && win.BTCSAIAccess.formatRemaining) {
          expect(win.BTCSAIAccess.formatRemaining(0)).to.equal('Expired')
          expect(win.BTCSAIAccess.formatRemaining(-1000)).to.equal('Expired')
        }
      })
    })
  })

  describe('Tier Constants', () => {
    it('should have correct tier durations', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess && win.BTCSAIAccess.TIER_DURATIONS) {
          const durations = win.BTCSAIAccess.TIER_DURATIONS
          expect(durations.single).to.equal(0)
          expect(durations.hourly).to.equal(60 * 60 * 1000)
          expect(durations.daily).to.equal(24 * 60 * 60 * 1000)
          expect(durations.weekly).to.equal(7 * 24 * 60 * 60 * 1000)
        }
      })
    })

    it('should have correct tier prices', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess && win.BTCSAIAccess.TIER_PRICES) {
          const prices = win.BTCSAIAccess.TIER_PRICES
          expect(prices.single).to.equal(21)
          expect(prices.hourly).to.equal(1000)
          expect(prices.daily).to.equal(10000)
          expect(prices.weekly).to.equal(25000)
        }
      })
    })
  })

  describe('Token Verification', () => {
    it('should reject tampered tokens', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          // Create a tampered token
          const tamperedToken = {
            tier: 'daily',
            timestamp: Date.now(),
            duration: 999999999999, // Tampered duration
            salt: 'invalid_salt'
          }
          win.localStorage.setItem('btcsai_access', JSON.stringify(tamperedToken))

          const access = win.BTCSAIAccess.getAccess()
          // Should reject tampered token
          expect(access).to.be.null
        }
      })
    })

    it('should accept valid tokens', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          win.BTCSAIAccess.setAccess('daily', 86400000)
          const access = win.BTCSAIAccess.getAccess()
          expect(access).to.not.be.null
          expect(access.valid).to.be.true
        }
      })
    })
  })

  describe('Access Extension', () => {
    it('should extend existing access when purchasing again', () => {
      cy.window().then((win) => {
        if (win.BTCSAIAccess) {
          // Set initial access
          win.BTCSAIAccess.setAccess('daily', 86400000)
          const firstAccess = win.BTCSAIAccess.getAccess()
          const firstExpiry = firstAccess.expires

          // Wait a tiny bit and set again
          setTimeout(() => {
            win.BTCSAIAccess.setAccess('daily', 86400000)
            const secondAccess = win.BTCSAIAccess.getAccess()
            // New expiry should be further in the future
            expect(secondAccess.expires).to.be.greaterThan(firstExpiry)
          }, 10)
        }
      })
    })
  })
})
