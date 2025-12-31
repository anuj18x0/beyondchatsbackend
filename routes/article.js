const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article');

// GET all articles with pagination
router.get('/', articleController.getAllArticles);

// GET search articles
router.get('/search', articleController.searchArticles);

// GET article by ID
router.get('/:id', articleController.getArticleById);

// POST create new article
router.post('/', articleController.createArticle);

// PUT update article
router.put('/:id', articleController.updateArticle);

// DELETE article
router.delete('/:id', articleController.deleteArticle);

module.exports = router;
