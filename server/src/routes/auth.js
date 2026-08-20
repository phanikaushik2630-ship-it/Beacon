import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/* ──────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────── */

/** Validate email format */
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

/** Build a safe token response object */
const tokenResponse = (user, token) => ({
  success: true,
  token,
  user: {
    id:        user._id,
    username:  user.username,
    email:     user.email,
    avatar:    user.avatar,
    createdAt: user.createdAt,
  },
});

/* ──────────────────────────────────────────────────
   POST /api/auth/register
   Register a new user
────────────────────────────────────────────────── */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;

    // ── Validation ──
    const errors = [];

    if (!username || username.trim().length < 2) {
      errors.push('Username must be at least 2 characters.');
    }
    if (!email || !isValidEmail(email)) {
      errors.push('A valid email address is required.');
    }
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters.');
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      errors.push('Username can only contain letters, numbers, and underscores.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // ── Check for duplicates ──
    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email: email.toLowerCase().trim() }),
      User.findOne({ username: username.trim() }),
    ]);

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
      });
    }
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: 'This username is already taken. Please choose another.',
      });
    }

    // ── Create user (password is hashed via pre-save hook) ──
    const user = await User.create({
      username: username.trim(),
      email:    email.toLowerCase().trim(),
      password,
      avatar:   avatar?.trim() || null,
    });

    // ── Generate token ──
    const token = user.generateAuthToken();

    console.log(`[Auth] New user registered: ${user.username} <${user.email}>`);

    return res.status(201).json(tokenResponse(user, token));
  } catch (err) {
    // Mongoose unique-constraint error (race condition fallback)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({
        success: false,
        error: `That ${field} is already in use.`,
      });
    }
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

/* ──────────────────────────────────────────────────
   POST /api/auth/login
   Authenticate an existing user, return JWT
────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validation ──
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.',
      });
    }

    // ── Find user (explicitly include password for comparison) ──
    const user = await User.findByEmail(email);
    if (!user) {
      // Return the same generic message for both not-found and wrong password
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // ── Compare password ──
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // ── Check account status ──
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'This account has been deactivated. Please contact support.',
      });
    }

    // ── Update lastSeen ──
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    // ── Generate token ──
    const token = user.generateAuthToken();

    console.log(`[Auth] User logged in: ${user.username} <${user.email}>`);

    return res.status(200).json(tokenResponse(user, token));
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

/* ──────────────────────────────────────────────────
   GET /api/auth/me
   Return the currently authenticated user's profile.
   Protected — requires valid Bearer JWT.
────────────────────────────────────────────────── */
router.get('/me', protect, async (req, res) => {
  try {
    // req.user is attached by the protect middleware
    return res.status(200).json({
      success: true,
      user: {
        id:        req.user._id,
        username:  req.user.username,
        email:     req.user.email,
        avatar:    req.user.avatar,
        isActive:  req.user.isActive,
        lastSeen:  req.user.lastSeen,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (err) {
    console.error('[Auth] Me error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch profile.' });
  }
});

/* ──────────────────────────────────────────────────
   PUT /api/auth/me
   Update the current user's profile (avatar, username).
   Protected — requires valid Bearer JWT.
────────────────────────────────────────────────── */
router.put('/me', protect, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};

    if (username !== undefined) {
      if (!username || username.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Username must be at least 2 characters.' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores.' });
      }
      // Check uniqueness (allow keeping the same username)
      const existing = await User.findOne({ username: username.trim(), _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'This username is already taken.' });
      }
      updates.username = username.trim();
    }

    if (avatar !== undefined) {
      updates.avatar = avatar?.trim() || null;
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Username is already taken.' });
    }
    console.error('[Auth] Update profile error:', err);
    return res.status(500).json({ success: false, error: 'Could not update profile.' });
  }
});

/* ──────────────────────────────────────────────────
   PUT /api/auth/change-password
   Change password for authenticated user.
   Protected — requires valid Bearer JWT.
────────────────────────────────────────────────── */
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    // Fetch user with password field included
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({ success: false, error: 'Could not change password.' });
  }
});

export default router;
