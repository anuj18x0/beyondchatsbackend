const axios = require('axios');
const articleService = require('./article');
const googleSearch = require('./google-search');
const ArticleAnalysis = require('../models/articleAnalysis');
const logger = require('../utils/logger');

/**
 * Get access token for Vertex AI
 */
const getVertexAIToken = async (credentials) => {
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
};

/**
 * Call Vertex AI Gemini to update content and rate both versions in one call
 */
const updateAndRateContentWithAI = async (originalContent, referenceUrls, credentials) => {
  try {
    const token = await getVertexAIToken(credentials);
    const projectId = credentials.project_id;
    const location = 'us-central1';
    
    const referencesText = referenceUrls
      .map((ref, idx) => `Reference ${idx + 1}: ${ref.url} - ${ref.reason}`)
      .join('\n');
    
    const prompt = `You are a content improvement expert. You have an original blog post and 2 reference website URLs.

ORIGINAL BLOG POST:
Title: ${originalContent.title}
Raw HTML Content: ${originalContent.rawContent}

REFERENCE WEBSITE URLs (for your reference):
${referencesText}

Your task:
1. First, rate the ORIGINAL content on these criteria (scale 1-10):
   - Content Quality (how well-written and informative)
   - Depth (how comprehensive and detailed)
   - Structure (how well-organized)
   - Relevance (how relevant to the topic)
   - Uniqueness (how unique the insights are)

2. Then, update and enhance the original blog post with better insights and information
   - Use the reference URLs as inspiration
   - Keep the original style and tone
   - Make the content more comprehensive and valuable
   - Return the updated content as clean HTML that matches the original format

3. Finally, rate the UPDATED content using the same criteria

Return your response in this JSON format:
{
  "originalRating": {
    "overallScore": 8.5,
    "ratings": {
      "contentQuality": 9,
      "depth": 8,
      "structure": 9,
      "relevance": 9,
      "uniqueness": 7
    },
    "strengths": ["List of strengths"],
    "weaknesses": ["List of weaknesses"],
    "summary": "Brief summary"
  },
  "updatedTitle": "Updated title if changed, or original",
  "updatedRawContent": "The complete updated blog post content in HTML format",
  "changesApplied": ["List of key changes made"],
  "newInsights": ["List of new insights added"],
  "updatedRating": {
    "overallScore": 9.2,
    "ratings": {
      "contentQuality": 10,
      "depth": 9,
      "structure": 9,
      "relevance": 10,
      "uniqueness": 8
    },
    "strengths": ["List of strengths"],
    "weaknesses": ["List of weaknesses"],
    "summary": "Brief summary"
  }
}`;

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`;
    
    const response = await axios.post(
      endpoint,
      {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 90000, // Increased timeout since this is a combined operation
      }
    );
    
    const aiResponse = response.data.candidates[0].content.parts[0].text.trim();
    
    // Extract JSON from response - handle markdown code blocks
    let jsonString = aiResponse;
    if (aiResponse.includes('```json')) {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      jsonString = jsonMatch ? jsonMatch[1].trim() : aiResponse;
    } else if (aiResponse.includes('```')) {
      const jsonMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/);
      jsonString = jsonMatch ? jsonMatch[1].trim() : aiResponse;
    } else {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
    }
    
    // Parse with better error handling
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      logger.error('JSON parse error, attempting to fix control characters');
      // Try to clean up common control character issues
      const cleanedJson = jsonString
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return JSON.parse(cleanedJson);
    }
  } catch (error) {
    logger.error('AI content update and rating error:', error.message);
    throw error;
  }
};

/**
 * Rate content using AI
 */
