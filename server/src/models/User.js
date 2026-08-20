import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/* ──────────────────────────────────────────────────
   USER SCHEMA
────────────────────────────────────────────────── */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Username must be at least 2 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },
    avatar: {
      type: String,
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

/* ──────────────────────────────────────────────────
   MIDDLEWARE — Hash password before save
────────────────────────────────────────────────── */
userSchema.pre('save', async function (next) {
  // Only hash if the password field was modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/* ──────────────────────────────────────────────────
   INSTANCE METHODS
────────────────────────────────────────────────── */

/**
 * Compare a plain-text password against the stored hash.
 * @param {string} candidatePassword - Plain text password to verify
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate a signed JWT for this user.
 * @returns {string} Signed JWT token
 */
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id:       this._id,
      username: this.username,
      email:    this.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/* ──────────────────────────────────────────────────
   STATIC METHODS
────────────────────────────────────────────────── */

/**
 * Find a user by email (case-insensitive).
 * @param {string} email
 * @returns {Promise<Document|null>}
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() }).select('+password');
};

/* ──────────────────────────────────────────────────
   VIRTUAL — Public profile (no sensitive data)
────────────────────────────────────────────────── */
userSchema.virtual('profile').get(function () {
  return {
    id:        this._id,
    username:  this.username,
    email:     this.email,
    avatar:    this.avatar,
    isActive:  this.isActive,
    lastSeen:  this.lastSeen,
    createdAt: this.createdAt,
  };
});

/* ──────────────────────────────────────────────────
   JSON SERIALIZATION — Strip password from responses
────────────────────────────────────────────────── */
userSchema.set('toJSON', {
  virtuals: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
