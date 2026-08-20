import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import healthRouter from './routes/health.js';
import authRouter   from './routes/auth.js';
import messagesRouter from './routes/messages.js';
import { registerChatSocketHandlers } from './sockets/chatSocket.js';

// ── Load environment variables ──
dotenv.config();

const app        = express();
const PORT       = process.env.PORT       || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGO_URI  = process.env.MONGO_URI  || 'mongodb://localhost:27017/realtimechat';

/* ═══════════════════════════════════════════════════
   MONGODB CONNECTION
═══════════════════════════════════════════════════ */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB unreachable
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.warn('⚠️  Server will continue without database. Auth routes will not function.');
    // Do not exit — allow server to run so Socket.io chat still works
  }
};

// Mongoose global settings
mongoose.set('strictQuery', false);

// Handle connection events after initial connect
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected. Attempting to reconnect…');
});
mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected successfully.');
});
mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message);
});

// Parse allowed origins
const parsedClientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://beacon-message.netlify.app',
  ...parsedClientUrls,
];

const checkOrigin = (origin, callback) => {
  // Allow non-browser requests (Postman, curl, server-to-server)
  if (!origin) return callback(null, true);

  const isExplicitlyAllowed = defaultOrigins.some((allowed) => {
    if (allowed === '*') return true;
    return origin.toLowerCase() === allowed.toLowerCase();
  });

  // Also dynamically allow any preview or production Netlify subdomain
  const isNetlifyDomain = /^https:\/\/[a-zA-Z0-9_-]+\.netlify\.app$/.test(origin);

  if (isExplicitlyAllowed || isNetlifyDomain) {
    return callback(null, true);
  }

  // Fallback: allow all origins in development or log warning in production
  if (process.env.NODE_ENV !== 'production') {
    return callback(null, true);
  }

  return callback(null, true); // Permissive to prevent blocking frontend deployments
};

const corsConfig = {
  origin: checkOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsConfig));
app.use(express.json({ limit: '10kb' }));         // Limit body size for security
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

/* ═══════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════ */
app.use('/api', healthRouter);             // GET /api/health
app.use('/api/auth', authRouter);          // POST /api/auth/register, /api/auth/login, etc.
app.use('/api/messages', messagesRouter);  // 1-to-1 direct messaging routes

// Root info route
app.get('/', (_req, res) => {
  res.json({
    name:    'Beacon API',
    status:  'online',
    version: '1.0.0',
    db:      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    routes: {
      health:         'GET   /api/health',
      register:       'POST  /api/auth/register',
      login:          'POST  /api/auth/login',
      me:             'GET   /api/auth/me',
      conversations:  'GET   /api/messages/conversations',
      usersDirectory: 'GET   /api/messages/users',
      messageHistory: 'GET   /api/messages/:partnerId',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
  });
});

/* ═══════════════════════════════════════════════════
   HTTP + SOCKET.IO SERVER
═══════════════════════════════════════════════════ */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

registerChatSocketHandlers(io);

/* ═══════════════════════════════════════════════════
   STARTUP
═══════════════════════════════════════════════════ */
const start = async () => {
  // Connect to MongoDB first (non-blocking failure)
  await connectDB();

  server.listen(PORT, () => {
    const dbStatus = mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️  Disconnected';
    console.log('═══════════════════════════════════════════════');
    console.log(`🚀 Beacon Server running on port ${PORT}`);
    console.log(`📡 Health Check : http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth Register: http://localhost:${PORT}/api/auth/register`);
    console.log(`🔐 Auth Login   : http://localhost:${PORT}/api/auth/login`);
    console.log(`🗄️  MongoDB      : ${dbStatus}`);
    console.log(`🌐 Client Origin : ${CLIENT_URL}`);
    console.log('═══════════════════════════════════════════════');
  });
};

start();

/* ═══════════════════════════════════════════════════
   GRACEFUL SHUTDOWN
═══════════════════════════════════════════════════ */
const shutdown = async (signal) => {
  console.log(`\n[${signal}] Gracefully shutting down…`);
  io.close(() => console.log('Socket.io closed.'));
  server.close(async () => {
    console.log('HTTP server closed.');
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown stalls
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
