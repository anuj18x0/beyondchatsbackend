require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { burstLimiter, apiLimiter } = require('./config/rate-limit');

const app = express();

// CORS Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://beyondchatsfrontend-git-main-anujs-projects-376ac7ae.vercel.app',
  'https://beyondchatsfrontend.vercel.app',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply burst protection first (10 seconds window)
app.use(burstLimiter);

// Apply general rate limiting (1 minute window)
app.use(apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
connectDB();

// Routes
const articleRoutes = require('./routes/article');
const internalRoutes = require('./routes/internal');
const analysisRoutes = require('./routes/analysis');

app.use('/api/articles', articleRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/internal', internalRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
