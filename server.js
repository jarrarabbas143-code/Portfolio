/**
 * MapRank Agency — Main Server Application
 * Agency: MapRank (GMB & Local SEO Agency)
 * Founder: Arsalan Abbas
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDatabase } = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows CDN scripts (Bootstrap, FontAwesome)
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS Setup
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.) or when '*' is allowed
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/testing
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API Routes
app.use('/api', apiRoutes);

// Serve Frontend Static Files (Seamless local preview)
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Fallback for admin and direct routing
app.get('/admin', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin/index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin/index.html'));
});

// Root fallback to frontend/index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

// Start Server
async function startServer() {
  try {
    console.log('--------------------------------------------------');
    console.log(' MapRank Agency — GMB & Local SEO System');
    console.log(' Founder: Arsalan Abbas');
    console.log(' WhatsApp: +92 311 8356461');
    console.log(' Email: abbasarsalan462@gmail.com');
    console.log('--------------------------------------------------');

    await initDatabase();

    app.listen(PORT, () => {
      console.log(`[Server] MapRank backend running on port: ${PORT}`);
      console.log(`[Server] Local URL: http://localhost:${PORT}`);
      console.log(`[Server] Admin Portal: http://localhost:${PORT}/admin`);
      console.log(`[Server] API Health Check: http://localhost:${PORT}/api/health`);
      console.log('--------------------------------------------------');
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
