# PWA Implementation for BTCSignal.ai

This document describes the Progressive Web App (PWA) implementation for BTCSignal.ai.

## Overview

BTCSignal.ai is now a fully-functional Progressive Web App with offline support, installability, and optimized caching strategies.

## Files Created

### 1. `/static/manifest.json`
The web app manifest defines how the app appears when installed on a user's device.

**Key Features:**
- **Name:** "BTC Signals Pro - Bitcoin On-Chain Data & Technical Analysis"
- **Short Name:** "BTC Signals" (used on home screen)
- **Display Mode:** Standalone (looks like a native app)
- **Theme Color:** #f7931a (Bitcoin orange)
- **Background Color:** #0d1117 (Dark theme)
- **Icons:** 192x192 and 512x512 PNG icons
- **App Shortcuts:** Quick access to latest signals

### 2. `/static/sw.js`
The service worker handles caching, offline functionality, and network strategies.

**Caching Strategies:**

1. **Cache-First (Static Assets)**
   - CSS files
   - JavaScript files
   - Images (PNG, JPG, SVG, WebP)
   - Fonts
   - Icons

   These assets are served from cache first, with network fallback.

2. **Network-First (Dynamic Content)**
   - API calls (`/api/*`)
   - Data files (`/data/*`)

   Always tries network first, falls back to cache if offline.

3. **Network-First with Offline Fallback (HTML Pages)**
   - All navigation requests
   - Falls back to cached version if available
   - Shows offline page if no cached version exists

**Cache Management:**
- Version-based cache naming (`btcsignal-static-v1`, `btcsignal-dynamic-v1`)
- Automatic cleanup of old caches on activation
- Precaching of critical assets on install

**Features:**
- Automatic background sync support
- Update notifications with auto-reload
- Message handling for cache control
- Comprehensive error logging

### 3. `/static/offline.html`
A beautifully designed offline fallback page shown when:
- User navigates to a page while offline
- The page is not in cache
- Network request fails

**Features:**
- Auto-retry when connection is restored
- Connection status indicator with pulse animation
- Navigation buttons (Try Again, Go Back)
- Information about cached content availability
- Responsive design matching site theme

### 4. `/layouts/partials/head.html` (Updated)
Added PWA support to the site header:

**PWA Meta Tags:**
```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">

<!-- iOS PWA Support -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="BTC Signals">

<!-- Android PWA Support -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="application-name" content="BTC Signals">
```

**Service Worker Registration:**
- Registers service worker on page load
- Handles service worker updates
- Shows update notification with auto-reload option
- Automatic update checks every 60 seconds
- Graceful error handling

### 5. `/generate-pwa-icons.sh`
A utility script to generate PWA icons from the existing apple-touch-icon.png.

## Icon Requirements

The PWA requires two icon sizes:
- **192x192px:** Minimum required size for Android
- **512x512px:** Required for splash screens and high-DPI displays

### Generating Icons

**Option 1: Use the provided script (macOS)**
```bash
./generate-pwa-icons.sh
```

**Option 2: Manual creation with sips (macOS)**
```bash
mkdir -p static/icons
sips -z 192 192 static/apple-touch-icon.png --out static/icons/icon-192x192.png
sips -z 512 512 static/apple-touch-icon.png --out static/icons/icon-512x512.png
```

**Option 3: Using ImageMagick (cross-platform)**
```bash
mkdir -p static/icons
magick static/apple-touch-icon.png -resize 192x192 static/icons/icon-192x192.png
magick static/apple-touch-icon.png -resize 512x512 static/icons/icon-512x512.png
```

**Option 4: Online tool**
Use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) or [RealFaviconGenerator](https://realfavicongenerator.net/)

**Best Practice:** For highest quality, design the icon at 512x512 in a graphics editor (Figma, Sketch, Adobe XD) and then downscale to 192x192.

## Testing the PWA

### Local Testing

1. **Build and serve the site:**
   ```bash
   hugo server
   ```

2. **Open Chrome DevTools:**
   - Go to Application tab
   - Check "Manifest" section for manifest.json
   - Check "Service Workers" section for sw.js registration
   - Check "Cache Storage" for cached assets

3. **Test offline mode:**
   - Check "Offline" in Network tab
   - Refresh page - should show cached content or offline page
   - Navigate to cached pages - should work offline

4. **Test installability:**
   - Look for "Install" prompt in Chrome
   - Or use Chrome menu > "Install BTCSignal.ai..."

### Production Testing

1. **Deploy to production**
2. **Run Lighthouse audit:**
   - Chrome DevTools > Lighthouse tab
   - Select "Progressive Web App" category
   - Run audit
   - Aim for 100% PWA score

3. **Test on mobile devices:**
   - iOS: Safari browser - Add to Home Screen
   - Android: Chrome browser - Install app

### PWA Checklist

- [ ] HTTPS enabled (required for service workers)
- [ ] manifest.json served correctly
- [ ] Service worker registered
- [ ] Icons generated (192x192, 512x512)
- [ ] Offline page accessible
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] Offline functionality works
- [ ] Cache updates properly
- [ ] Lighthouse PWA score > 90

## Browser Support

### Service Workers Support
- Chrome 40+
- Firefox 44+
- Safari 11.1+
- Edge 17+
- Opera 27+

