import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All message routes require authentication
router.use(protect);

/* ──────────────────────────────────────────────────
   GET /api/messages/users
   Search / List registered users to start a chat with
────────────────────────────────────────────────── */
router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    const currentUserId = req.user._id;

    const filter = {
      _id: { $ne: currentUserId },
      isActive: true,
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ username: regex }, { email: regex }];
    }

    const users = await User.find(filter)
      .select('username email avatar lastSeen isActive createdAt')
      .sort({ username: 1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (err) {
    console.error('[Messages] Get users error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch user directory.' });
  }
});

/* ──────────────────────────────────────────────────
   GET /api/messages/conversations
   List all 1-to-1 conversation threads for current user
────────────────────────────────────────────────── */
router.get('/conversations', async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user._id);

    // Aggregate to find the latest message per conversation partner
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: currentUserId }, { receiver: currentUserId }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$sender', currentUserId] },
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
                    { $eq: ['$receiver', currentUserId] },
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
      {
        $unwind: '$partner',
      },
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
      {
        $sort: { 'lastMessage.timestamp': -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (err) {
    console.error('[Messages] Get conversations error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch conversations.' });
  }
});

/* ──────────────────────────────────────────────────
   GET /api/messages/:partnerId
   Get message history between current user & partner
────────────────────────────────────────────────── */
router.get('/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const partner = await User.findById(partnerId).select('username email avatar lastSeen isActive');
    if (!partner) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: partnerId },
        { sender: partnerId, receiver: currentUserId },
      ],
    })
      .sort({ timestamp: 1 })
      .populate('sender', 'username email avatar')
      .populate('receiver', 'username email avatar')
      .limit(100);

    // Auto mark received messages as read
    await Message.updateMany(
      { sender: partnerId, receiver: currentUserId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      partner,
      messages,
    });
  } catch (err) {
    console.error('[Messages] Get message thread error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch message history.' });
  }
});

/* ──────────────────────────────────────────────────
   PATCH /api/messages/:partnerId/read
   Mark all messages from partnerId as read
────────────────────────────────────────────────── */
router.patch('/:partnerId/read', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const result = await Message.updateMany(
      { sender: partnerId, receiver: currentUserId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error('[Messages] Mark as read error:', err);
    return res.status(500).json({ success: false, error: 'Could not mark messages as read.' });
  }
});

/* ──────────────────────────────────────────────────
   DELETE /api/messages/item/:messageId
   Delete a single message by ID
────────────────────────────────────────────────── */
router.delete('/item/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ success: false, error: 'Invalid message ID.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    // Only sender or receiver can delete the message
    const isSender = message.sender.toString() === currentUserId.toString();
    const isReceiver = message.receiver.toString() === currentUserId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this message.' });
    }

    await Message.findByIdAndDelete(messageId);

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully.',
      deletedMessageId: messageId,
    });
  } catch (err) {
    console.error('[Messages] Delete message error:', err);
    return res.status(500).json({ success: false, error: 'Could not delete message.' });
  }
});

/* ──────────────────────────────────────────────────
   DELETE /api/messages/thread/:partnerId
   Clear entire conversation thread with a partner
────────────────────────────────────────────────── */
router.delete('/thread/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ success: false, error: 'Invalid partner ID.' });
    }

    const result = await Message.deleteMany({
      $or: [
        { sender: currentUserId, receiver: partnerId },
        { sender: partnerId, receiver: currentUserId },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Conversation history cleared.',
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error('[Messages] Clear thread error:', err);
    return res.status(500).json({ success: false, error: 'Could not clear conversation history.' });
  }
});

export default router;
