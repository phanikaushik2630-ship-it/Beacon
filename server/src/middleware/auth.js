import jwt from 'jsonwebtoken';
import { dbUser } from '../services/dbAdapter.js';

/* ──────────────────────────────────────────────────
   PROTECT MIDDLEWARE
   Verifies Bearer JWT and attaches req.user
────────────────────────────────────────────────── */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No authentication token provided.',
    });
  }

  try {
    // 2. Verify the token
    const secret = process.env.JWT_SECRET || 'beacon_secret_jwt_key_2024';
    const decoded = jwt.verify(token, secret);

    // 3. Check the user still exists in the database
    const user = await dbUser.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'The user belonging to this token no longer exists.',
      });
    }

    // 4. Check user is still active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'This account has been deactivated.',
      });
    }

    // 5. Attach user to request and continue
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Your session has expired. Please log in again.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please log in again.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Authentication error. Please try again.',
    });
  }
};

/* ──────────────────────────────────────────────────
   OPTIONAL AUTH MIDDLEWARE
   Attaches req.user if token is valid, but does NOT
   block the request if no token is provided.
   Useful for routes that work for both guests & users.
────────────────────────────────────────────────── */
export const optionalAuth = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'beacon_secret_jwt_key_2024';
    const decoded = jwt.verify(token, secret);
    req.user = await dbUser.findById(decoded.id);
    next();
  } catch {
    req.user = null;
    next();
  }
};

/* ──────────────────────────────────────────────────
   SOCKET.IO AUTH MIDDLEWARE
   Use in socket.io to protect socket connections.
   Usage: io.use(socketAuth)
────────────────────────────────────────────────── */
export const socketAuth = async (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    // Allow unauthenticated socket connections (guest mode)
    socket.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'beacon_secret_jwt_key_2024';
    const decoded = jwt.verify(token, secret);
    const user = await dbUser.findById(decoded.id);
    socket.user = user || null;
    next();
  } catch {
    socket.user = null;
    next();
  }
};
