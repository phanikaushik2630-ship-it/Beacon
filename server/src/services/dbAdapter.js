import mongoose from 'mongoose';
import User from '../models/User.js';
import Message from '../models/Message.js';
import memoryStore from './store.js';

/**
 * Intelligent Database Adapter
 * Seamlessly routes queries to Mongoose when MongoDB is connected,
 * or to high-performance InMemoryStore when MongoDB is disconnected.
 */

const isMongoConnected = () => mongoose.connection.readyState === 1;

export const dbUser = {
  async findByEmail(email) {
    if (isMongoConnected()) {
      return User.findByEmail(email);
    }
    return memoryStore.findUserByEmail(email, true);
  },

  async findOne(filter) {
    if (isMongoConnected()) {
      return User.findOne(filter);
    }
    if (filter.email) return memoryStore.findUserByEmail(filter.email);
    if (filter.username) return memoryStore.findUserByUsername(filter.username);
    if (filter._id) return memoryStore.findUserById(filter._id);
    return null;
  },

  async findById(id) {
    if (isMongoConnected()) {
      return User.findById(id);
    }
    return memoryStore.findUserById(id);
  },

  async create(userData) {
    if (isMongoConnected()) {
      return User.create(userData);
    }
    return memoryStore.createUser(userData);
  },

  async findByIdAndUpdate(id, updates, options = {}) {
    if (isMongoConnected()) {
      return User.findByIdAndUpdate(id, updates, options);
    }
    const updateFields = updates.$set ? updates.$set : updates;
    return memoryStore.updateUser(id, updateFields);
  },

  async find(filter = {}) {
    if (isMongoConnected()) {
      return User.find(filter);
    }
    const excludeId = filter._id?.$ne;
    const search = filter.$or?.[0]?.username?.source || '';
    return memoryStore.getAllUsers(excludeId, search);
  },
};

export const dbMessage = {
  async create(messageData) {
    if (isMongoConnected()) {
      const created = await Message.create(messageData);
      return Message.findById(created._id)
        .populate('sender', 'username email avatar')
        .populate('receiver', 'username email avatar');
    }
    return memoryStore.createMessage(messageData);
  },

  async findById(id) {
    if (isMongoConnected()) {
      return Message.findById(id);
    }
    return memoryStore.getMessageById(id);
  },

  async findByIdAndDelete(id) {
    if (isMongoConnected()) {
      return Message.findByIdAndDelete(id);
    }
    return memoryStore.deleteMessageById(id);
  },

  async deleteMany(filter) {
    if (isMongoConnected()) {
      return Message.deleteMany(filter);
    }
    // Handle conversation thread deletion: $or: [{ sender, receiver }, { sender, receiver }]
    if (filter.$or && filter.$or.length >= 2) {
      const u1 = filter.$or[0].sender;
      const u2 = filter.$or[0].receiver;
      const deletedCount = await memoryStore.deleteThread(u1, u2);
      return { deletedCount };
    }
    return { deletedCount: 0 };
  },

  async updateMany(filter, update) {
    if (isMongoConnected()) {
      return Message.updateMany(filter, update);
    }
    const partnerId = filter.sender;
    const currentUserId = filter.receiver;
    if (partnerId && currentUserId) {
      const modifiedCount = await memoryStore.markMessagesRead(partnerId, currentUserId);
      return { modifiedCount };
    }
    return { modifiedCount: 0 };
  },

  async getHistory(currentUserId, partnerId, limit = 100) {
    if (isMongoConnected()) {
      return Message.find({
        $or: [
          { sender: currentUserId, receiver: partnerId },
          { sender: partnerId, receiver: currentUserId },
        ],
      })
        .sort({ timestamp: 1 })
        .populate('sender', 'username email avatar')
        .populate('receiver', 'username email avatar')
        .limit(limit);
    }
    return memoryStore.getMessageHistory(currentUserId, partnerId, limit);
  },

  async getConversations(currentUserId) {
    if (isMongoConnected()) {
      const cId = new mongoose.Types.ObjectId(currentUserId);
      return Message.aggregate([
        {
          $match: {
            $or: [{ sender: cId }, { receiver: cId }],
          },
        },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: {
              $cond: {
                if: { $eq: ['$sender', cId] },
                then: '$receiver',
                else: '$sender',
              },
            },
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$receiver', cId] },
                      { $eq: ['$read', false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'partner',
          },
        },
        { $unwind: '$partner' },
        {
          $project: {
            _id: 0,
            partnerId: '$_id',
            partner: {
              id: '$partner._id',
              username: '$partner.username',
              email: '$partner.email',
              avatar: '$partner.avatar',
              lastSeen: '$partner.lastSeen',
              isActive: '$partner.isActive',
            },
            lastMessage: {
              id: '$lastMessage._id',
              sender: '$lastMessage.sender',
              receiver: '$lastMessage.receiver',
              content: '$lastMessage.content',
              timestamp: '$lastMessage.timestamp',
              read: '$lastMessage.read',
            },
            unreadCount: 1,
          },
        },
        { $sort: { 'lastMessage.timestamp': -1 } },
      ]);
    }
    return memoryStore.getConversations(currentUserId);
  },
};
