# Offline Features Implementation Guide

## Overview

This document explains the implementation details of the comprehensive offline support system added to EthioCosmos PWA.

## Components Added

### 1. Enhanced Service Worker (`public/sw.js`)

**Key Features:**
- Multiple cache stores for different content types
- Intelligent fetch interception
- Network-first strategy for API calls
- Cache-first strategy for static assets and media
- Background sync support
- Message handling for client commands

**Cache Stores:**
```javascript
const STATIC_CACHE = `ethio-cosmos-static-${CACHE_VERSION}`;
const API_CACHE = `ethio-cosmos-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `ethio-cosmos-images-${CACHE_VERSION}`;
const MEDIA_CACHE = `ethio-cosmos-media-${CACHE_VERSION}`;
```

**Fetch Strategies:**

| Content Type | Strategy | Fallback |
|---|---|---|
| Navigation (HTML) | Network-first | index.html from cache |
| CMS API calls | Network-first | API cache |
| Images | Cache-first | Network |
| Media (video/PDF) | Cache-first | Network |
| Other requests | Cache-first | Network |

**Message Handlers:**
- `SKIP_WAITING`: Force service worker update
- `PREFETCH_CONTENT`: Trigger background prefetch
- `CACHE_URLS`: Cache specific URLs
- `CLEAR_CACHE`: Clear all caches
- `GET_CACHE_SIZE`: Get total cache size

### 2. Background Prefetch Utility (`src/lib/background-prefetch.ts`)

**Main Functions:**

```typescript
// Prefetch all content
await prefetchAllContent();

// Get current progress
const progress = getPrefetchProgress();

// Get cache size
const size = await getCacheSize();

// Clear all caches
await clearAllCaches();

// Setup automatic online listener
setupOnlineListener();
```

**Content Discovery:**
- Fetches all topics and their images
- Fetches all subtopics
- Fetches all lessons and lesson images
- Fetches all quizzes and questions
- Fetches all site content (homepage, about, materials)
- Fetches gallery images
- Fetches materials (videos, PDFs, thumbnails)
- Fetches about page content (team images)

**URL Extraction:**
- Automatically extracts image URLs from all content
- Automatically extracts media URLs (video, PDF, audio)
- Deduplicates URLs to avoid redundant caching

**Progress Tracking:**
- Tracks total items to prefetch
- Tracks completed items
- Tracks current item being prefetched
- Tracks overall status (idle, running, completed, error)
- Supports progress callbacks

### 3. Offline Status Monitor Component (`src/components/OfflineStatusMonitor.tsx`)

**Features:**
- Displays online/offline status with visual indicator
- Shows cache size in human-readable format
- Displays prefetch progress with progress bar
- Provides manual prefetch trigger button
- Shows current prefetch item
- Displays error messages if prefetch fails
- Auto-hides when not needed

**UI Elements:**
- Status button (bottom-right, above task bar)
- Expandable details panel
- Progress bar during prefetch
- Cache size display
- Manual trigger button

**Styling:**
- Green for online status
- Red for offline status
- Orange for prefetch progress
- Smooth transitions and animations

### 4. Enhanced Service Worker Registration (`index.html`)

**Improvements:**
- Periodic update checking (every 60 seconds)
- Controller change detection
- Message listening from service worker
- Comprehensive error handling
- Logging for debugging

**Update Flow:**
1. Check for updates every 60 seconds
2. If new version available, activate it
3. Notify user of update
4. Optionally reload page

## Integration Points

### App.tsx
```typescript
import OfflineStatusMonitor from '@/components/OfflineStatusMonitor';

// Added to App component
<OfflineStatusMonitor />
```

The monitor automatically:
- Initializes on component mount
- Sets up online/offline listeners
- Starts prefetch when coming online
- Updates cache size periodically
- Listens for service worker messages

## Data Flow

### Prefetch Flow
```
User Online
    ↓
setupOnlineListener() triggered
    ↓
prefetchAllContent() called
    ↓
Fetch all CMS data (topics, lessons, etc.)
    ↓
Extract image and media URLs
    ↓
Send URLs to Service Worker
    ↓
Service Worker caches all URLs
    ↓
Progress updated in UI
    ↓
Prefetch Complete
```

### Offline Access Flow
```
User Offline
    ↓
