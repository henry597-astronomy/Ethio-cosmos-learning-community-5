# EthioCosmos PWA - Comprehensive Offline Features

## Overview

The EthioCosmos PWA now includes **full offline support** with automatic background downloading of all content when the user is online. This ensures users can access the complete learning experience without internet connectivity.

## Features

### 1. **Automatic Background Prefetching**
- Automatically downloads all content when the app is online
- Runs in the background without blocking the UI
- Includes:
  - All topics and subtopics
  - All lessons with content blocks and images
  - All quizzes and questions
  - All gallery images
  - All videos and PDFs
  - All site content (homepage, about, materials)
  - All team member avatars

### 2. **Intelligent Caching Strategy**
- **Static Assets**: Cached on service worker install
- **API Data**: Network-first with cache fallback
- **Images**: Cache-first with network refresh
- **Media (Videos/PDFs)**: Cache-first with network fallback
- **Navigation**: Always serves index.html for SPA routing

### 3. **Automatic Update on Reconnection**
- Detects when user comes back online
- Automatically triggers content refresh
- Updates cache with latest data
- Notifies user of sync completion

### 4. **Offline Status Monitor**
- Visual indicator showing online/offline status
- Displays cache size
- Shows prefetch progress
- Manual prefetch trigger button
- Located in bottom-right corner (above task bar)

### 5. **Cache Management**
- Multiple cache stores for different content types:
  - `ethio-cosmos-static-v9`: Static assets
  - `ethio-cosmos-api-v9`: API data
  - `ethio-cosmos-images-v9`: Images
  - `ethio-cosmos-media-v9`: Videos, PDFs, audio
- Automatic cleanup of old cache versions
- Cache size tracking

## Architecture

### Service Worker (`public/sw.js`)
Enhanced service worker with:
- Comprehensive fetch interception
- Multiple caching strategies
- Background sync support
- Message handling for client commands
- Cache management utilities

### Background Prefetch (`src/lib/background-prefetch.ts`)
Intelligent prefetching utility that:
- Discovers all content from Supabase
- Extracts image and media URLs
- Communicates with service worker
- Tracks prefetch progress
- Handles errors gracefully

### Offline Status Monitor (`src/components/OfflineStatusMonitor.tsx`)
UI component that:
- Displays online/offline status
- Shows cache statistics
- Displays prefetch progress
- Provides manual prefetch trigger
- Updates in real-time

### Enhanced Service Worker Registration (`index.html`)
Improved registration with:
- Update checking (every 60 seconds)
- Controller change detection
- Message listening
- Error handling

## How It Works

### On App Startup
1. Service worker registers and caches static assets
2. App detects online status
3. If online, background prefetch starts after 3 seconds
4. Prefetch discovers and caches all content
5. User can see progress in the Offline Status Monitor

### When User Goes Online
1. `online` event triggers
2. Background prefetch automatically starts
3. All content is refreshed from the server
4. Cache is updated with latest data
5. User is notified of sync completion

### When User Goes Offline
1. `offline` event is detected
2. All requests fall back to cached content
3. User can continue using the app fully
4. No data is lost

### Content Access Offline
- **Learning Pages**: All topics, lessons, and quizzes available
- **Materials**: All gallery images, videos, and PDFs available
- **About Page**: All team information and images available
- **Navigation**: Full app navigation works offline
- **User Data**: Bookmarks and progress cached locally in IndexedDB

## Usage

### For Users

**Automatic Prefetch:**
1. Keep the app open while online
2. Wait for prefetch to complete (usually a few seconds)
3. Go offline and use the app normally

**Manual Prefetch:**
1. Click the online/offline status button (bottom-right)
2. Click "Download All Content"
3. Wait for prefetch to complete

**Check Cache Status:**
1. Click the online/offline status button
2. View cache size and prefetch progress

### For Developers

**Trigger Prefetch Programmatically:**
```typescript
import { prefetchAllContent } from '@/lib/background-prefetch';

await prefetchAllContent();
```

