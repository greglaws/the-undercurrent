/**
 * Turns pipeline problems into GitHub issues assigned to the repo owner, which is what
 * sends the notification. Each problem keeps one open issue, gets a comment on every
 * run it persists, and closes itself once it recovers.
 *
 * Usage: node scripts/report-health.js <job status>
 *        node scripts/report-health.js --watchdog
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GALLERY_PATH = path.join(ROOT, 'data', 'gallery.json');
const HEADLINES_DIR = path.join(ROOT, 'data', 'headlines');
const LABEL = 'pipeline-alert';
const GENERATION_TITLE = 'Daily generation failed';
const SOURCE_PREFIX = 'Headline source failing: ';
const TEST_TITLE = 'Test alert';

const RUN_URL = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf-8' });
}

function hasArtwork(date) {
  try {
    return JSON.parse(fs.readFileSync(GALLERY_PATH, 'utf-8')).some(e => e.date === date);
  } catch {
    return false;
  }
}

function readSources(date) {
  try {
    return JSON.parse(fs.readFileSync(path.join(HEADLINES_DIR, `${date}.json`), 'utf-8')).sources;
  } catch {
    return null;
  }
}

function readGenerationError() {
  try {
    return fs.readFileSync(path.join(process.env.RUNNER_TEMP, 'generation-error.txt'), 'utf-8');
  } catch {
    return null;
  }
}

function raise(open, title, detail) {
  const body = `${detail}\n\n[Workflow run](${RUN_URL}) · cc @${process.env.GITHUB_REPOSITORY_OWNER}`;
  const existing = open.find(issue => issue.title === title);
  if (existing) {
    gh('issue', 'comment', String(existing.number), '--body', body);
    console.log(`Updated alert #${existing.number}: ${title}`);
  } else {
    gh('issue', 'create', '--title', title, '--body', body, '--label', LABEL,
      '--assignee', process.env.GITHUB_REPOSITORY_OWNER);
    console.log(`Opened alert: ${title}`);
  }
}

function run() {
  const today = new Date().toISOString().split('T')[0];
  const watchdog = process.argv[2] === '--watchdog';
  const jobStatus = process.argv[2];

  gh('label', 'create', LABEL, '--color', 'B60205', '--description', 'Raised by the daily pipeline', '--force');
  const open = JSON.parse(gh('issue', 'list', '--label', LABEL, '--state', 'open', '--limit', '100', '--json', 'number,title'));

  // The watchdog only sees the committed gallery, so it can raise but never clear alerts
  if (watchdog) {
    if (hasArtwork(today)) {
      console.log(`Artwork for ${today} is published.`);
    } else {
      raise(open, GENERATION_TITLE, `${today}: no artwork had been published by the watchdog check. The daily run may be delayed, stuck, or may not have started.`);
    }
    return;
  }

  const problems = new Map();
  if (jobStatus !== 'success' || !hasArtwork(today)) {
    const cause = readGenerationError();
    problems.set(GENERATION_TITLE, `${today}: the daily run ended with status \`${jobStatus}\` and artwork for today ${hasArtwork(today) ? 'exists' : 'was not produced'}.${cause ? `\n\n\`\`\`\n${cause}\n\`\`\`` : ''}`);
  }

  const sources = readSources(today);
  for (const source of sources || []) {
    if (source.headlines.length === 0) {
      problems.set(SOURCE_PREFIX + source.source, `${today}: ${source.source} contributed no headlines (${source.error || 'no recent items'}). The artwork still generates from the remaining sources.`);
    }
  }

  if (process.env.TEST_ALERT === 'true') {
    problems.set(TEST_TITLE, `${today}: test requested from a manual run. The next run without the test option closes this.`);
  }

  for (const [title, detail] of problems) {
    raise(open, title, detail);
  }

  for (const issue of open) {
    // If the run died before fetching, source health is unknown rather than recovered
    const unknown = issue.title.startsWith(SOURCE_PREFIX) && !sources;
    if (!problems.has(issue.title) && !unknown) {
      gh('issue', 'close', String(issue.number), '--comment', `${today}: recovered. [Workflow run](${RUN_URL})`);
      console.log(`Closed alert #${issue.number}: ${issue.title}`);
    }
  }

  console.log(`Health check complete: ${problems.size} problem(s).`);
}

run();
