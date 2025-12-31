const express = require('express');
const router = express.Router();
const scraperService = require('../services/scraper');
const googleSearch = require('../services/google-search');
const articleService = require('../services/article');
const contentUpdater = require('../services/content-updater');
const logger = require('../utils/logger');
const { strictLimiter, updateLimiter } = require('../config/rate-limit');

// Internal route to scrape and store articles from the oldest page
router.post('/scrape-and-store', strictLimiter, async (req, res) => {
  try {
    const limit = req.body.limit || 5;
    
    const scrapedArticles = await scraperService.scrapeOldestPageArticles(limit);
    
    if (scrapedArticles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No articles were scraped',
      });
    }
    
    // Store in database
    const storedArticles = await articleService.createBulkArticles(scrapedArticles);
    
    res.status(200).json({
      success: true,
      message: `Successfully scraped and stored ${storedArticles.length} articles`,
      data: {
        scrapedCount: scrapedArticles.length,
        storedCount: storedArticles.length,
        articles: storedArticles,
      },
    });
  } catch (error) {
    logger.error('Error in scrape and store:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error scraping and storing articles',
      error: error.message,
    });
  }
});

// Route to scrape any URL with generic extractor
router.post('/scrape-url', strictLimiter, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required',
      });
    }
    
    const extracted = await genericScraper.fetchAndExtract(url);
    
    res.status(200).json({
      success: true,
      message: 'Content extracted successfully',
      data: extracted,
    });
  } catch (error) {
    logger.error('Error scraping URL:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error scraping URL',
      error: error.message,
    });
  }
});

// Predict top article URLs using Vertex AI Gemini
router.post('/predict-articles', strictLimiter, async (req, res) => {
  try {
    const { query, limit = 2 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }
    
    const articles = await googleSearch.predictTopWebsites(query, limit);
    
    res.status(200).json({
      success: true,
      message: `Found ${articles.length} article URLs`,
      data: articles,
    });
  } catch (error) {
    logger.error('Article prediction error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
      hint: 'Make sure credentials.json is in backend/creds/ and Vertex AI API is enabled',
    });
  }
});

// Route to update and rate content using AI
router.post('/update-and-rate', updateLimiter, async (req, res) => {
  try {
    const { articleId } = req.body;
    
    if (!articleId) {
      return res.status(400).json({
        success: false,
        message: 'Article ID is required',
      });
    }
    
    const result = await contentUpdater.updateAndRateContent(articleId);
    
    res.status(200).json({
      success: true,
      message: 'Content updated and rated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Update and rate error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Internal route to get scraping status
router.get('/scrape-status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Scraper service is operational',
    endpoints: {
      scrapeAndStore: 'POST /internal/scrape-and-store',
      scrapeUrl: 'POST /internal/scrape-url',
      predictArticles: 'POST /internal/predict-articles',
      updateAndRate: 'POST /internal/update-and-rate',
      scrapeStatus: 'GET /internal/scrape-status',
    },
  });
});

module.exports = router;
