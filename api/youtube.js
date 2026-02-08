const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { method, queryStringParameters } = event;
    const { videoId } = queryStringParameters;

    if (method !== 'GET' || !videoId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Please provide a videoId' }),
        };
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.error) {
            return {
                statusCode: data.error.code,
                body: JSON.stringify(data.error),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data.items),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred while fetching data from YouTube API' }),
        };
    }
};