import express from 'express';
import { dbUser, dbMessage } from '../services/dbAdapter.js';
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
    const currentUserId = req.user._id || req.user.id;

    const filter = {
      _id: { $ne: currentUserId },
      isActive: true,
    };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ username: regex }, { email: regex }];
    }

    const users = await dbUser.find(filter);

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
    const currentUserId = req.user._id || req.user.id;
    const conversations = await dbMessage.getConversations(currentUserId);

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
    const currentUserId = req.user._id || req.user.id;

    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const partner = await dbUser.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const messages = await dbMessage.getHistory(currentUserId, partnerId, 100);

    // Auto mark received messages as read
    await dbMessage.updateMany(
      { sender: partnerId, receiver: currentUserId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      partner: {
        id: partner._id || partner.id,
        username: partner.username,
        email: partner.email,
        avatar: partner.avatar,
        lastSeen: partner.lastSeen,
        isActive: partner.isActive,
      },
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
    const currentUserId = req.user._id || req.user.id;

    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const result = await dbMessage.updateMany(
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
    const currentUserId = (req.user._id || req.user.id).toString();

    if (!messageId) {
      return res.status(400).json({ success: false, error: 'Invalid message ID.' });
    }

    const message = await dbMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    const senderId = (typeof message.sender === 'object' ? (message.sender._id || message.sender.id) : message.sender).toString();
    const receiverId = (typeof message.receiver === 'object' ? (message.receiver._id || message.receiver.id) : message.receiver).toString();

    if (senderId !== currentUserId && receiverId !== currentUserId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this message.' });
    }

    await dbMessage.findByIdAndDelete(messageId);

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
    const currentUserId = req.user._id || req.user.id;

    if (!partnerId) {
      return res.status(400).json({ success: false, error: 'Invalid partner ID.' });
    }

    const result = await dbMessage.deleteMany({
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