Request resource
    ↓
Service Worker intercepts
    ↓
Check cache
    ↓
Return cached response
    ↓
User sees content
```

### Update Flow
```
User comes online
    ↓
'online' event triggered
    ↓
prefetchAllContent() called
    ↓
Fetch latest data from server
    ↓
Update cache with new data
    ↓
Notify user of sync
```

## Security Considerations

### What's NOT Cached
- Authentication tokens (security risk)
- User passwords (security risk)
- User-specific data (privacy)
- Real-time chat (user-generated)
- External third-party content

### What IS Cached
- Static assets (safe)
- Public CMS content (safe)
- Public images (safe)
- Public media (safe)
- Public API responses (safe)

### HTTPS Requirement
- Service Workers only work over HTTPS
- Ensures secure communication
- Prevents man-in-the-middle attacks

## Performance Optimization

### Caching Strategies

**Network-First (API calls)**
- Try network first
- Fall back to cache if offline
- Ensures latest data when online
- Graceful degradation offline

**Cache-First (Static assets)**
- Check cache first
- Fall back to network if not cached
- Instant load times
- Background update available

**Image Optimization**
- Cache-first strategy
- Network refresh in background
- Reduces bandwidth usage
- Fast load times

### Storage Management

**Cache Size Limits**
- Typical: 70-280MB
- Depends on content size
- Browser quota: Usually 50% of available storage
- Can be managed by user

**Cleanup Strategy**
- Old cache versions deleted on activation
- Versioning prevents conflicts
- Automatic cleanup on update

## Troubleshooting

### Service Worker Not Registering
1. Check HTTPS is enabled
2. Check `public/sw.js` is accessible
3. Check browser console for errors
4. Clear browser cache and reload

### Prefetch Not Starting
1. Check if online (see status indicator)
2. Check browser console for errors
3. Try manual prefetch trigger
4. Check Supabase connection

### Cache Not Updating
1. Verify online connection
2. Check cache size is growing
3. Try manual prefetch
4. Check service worker logs

### Content Not Available Offline
1. Ensure prefetch completed
2. Check cache size > 50MB
3. Try manual prefetch again
4. Check specific content in cache

## Testing Checklist

- [ ] Service worker registers on app load
- [ ] Static assets cached on install
- [ ] Prefetch starts automatically when online
- [ ] Progress indicator shows during prefetch
- [ ] Cache size updates after prefetch
- [ ] Offline mode works (DevTools)
- [ ] Content loads from cache offline
- [ ] App is fully functional offline
- [ ] Update triggers when coming online
- [ ] Manual prefetch button works
- [ ] Error handling works properly
- [ ] No sensitive data is cached

## Monitoring

### Browser DevTools

**Application Tab:**
1. Service Workers: See registration status
2. Cache Storage: See all cached content
3. Manifest: See PWA configuration

**Console:**
Look for logs:
- `[SW]`: Service worker logs
- `[Prefetch]`: Prefetch utility logs
- `[Monitor]`: Monitor component logs
- `[App]`: App initialization logs

### Metrics to Track

- Cache size growth
- Prefetch duration
- Number of cached items
- Cache hit rate
- Offline usage patterns

## Future Enhancements

### Phase 2
- [ ] Selective content caching UI
- [ ] Compression for media files
- [ ] Incremental updates (only new content)
- [ ] Storage quota warnings

### Phase 3
- [ ] Background sync for user submissions
- [ ] Periodic cache cleanup
- [ ] Per-content-type cache versioning
- [ ] Advanced analytics

### Phase 4
- [ ] P2P content sharing (WebRTC)
- [ ] Delta sync (only changes)
- [ ] Predictive prefetching
- [ ] Machine learning for cache optimization

## References

### MDN Documentation
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

### Browser Support
- [caniuse.com - Service Workers](https://caniuse.com/serviceworkers)
- [caniuse.com - Cache API](https://caniuse.com/cache)

### Related Files
- `public/sw.js` - Service worker implementation
- `src/lib/background-prefetch.ts` - Prefetch utility
- `src/components/OfflineStatusMonitor.tsx` - UI component
- `index.html` - SW registration
- `OFFLINE_FEATURES.md` - User documentation

---

**Last Updated**: June 2026
**Version**: 1.0
**Status**: Complete
