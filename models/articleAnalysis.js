const mongoose = require('mongoose');

const articleAnalysisSchema = new mongoose.Schema({
  originalArticle: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: true,
    },
    title: String,
    rawContent: String,
  },
  updatedArticle: {
    title: String,
    rawContent: String,
  },
  references: [{
    url: String,
    reason: String,
  }],
  changesApplied: [String],
  newInsights: [String],
  ratings: {
    original: {
      overallScore: Number,
      ratings: {
        contentQuality: Number,
        depth: Number,
        structure: Number,
        relevance: Number,
        uniqueness: Number,
      },
      strengths: [String],
      weaknesses: [String],
      summary: String,
    },
    updated: {
      overallScore: Number,
      ratings: {
        contentQuality: Number,
        depth: Number,
        structure: Number,
        relevance: Number,
        uniqueness: Number,
      },
      strengths: [String],
      weaknesses: [String],
      summary: String,
    },
  },
  improvement: {
    scoreDifference: Number,
    improved: Boolean,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
articleAnalysisSchema.index({ 'originalArticle.id': 1 });
articleAnalysisSchema.index({ createdAt: -1 });

const ArticleAnalysis = mongoose.model('ArticleAnalysis', articleAnalysisSchema);

module.exports = ArticleAnalysis;