const rateContentWithAI = async (content, credentials) => {
  try {
    const token = await getVertexAIToken(credentials);
    const projectId = credentials.project_id;
    const location = 'us-central1';
    const model = 'gemini-2.5-flash';
    
    const prompt = `Rate this blog post on the following criteria (scale 1-10):

BLOG POST:
Title: ${content.title}
Content: ${content.rawContent || content.content}

Provide ratings for:
1. Content Quality - How well-written and informative
2. Depth - How comprehensive and detailed
3. Structure - How well-organized
4. Relevance - How relevant to the topic
5. Uniqueness - How unique the insights are

Return your response in this JSON format:
{
  "overallScore": number,
  "ratings": {
    "contentQuality": number,
    "depth": number,
    "structure": number,
    "relevance": number,
    "uniqueness": number
  },
  "strengths": ["List of strengths"],
  "weaknesses": ["List of weaknesses"],
  "summary": "Brief summary of the rating"
}`;

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
    
    const response = await axios.post(
      endpoint,
      {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    const aiResponse = response.data.candidates[0].content.parts[0].text.trim();
    
    // Extract JSON from response - handle markdown code blocks
    let jsonString = aiResponse;
    if (aiResponse.includes('```json')) {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      jsonString = jsonMatch ? jsonMatch[1].trim() : aiResponse;
    } else if (aiResponse.includes('```')) {
      const jsonMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/);
      jsonString = jsonMatch ? jsonMatch[1].trim() : aiResponse;
    } else {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
    }
    
    // Parse with better error handling
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      logger.error('JSON parse error in rating, attempting to fix');
      // Try to clean up common issues
      const cleanedJson = jsonString
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return JSON.parse(cleanedJson);
    }
  } catch (error) {
    logger.error('AI rating error:', error.message);
    throw error;
  }
};

/**
 * Main function to update and rate content - optimized to 2 API calls
 */
const updateAndRateContent = async (articleId) => {
  try {
    const credentials = googleSearch.loadGoogleCredentials();
    if (!credentials) {
      throw new Error('Google credentials not found');
    }
    
    const originalArticle = await articleService.getArticleById(articleId);
    
    if (!originalArticle) {
      throw new Error(`Article with ID ${articleId} not found`);
    }
    
    const referenceUrls = await googleSearch.predictTopWebsites(originalArticle.title, 2);
    
    const result = await updateAndRateContentWithAI(originalArticle, referenceUrls, credentials);
    
    const originalRating = result.originalRating;
    const updatedRating = result.updatedRating;
    
    const analysisData = {
      originalArticle: {
        id: originalArticle._id,
        title: originalArticle.title,
        rawContent: originalArticle.rawContent,
      },
      updatedArticle: {
        title: result.updatedTitle,
        rawContent: result.updatedRawContent,
      },
      references: referenceUrls.map(ref => ({
        url: ref.url,
        reason: ref.reason,
      })),
      changesApplied: result.changesApplied,
      newInsights: result.newInsights,
      ratings: {
        original: originalRating,
        updated: updatedRating,
      },
      improvement: {
        scoreDifference: updatedRating.overallScore - originalRating.overallScore,
        improved: updatedRating.overallScore > originalRating.overallScore,
      },
    };
    
    const analysis = await ArticleAnalysis.create(analysisData);
    
    const responseResult = {
      analysisId: analysis._id,
      original: {
        id: originalArticle._id,
        title: originalArticle.title,
        rawContent: originalArticle.rawContent,
        rating: originalRating,
      },
      references: referenceUrls.map(ref => ({
        url: ref.url,
        reason: ref.reason,
      })),
      updated: {
        title: result.updatedTitle,
        rawContent: result.updatedRawContent,
        changesApplied: result.changesApplied,
        newInsights: result.newInsights,
        rating: updatedRating,
      },
      improvement: {
        scoreDifference: updatedRating.overallScore - originalRating.overallScore,
        improved: updatedRating.overallScore > originalRating.overallScore,
      },
    };
    
    return responseResult;
  } catch (error) {
    logger.error('Update and rate content error:', error.message);
    throw error;
  }
};

module.exports = {
  updateAndRateContent,
  updateAndRateContentWithAI,
  rateContentWithAI,
};
