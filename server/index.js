/**
 * Riddick Chess v2 - Main Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const { initDatabase } = require('./init-db');

const app = express();
const server = http.createServer(app);

// CORS configuration - allow same origin in production
const corsOrigin = process.env.NODE_ENV === 'production' 
  ? true  // Allow same origin
  : 'http://localhost:3000';

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize socket handlers
const { initializeSocket, userSockets } = require('./sockets');
initializeSocket(io);

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/games', require('./routes/games'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/puzzles', require('./routes/puzzles'));
app.use('/api/leaderboards', require('./routes/leaderboards'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/club', require('./routes/club'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/customization', require('./routes/customization'));
app.use('/api/healthcheck', require('./routes/healthcheck'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get actually connected socket users
app.get('/api/online-users', async (req, res) => {
  try {
    const connectedUserIds = [...userSockets.keys()];
    console.log('Connected socket users:', connectedUserIds);
    
    if (connectedUserIds.length === 0) {
      return res.json([]);
    }
    
    const pool = require('./utils/db');
    const result = await pool.query(`
      SELECT id, username, avatar
      FROM users
      WHERE id = ANY($1) AND is_banned = FALSE
    `, [connectedUserIds]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve React app (production or if build exists in dev)
const buildPath = path.join(__dirname, '../client/build');

if (process.env.NODE_ENV === 'production' || fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // In development without build, redirect to client dev server
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Riddick Chess - Development</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #0f0f1a;
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
              h1 { margin-bottom: 1rem; }
              a {
                color: #6366f1;
                text-decoration: none;
                font-size: 1.2rem;
              }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>♔ Riddick Chess Server</h1>
              <p>API server is running on port 5000</p>
              <p>Please start the React development server:</p>
              <p><code>cd client && npm start</code></p>
              <p>Then visit <a href="http://localhost:3000">http://localhost:3000</a></p>
            </div>
          </body>
        </html>
      `);
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;

// Initialize database then start server
initDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`
  ♔ ═══════════════════════════════════════════ ♔
  ║                                               ║
  ║         RIDDICK CHESS v2.0                    ║
  ║         Server running on port ${PORT}            ║
  ║                                               ║
  ║   Features:                                   ║
  ║   ✓ Real-time Chess with Socket.io            ║
  ║   ✓ Glicko-2 Rating System                    ║
  ║   ✓ Swiss Tournament System                   ║
  ║   ✓ Puzzle Training & Puzzle Rush             ║
  ║   ✓ Achievements & Leaderboards               ║
  ║   ✓ Spectator Mode                            ║
  ║   ✓ Club Members Section                      ║
  ║                                               ║
  ♔ ═══════════════════════════════════════════ ♔
      `);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = { app, server, io };
// Deploy 1766735582
// Domain fix 1766790051
// Fix domain 1766796173
// Fix domain 1766796406
// Force rebuild 1766811408
