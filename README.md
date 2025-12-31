# BeyondChats Backend

AI-powered content management system backend built with Node.js, Express, MongoDB, and Google Vertex AI Gemini.

## 🚀 Features

- **Article Scraping**: Scrape articles from BeyondChats blog (oldest-first with multi-page support)
- **AI Content Enhancement**: Improve articles using Google Vertex AI Gemini 2.5-flash
- **Content Analysis**: Rate and compare original vs enhanced content
- **Google Custom Search**: Find real article URLs automatically
- **Rate Limiting**: 4-tier protection system
- **RESTful API**: Clean API endpoints for CRUD operations

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local or cloud instance)
- **Google Cloud Project** with:
  - Vertex AI API enabled
  - Service Account with Vertex AI permissions
  - Custom Search API enabled
  - Programmable Search Engine created

## 🛠️ Installation

### 1. Clone the repository
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend root directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/<YOUR_DB_NAME>
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/YOUR_DB_NAME

# Google Cloud Configuration
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Google Custom Search API
GOOGLE_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id

# Server Configuration
PORT=5000
```

### 4. Google Cloud Setup

#### Service Account Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable Vertex AI API
4. Create a Service Account with "Vertex AI User" role
5. Download JSON key file
6. Place it in a secure location and update `GOOGLE_APPLICATION_CREDENTIALS` path

#### Custom Search Setup:
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Create a new search engine
3. Configure it to search the entire web
4. Copy the Search Engine ID
5. Get API key from [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)

## 🏃 Running the Application

### Development Mode
```bash
npm start
```

Server will start on `http://localhost:5000`

### Scrape Articles (Standalone)
```bash
npm run scrape
```

## 📁 Project Structure

```
backend/
├── app.js                      # Main application entry point
├── config/
│   ├── db.js                   # MongoDB connection
│   └── rate-limit.js           # Rate limiting configuration
├── controllers/
│   └── article.js              # Article CRUD controllers
├── models/
│   ├── article.js              # Article schema
│   └── articleAnalysis.js      # Analysis schema
├── routes/
│   ├── article.js              # Article API routes
│   ├── analysis.js             # Analysis API routes
│   └── internal.js             # Internal operations (scraping, AI)
├── services/
│   ├── article.js              # Article business logic
│   ├── scraper.js              # Web scraping service
│   ├── google-scrapper.js      # Google Custom Search
│   └── content-updater.js      # AI content enhancement
├── scripts/
│   └── scrape-beyond-chats.js  # Standalone scraper
└── utils/
    ├── logger.js               # Logging utility
    └── sanitize.js             # Input sanitization
```

## 🔌 API Endpoints

### Articles
- `GET /api/articles` - Get all articles (with pagination)
- `GET /api/articles/:id` - Get single article
- `POST /api/articles` - Create new article
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article

### Analysis
- `GET /api/analysis` - Get all analyses
- `GET /api/analysis/:id` - Get single analysis
- `GET /api/analysis/article/:articleId` - Get analyses for specific article

### Internal Operations
- `POST /internal/scrape-and-store` - Scrape articles from BeyondChats
  ```json
  { "limit": 5 }
  ```
- `POST /internal/predict-articles` - Find real article URLs
  ```json
  { "query": "search query", "limit": 2 }
  ```
- `POST /internal/update-and-rate` - Enhance article with AI
  ```json
  { "articleId": "article_id_here" }
  ```

## 🛡️ Rate Limiting

Four-tier protection system:
- **Burst Limiter**: 40 requests per 10 seconds
- **API Limiter**: 150 requests per minute
- **Strict Limiter**: 3 requests per minute (scraping, prediction)
- **Update Limiter**: 10 requests per hour (AI enhancement)

## 📊 Database Schemas

### Article
```javascript
{
  title: String,
  rawContent: String,
  publishedDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### ArticleAnalysis
```javascript
{
  originalArticle: {
    id: ObjectId,
    title: String,
    rawContent: String
  },
  updatedArticle: {
    title: String,
    rawContent: String
  },
  references: [{ url: String, reason: String }],
  changesApplied: [String],
  newInsights: [String],
  ratings: {
    original: { overallScore, ratings, strengths, weaknesses },
    updated: { overallScore, ratings, strengths, weaknesses }
  },
  improvement: {
    scoreDifference: Number,
    improved: Boolean
  },
  createdAt: Date
}
```

## 🤖 AI Content Enhancement

The system uses Google Vertex AI Gemini 2.5-flash to:
1. **Rate Original Content**: Analyze quality, depth, structure, relevance, uniqueness
2. **Enhance Content**: Improve using research from Google Custom Search
3. **Rate Enhanced Content**: Compare improvements
4. **Track Changes**: Document all modifications and insights

### Enhancement Process:
1. Original article is rated (0-10 scale)
2. Google Custom Search finds relevant references
3. AI rewrites content with improvements
4. Enhanced version is rated
5. Analysis report is generated with comparison

## 🔧 Technologies

- **Node.js** & **Express** - Backend framework
- **MongoDB** & **Mongoose** - Database
- **Google Vertex AI** - Gemini 2.5-flash for content enhancement
- **Google Custom Search API** - Research and URL discovery
- **Axios** & **Cheerio** - Web scraping
- **express-rate-limit** - API protection

## 📝 Logging

Logs are stored in `logs/` directory:
- `app.log` - General application logs
- `error.log` - Error logs only

## 🚨 Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 🔒 Security

- Input sanitization on all endpoints
- Rate limiting on all routes
- Environment variables for sensitive data
- MongoDB injection prevention

## 👥 Support

For issues or questions, please open an issue in the repository.
