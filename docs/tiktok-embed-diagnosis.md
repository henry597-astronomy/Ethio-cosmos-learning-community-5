# TikTok Embed Diagnosis

## Official source
TikTok's official documentation is available at https://developers.tiktok.com/doc/embed-player and https://developers.tiktok.com/doc/embed-videos/. The embed-player documentation supports an iframe player format for TikTok videos.

## Production diagnosis (2026-08-18)
The newest Shorts record was queried from Supabase and contains this share URL:
`https://vt.tiktok.com/ZSVrvStU5/`

The current parser classifies it as TikTok because the host contains `tiktok.com`, but `extractTikTokVideoId()` only recognizes `tiktok.com/@user/video/ID` and `tiktok.com/v/ID`. Therefore it returns null, `getEmbedUrl()` returns null, and ShortsFeed falls through to `<video src="https://vt.tiktok.com/ZSVrvStU5/">`, which is an HTML redirect page rather than a video file. The Android screenshot's gray placeholder is consistent with this fallback.

Following the share URL from the sandbox resolves it to:
`https://www.tiktok.com/@saganrepository/video/7635769645605080351?_r=1&_t=ZS-98ytj14ZJSu`

## Required fix
Support TikTok redirect/share hosts such as `vt.tiktok.com` and `vm.tiktok.com` by resolving them server-side or by normalizing them at link submission. Use TikTok's official iframe player format for canonical video IDs, and never pass a social share/webpage URL to the native `<video>` element. Preserve a safe fallback that opens the original link externally if an embed cannot load.
