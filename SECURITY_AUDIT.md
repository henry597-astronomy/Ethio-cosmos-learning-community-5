# Security audit evidence

This note records confirmed findings from the repository before hardening.

## Confirmed high-risk findings

1. `src/services/groq.ts:2-4` contains an obfuscated Groq API key fallback and sends it directly from browser code to `api.groq.com`. Any visitor can extract and abuse the key. The existing UI contract is `getGroqChatCompletion(messages)` from `src/components/AIChatBar.tsx:172-190`.
2. `api/livekit/token.ts:27-69` issues LiveKit tokens without authenticating the caller. It trusts request fields `isHost`, `userName`, `userId`, `avatarUrl`, and `roomName`; a caller can forge host tokens and participant metadata. `src/components/LiveHostModal.tsx:47-63` legitimately requests a host token, and `src/context/LiveKitContext.tsx:301-314` requests a viewer token.
3. `api/livekit/stop-hosting.ts:27-80` uses the Supabase service-role key and accepts arbitrary `host_id` and `room_name` without authenticating the caller. This allows unauthenticated deactivation of another user's active live session.
4. `src/context/AuthContext.tsx:60-63` and `src/pages/AdminPage.tsx:203-250` use client-side email/role checks for super-admin behavior. Client checks are not an authorization boundary.
5. `supabase/add_blocking_feature.sql:18-23` and `supabase/fix-admin-role-update.sql:18-27` permit self-updates and broad admin updates on `profiles` without restricting the fields that may change. Because the app updates only `role` or `is_blocked` from the client, this must be replaced with server-side field-level policy/function enforcement; otherwise a user may be able to alter their own role if the current policy is applied.
6. `supabase/delete_user_function.sql` does enforce a super-admin email check inside a `SECURITY DEFINER` function, but the same hardcoded email is repeated in client code and other SQL. The email should be moved to a database-controlled configuration/identity policy rather than treated as a frontend secret.
7. `public/sw.js:83-106` classifies `quizzes`, `channel_posts`, `channel_comments`, `channel_reactions`, and `comment_reactions` as public-cache candidates even though several are authenticated/community data. `public/sw.js:424-453` also contains a placeholder Supabase prefetch URL. These paths should not cache authenticated/community responses as shared public data.
8. `index.html:112-126` renders startup error text via `innerHTML`; the current value originates from a browser error, but using `textContent` is a safer non-disruptive change.

## Confirmed lower-risk findings

- `api/livekit/token.ts` and `api/livekit/stop-hosting.ts` use wildcard CORS and advertise unnecessary HTTP methods.
- `api/livekit/token.ts` has no input length/character validation for room names or display names.
- `api/daily-space-news.ts` already checks a cron bearer secret and uses a service-role client only inside the protected scheduled pipeline; it should retain generic error responses and strict method handling.

## Behavior constraints

- Any authenticated user is intentionally allowed to start a live stream, as shown by `BottomTaskBar.tsx` and `LiveHostModal.tsx`; hardening must preserve that behavior.
- AI chat is currently available from the global app shell and does not require a signed-in user; removing the browser key should preserve the feature through a server endpoint, with abuse controls that do not silently break normal use.
- Mobile builds use Capacitor and require absolute API URLs through `src/lib/api-config.ts`.