**Get Prefetch Progress:**
```typescript
import { getPrefetchProgress, setPrefetchProgressCallback } from '@/lib/background-prefetch';

setPrefetchProgressCallback((progress) => {
  console.log('Prefetch progress:', progress);
});
```

**Get Cache Size:**
```typescript
import { getCacheSize } from '@/lib/background-prefetch';

const size = await getCacheSize();
console.log('Cache size:', size);
```

**Clear All Caches:**
```typescript
import { clearAllCaches } from '@/lib/background-prefetch';

await clearAllCaches();
```

**Setup Online Listener:**
```typescript
import { setupOnlineListener } from '@/lib/background-prefetch';

setupOnlineListener(); // Already called in OfflineStatusMonitor
```

## Cache Breakdown

### What Gets Cached

| Content Type | Size | Count | Strategy |
|---|---|---|---|
| Static Assets | ~500KB | 30+ | Install-time |
| Topic Images | ~2-5MB | 10+ | On-demand |
| Lesson Images | ~5-10MB | 50+ | On-demand |
| Gallery Images | ~3-8MB | 20+ | On-demand |
| Team Avatars | ~1-2MB | 20+ | On-demand |
| Videos | ~50-200MB | 10+ | On-demand |
| PDFs | ~10-50MB | 10+ | On-demand |
| API Data | ~1-5MB | All | Network-first |

**Total Typical Cache: 70-280MB** (depending on content)

### What's NOT Cached

- User authentication tokens (security)
- User-specific data (bookmarks, progress) - cached in IndexedDB separately
- Real-time chat messages (user-generated)
- External third-party content (YouTube embeds)
- Google Drive embeds

## Performance Impact

### Benefits
- **Instant Load Times**: Cached content loads immediately
- **Reduced Bandwidth**: No re-downloading of static content
- **Better UX**: Seamless offline experience
- **Reduced Server Load**: Fewer requests for repeated content

### Considerations
- **Storage Space**: Uses 70-280MB of device storage
- **Initial Prefetch**: Takes 30-60 seconds on first run
- **Update Delay**: Cached content may be slightly outdated until refresh

## Troubleshooting

### Cache Not Updating
1. Check if you're online (see status indicator)
2. Click "Download All Content" to manually trigger
3. Check browser console for errors

### Cache Size Growing Too Large
1. Click status indicator
2. Look for "Clear Cache" option in future versions
3. Or clear browser cache manually

### Service Worker Not Registering
1. Check browser console for errors
2. Ensure HTTPS is used (required for SW)
3. Check that `public/sw.js` is accessible

### Content Not Available Offline
1. Ensure prefetch completed before going offline
2. Check cache size (should be > 50MB)
3. Try manual prefetch again

## Browser Support

Service Workers are supported in:
- Chrome/Edge 40+
- Firefox 44+
- Safari 11.1+
- Opera 27+
- Android Browser 40+

## Security Considerations

1. **No Sensitive Data Cached**: Auth tokens and passwords are never cached
2. **HTTPS Only**: Service workers only work over HTTPS
3. **Same-Origin Policy**: Only same-origin requests are cached
4. **User Control**: Users can clear cache anytime

## Future Enhancements

- [ ] Selective content caching (choose what to download)
- [ ] Compression for cached media
- [ ] Incremental updates (only new content)
- [ ] Storage quota management
- [ ] Background sync for user submissions
- [ ] Periodic cache cleanup
- [ ] Cache versioning per content type

## Testing

### Test Offline Mode
1. Open DevTools (F12)
2. Go to Application > Service Workers
3. Check "Offline"
4. Navigate around the app
5. Everything should work

### Test Cache
1. Open DevTools
2. Go to Application > Cache Storage
3. Expand cache stores
4. See all cached content

### Test Prefetch
1. Open DevTools Console
2. Look for `[SW]` and `[Prefetch]` logs
3. Monitor prefetch progress
4. Check cache size after completion

## Support

For issues or questions:
1. Check browser console for error messages
2. Review this documentation
3. Check GitHub issues
4. Contact the development team

---

**Last Updated**: June 2026
**Version**: 1.0
**Status**: Production Ready
