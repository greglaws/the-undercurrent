const RSSParser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new RSSParser();

// RSS feeds for the six papers (all independently owned)
const FEEDS = [
  { name: 'The New York Times',      url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { name: 'The Washington Post',     url: 'https://feeds.washingtonpost.com/rss/homepage' },
  { name: 'The Wall Street Journal', url: 'https://feeds.content.dowjones.io/public/rss/WSJcomUSBusiness' },
  { name: 'Los Angeles Times',       url: 'https://www.latimes.com/index.rss' },
  { name: 'NPR News',                url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'PBS NewsHour',             url: 'https://www.pbs.org/newshour/feeds/rss/headlines' },
];

async function fetchHeadlines() {
  const now = new Date();
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const results = [];

  for (const source of FEEDS) {
    try {
      const feed = await parser.parseURL(source.url);
      // Filter to items published in the last 24 hours
      const recent = feed.items.filter(item => {
        // rss-parser normalises dates into isoDate; fall back to raw pubDate
        const raw = item.isoDate || item.pubDate;
        const pub = raw ? new Date(raw) : null;
        // Keep items with missing or unparseable dates (benefit of the doubt)
        return !pub || isNaN(pub.getTime()) || pub >= cutoff;
      });
      const headlines = recent.slice(0, 3)
        .map(item => (item.title || '').trim())
        .filter(t => t.length > 0);
      results.push({
        source: source.name,
        headlines,
      });
      console.log(`  ✓ ${source.name}: ${headlines.length} headlines (${feed.items.length - recent.length} filtered)`);
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
