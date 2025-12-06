// BTC Signal AI - Access Management System
// Handles premium access tracking with tamper-resistant localStorage

const BTCSAIAccess = (function() {
  const STORAGE_KEY = 'btcsai_access';
  const SINGLE_POSTS_KEY = 'btcsai_unlocked_posts';
  const ADMIN_KEY = 'btcsai_admin';
  const RECOVERY_KEY = 'btcsai_recovery_code';
  const SESSION_KEY = 'btcsai_session_token';

  // Admin mode check - bypasses all paywalls for development/testing
  // To enable: localStorage.setItem('btcsai_admin', 'satoshi2024')
  // To disable: localStorage.removeItem('btcsai_admin')
  function isAdmin() {
    try {
      return localStorage.getItem(ADMIN_KEY) === 'satoshi2024';
    } catch (e) {
      return false;
    }
  }

  // Enable admin mode (call from browser console)
  function enableAdmin() {
    localStorage.setItem(ADMIN_KEY, 'satoshi2024');
    return true;
  }

  // Disable admin mode
  function disableAdmin() {
    localStorage.removeItem(ADMIN_KEY);
    return true;
  }

  // Simple hash function for salt verification
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Generate verification salt
  function generateSalt(timestamp, duration) {
    const base = timestamp + ':' + duration + ':btcsai2024';
    return simpleHash(base);
  }

  // Verify access token integrity
  function verifyToken(token) {
    if (!token || !token.timestamp || !token.duration || !token.salt) {
      return false;
    }
    const expectedSalt = generateSalt(token.timestamp, token.duration);
    return token.salt === expectedSalt;
  }

  // Get current access status
  function getAccess() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const token = JSON.parse(stored);

      // Verify token integrity
      if (!verifyToken(token)) {
        console.warn('Access token tampered, clearing');
        clearAccess();
        return null;
      }

      // Check if expired
      const expiry = token.timestamp + token.duration;
      if (Date.now() > expiry) {
        return { expired: true, tier: token.tier };
      }

      return {
        valid: true,
        tier: token.tier,
        expires: expiry,
        remaining: expiry - Date.now()
      };
    } catch (e) {
      console.error('Error reading access:', e);
      return null;
    }
  }

  // Set access with new purchase
  function setAccess(tier, durationMs) {
    const timestamp = Date.now();
    const salt = generateSalt(timestamp, durationMs);

    // Check if extending existing access
    const current = getAccess();
    let newTimestamp = timestamp;

    if (current && current.valid && current.remaining > 0) {
      // Add time to existing access
      newTimestamp = current.expires;
    }

    const token = {
      tier: tier,
      timestamp: newTimestamp,
      duration: durationMs,
      salt: generateSalt(newTimestamp, durationMs),
      purchasedAt: timestamp
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
    return token;
  }

  // Clear access
  function clearAccess() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Check if user has all-access (hourly, daily, weekly) or is admin
  function hasAllAccess() {
    // Admin mode bypasses everything
    if (isAdmin()) return true;

    const access = getAccess();
    return access && access.valid && ['hourly', 'daily', 'weekly'].includes(access.tier);
  }

  // Check if specific post is unlocked
  function isPostUnlocked(postId) {
    // Admin mode bypasses everything
    if (isAdmin()) return true;

    // First check all-access
    if (hasAllAccess()) return true;

    // Then check individual posts
    try {
      const posts = JSON.parse(localStorage.getItem(SINGLE_POSTS_KEY) || '[]');
      return posts.includes(postId);
    } catch (e) {
      return false;
    }
  }

  // Unlock individual post
  function unlockPost(postId) {
    try {
      const posts = JSON.parse(localStorage.getItem(SINGLE_POSTS_KEY) || '[]');
      if (!posts.includes(postId)) {
        posts.push(postId);
        localStorage.setItem(SINGLE_POSTS_KEY, JSON.stringify(posts));
      }
    } catch (e) {
      console.error('Error unlocking post:', e);
    }
  }

  // Get unlocked posts list
  function getUnlockedPosts() {
    try {
      return JSON.parse(localStorage.getItem(SINGLE_POSTS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  // Format remaining time
  function formatRemaining(ms) {
    if (ms <= 0) return 'Expired';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return days + ' day' + (days > 1 ? 's' : '') + ' remaining';
    }

    if (hours > 0) {
      return hours + 'h ' + minutes + 'm remaining';
    }

    return minutes + ' minutes remaining';
  }

  // Get tier durations in ms
  const TIER_DURATIONS = {
    single: 0, // Permanent for that post
    hourly: 60 * 60 * 1000, // 1 hour
    daily: 24 * 60 * 60 * 1000, // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
    monthly: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  // Tier prices in sats
  const TIER_PRICES = {
    single: 21,
    hourly: 1000,
    daily: 10000,
    weekly: 25000,
    monthly: 50000
  };

  // Store recovery code locally
  function setRecoveryCode(code) {
    try {
      localStorage.setItem(RECOVERY_KEY, code);
      return true;
    } catch (e) {
      console.error('Error storing recovery code:', e);
      return false;
    }
  }

  // Get stored recovery code
  function getRecoveryCode() {
    try {
      return localStorage.getItem(RECOVERY_KEY);
    } catch (e) {
      return null;
    }
  }

  // Clear recovery code
  function clearRecoveryCode() {
    try {
      localStorage.removeItem(RECOVERY_KEY);
    } catch (e) {
      console.error('Error clearing recovery code:', e);
    }
  }

  // Store session token locally
  function setSessionToken(token) {
    try {
      localStorage.setItem(SESSION_KEY, token);
      return true;
    } catch (e) {
      console.error('Error storing session token:', e);
      return false;
    }
  }

  // Get stored session token
  function getSessionToken() {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch (e) {
      return null;
    }
  }

  // Clear session token
  function clearSessionToken() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Error clearing session token:', e);
    }
  }

  // Validate session with server - returns false if kicked off by another device
  async function validateSession() {
    const recoveryCode = getRecoveryCode();
    const sessionToken = getSessionToken();

    // If no session info, can't validate - assume valid (old access)
    if (!recoveryCode || !sessionToken) {
      return { valid: true, reason: 'no_session_info' };
    }

    try {
      const response = await fetch('/.netlify/functions/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryCode, sessionToken })
      });

      const data = await response.json();

      if (!data.valid && data.kicked) {
        // User was kicked off - clear their access
        clearAccess();
        clearRecoveryCode();
        clearSessionToken();
        return {
          valid: false,
          kicked: true,
          message: data.error || 'Your access was recovered on another device'
        };
      }

      if (!data.valid && data.expired) {
        return {
          valid: false,
          expired: true,
          message: 'Your access has expired'
        };
      }

      return { valid: data.valid };
    } catch (error) {
      console.error('Session validation error:', error);
      // On network error, assume valid to avoid false kicks
      return { valid: true, reason: 'network_error' };
    }
  }

  // Recover access from server using recovery code or payment hash
  async function recoverAccess(recoveryCodeOrHash) {
    const isRecoveryCode = recoveryCodeOrHash.startsWith('BTCSIG-');

    try {
      const response = await fetch('/.netlify/functions/recover-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isRecoveryCode
            ? { recoveryCode: recoveryCodeOrHash }
            : { paymentHash: recoveryCodeOrHash }
        )
      });

      const data = await response.json();

      if (data.success) {
        // Restore access locally
        const duration = TIER_DURATIONS[data.tier];
        if (duration && data.remainingMs > 0) {
          // Calculate new timestamp based on remaining time
          const newExpiry = Date.now() + data.remainingMs;
          const newTimestamp = newExpiry - duration;
          const salt = generateSalt(newTimestamp, duration);

          const token = {
            tier: data.tier,
            timestamp: newTimestamp,
            duration: duration,
            salt: salt,
            purchasedAt: new Date(data.purchaseDate).getTime(),
            recoveredAt: Date.now()
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
        }

        // Store the recovery code and session token for future use
        if (data.recoveryCode) {
          setRecoveryCode(data.recoveryCode);
        }
        if (data.sessionToken) {
          setSessionToken(data.sessionToken);
        }

        return {
          success: true,
          tier: data.tier,
          expiresAt: data.expiresAt,
          remainingMs: data.remainingMs,
          sessionToken: data.sessionToken
        };
      } else {
        return {
          success: false,
          error: data.error,
          expired: data.expired,
          notFound: data.notFound,
          rateLimited: data.rateLimited
        };
      }
    } catch (error) {
      console.error('Recovery error:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  return {
    getAccess,
    setAccess,
    clearAccess,
    hasAllAccess,
    isPostUnlocked,
    unlockPost,
    getUnlockedPosts,
    formatRemaining,
    TIER_DURATIONS,
    TIER_PRICES,
    // Admin functions
    isAdmin,
    enableAdmin,
    disableAdmin,
    // Recovery functions
    setRecoveryCode,
    getRecoveryCode,
    clearRecoveryCode,
    recoverAccess,
    // Session functions (for single-device enforcement)
    setSessionToken,
    getSessionToken,
    clearSessionToken,
    validateSession
  };
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.BTCSAIAccess = BTCSAIAccess;

  // Log admin status on load (helpful for debugging)
  if (BTCSAIAccess.isAdmin()) {
  }

  // Session validation on page load - check if user was kicked off
  // Only runs if user has active access and session info
  (async function checkSessionOnLoad() {
    // Skip if admin mode
    if (BTCSAIAccess.isAdmin()) return;

    // Skip if no active access
    const access = BTCSAIAccess.getAccess();
    if (!access || !access.valid) return;

    // Skip if no session token (old access before this feature)
    const sessionToken = BTCSAIAccess.getSessionToken();
    if (!sessionToken) return;

    // Validate session
    const result = await BTCSAIAccess.validateSession();

    if (!result.valid && result.kicked) {
      // User was kicked off - show message and redirect
      showKickedOffModal(result.message);
    }
  })();

  // Show kicked off modal
  function showKickedOffModal(message) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#161b22;border:1px solid #f85149;border-radius:12px;padding:32px;max-width:400px;text-align:center;';
    modal.innerHTML = `
      <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
      <h2 style="color:#f85149;margin-bottom:16px;">Access Revoked</h2>
      <p style="color:#8d96a0;margin-bottom:24px;">${message || 'Your access was recovered on another device. Only one device can use a recovery code at a time.'}</p>
      <p style="color:#8d96a0;font-size:0.9rem;margin-bottom:24px;">If this wasn't you, your recovery code may have been shared.</p>
      <a href="/pricing/" style="display:inline-block;background:linear-gradient(135deg,#f7931a,#ff6b00);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Get New Access</a>
      <br><br>
      <a href="/recover/" style="color:#f7931a;font-size:0.9rem;">Recover with your code →</a>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
}
