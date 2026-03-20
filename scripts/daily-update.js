/**
 * Daily orchestrator: fetch headlines → build rolling window → generate image → update gallery
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { fetchHeadlines } = require('./fetch-headlines');
const { generateImage } = require('./generate-image');

const ROOT = path.join(__dirname, '..');
const ARCHIVE_DIR = path.join(ROOT, 'archive');
const HEADLINES_DIR = path.join(ROOT, 'data', 'headlines');
const GALLERY_PATH = path.join(ROOT, 'data', 'gallery.json');
const ROLLING_DAYS = 7;

async function run() {
  console.log('=== HeadlinePic Daily Update ===\n');

  // Step 1: Fetch today's headlines
  console.log('Step 1: Fetching headlines...\n');
  const todayData = await fetchHeadlines();
  const today = todayData.date;

  // Step 2: Build rolling 7-day headline text
  console.log('\nStep 2: Building rolling headline window...\n');
  const headlinesText = buildRollingHeadlines(today);
  console.log(headlinesText.slice(0, 500) + (headlinesText.length > 500 ? '...' : ''));

  // Step 3: Generate image
  console.log('\nStep 3: Generating artwork...\n');
  const dayDir = path.join(ARCHIVE_DIR, today);
  if (!fs.existsSync(dayDir)) {
    fs.mkdirSync(dayDir, { recursive: true });
  }

  const imagePath = path.join(dayDir, `headlinepic.png`);
  const result = await generateImage(headlinesText, imagePath);

  // Save the headline text used (for reference, not published)
  fs.writeFileSync(
    path.join(dayDir, 'headlines-used.txt'),
    headlinesText
  );

  // Step 4: Update gallery.json
  console.log('\nStep 4: Updating gallery...\n');
  updateGallery(today, result.ext);

  console.log('\n=== Done! ===');
}

function buildRollingHeadlines(todayStr) {
  const files = [];
  const today = new Date(todayStr + 'T12:00:00');

  for (let i = 0; i < ROLLING_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const filePath = path.join(HEADLINES_DIR, `${dateStr}.json`);

    if (fs.existsSync(filePath)) {
      files.push({ date: dateStr, data: JSON.parse(fs.readFileSync(filePath, 'utf-8')) });
    }
  }

  if (files.length === 0) {
    throw new Error('No headline files found for the rolling window');
  }

  let text = '';
  for (const file of files) {
    text += `--- ${file.date} ---\n`;
    for (const source of file.data.sources) {
      if (source.headlines.length > 0) {
        text += `${source.source}:\n`;
        for (const h of source.headlines) {
          text += `  • ${h}\n`;
        }
      }
    }
    text += '\n';
  }

  return text;
}

function updateGallery(today, ext) {
  let gallery = [];
  if (fs.existsSync(GALLERY_PATH)) {
    try {
      gallery = JSON.parse(fs.readFileSync(GALLERY_PATH, 'utf-8'));
    } catch {
      gallery = [];
    }
  }

  // Remove existing entry for today if re-running
  gallery = gallery.filter(e => e.date !== today);

  // Determine number
  const maxNum = gallery.reduce((max, e) => Math.max(max, e.number || 0), 0);

  gallery.unshift({
    date: today,
    number: maxNum + 1,
    image: `archive/${today}/headlinepic.${ext}`,
  });

  // Sort newest first
  gallery.sort((a, b) => b.date.localeCompare(a.date));

  fs.writeFileSync(GALLERY_PATH, JSON.stringify(gallery, null, 2));
  console.log(`Gallery updated: ${gallery.length} entries (newest: ${today})`);
}

run().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
