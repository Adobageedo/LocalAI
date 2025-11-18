/**
 * Express Server for Railway Deployment
 * Serves the React build and handles API routes with TypeScript support
 */

// Load environment variables from .env file
require('dotenv').config();

// Register ts-node to handle TypeScript files
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    esModuleInterop: true,
    skipLibCheck: true
  },
  transpileOnly: true
});

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes - Load TypeScript route files
try {
  const promptLLMRouter = require('./routes/promptLLM').default;
  const composeRouter = require('./routes/compose').default;
  const composeStreamRouter = require('./routes/compose-stream').default;
  const downloadPdpRouter = require('./routes/download-pdp').default;
  const techniciansRouter = require('./routes/technicians').default;
  const recordsRouter = require('./routes/records').default;

  app.use('/api/promptLLM', promptLLMRouter);
  app.use('/api/compose', composeRouter);
  app.use('/api/compose-stream', composeStreamRouter);
  app.use('/api/download-pdp', downloadPdpRouter);
  app.use('/api/technicians', techniciansRouter);
  app.use('/api/records', recordsRouter);

  console.log('✅ API routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading API routes:', error);
  process.exit(1);
}

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  const buildPath = path.join(__dirname, 'build');
  app.use(express.static(buildPath));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  
  console.log('✅ Serving static files from:', buildPath);
} else {
  // In development, just show a message for non-API routes
  app.get('*', (req, res) => {
    res.json({
      message: 'Development mode - use npm start for React dev server',
      apiEndpoints: [
        '/api/promptLLM',
        '/api/compose',
        '/api/compose-stream',
        '/api/download-pdp'
      ]
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('┌────────────────────────────────────────┐');
  console.log('│     🚀 Server Running Successfully     │');
  console.log('└────────────────────────────────────────┘');
  console.log(`   Port:        ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   API Base:    http://localhost:${PORT}/api`);
  console.log(`   Health:      http://localhost:${PORT}/health`);
  console.log('────────────────────────────────────────');
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received: closing HTTP server gracefully`);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
