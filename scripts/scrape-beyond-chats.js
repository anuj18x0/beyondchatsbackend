require('dotenv').config();
const mongoose = require('mongoose');
const scraperService = require('../services/scraper');
const articleService = require('../services/article');
const logger = require('../utils/logger');

const main = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beyondchats';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected for scraping');
    
    // Get limit from command line or default to 5
    const limit = process.argv[2] ? parseInt(process.argv[2]) : 5;
    logger.info(`Scraping ${limit} articles from the last page`);
    
    // Scrape articles
    const scrapedArticles = await scraperService.scrapeLastPageArticles(limit);
    logger.info(`Scraped ${scrapedArticles.length} articles`);
    
    // Store in database
    const storedArticles = await articleService.createBulkArticles(scrapedArticles);
    logger.info(`Stored ${storedArticles.length} articles in database`);
    
    console.log('\n✓ Scraping completed successfully!');
    console.log(`✓ Total articles stored: ${storedArticles.length}`);
    
    storedArticles.forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   Author: ${article.author}`);
      console.log(`   Date: ${article.publishedDate}`);
      console.log(`   URL: ${article.url}`);
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('Scraping error:', error.message);
    console.error('Error:', error);
    process.exit(1);
  }
};

main();
