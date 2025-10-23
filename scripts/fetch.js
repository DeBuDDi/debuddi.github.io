const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const sourceUrl = 'https://www.cznmeta.com/news';

async function main() {
  console.log('Fetching', sourceUrl);
  const res = await fetch(sourceUrl, { headers: { 'User-Agent': 'cznmeta-video-generator/1.0 (+https://github.com/DeBuDDi)' } });
  if (!res.ok) throw new Error(`Failed to fetch ${sourceUrl}: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const ids = new Set();

  // Find YouTube links in anchors and iframes
  $('a[href], iframe[src]').each((i, el) => {
    const href = ($(el).attr('href') || $(el).attr('src') || '').trim();
    if (!href) return;
    const m = href.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) ids.add(m[1]);
  });

  console.log('Found video IDs:', Array.from(ids));

  const videos = [];
  for (const id of ids) {
    try {
      const url = `https://www.youtube.com/watch?v=${id}`;
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const o = await fetch(oembedUrl, { headers: { 'User-Agent': 'cznmeta-video-generator/1.0' } });
      if (!o.ok) {
        console.warn('oEmbed failed for', id, o.status);
        videos.push({ id, url, title: `Video ${id}`, author: '', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` });
        continue;
      }
      const data = await o.json();
      videos.push({ id, title: data.title, author: data.author_name, thumbnail: data.thumbnail_url, url });
    } catch (e) {
      console.warn('Error fetching oEmbed for', id, e && e.message ? e.message : e);
      videos.push({ id, url: `https://www.youtube.com/watch?v=${id}`, title: `Video ${id}`, author: '', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` });
    }
  }

  const outDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'index.html');
  const page = generateHtml(sourceUrl, videos);
  fs.writeFileSync(outPath, page, 'utf8');
  console.log('Wrote', outPath);
}

function generateHtml(sourceUrl, videos) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Videos from ${escapeHtml(sourceUrl)}</title>
<style>
  :root{color-scheme: light dark}
  body{font-family:Inter, system-ui, -apple-system, Arial, Helvetica, sans-serif; margin:24px; color:var(--text,#111); background:var(--bg,#fff)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
  .card{border:1px solid #e6e6e6;border-radius:8px;overflow:hidden;text-decoration:none;color:inherit;display:block;background:#fff}
  img{width:100%;height:auto;display:block;background:#000}
  .meta{padding:10px}
  h3{margin:0 0 6px 0;font-size:16px;line-height:1.2}
  p{margin:0;color:#555;font-size:13px}
  header{margin-bottom:18px}
  a.card:hover{box-shadow:0 6px 18px rgba(0,0,0,0.08)}
  @media (prefers-color-scheme:dark){
    :root{--bg:#0b0b0b;--text:#e6e6e6}
    .card{border-color:#222;background:#0f0f10}
    p{color:#a8a8a8}
  }
</style>
</head>
<body>
<header>
  <h1>All posted YouTube content from ${escapeHtml(sourceUrl)}</h1>
  <p>Generated on ${new Date().toUTCString()}</p>
  <p>Source: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceUrl}</a></p>
</header>

<div class="grid">
${videos.map(v => `<a class="card" href="${v.url}" target="_blank" rel="noopener noreferrer">
  <img src="${v.thumbnail}" alt="${escapeHtml(v.title)}">
  <div class="meta">
    <h3>${escapeHtml(v.title)}</h3>
    <p>by ${escapeHtml(v.author || '')}</p>
  </div>
</a>`).join('\n')}
</div>

</body>
</html>`;
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

main().catch(err => { console.error(err); process.exit(1); });
