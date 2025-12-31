const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    publishedDate: {
      type: Date,
      required: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    sections: [
      {
        title: String,
        paragraphs: [String],
      },
    ],
    rawContent: {
      type: String,
      required: true,
    },
    // excerpt: {
    //   type: String,
    //   trim: true,
    // },
  },
  {
    timestamps: true,
  }
);

// Create index for faster queries
articleSchema.index({ publishedDate: -1 });
articleSchema.index({ author: 1 });

module.exports = mongoose.model('Article', articleSchema);
