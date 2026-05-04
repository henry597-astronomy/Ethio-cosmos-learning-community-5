#!/usr/bin/env node
/**
 * generate-icons.js
 * Run this ONCE from the project root to create the two PNG icons
 * that manifest.json expects.
 *
 * Requirements: sharp  (install temporarily with: npm install sharp --save-dev)
 * Usage:        node generate-icons.js
 */

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The custom EthioCosmos telescope/astronomy icon
const SOURCE = path.join(__dirname, 'public/images/app-icon-source.jpg');
const OUT_192 = path.join(__dirname, 'public/images/icon-192.png');
const OUT_512 = path.join(__dirname, 'public/images/icon-512.png');

async function generate() {
  console.log('Generating icons from:', SOURCE);

  await sharp(SOURCE)
    .resize(192, 192, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(OUT_192);
  console.log('✅ Created icon-192.png');

  await sharp(SOURCE)
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(OUT_512);
  console.log('✅ Created icon-512.png');

  console.log('\nDone! Both icons are in public/images/');
}

generate().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
