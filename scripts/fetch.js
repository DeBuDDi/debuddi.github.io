// script: scripts/fetch.js
// Fetches https://www.cznmeta.com/news, extracts YouTube ids, queries oEmbed and writes
// - docs/video.html (a full static page) and
// - videos.json at repository root (/videos.json) for the video.html above to consume.

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const sourceUrl = 'https://www.cznmeta.com/news';

async function main(){
  console.log('Fetching', sourceUrl);
  const res = await fetch(sourceUrl, { headers:{ 'User-Agent': 'cznmeta-video-generator/1.0 (+https://github.com/DeBuDDi)' }});
  if (!res.ok) throw new Error('fetch failed: ' + res.status);
  const html = await res.text();
  const $ = cheerio.load(html);

  const ids = new Set();
  $('a[href], iframe[src]').each((i, el) => {
    const href = ($(el).attr('href') || $(el).attr('src') || '').trim();
    if (!href) return;
    const m = href.match(/(?:youtube\\.com\\/watch\\?v=|youtube\\.com\\/embed\\/|youtu\\.be\\/)([A-Za-z0-9_-]{11})/);
    if (m) ids.add(m[1]);
  });

  console.log('Found IDs', ids.size);
  const videos = [];
  for (const id of ids) {
    try {
      const url = `https://www.youtube.com/watch?v=${id}`;
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const r = await fetch(oembed, { headers:{ 'User-Agent': 'cznmeta-video-generator/1.0' }});
      if (!r.ok) {
        console.warn('oEmbed failed for', id, r.status);
        videos.push({ id, url, title:`Video ${id}`, author:'', thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`});
        continue;
      }
      const data = await r.json();
      videos.push({ id, url, title: data.title, author: data.author_name, thumbnail: data.thumbnail_url });
    } catch(e){
      console.warn('error for', id, e.message || e);
      videos.push({ id, url: `https://www.youtube.com/watch?v=${id}`, title: `Video ${id}`, author:'', thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`});
    }
  }

  // write videos.json at repo root so video.html can fetch /videos.json
  const outJsonPath = path.join(process.cwd(), 'videos.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(videos, null, 2), 'utf8');
  console.log('Wrote', outJsonPath);

  // write a fully static docs/video.html (so Pages published from docs/ shows the page)
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const docsHtml = generateHtml(sourceUrl, videos);
  const docsPath = path.join(docsDir, 'video.html');
  fs.writeFileSync(docsPath, docsHtml, 'utf8');
  console.log('Wrote', docsPath);
}

function generateHtml(sourceUrl, videos){
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Videos from ${escapeHtml(sourceUrl)}</title>
<style>
  body{font-family:Inter, system-ui, -apple-system, Arial, Helvetica, sans-serif; margin:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
  .card{border:1px solid #e6e6e6;border-radius:8px;overflow:hidden;text-decoration:none;color:inherit;display:block;background:#fff}
  img{width:100%;height:auto;display:block;background:#000}
  .meta{padding:10px}
  h3{margin:0 0 6px 0;font-size:16px;line-height:1.2}
  p{margin:0;color:#555;font-size:13px}
</style>
</head>
<body>
<header>
  <h1>All posted YouTube content from ${escapeHtml(sourceUrl)}</h1>
  <p>Generated on ${new Date().toUTCString()}</p>
</header>
<div class="grid">
${videos.map(v=>`<a class="card" href="${v.url}" target="_blank" rel="noopener noreferrer">
  <img src="${v.thumbnail}" alt="${escapeHtml(v.title)}">
  <div class="meta"><h3>${escapeHtml(v.title)}</h3><p>by ${escapeHtml(v.author||'')}</p></div>
</a>`).join('\n')}
</div>
</body>
</html>`;
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;'}[c])); }

main().catch(e=>{ console.error(e); process.exit(1); });
