/// <reference types="cypress" />

describe('Utility Functions Unit Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('Number Formatting', () => {
    it('should format currency correctly', () => {
      cy.window().then((win) => {
        // Test common number formatting patterns
        const formatNumber = (num) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(num)
        }

        expect(formatNumber(1000)).to.equal('$1,000')
        expect(formatNumber(95000)).to.equal('$95,000')
        expect(formatNumber(100000)).to.equal('$100,000')
      })
    })

    it('should format sats correctly', () => {
      cy.window().then((win) => {
        const formatSats = (sats) => {
          return new Intl.NumberFormat('en-US').format(sats) + ' sats'
        }

        expect(formatSats(21)).to.equal('21 sats')
        expect(formatSats(1000)).to.equal('1,000 sats')
        expect(formatSats(10000)).to.equal('10,000 sats')
      })
    })

    it('should format percentages correctly', () => {
      cy.window().then((win) => {
        const formatPercent = (value) => {
          return (value * 100).toFixed(2) + '%'
        }

        expect(formatPercent(0.05)).to.equal('5.00%')
        expect(formatPercent(0.123)).to.equal('12.30%')
        expect(formatPercent(-0.05)).to.equal('-5.00%')
      })
    })
  })

  describe('Date/Time Formatting', () => {
    it('should format timestamps correctly', () => {
      cy.window().then((win) => {
        const formatTimestamp = (ts) => {
          return new Date(ts).toLocaleString()
        }

        const now = Date.now()
        const formatted = formatTimestamp(now)
        expect(formatted).to.be.a('string')
        expect(formatted.length).to.be.greaterThan(10)
      })
    })

    it('should calculate time differences', () => {
      const now = Date.now()
      const oneHourAgo = now - (60 * 60 * 1000)
      const oneDayAgo = now - (24 * 60 * 60 * 1000)

      const hourDiff = Math.floor((now - oneHourAgo) / (60 * 60 * 1000))
      const dayDiff = Math.floor((now - oneDayAgo) / (24 * 60 * 60 * 1000))

      expect(hourDiff).to.equal(1)
      expect(dayDiff).to.equal(1)
    })

    it('should format relative time', () => {
      const formatRelativeTime = (ms) => {
        if (ms < 60000) return 'Just now'
        if (ms < 3600000) return Math.floor(ms / 60000) + ' min ago'
        if (ms < 86400000) return Math.floor(ms / 3600000) + ' hours ago'
        return Math.floor(ms / 86400000) + ' days ago'
      }

      expect(formatRelativeTime(30000)).to.equal('Just now')
      expect(formatRelativeTime(300000)).to.equal('5 min ago')
      expect(formatRelativeTime(7200000)).to.equal('2 hours ago')
      expect(formatRelativeTime(172800000)).to.equal('2 days ago')
    })
  })

  describe('Validation Functions', () => {
    it('should validate email format', () => {
      const isValidEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return re.test(email)
      }

      expect(isValidEmail('test@example.com')).to.be.true
      expect(isValidEmail('user.name@domain.org')).to.be.true
      expect(isValidEmail('invalid-email')).to.be.false
      expect(isValidEmail('no@domain')).to.be.false
      expect(isValidEmail('')).to.be.false
    })

    it('should validate recovery code format', () => {
      const isValidRecoveryCode = (code) => {
        return /^BTCSIG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)
      }

      expect(isValidRecoveryCode('BTCSIG-ABCD-1234-WXYZ')).to.be.true
      expect(isValidRecoveryCode('BTCSIG-TEST-CODE-1234')).to.be.true
      expect(isValidRecoveryCode('invalid')).to.be.false
      expect(isValidRecoveryCode('BTCSIG-short')).to.be.false
    })

    it('should validate price input', () => {
      const isValidPrice = (price) => {
        return typeof price === 'number' && price > 0 && isFinite(price)
      }

      expect(isValidPrice(95000)).to.be.true
      expect(isValidPrice(0.001)).to.be.true
      expect(isValidPrice(0)).to.be.false
      expect(isValidPrice(-100)).to.be.false
      expect(isValidPrice(Infinity)).to.be.false
      expect(isValidPrice(NaN)).to.be.false
    })
  })

  describe('LocalStorage Helpers', () => {
    it('should safely get from localStorage', () => {
      cy.window().then((win) => {
        const safeGet = (key) => {
          try {
            return win.localStorage.getItem(key)
          } catch (e) {
            return null
          }
        }

        win.localStorage.setItem('test_key', 'test_value')
        expect(safeGet('test_key')).to.equal('test_value')
        expect(safeGet('nonexistent')).to.be.null
      })
    })

    it('should safely set to localStorage', () => {
      cy.window().then((win) => {
        const safeSet = (key, value) => {
          try {
            win.localStorage.setItem(key, value)
            return true
          } catch (e) {
            return false
          }
        }

        expect(safeSet('test_set', 'value')).to.be.true
        expect(win.localStorage.getItem('test_set')).to.equal('value')
      })
    })

    it('should safely parse JSON from localStorage', () => {
      cy.window().then((win) => {
        const safeJsonParse = (key) => {
          try {
            const item = win.localStorage.getItem(key)
            return item ? JSON.parse(item) : null
          } catch (e) {
            return null
          }
        }

        win.localStorage.setItem('json_test', JSON.stringify({ foo: 'bar' }))
        const parsed = safeJsonParse('json_test')
        expect(parsed).to.deep.equal({ foo: 'bar' })

        win.localStorage.setItem('invalid_json', 'not json')
        expect(safeJsonParse('invalid_json')).to.be.null
      })
    })
  })

  describe('Array Utilities', () => {
    it('should remove duplicates', () => {
      const uniqueArray = (arr) => [...new Set(arr)]

      expect(uniqueArray([1, 2, 2, 3, 3, 3])).to.deep.equal([1, 2, 3])
      expect(uniqueArray(['a', 'b', 'a'])).to.deep.equal(['a', 'b'])
    })

    it('should sort by property', () => {
      const sortByProp = (arr, prop) => {
        return [...arr].sort((a, b) => a[prop] - b[prop])
      }

      const items = [{ value: 3 }, { value: 1 }, { value: 2 }]
      const sorted = sortByProp(items, 'value')
      expect(sorted[0].value).to.equal(1)
      expect(sorted[2].value).to.equal(3)
    })

    it('should filter by condition', () => {
      const items = [
        { type: 'buy', amount: 100 },
        { type: 'sell', amount: 50 },
        { type: 'buy', amount: 200 }
      ]

      const buys = items.filter(i => i.type === 'buy')
      expect(buys.length).to.equal(2)
    })
  })

  describe('Calculation Helpers', () => {
    it('should calculate percentage change', () => {
      const percentChange = (oldVal, newVal) => {
        return ((newVal - oldVal) / oldVal) * 100
      }

      expect(percentChange(100, 110)).to.equal(10)
      expect(percentChange(100, 90)).to.equal(-10)
      expect(percentChange(50, 75)).to.equal(50)
    })

    it('should calculate R-multiple', () => {
      const calculateRMultiple = (entry, exit, stopLoss) => {
        const risk = Math.abs(entry - stopLoss)
        const reward = Math.abs(exit - entry)
        return reward / risk
      }

      // 1R trade
      expect(calculateRMultiple(100, 110, 90)).to.equal(1)
      // 2R trade
      expect(calculateRMultiple(100, 120, 90)).to.equal(2)
    })

    it('should calculate position size', () => {
      const positionSize = (balance, riskPercent, entryPrice, stopLoss) => {
        const riskAmount = balance * (riskPercent / 100)
        const riskPerUnit = Math.abs(entryPrice - stopLoss)
        return riskAmount / riskPerUnit
      }

      // $10000 balance, 1% risk, entry 95000, stop 94000
      const size = positionSize(10000, 1, 95000, 94000)
      expect(size).to.equal(0.1) // 0.1 BTC
    })
  })

  describe('Data Freshness Utilities', () => {
    it('should format time ago correctly', () => {
      const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Unknown'
        const now = new Date()
        const then = new Date(timestamp)
        const diffMs = now - then
        const diffMins = Math.floor(diffMs / (1000 * 60))
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${Math.floor(diffHours / 24)}d ago`
      }

      const now = Date.now()
      expect(formatTimeAgo(now)).to.equal('Just now')
      expect(formatTimeAgo(now - 5 * 60 * 1000)).to.equal('5m ago')
      expect(formatTimeAgo(now - 2 * 60 * 60 * 1000)).to.equal('2h ago')
      expect(formatTimeAgo(now - 25 * 60 * 60 * 1000)).to.equal('1d ago')
      expect(formatTimeAgo(null)).to.equal('Unknown')
    })

    it('should detect stale data correctly', () => {
      const isDataStale = (timestamp, maxAgeMinutes = 15) => {
        if (!timestamp) return true
        const now = new Date()
        const then = new Date(timestamp)
        const diffMs = now - then
        return diffMs > maxAgeMinutes * 60 * 1000
      }

      const now = Date.now()
      expect(isDataStale(now)).to.be.false
      expect(isDataStale(now - 10 * 60 * 1000)).to.be.false
      expect(isDataStale(now - 20 * 60 * 1000)).to.be.true
      expect(isDataStale(null)).to.be.true
    })
  })

  describe('CSV Export Utilities', () => {
    it('should escape CSV values correctly', () => {
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"'
        }
        return str
      }

      expect(escapeCSV('simple')).to.equal('simple')
      expect(escapeCSV('has, comma')).to.equal('"has, comma"')
      expect(escapeCSV('has "quotes"')).to.equal('"has ""quotes"""')
      expect(escapeCSV(null)).to.equal('')
      expect(escapeCSV(123)).to.equal('123')
    })

    it('should create CSV rows correctly', () => {
      const createCSVRow = (values) => {
        return values.map(v => {
          if (v === null || v === undefined) return ''
          const str = String(v)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"'
          }
          return str
        }).join(',')
      }

      expect(createCSVRow(['a', 'b', 'c'])).to.equal('a,b,c')
      expect(createCSVRow(['test', 'has, comma', 'end'])).to.equal('test,"has, comma",end')
    })
  })

  describe('Signal Accuracy Calculations', () => {
    it('should calculate win rate correctly', () => {
      const calculateWinRate = (wins, losses) => {
        const total = wins + losses
        if (total === 0) return 0
        return (wins / total) * 100
      }

      expect(calculateWinRate(4, 1)).to.equal(80)
      expect(calculateWinRate(5, 5)).to.equal(50)
      expect(calculateWinRate(0, 0)).to.equal(0)
      expect(calculateWinRate(10, 0)).to.equal(100)
    })

    it('should classify win rate correctly', () => {
      const classifyWinRate = (rate) => {
        if (rate >= 60) return 'good'
        if (rate >= 40) return 'neutral'
        return 'poor'
      }

      expect(classifyWinRate(80)).to.equal('good')
      expect(classifyWinRate(60)).to.equal('good')
      expect(classifyWinRate(50)).to.equal('neutral')
      expect(classifyWinRate(40)).to.equal('neutral')
      expect(classifyWinRate(30)).to.equal('poor')
    })
  })
})
