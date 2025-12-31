const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Load Google service account credentials from JSON file
 */
const loadGoogleCredentials = () => {
  try {
    const credsPath = path.join(__dirname, '../credentials.json');
    
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
