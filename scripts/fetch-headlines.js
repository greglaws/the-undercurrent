const RSSParser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new RSSParser();

// RSS feeds for the six papers (all independently owned)
const FEEDS = [
  { name: 'The New York Times',      url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { name: 'The Washington Post',     url: 'https://feeds.washingtonpost.com/rss/national' },
  { name: 'The Wall Street Journal', url: 'https://feeds.content.dowjones.io/public/rss/mw_topStories' },
  { name: 'Los Angeles Times',       url: 'https://www.latimes.com/world-nation/rss2.0.xml' },
  { name: 'NPR News',                url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'PBS NewsHour',             url: 'https://www.pbs.org/newshour/feeds/rss/headlines' },
];

async function fetchHeadlines() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const results = [];

  for (const source of FEEDS) {
    try {
      const feed = await parser.parseURL(source.url);
      // Take up to 5 headlines per source
      const headlines = feed.items.slice(0, 5).map(item => item.title);
      results.push({
        source: source.name,
        headlines,
      });
      console.log(`  ✓ ${source.name}: ${headlines.length} headlines`);
    } catch (err) {
      console.warn(`  ✗ ${source.name}: ${err.message}`);
      results.push({
        source: source.name,
        headlines: [],
        error: err.message,
      });
    }
  }

  // Save today's headlines
  const dataDir = path.join(__dirname, '..', 'data');
  const headlinesDir = path.join(dataDir, 'headlines');
  if (!fs.existsSync(headlinesDir)) {
    fs.mkdirSync(headlinesDir, { recursive: true });
  }

  const outPath = path.join(headlinesDir, `${today}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ date: today, sources: results }, null, 2));
  console.log(`\nSaved to ${outPath}`);

  return { date: today, sources: results };
}

// Allow running standalone or as module
if (require.main === module) {
  console.log('Fetching headlines...\n');
  fetchHeadlines().catch(console.error);
}

module.exports = { fetchHeadlines };
