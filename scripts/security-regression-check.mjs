import { readFile } from 'node:fs/promises';

const files = Object.fromEntries(
  await Promise.all([
    ['groqClient', 'src/services/groq.ts'],
    ['groqApi', 'api/groq/chat.ts'],
    ['voiceApi', 'api/voice/transcribe.ts'],
    ['tokenApi', 'api/livekit/token.ts'],
    ['stopApi', 'api/livekit/stop-hosting.ts'],
    ['security', 'api/_lib/security.ts'],
    ['migration', 'supabase/security_hardening.sql'],
    ['serviceWorker', 'public/sw.js'],
    ['index', 'index.html'],
    ['premiumClient', 'src/context/PremiumContext.tsx'],
    ['premiumAdmin', 'src/components/PremiumAdminPanel.tsx'],
    ['premiumHelper', 'api/_lib/premium.ts'],
    ['premiumAccessApi', 'api/premium/access.ts'],
    ['premiumCheckoutApi', 'api/premium/checkout.ts'],
    ['premiumMigration', 'supabase/premium_mode.sql'],
    ['premiumSecurityMigration', 'supabase/premium_security.sql'],
    ['premiumLessonMigration', 'supabase/premium_lessons.sql'],
    ['premiumContentMigration', 'supabase/premium_content_and_profile_repair.sql'],
    ['premiumAiClient', 'src/components/AIChatBar.tsx'],
    ['premiumSolarPage', 'src/pages/SolarSystemPage.tsx'],
  ].map(async ([key, path]) => [key, await readFile(path, 'utf8')]))
);

const checks = [
  ['Groq client has no browser key or direct provider URL', !/VITE_GROQ_API_KEY|api\.groq\.com|atob\(/.test(files.groqClient)],
  ['Groq API uses server-only key', /process\.env\.GROQ_API_KEY/.test(files.groqApi)],
  ['Groq API authenticates, Premium-gates, validates, and rate-limits requests', /authenticateSupabaseRequest/.test(files.groqApi) && /requirePremiumFeature\(auth\.client, 'ai_tutor'\)/.test(files.groqApi) && /enforceRateLimit/.test(files.groqApi)],
  ['Voice transcription Premium-gates before provider usage', /authenticateSupabaseRequest/.test(files.voiceApi) && /requirePremiumFeature\(auth\.client, 'ai_tutor'\)/.test(files.voiceApi)],
  ['LiveKit token verifies the authenticated user', /authenticateSupabaseRequest/.test(files.tokenApi) && /Authorization/.test(files.security)],
  ['LiveKit token does not trust client identity metadata', !/requestBody\.(userName|userId|avatarUrl)/.test(files.tokenApi)],
  ['LiveKit viewers cannot publish media or room data', /canPublish: isHost/.test(files.tokenApi) && /canPublishData: isHost/.test(files.tokenApi)],
  ['LiveKit shutdown binds to authenticated owner', /auth\.user\.id/.test(files.stopApi) && /eq\('host_id', auth\.user\.id\)/.test(files.stopApi)],
  ['Profile privilege escalation is blocked by a trigger', /protect_profile_security_fields/.test(files.migration) && /Only the primary administrator/.test(files.migration)],
  ['Unrestricted storage uploads are removed', /DROP POLICY IF EXISTS "Authenticated Upload Access"/.test(files.migration) && /public\.is_active_admin\(\)/.test(files.migration)],
  ['Private API data is not in the service-worker public cache list', !/channel_posts|channel_comments|channel_reactions|comment_reactions/.test(files.serviceWorker.match(/const PUBLIC_API_PATTERNS = \[[\s\S]*?\];/)?.[0] ?? '')],
  ['Startup errors are rendered as text, not HTML', !/errDiv\.innerHTML/.test(files.index) && /details\.textContent/.test(files.index)],
  ['Premium client contains no provider secrets', !/CHAPA_SECRET_KEY|ARIFPAY_SECRET_KEY|PREMIUM_PROVIDER_WEBHOOK_SECRET/.test(files.premiumClient + files.premiumAdmin)],
  ['Premium server guard uses the ownership-safe RPC', /user_has_premium_feature/.test(files.premiumHelper) && /requested_feature/.test(files.premiumHelper) && !/requested_user/.test(files.premiumHelper)],
  ['AI client sends the signed-in bearer token', /Authorization: `Bearer \$\{accessToken\}`/.test(files.groqClient)],
  ['Premium lesson flags are Admin-write-only and protect lesson rows', /premium_lessons/.test(files.premiumLessonMigration) && /Admins manage premium lesson flags/.test(files.premiumLessonMigration) && /user_has_premium_lesson/.test(files.premiumLessonMigration) && /DROP POLICY IF EXISTS "Public read access for lessons"/.test(files.premiumLessonMigration)],
  ['Premium content hierarchy is categorized and Admin-write-only', /CREATE TABLE IF NOT EXISTS public\.premium_topics/.test(files.premiumContentMigration) && /CREATE TABLE IF NOT EXISTS public\.premium_subtopics/.test(files.premiumContentMigration) && /Admins manage premium topic flags/.test(files.premiumContentMigration) && /Admins manage premium subtopic flags/.test(files.premiumContentMigration) && /user_can_access_learning/.test(files.premiumContentMigration)],
  ['Profile repair is current-user-only and preserves role safeguards', /CREATE OR REPLACE FUNCTION public\.ensure_current_profile/.test(files.premiumContentMigration) && /GRANT EXECUTE ON FUNCTION public\.ensure_current_profile\(\) TO authenticated/.test(files.premiumContentMigration) && /unique_profile_username/.test(files.premiumContentMigration)],
  ['Premium UI uses the exact seeded feature keys', /canUse\('ai_tutor'\)/.test(files.premiumAiClient) && /canUse\('observatory_simulation'\)/.test(files.premiumSolarPage)],
  ['Premium access API authenticates and rate-limits requests', /authenticateSupabaseRequest/.test(files.premiumAccessApi) && /enforceRateLimit/.test(files.premiumAccessApi)],
  ['Premium checkout fails closed while provider is not ready', /PAYMENT_PROVIDER_NOT_CONNECTED/.test(files.premiumCheckoutApi) && /readyForCheckout/.test(files.premiumCheckoutApi)],
  ['Premium entitlement writes are Admin-only', /Admins manage premium entitlements/.test(files.premiumMigration) && /public\.is_active_admin\(\)/.test(files.premiumMigration)],
  ['Premium RPC removes the arbitrary-user argument', /DROP FUNCTION IF EXISTS public\.user_has_premium_feature\(text, uuid\)/.test(files.premiumSecurityMigration) && /CREATE OR REPLACE FUNCTION public\.user_has_premium_feature\(requested_feature text\)/.test(files.premiumSecurityMigration) && !/requested_user/.test(files.premiumSecurityMigration)],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`);
}

if (failed.length > 0) process.exit(1);
