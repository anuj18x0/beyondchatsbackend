const articleService = require('../services/article');
const logger = require('../utils/logger');

const getAllArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await articleService.getAllArticles(page, limit);
    
    res.status(200).json({
      success: true,
      data: result.articles,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Controller error - getAllArticles:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching articles',
      error: error.message,
    });
  }
};

const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await articleService.getArticleById(id);
    
    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    logger.error('Controller error - getArticleById:', error.message);
    
    if (error.message === 'Article not found') {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching article',
      error: error.message,
    });
  }
};

const createArticle = async (req, res) => {
  try {
    const { title, author, publishedDate, url, content, rawContent } = req.body;
    
    if (!title || !author || !url || !content || !rawContent) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, author, url, content, rawContent',
      });
    }
    
    const article = await articleService.createArticle({
      title,
      author,
      publishedDate: publishedDate || new Date(),
      url,
      content,
      rawContent,
    });
    
    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article,
    });
  } catch (error) {
    logger.error('Controller error - createArticle:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating article',
      error: error.message,
    });
  }
};

const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const article = await articleService.updateArticle(id, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      data: article,
    });
  } catch (error) {
    logger.error('Controller error - updateArticle:', error.message);
    
    if (error.message === 'Article not found') {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating article',
      error: error.message,
    });
  }
};

const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await articleService.deleteArticle(id);
    
    res.status(200).json({
      success: true,
      message: 'Article deleted successfully',
      data: article,
    });
  } catch (error) {
    logger.error('Controller error - deleteArticle:', error.message);
    
    if (error.message === 'Article not found') {
      return res.status(404).json({
        success: false,
        message: 'Article not found',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error deleting article',
      error: error.message,
    });
  }
};

const searchArticles = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q" is required',
      });
    }
    
    const result = await articleService.searchArticles(q, page, limit);
    
    res.status(200).json({
      success: true,
      data: result.articles,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Controller error - searchArticles:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error searching articles',
      error: error.message,
    });
  }
};

module.exports = {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  searchArticles,
};
