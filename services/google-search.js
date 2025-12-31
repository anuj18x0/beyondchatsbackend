const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Load Google service account credentials from JSON file
 */
const loadGoogleCredentials = () => {
  try {
    const credsPath = path.join(__dirname, '../creds/credentials.json');
    
    if (!fs.existsSync(credsPath)) {
      throw new Error('credentials.json not found');
    }
    
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    return creds;
  } catch (error) {
    throw new Error(`Error loading credentials: ${error.message}`);
  }
};

/**
 * Generate JWT and get OAuth2 access token
 */
const getAccessToken = async (credentials) => {
  try {
    const jwt = require('jsonwebtoken');
    
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: credentials.token_uri,
      exp: now + 3600,
      iat: now,
    };
    
    const token = jwt.sign(claim, credentials.private_key, { algorithm: 'RS256' });
    
    const response = await axios.post(credentials.token_uri, {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    });
    
    return response.data.access_token;
  } catch (error) {
    throw new Error(`Access token error: ${error.message}`);
  }
};

/*
// OLD IMPLEMENTATION - Using Vertex AI Gemini (COMMENTED OUT)
const predictTopWebsites = async (query, limit = 2) => {
  try {
    const credentials = loadGoogleCredentials();
    
    if (!credentials) {
      throw new Error('Google credentials not found. Place credentials.json in backend/creds/ folder');
    }
    
    logger.info(`Using Vertex AI Gemini with Google Search to find top ${limit} articles for: "${query}"`);
    
    const token = await getAccessToken(credentials);
    const projectId = credentials.project_id;
    const location = 'us-central1';
    
    const prompt = `You are helping to find reference articles for content improvement. 

Search for the top ${limit} REAL, EXISTING article or blog URLs that are most relevant to this topic: "${query}"

Important:
- Focus on the EXACT topic and context provided
- Find articles from authoritative marketing, business, or industry blogs
- URLs must be real and accessible (not hypothetical)
- Prioritize recent, high-quality content

Return ONLY a JSON array in this exact format:
[
  {"url": "https://example.com/article", "title": "Article Title", "reason": "Why this is relevant"}
]`;

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`;
    
    const response = await axios.post(
      endpoint,
      {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
        tools: [{
          googleSearch: {}
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );
    
    const content = response.data.candidates[0].content.parts[0].text.trim();
    logger.info('Gemini response with grounding:', content);
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      logger.warn('No JSON array found in response, attempting to parse full response');
      throw new Error('No JSON array found in response');
    }
    
    const websites = JSON.parse(jsonMatch[0]);
    
    logger.info(`Found ${websites.length} article URLs with Google Search grounding`);
    websites.forEach((w, i) => logger.info(`  ${i + 1}. ${w.title} - ${w.url}`));
    
    return websites;
  } catch (error) {
    logger.error('Vertex AI error:', error.message);
    if (error.response?.data) {
      logger.error('API error:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};
*/

/**
 * Use Google Custom Search API to find real article URLs
 */
const predictTopWebsites = async (query, limit = 2) => {
  try {
    const apiKey = process.env.CUSTOM_SEARCH;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      throw new Error('CUSTOM_SEARCH or SEARCH_ENGINE_ID not found in environment variables');
    }
    
    const endpoint = 'https://www.googleapis.com/customsearch/v1';
    
    const response = await axios.get(endpoint, {
      params: {
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: limit,
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return [];
    }
    
    const websites = response.data.items.map((item) => ({
      url: item.link,
      title: item.title,
      reason: item.snippet || 'Relevant article found via Google Search',
    }));
    
    return websites;
  } catch (error) {
    logger.error('Google Custom Search API error:', error.message);
    if (error.response?.data) {
      logger.error('API error:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

module.exports = {
  loadGoogleCredentials,
  getAccessToken,
  predictTopWebsites,
};
