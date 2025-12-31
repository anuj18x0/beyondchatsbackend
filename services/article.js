const Article = require('../models/article');
const logger = require('../utils/logger');

const createArticle = async (articleData) => {
  try {
    const existingArticle = await Article.findOne({ url: articleData.url });
    if (existingArticle) {
      return existingArticle;
    }
    
    const article = new Article({
      title: articleData.title,
      author: articleData.author,
      publishedDate: articleData.publishedDate || new Date(articleData.dateText),
      url: articleData.url,
      content: articleData.content,
      sections: articleData.sections || [],
      rawContent: articleData.rawContent,
    });
    
    await article.save();
    return article;
  } catch (error) {
    logger.error('Error creating article:', error.message);
    throw error;
  }
};

const createBulkArticles = async (articlesData) => {
  try {
    const createdArticles = [];
    
    for (const articleData of articlesData) {
      try {
        const article = await createArticle(articleData);
        createdArticles.push(article);
      } catch (error) {
        // Continue with other articles
      }
    }
    
    return createdArticles;
  } catch (error) {
    logger.error('Error creating bulk articles:', error.message);
    throw error;
  }
};

const getAllArticles = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    const articles = await Article.find()
      .select('_id title rawContent publishedDate')
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Article.countDocuments();
    
    return {
      articles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalArticles: total,
      },
    };
  } catch (error) {
    logger.error('Error getting all articles:', error.message);
    throw error;
  }
};

const getArticleById = async (id) => {
  try {
    const article = await Article.findById(id);
    if (!article) {
      throw new Error('Article not found');
    }
    return article;
  } catch (error) {
    logger.error('Error getting article by ID:', error.message);
    throw error;
  }
};

const updateArticle = async (id, updateData) => {
  try {
    const article = await Article.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    return article;
  } catch (error) {
    logger.error('Error updating article:', error.message);
    throw error;
  }
};

const deleteArticle = async (id) => {
  try {
    const article = await Article.findByIdAndDelete(id);
    
    if (!article) {
      throw new Error('Article not found');
    }
    
    return article;
  } catch (error) {
    logger.error('Error deleting article:', error.message);
    throw error;
  }
};

const searchArticles = async (query, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const articles = await Article.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Article.countDocuments({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
      ],
    });
    
    return {
      articles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalArticles: total,
      },
    };
  } catch (error) {
    logger.error('Error searching articles:', error.message);
    throw error;
  }
};

module.exports = {
  createArticle,
  createBulkArticles,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  searchArticles,
};
