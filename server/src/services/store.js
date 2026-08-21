import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Generate standard 24-character hex ID (similar to MongoDB ObjectId)
export const generateId = () => crypto.randomBytes(12).toString('hex');

class InMemoryStore {
  constructor() {
    this.users = new Map();
    this.messages = [];
    this.init();
  }

  async init() {
    // Ensure directory exists
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('[Store] Could not create data directory:', e.message);
    }

    // Attempt to load from disk
    const loaded = this.loadFromDisk();
    if (!loaded || this.users.size === 0) {
      await this.initDefaultUsers();
      this.saveToDisk();
    }
  }

  saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        users: Array.from(this.users.values()),
        messages: this.messages,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Store] Could not save store to disk:', e.message);
    }
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.users)) {
          for (const u of parsed.users) {
            this.users.set(u._id, u);
          }
        }
        if (Array.isArray(parsed.messages)) {
          this.messages = parsed.messages;
        }
        return true;
      }
    } catch (e) {
      console.warn('[Store] Could not load store from disk:', e.message);
    }
    return false;
  }

  async initDefaultUsers() {
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    const demoUsers = [
      {
        _id: '660000000000000000000001',
        username: 'aurora',
        email: 'aurora@beacon.app',
        password: defaultPasswordHash,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isActive: true,
        lastSeen: new Date(),
        createdAt: new Date(),
      },
      {
        _id: '660000000000000000000002',
        username: 'nova',
        email: 'nova@beacon.app',
        password: defaultPasswordHash,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        isActive: true,
        lastSeen: new Date(),
        createdAt: new Date(),
      },
      {
        _id: '660000000000000000000003',
        username: 'cyber_pilot',
        email: 'pilot@beacon.app',
        password: defaultPasswordHash,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        isActive: true,
        lastSeen: new Date(),
        createdAt: new Date(),
      },
    ];

    for (const u of demoUsers) {
      this.users.set(u._id, u);
    }
  }

  // ── USER METHODS ──

  generateToken(user) {
    const secret = process.env.JWT_SECRET || 'beacon_secret_jwt_key_2024';
    return jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  formatUser(user, includePassword = false) {
    if (!user) return null;
    const formatted = {
      _id: user._id,
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar || null,
      isActive: user.isActive ?? true,
      lastSeen: user.lastSeen || new Date(),
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
      generateAuthToken: () => this.generateToken(user),
      comparePassword: async (candidatePassword) => bcrypt.compare(candidatePassword, user.password),
    };
    if (includePassword) {
      formatted.password = user.password;
    }
    return formatted;
  }

  async findUserByEmail(email, includePassword = false) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        return this.formatUser(u, includePassword);
      }
    }
    return null;
  }

  async findUserByUsername(username) {
    if (!username) return null;
    const cleanUsername = username.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === cleanUsername) {
        return this.formatUser(u);
      }
    }
    return null;
  }

  async findUserById(id) {
    if (!id) return null;
    const stringId = id.toString();
    const user = this.users.get(stringId);
    return user ? this.formatUser(user) : null;
  }

  async createUser({ username, email, password, avatar }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = generateId();

    const newUser = {
      _id: id,
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      avatar: avatar?.trim() || null,
      isActive: true,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(id, newUser);
    this.saveToDisk();
    return this.formatUser(newUser);
  }

  async updateUser(id, updates) {
    const stringId = id.toString();
    const user = this.users.get(stringId);
    if (!user) return null;

    if (updates.username) user.username = updates.username.trim();
    if (updates.avatar !== undefined) user.avatar = updates.avatar?.trim() || null;
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(updates.password, salt);
    }
    if (updates.lastSeen) user.lastSeen = new Date(updates.lastSeen);
    user.updatedAt = new Date();

    this.users.set(stringId, user);
    this.saveToDisk();
    return this.formatUser(user);
  }

  async resetUserPasswordByEmail(email, newPassword) {
    if (!email || !newPassword) return null;
    const cleanEmail = email.toLowerCase().trim();
    for (const [id, user] of this.users.entries()) {
      if (user.email.toLowerCase() === cleanEmail) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.updatedAt = new Date();
        this.users.set(id, user);
        this.saveToDisk();
        return this.formatUser(user);
      }
    }
    return null;
  }

  async getAllUsers(excludeUserId = null, searchQuery = '') {
    const results = [];
    const searchLower = searchQuery.toLowerCase().trim();

    for (const u of this.users.values()) {
      if (excludeUserId && u._id === excludeUserId.toString()) continue;
      if (!u.isActive) continue;

      if (
        !searchLower ||
        u.username.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      ) {
        results.push(this.formatUser(u));
      }
    }

    return results.sort((a, b) => a.username.localeCompare(b.username));
  }

  // ── MESSAGE METHODS ──

  async createMessage({ sender, receiver, content, timestamp }) {
    const senderId = typeof sender === 'object' ? (sender._id || sender.id).toString() : sender.toString();
    const receiverId = typeof receiver === 'object' ? (receiver._id || receiver.id).toString() : receiver.toString();

    const msg = {
      _id: generateId(),
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      read: false,
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.messages.push(msg);
    this.saveToDisk();

    // Return populated message
    const senderUser = await this.findUserById(senderId);
    const receiverUser = await this.findUserById(receiverId);

    return {
      _id: msg._id,
      id: msg._id,
      sender: senderUser
        ? { _id: senderUser.id, id: senderUser.id, username: senderUser.username, email: senderUser.email, avatar: senderUser.avatar }
        : senderId,
      receiver: receiverUser
        ? { _id: receiverUser.id, id: receiverUser.id, username: receiverUser.username, email: receiverUser.email, avatar: receiverUser.avatar }
        : receiverId,
      content: msg.content,
      timestamp: msg.timestamp,
      read: msg.read,
      readAt: msg.readAt,
    };
  }

  async getMessageById(messageId) {
    const stringId = messageId.toString();
    return this.messages.find((m) => m._id === stringId) || null;
  }

  async deleteMessageById(messageId) {
    const stringId = messageId.toString();
    const initialLen = this.messages.length;
    this.messages = this.messages.filter((m) => m._id !== stringId);
    this.saveToDisk();
    return this.messages.length < initialLen;
  }

  async deleteThread(user1Id, user2Id) {
    const u1 = user1Id.toString();
    const u2 = user2Id.toString();
    const initialLen = this.messages.length;

    this.messages = this.messages.filter(
      (m) => !( (m.sender === u1 && m.receiver === u2) || (m.sender === u2 && m.receiver === u1) )
    );

    this.saveToDisk();
    return initialLen - this.messages.length;
  }

  async markMessagesRead(partnerId, currentUserId) {
    const pId = partnerId.toString();
    const cId = currentUserId.toString();
    let count = 0;

    for (const m of this.messages) {
      if (m.sender === pId && m.receiver === cId && !m.read) {
        m.read = true;
        m.readAt = new Date();
        count++;
      }
    }
    if (count > 0) this.saveToDisk();
    return count;
  }

  async getMessageHistory(user1Id, user2Id, limit = 100) {
    const u1 = user1Id.toString();
    const u2 = user2Id.toString();

    const matched = this.messages.filter(
      (m) => (m.sender === u1 && m.receiver === u2) || (m.sender === u2 && m.receiver === u1)
    );

    matched.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const sliced = matched.slice(-limit);

    // Populate sender & receiver
    const populated = await Promise.all(
      sliced.map(async (msg) => {
        const senderUser = await this.findUserById(msg.sender);
        const receiverUser = await this.findUserById(msg.receiver);

        return {
          _id: msg._id,
          id: msg._id,
          sender: senderUser
            ? { _id: senderUser.id, id: senderUser.id, username: senderUser.username, email: senderUser.email, avatar: senderUser.avatar }
            : msg.sender,
          receiver: receiverUser
            ? { _id: receiverUser.id, id: receiverUser.id, username: receiverUser.username, email: receiverUser.email, avatar: receiverUser.avatar }
            : msg.receiver,
          content: msg.content,
          timestamp: msg.timestamp,
          read: msg.read,
          readAt: msg.readAt,
        };
      })
    );

    return populated;
  }

  async getConversations(currentUserId) {
    const cId = currentUserId.toString();
    const partnersMap = new Map();

    // Group messages by conversation partner
    for (const m of this.messages) {
      if (m.sender === cId || m.receiver === cId) {
        const partnerId = m.sender === cId ? m.receiver : m.sender;
        if (!partnersMap.has(partnerId)) {
          partnersMap.set(partnerId, {
            partnerId,
            messages: [],
          });
        }
        partnersMap.get(partnerId).messages.push(m);
      }
    }

    const conversations = [];

    for (const [partnerId, data] of partnersMap.entries()) {
      const partnerUser = await this.findUserById(partnerId);
      if (!partnerUser) continue;

      // Sort descending to get latest
      data.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const lastMessage = data.messages[0];
      const unreadCount = data.messages.filter((m) => m.receiver === cId && !m.read).length;

      conversations.push({
        partnerId,
        partner: {
          id: partnerUser.id,
          username: partnerUser.username,
          email: partnerUser.email,
          avatar: partnerUser.avatar,
          lastSeen: partnerUser.lastSeen,
          isActive: partnerUser.isActive,
        },
        lastMessage: {
          id: lastMessage._id,
          sender: lastMessage.sender,
          receiver: lastMessage.receiver,
          content: lastMessage.content,
          timestamp: lastMessage.timestamp,
          read: lastMessage.read,
        },
        unreadCount,
      });
    }

    conversations.sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));
    return conversations;
  }
}

export const memoryStore = new InMemoryStore();
export default memoryStore;
