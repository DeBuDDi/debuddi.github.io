// scripts/fetch.js
// Fetches https://www.cznmeta.com/news, extracts YouTube links and surrounding article info,
// queries YouTube oEmbed for title/thumbnail, and writes:
//  - videos.json (repo root)
//  - docs/video.html (static page for GitHub Pages)

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const SOURCE = 'https://www.cznmeta.com/news';
const USER_AGENT = 'cznmeta-video-generator/1.0 (+https://github.com/DeBuDDi)';

function tryText($el) {
  if (!$el || !$el.length) return '';
  return $el.first().text().trim();
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, timeout: 20000 });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

async function getOEmbedInfo(videoUrl) {
  const oe = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
  try {
    const r = await fetch(oe, { headers: { 'User-Agent': USER_AGENT }, timeout: 15000 });
    if (!r.ok) throw new Error(`oEmbed ${r.status}`);
    return await r.json();
  } catch (e) {
    // fallback thumbnail url if oEmbed fails
    const id = videoUrl.split('v=')[1] || videoUrl.split('/').pop();
    return { title: `Video ${id}`, author_name: '', thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /v=([A-Za-z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function main() {
  console.log('Fetching source:', SOURCE);
  const html = await fetchPage(SOURCE);
  const $ = cheerio.load(html);

  const found = new Map(); // id -> {id,url,sourceTitle,sourceLink}
  // Search anchors and iframes
  $('a[href], iframe[src]').each((i, el) => {
    const href = ($(el).attr('href') || $(el).attr('src') || '').trim();
    const id = extractYouTubeId(href);
    if (!id) return;

    // Try to find a title and date near this link by walking up the DOM
    let sourceTitle = '';
    let sourceLink = '';
    let sourceDate = '';
    let node = $(el);
    for (let level = 0; level < 6; level++) {
      const titleEl = node.find('h1,h2,h3, .title, .entry-title').first();
      if (titleEl && titleEl.length) { sourceTitle = tryText(titleEl); }
      // time element
      const timeEl = node.find('time, .date, .post-date, .published').first();
      if (timeEl && timeEl.length) { sourceDate = tryText(timeEl); }
      // link to article
      const a = node.find('a[href]').first();
      if (a && a.length) { sourceLink = a.attr('href'); }
      if (sourceTitle) break;
      node = node.parent();
      if (!node || !node.length) break;
    }

    // as fallback, try nearest heading prior in DOM
    if (!sourceTitle) {
      const prevHeading = $(el).prevAll('h1,h2,h3').first();
      if (prevHeading && prevHeading.length) sourceTitle = tryText(prevHeading);
    }

    const url = `https://www.youtube.com/watch?v=${id}`;
    found.set(id, { id, url, sourceTitle, sourceLink, sourceDate });
  });

  console.log('Found YouTube videos:', found.size);

  const videos = [];
  for (const [id, meta] of found) {
    const oinfo = await getOEmbedInfo(meta.url);
    videos.push({
      id,
      url: meta.url,
      title: oinfo.title || meta.sourceTitle || meta.id,
      author: oinfo.author_name || '',
      thumbnail: oinfo.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      sourceTitle: meta.sourceTitle || '',
      sourceLink: meta.sourceLink || '',
      sourceDate: meta.sourceDate || ''
    });
  }

  // Sort by title (or keep discovery order)
  // write videos.json at repo root
  const jsonPath = path.join(process.cwd(), 'videos.json');
  fs.writeFileSync(jsonPath, JSON.stringify(videos, null, 2), 'utf8');
  console.log('Wrote', jsonPath);

  // Also generate docs/video.html (static page for Pages)
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const docsHtml = generateDocsHtml(SOURCE, videos);
  const docsPath = path.join(docsDir, 'video.html');
  fs.writeFileSync(docsPath, docsHtml, 'utf8');
  console.log('Wrote', docsPath);
}

function generateDocsHtml(source, videos){
  const items = videos.map(v => `<a class="card" href="${v.url}" target="_blank" rel="noopener noreferrer">
    <img class="thumb" src="${v.thumbnail}" alt="${escapeHtml(v.title)}">
    <div class="meta">
      <h3>${escapeHtml(v.title)}</h3>
      <p>${escapeHtml(v.author || '')}${v.sourceTitle ? ' — ' + escapeHtml(v.sourceTitle) : ''}</p>
    </div>
  </a>`).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Videos from ${escapeHtml(source)}</title>
<style>
  body{font-family:Inter, system-ui, -apple-system, Arial, Helvetica, sans-serif; margin:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
  .card{background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee;text-decoration:none;color:inherit;display:block}
  .thumb{width:100%;height:160px;object-fit:cover;background:#000}
  .meta{padding:10px}
  h3{margin:0 0 6px 0;font-size:15px}
  p{margin:0;color:#666;font-size:13px}
</style>
</head>
<body>
  <header><h1>Videos from ${escapeHtml(source)}</h1><p>Generated on ${new Date().toUTCString()}</p></header>
  <main>
    <div class="grid">${items}</div>
  </main>
</body>
</html>`;
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

main().catch(err => { console.error(err); process.exit(1); });