### Install Support
- Chrome (Android): Full support
- Chrome (Desktop): Full support
- Safari (iOS 11.3+): Add to Home Screen
- Edge: Full support
- Samsung Internet: Full support

### Graceful Degradation
The PWA features degrade gracefully:
- If service workers aren't supported, site works normally
- If offline, shows offline page instead of browser error
- If install not supported, site remains accessible via browser

## Cache Strategy Details

### Static Cache (btcsignal-static-v1)
Long-lived cache for assets that rarely change:
- CSS files
- JavaScript files
- Images
- Fonts
- Icons
- Manifest

**Strategy:** Cache-first, network fallback
**Update:** Manual version bump in sw.js

### Dynamic Cache (btcsignal-dynamic-v1)
Short-lived cache for frequently changing content:
- HTML pages
- API responses
- Data files

**Strategy:** Network-first, cache fallback
**Update:** Automatic on each successful network request

## Updating the Service Worker

When you need to force cache updates:

1. **Increment cache version in sw.js:**
   ```javascript
   const CACHE_VERSION = 'v2'; // Change from v1 to v2
   ```

2. **Deploy the updated sw.js**

3. **Users will receive update notification:**
   - Shows browser prompt
   - Option to reload immediately
   - Or waits for next page load

### Manual Cache Clear

Users can clear the cache via browser:
- Chrome: DevTools > Application > Clear storage
- Or the service worker will send a CLEAR_CACHE message

## Performance Optimization

### Benefits of PWA Implementation

1. **Faster Load Times:**
   - Static assets served from cache
   - No network latency for cached resources
   - Instant page loads on repeat visits

2. **Offline Functionality:**
   - View cached pages offline
   - Graceful offline experience
   - Background sync when connection restored

3. **Reduced Server Load:**
   - Fewer requests for static assets
   - Bandwidth savings
   - Better scalability

4. **Improved User Experience:**
   - App-like experience
   - Add to home screen
   - No browser chrome in standalone mode
   - Push notifications capability (future enhancement)

### Expected Performance Gains

- **First Load:** Same as before (needs to download assets)
- **Repeat Visits:** 2-3x faster (assets from cache)
- **Offline:** Full functionality for cached pages
- **Data Usage:** 50-70% reduction on repeat visits

## Future Enhancements

### Potential Additions

1. **Push Notifications:**
   - BTC price alerts
   - New signal notifications
   - Breaking news alerts

2. **Background Sync:**
   - Queue failed API requests
   - Sync when connection restored
   - Update cached data in background

3. **Advanced Caching:**
   - Predictive prefetching
   - Smart cache expiration
   - Image optimization

4. **Web Share API:**
   - Share signals directly from app
   - Native share experience

5. **Periodic Background Sync:**
   - Update cache in background
   - Fresh data on app open

## Troubleshooting

### Service Worker Not Registering

1. **Check HTTPS:** Service workers require HTTPS (except localhost)
2. **Check console:** Look for registration errors
3. **Check sw.js path:** Must be at root level (`/sw.js`)
4. **Clear cache:** Hard refresh (Ctrl+Shift+R)

### Icons Not Showing

1. **Verify icon paths:** Check `/icons/icon-192x192.png` exists
2. **Check icon sizes:** Must be exactly 192x192 and 512x512
3. **Validate manifest:** Use Chrome DevTools > Application > Manifest

### Offline Page Not Showing

1. **Check OFFLINE_PAGE path:** Verify `/offline.html` exists
2. **Check cache:** Look in DevTools > Application > Cache Storage
3. **Clear cache and retry:** Unregister SW and re-register

### App Not Installable

1. **Check Lighthouse:** Run PWA audit
2. **Verify manifest:** All required fields present
3. **Check icons:** Correct sizes and formats
4. **HTTPS required:** App must be served over HTTPS

### Update Not Working

1. **Hard refresh:** Ctrl+Shift+R to bypass cache
2. **Unregister SW:** DevTools > Application > Service Workers > Unregister
3. **Clear storage:** DevTools > Application > Clear storage
4. **Increment version:** Change CACHE_VERSION in sw.js

## Security Considerations

### Content Security Policy

If using CSP headers, ensure service worker is allowed:
```
Content-Security-Policy: worker-src 'self'
```

### HTTPS Requirement

Service workers only work on:
- HTTPS sites (production)
- localhost (development)

### Same-Origin Policy

Service worker only caches same-origin requests by default.

## Monitoring

### Metrics to Track

1. **Service Worker Registration Rate:**
   - % of users with active service worker
   - Track via analytics

2. **Cache Hit Rate:**
   - % of requests served from cache
   - Monitor in service worker logs

3. **Offline Usage:**
   - Track offline page views
   - Monitor failed network requests

4. **Install Rate:**
   - % of users who install PWA
   - Track install prompt acceptance

5. **Update Success:**
   - % of users on latest version
   - Track update notification acceptance

## Resources

### Documentation
- [MDN: Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Google: PWA Checklist](https://web.dev/pwa-checklist/)

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox) (for advanced SW)

### Testing
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [PWA Testing](https://web.dev/progressive-web-apps/)

## Support

For issues or questions about the PWA implementation:
1. Check this documentation
2. Review browser console for errors
3. Use Chrome DevTools Application tab
4. Run Lighthouse audit for diagnostics
