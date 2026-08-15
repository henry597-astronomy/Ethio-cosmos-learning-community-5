import { readFile } from 'node:fs/promises';

const files = Object.fromEntries(
  await Promise.all([
    ['groqClient', 'src/services/groq.ts'],
    ['groqApi', 'api/groq.ts'],
    ['tokenApi', 'api/livekit/token.ts'],
    ['stopApi', 'api/livekit/stop-hosting.ts'],
    ['security', 'api/_lib/security.ts'],
    ['migration', 'supabase/security_hardening.sql'],
    ['serviceWorker', 'public/sw.js'],
    ['index', 'index.html'],
  ].map(async ([key, path]) => [key, await readFile(path, 'utf8')]))
);

const checks = [
  ['Groq client has no browser key or direct provider URL', !/VITE_GROQ_API_KEY|api\.groq\.com|atob\(/.test(files.groqClient)],
  ['Groq API uses server-only key', /process\.env\.GROQ_API_KEY/.test(files.groqApi)],
  ['Groq API validates and rate-limits requests', /parseMessages/.test(files.groqApi) && /enforceRateLimit/.test(files.groqApi)],
  ['LiveKit token verifies the authenticated user', /authenticateSupabaseRequest/.test(files.tokenApi) && /Authorization/.test(files.security)],
  ['LiveKit token does not trust client identity metadata', !/requestBody\.(userName|userId|avatarUrl)/.test(files.tokenApi)],
  ['LiveKit viewers cannot publish media or room data', /canPublish: isHost/.test(files.tokenApi) && /canPublishData: isHost/.test(files.tokenApi)],
  ['LiveKit shutdown binds to authenticated owner', /auth\.user\.id/.test(files.stopApi) && /eq\('host_id', auth\.user\.id\)/.test(files.stopApi)],
  ['Profile privilege escalation is blocked by a trigger', /protect_profile_security_fields/.test(files.migration) && /Only the primary administrator/.test(files.migration)],
  ['Unrestricted storage uploads are removed', /DROP POLICY IF EXISTS "Authenticated Upload Access"/.test(files.migration) && /public\.is_active_admin\(\)/.test(files.migration)],
  ['Private API data is not in the service-worker public cache list', !/channel_posts|channel_comments|channel_reactions|comment_reactions/.test(files.serviceWorker.match(/const PUBLIC_API_PATTERNS = \[[\s\S]*?\];/)?.[0] ?? '')],
  ['Startup errors are rendered as text, not HTML', !/errDiv\.innerHTML/.test(files.index) && /details\.textContent/.test(files.index)],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`);
}

if (failed.length > 0) process.exit(1);
