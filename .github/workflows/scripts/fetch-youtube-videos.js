const fs = require('fs');
const path = require('path');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = 'UCVifvscpsdxwTWRXXnWsjYQ';
const MAX_RESULTS = 9;
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'videos.json');

// Ensure data directory exists
const dataDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function fetchYouTubeVideos() {
  if (!YOUTUBE_API_KEY) {
    console.error('❌ ERROR: YOUTUBE_API_KEY is not set');
    process.exit(1);
  }

  try {
    console.log('⏳ Fetching YouTube videos...');
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=${MAX_RESULTS}&type=video`;

    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('No videos found');
    }

    const output = {
      timestamp: new Date().toISOString(),
      items: data.items,
      success: true
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`✅ Successfully cached ${data.items.length} videos`);
    console.log(`📁 File saved to: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    const fallback = {
      timestamp: new Date().toISOString(),
      items: [],
      success: false,
      error: error.message
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fallback, null, 2));
    process.exit(1);
  }
}

fetchYouTubeVideos();
