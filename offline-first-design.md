# EthioCosmos Offline-First Design

## Non-negotiable behavior

The app must render its shell quickly without waiting for Supabase. Home, Learning, About, and Materials may display the last successfully fetched overview data from local IndexedDB and bundled assets. A topic detail or lesson must not be usable offline merely because it was opportunistically viewed or cached. A topic is usable offline only after the signed-in user explicitly taps its Premium-gated download action and the complete topic payload plus required media finish caching. A material is usable offline only after the signed-in user explicitly taps its Premium-gated download action and the required file/media is successfully cached. External embeds that cannot be fetched as a direct file are never advertised as offline-ready.

When connectivity returns, the app may refresh overview metadata and the already explicit topic/material selections. It must not download all topics, all lessons, all materials, quizzes, media, or new selections automatically. Reconnect work is non-blocking and bounded; it must never delay route rendering.

## Current audit findings

The current React entrypoint and lightweight CMS provider do not fire global CMS queries at startup. `ProtectedRoute` still waits for `authReady`, and `PremiumProvider` currently performs a network refresh immediately and exposes a loading state that Learning, Topic, and Lesson use as a hard render gate. CMS hooks currently call Supabase first and only read IndexedDB after the request rejects. `getValidatedOfflineData` only accepts a complete global official-learning manifest, but homepage keys are not in its allowlist, so cached Home sections cannot currently fall back. `downloadOfficialLearningPack` fetches the entire official content set and `setupOnlineListener` calls it after reconnect or after a five-second online startup delay. `AppUpdatePrompt` is its live global caller. The service worker already caches static build assets and can cache selected URLs by explicit `CACHE_URLS`, but its ordinary image/media fetch handlers cache resources merely when viewed online; those caches must not be treated as proof of an explicit download.

## Cache model

IndexedDB remains the source of truth for structured data. Overview keys are stored under a non-sensitive cache namespace and are readable as last-known UI metadata: `homepage_hero`, `homepage_feature_cards`, `homepage_featured_topics`, `about_content`, `topics`, and `materials_groups`. Overview data is written after successful online fetches but is never sufficient to unlock topic detail or material opening offline.

An explicit manifest is stored per authenticated user and selected locale. It records complete topics and materials separately, with stable IDs, source hashes, media URLs, cacheability status, and timestamps. The manifest must be written atomically only after all required structured records and direct media have succeeded. A failed or partial download must not grant offline access. Manifest checks always validate the current Supabase session user ID and current selected language; guest or another account's cache is never accepted.

Recommended structured keys are `offline_topic:<topicId>:<language>` for a complete topic payload and `offline_material:<type>:<materialId>:<language>` for a complete material record, with a user-scoped manifest index such as `offline_selection_manifest:<userId>:<language>`. Existing global-pack records may remain readable only through the legacy complete-pack validator during compatibility, but new UI and reconnect logic must never create or depend on a global pack.

## Page behavior

CMS hooks should use cache-first initialization for overview data: read the local entry immediately, set state if present, then refresh in the background only when online. If no cache exists, make a bounded network attempt and show a lightweight unavailable state rather than an indefinite spinner. Topic and lesson hooks must use an explicit-selection validator for offline fallback. If a requested topic/lesson is not selected, show a clear download-required state while preserving the normal online fetch path. Materials should always show the cached catalog when present; opening a material offline must first verify its selected-material record and direct cached media. The existing per-item `OfflineSaveButton` should be reused and extended rather than duplicated.

## Premium boundary

`offline_learning_packs` remains the single feature key controlling all topic/material offline download actions. The UI checks the existing `usePremium().canUse('offline_learning_packs')` guard before beginning any download and opens the existing Premium dialog when unavailable. Premium controls access to downloading, not visibility of cached landing pages. A Premium user must still explicitly choose each topic or material. Admin-controlled feature changes continue to be authoritative when online; cached Premium state may only be used as a short-lived last-known decision and must fail closed for starting a new download if it cannot be verified.

## Service-worker boundary

The service worker may continue serving the app shell and resources already explicitly sent through `CACHE_URLS`. It must not prefetch CMS data, respond to `sync-all-content` by downloading content, or make ordinary online viewing count as an explicit offline selection. Direct media caching is best-effort and must report success only when the requested response is actually stored. Cache keys should retain their current versioned namespaces; old broad caches should not be interpreted as new explicit selections.

## Device Downloads export

For Capacitor Android, a successful supported material download has two separate outcomes: an in-app offline copy and an exported user-visible file. The exporter should use the Capacitor Filesystem plugin with the Android `Directory.Documents`/public Documents location only when that maps to a user-visible Downloads location in the current wrapper; if the installed plugin/API cannot guarantee the Downloads folder, it must use the Android MediaStore/Download location or report the export failure instead of claiming success. The web/PWA path should retain the browser download behavior. The app should export direct PDFs, images, and direct video files with sanitized filenames and correct MIME extensions. External video embeds are not exported because there is no direct source file. Export errors must not invalidate a successfully cached in-app copy, but the user must be told that the file was saved for offline in-app use and not exported.

## Validation invariants

Static checks must assert that reconnect code does not call `downloadOfficialLearningPack`, no broad pack is triggered by startup or service-worker sync, overview keys are allowed through the overview validator, topic/material access requires the explicit manifest, and download UI checks `offline_learning_packs`. Build, localization, security, and diff checks remain mandatory. Android release verification must be performed only after the web behavior is validated; no release or deployment claim is made without a verified artifact and production hash.
