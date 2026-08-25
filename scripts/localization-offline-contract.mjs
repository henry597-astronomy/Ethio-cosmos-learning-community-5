import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const dictionary = read('src/i18n/app-copy.ts');
const languageProvider = read('src/context/AppLanguageProvider.tsx');
const tutor = read('src/components/LessonTutor.tsx');
const teacher = read('src/components/AIChatBar.tsx');
const homepage = read('src/pages/HomePage.tsx');
const offline = read('src/lib/background-prefetch.ts');
const translationRoute = read('api/content/translate.ts');
const migration = read('supabase/official_content_localizations.sql');
const executableMigration = migration.replace(/^\s*--.*$/gm, '');

assert.match(dictionary, /en:\s*\{/);
assert.match(dictionary, /am:\s*\{/);
assert.match(languageProvider, /const storageKey = `\$\{APP_LANGUAGE_STORAGE_KEY\}:\$\{user\?\.id \?\? 'guest'\}`/);
assert.match(languageProvider, /getAppCopy\(language, key\)/);
assert.doesNotMatch(tutor, /setAppLanguage|changeLanguage/);
assert.match(teacher, /tutorContext:/);
assert.match(teacher, /language === 'am' \? 'Amharic' : 'English'/);

const allowedTypes = ['homepage', 'topic', 'subtopic', 'lesson', 'quiz', 'quiz_question', 'material', 'about'];
for (const sourceType of allowedTypes) {
  assert.match(translationRoute, new RegExp(`['"]${sourceType}['"]`));
  assert.match(migration, new RegExp(`['"]${sourceType}['"]`));
}
for (const excludedType of ['space_news', 'channel_posts', 'channel_comments', 'shorts', 'profiles', 'chat_messages']) {
  assert.doesNotMatch(translationRoute, new RegExp(excludedType));
  assert.doesNotMatch(executableMigration, new RegExp(excludedType));
}
assert.match(translationRoute, /canonical\.text\.trim\(\) !== request\.sourceText/);
assert.match(translationRoute, /source_hash/);
assert.match(translationRoute, /content_localizations/);

// Daily Space News is rendered from its authored fields directly; no official
// translation component is allowed to wrap title, summary, or category.
const dailyNewsBlock = homepage.slice(homepage.indexOf('{dailyNews &&'), homepage.indexOf('{dailyNews &&') + 2400);
assert.match(dailyNewsBlock, /dailyNews\.title/);
assert.match(dailyNewsBlock, /dailyNews\.summary/);
assert.match(dailyNewsBlock, /dailyNews\.category/);
assert.doesNotMatch(dailyNewsBlock, /LocalizedOfficialText/);

const officialPackKeys = ['topics', 'all_subtopics', 'site_content', 'materials_gallery_images', 'materials_videos', 'materials_pdfs', 'materials_groups', 'about_content', 'quizzes', 'quiz_questions_all'];
for (const key of officialPackKeys) assert.match(offline, new RegExp(`['"]${key}['"]`));
assert.doesNotMatch(offline, /prefetchPublicCommunityContent|from\(['"](?:channel_posts|space_news|shorts)['"]\)/);
assert.match(offline, /saveOfflinePackManifest/);
assert.match(offline, /language/);

console.log('Localization/offline contract checks passed.');
