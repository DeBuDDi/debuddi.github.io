// api/youtube.js - Serverless function to fetch YouTube videos
// Deploy to Vercel, Netlify, or similar serverless platform
// Set the YOUTUBE_API_KEY environment variable in your deployment platform

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  const { channelId, maxResults = 9 } = req.query;

  if (!channelId) {
    return res.status(400).json({ error: 'channelId parameter is required' });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${encodeURIComponent(apiKey)}&channelId=${encodeURIComponent(channelId)}&part=snippet,id&order=date&maxResults=${maxResults}&type=video`;

    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ 
        error: `YouTube API error: ${error}` 
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching from YouTube API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch videos',
      details: error.message 
    });
  }
}
