import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.join(repoRoot, 'assets', 'screenshots');
const dataDir = path.join(repoRoot, 'data');
mkdirSync(screenshotsDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

const sites = [
  { url: 'https://rocket.rainywhisper.com/' },
  { url: 'https://lzq1206.github.io/WeatherWhisper/' },
  { url: 'https://lzq1206.github.io/CulturalWhisper/' },
  { url: 'https://lzq1206.github.io/QuantWhisper/' },
  { url: 'https://lzq1206.github.io/MirageWhisper/' },
  { url: 'https://lzq1206.github.io/SunsetWhisper/' },
  { url: 'https://lzq1206.github.io/Milkyseas/' },
  { url: 'https://orbit.rainywhisper.com/' },
  { url: 'https://lzq1206.github.io/webwhisper/' },
  { url: 'https://lzq1206.github.io/railwaystar/' },
];

function slugFromUrl(url) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');
  const parts = u.pathname.split('/').filter(Boolean);
  const tail = parts.join('-') || (host.split('.')[0] || 'site');
  return `${host}-${tail}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function labelFromUrl(url) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');
  const parts = u.pathname.split('/').filter(Boolean);
  if (host.endsWith('github.io') && parts[0]) return parts[0];
  if (parts.length) return parts[parts.length - 1];
  return host.split('.')[0];
}

function inferTitle(rawTitle, label, url) {
  const title = (rawTitle || '').trim();
  if (title) return title;
  const host = new URL(url).hostname.replace(/^www\./, '');
  return `${label} · ${host}`;
}

function inferSummary(title, desc, label, url) {
  const cleanDesc = (desc || '').trim().replace(/\s+/g, ' ');
  if (cleanDesc) return cleanDesc;
  return `这是 ${label} 的主页，当前自动展示页面标题：${title}。`;
}

function runBrowser(args, label) {
  const result = spawnSync('agent-browser', args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const err = new Error(`agent-browser ${label} failed`);
    err.stdout = result.stdout;
    err.stderr = result.stderr;
    throw err;
  }
  return result.stdout || '';
}

const collected = [];
for (const site of sites) {
  const label = labelFromUrl(site.url);
  const slug = slugFromUrl(site.url);
  const session = slug;
  const screenshot = path.join(screenshotsDir, `${slug}.png`);

  try {
    runBrowser(['--session', session, 'open', site.url], `open ${site.url}`);
    runBrowser(['--session', session, 'wait', '1200'], `wait ${site.url}`);
    const metaOut = runBrowser([
      '--session', session,
      'eval',
      `JSON.stringify((()=>{const title=document.title; const desc=(document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '').trim(); return {title, desc};})())`
    ], `eval ${site.url}`);
    runBrowser(['--session', session, 'screenshot', screenshot], `screenshot ${site.url}`);
    runBrowser(['--session', session, 'close'], `close ${site.url}`);

    const jsonLine = metaOut.split(/\r?\n/).map(s => s.trim()).filter(Boolean).reverse().find(s => s.includes('{'));
    let raw = { title: '', desc: '' };
    if (jsonLine) {
      try {
        const parsed = JSON.parse(jsonLine);
        raw = JSON.parse(parsed);
      } catch {
        raw = { title: '', desc: '' };
      }
    }

    const title = inferTitle(raw.title, label, site.url);
    const summary = inferSummary(title, raw.desc, label, site.url);
    collected.push({
      label,
      title,
      summary,
      url: site.url,
      hostname: new URL(site.url).hostname.replace(/^www\./, ''),
      slug,
      screenshot: `assets/screenshots/${slug}.png`,
      sourceType: site.url.includes('github.io') ? 'GitHub Pages' : 'Custom domain',
    });
  } catch (err) {
    try { runBrowser(['--session', session, 'close'], `close-fail ${site.url}`); } catch {}
    const title = label;
    collected.push({
      label,
      title,
      summary: `这是 ${label} 的主页。自动抓取截图失败，先保留链接与标题。`,
      url: site.url,
      hostname: new URL(site.url).hostname.replace(/^www\./, ''),
      slug,
      screenshot: '',
      sourceType: site.url.includes('github.io') ? 'GitHub Pages' : 'Custom domain',
    });
  }
}

const pretty = JSON.stringify(collected, null, 2);
writeFileSync(path.join(dataDir, 'site-data.js'), `window.SITE_COLLECTION = ${pretty};\n`, 'utf8');
writeFileSync(path.join(dataDir, 'site-data.json'), `${pretty}\n`, 'utf8');
console.log(`Wrote ${collected.length} site entries`);
