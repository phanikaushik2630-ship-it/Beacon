import express from 'express';
import { dbUser } from '../services/dbAdapter.js';
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
    id:        user._id || user.id,
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
      dbUser.findOne({ email: email.toLowerCase().trim() }),
      dbUser.findOne({ username: username.trim() }),
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

    // ── Create user ──
    const user = await dbUser.create({
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
    const rawIdentifier = req.body.email || req.body.username || req.body.identifier || '';
    const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';
    const password = req.body.password;

    // ── Validation ──
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email/username and password.',
      });
    }

    // ── Find user by email OR username ──
    let user = null;
    if (identifier.includes('@')) {
      user = await dbUser.findByEmail(identifier.toLowerCase());
    } else {
      user = await dbUser.findByUsername(identifier.toLowerCase());
    }

    if (!user) {
      user =
        (await dbUser.findByEmail(identifier.toLowerCase())) ||
        (await dbUser.findByUsername(identifier.toLowerCase()));
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No account found with this email or username. Click "Forgot Password?" or register a new account.',
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
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'This account has been deactivated. Please contact support.',
      });
    }

    // ── Update lastSeen ──
    await dbUser.findByIdAndUpdate(user._id || user.id, { lastSeen: new Date() });

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
    return res.status(200).json({
      success: true,
      user: {
        id:        req.user._id || req.user.id,
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
    const userId = req.user._id || req.user.id;

    if (username !== undefined) {
      if (!username || username.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Username must be at least 2 characters.' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores.' });
      }
      // Check uniqueness
      const existing = await dbUser.findOne({ username: username.trim() });
      if (existing && (existing._id || existing.id).toString() !== userId.toString()) {
        return res.status(409).json({ success: false, error: 'This username is already taken.' });
      }
      updates.username = username.trim();
    }

    if (avatar !== undefined) {
      updates.avatar = avatar?.trim() || null;
    }

    const updated = await dbUser.findByIdAndUpdate(
      userId,
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
    const userId = req.user._id || req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = await dbUser.findByEmail(req.user.email);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    await dbUser.findByIdAndUpdate(userId, { password: newPassword });

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({ success: false, error: 'Could not change password.' });
  }
});

/* ──────────────────────────────────────────────────
   POST /api/auth/forgot-password
   Public password reset or instant recovery by email
────────────────────────────────────────────────── */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email and new password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await dbUser.findByEmail(cleanEmail);

    if (existing) {
      await dbUser.resetPassword(cleanEmail, newPassword);
      console.log(`[Auth] Password reset successfully for: <${cleanEmail}>`);
      return res.status(200).json({
        success: true,
        message: 'Password reset successfully! You can now sign in with your new password.',
      });
    } else {
      // Auto-create account so user is never blocked
      const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'user';
      let username = baseUsername;
      const userExists = await dbUser.findOne({ username });
      if (userExists) {
        username = `${baseUsername}_${Math.floor(Math.random() * 899 + 100)}`;
      }

      await dbUser.create({
        username,
        email: cleanEmail,
        password: newPassword,
      });

      console.log(`[Auth] Account initialized for: ${username} <${cleanEmail}>`);
      return res.status(200).json({
        success: true,
        message: 'Account verified and password updated successfully! You can now sign in.',
      });
    }
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    return res.status(500).json({ success: false, error: 'Could not reset password. Please try again.' });
  }
});

export default router;
