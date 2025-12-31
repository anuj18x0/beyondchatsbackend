const express = require('express');
const router = express.Router();
const ArticleAnalysis = require('../models/articleAnalysis');
const logger = require('../utils/logger');

// GET all analyses with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const analyses = await ArticleAnalysis.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('originalArticle.id', 'title');

    const total = await ArticleAnalysis.countDocuments();

    res.json({
      success: true,
      data: analyses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalAnalyses: total,
      },
    });
  } catch (error) {
    logger.error('Get analyses error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analyses',
      error: error.message,
    });
  }
});

// GET analysis by ID
router.get('/:id', async (req, res) => {
  try {
    const analysis = await ArticleAnalysis.findById(req.params.id)
      .populate('originalArticle.id', 'title');

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('Get analysis error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis',
      error: error.message,
    });
  }
});

// GET analyses for a specific article
router.get('/article/:articleId', async (req, res) => {
  try {
    const analyses = await ArticleAnalysis.find({
      'originalArticle.id': req.params.articleId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: analyses,
    });
  } catch (error) {
    logger.error('Get article analyses error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article analyses',
      error: error.message,
    });
  }
});

module.exports = router;
