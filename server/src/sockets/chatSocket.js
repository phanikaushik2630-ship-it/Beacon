import { dbUser, dbMessage } from '../services/dbAdapter.js';
import { socketAuth } from '../middleware/auth.js';

/**
 * Socket.io 1-to-1 chat handler module
 * Handles direct messaging, message deletion, presence, and typing indicators.
 */
export const registerChatSocketHandlers = (io) => {
  io.use(socketAuth);

  const onlineUsers = new Map();
  const getOnlineUserIds = () => Array.from(onlineUsers.keys());

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user ? (user._id || user.id).toString() : null;

    if (userId) {
      socket.join(userId);

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      dbUser.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
      io.emit('users:online', getOnlineUserIds());
    }

    // Ping check
    socket.on('ping_check', (data, callback) => {
      const payload = { receivedAt: Date.now(), ...data };
      if (typeof callback === 'function') callback(payload);
      else socket.emit('pong_check', payload);
    });

    // Send 1-to-1 direct message
    socket.on('sendMessage', async (data, callback) => {
      try {
        if (!user) {
          const errResponse = { success: false, error: 'Authentication required.' };
          if (typeof callback === 'function') callback(errResponse);
          return socket.emit('error:message', errResponse);
        }

        const receiverId = (data.receiverId || data.receiver)?.toString();
        const content = data.content || data.message;

        if (!receiverId) {
          const errResponse = { success: false, error: 'Invalid recipient ID.' };
          if (typeof callback === 'function') callback(errResponse);
          return socket.emit('error:message', errResponse);
        }

        if (!content || !content.trim()) {
          const errResponse = { success: false, error: 'Message cannot be empty.' };
          if (typeof callback === 'function') callback(errResponse);
          return socket.emit('error:message', errResponse);
        }

        const populatedMessage = await dbMessage.create({
          sender: user._id || user.id,
          receiver: receiverId,
          content: content.trim(),
          timestamp: new Date(),
        });

        io.to(receiverId).emit('receiveMessage', populatedMessage);
        io.to(userId).emit('receiveMessage', populatedMessage);

        if (typeof callback === 'function') {
          callback({ success: true, message: populatedMessage });
        }
      } catch (err) {
        console.error('[Socket.io] Error sending message:', err);
        const errResponse = { success: false, error: 'Failed to send message.' };
        if (typeof callback === 'function') callback(errResponse);
        socket.emit('error:message', errResponse);
      }
    });

    // Delete single message in real time
    socket.on('deleteMessage', async ({ messageId, partnerId }, callback) => {
      try {
        if (!user || !messageId) return;

        const msg = await dbMessage.findById(messageId);
        if (msg) {
          const senderId = (typeof msg.sender === 'object' ? (msg.sender._id || msg.sender.id) : msg.sender).toString();
          const receiverId = (typeof msg.receiver === 'object' ? (msg.receiver._id || msg.receiver.id) : msg.receiver).toString();

          // Authorize deletion
          if (senderId === userId || receiverId === userId) {
            await dbMessage.findByIdAndDelete(messageId);

            const payload = { messageId, partnerId, deletedBy: userId };
            if (partnerId) io.to(partnerId.toString()).emit('messageDeleted', payload);
            io.to(userId).emit('messageDeleted', payload);

            if (typeof callback === 'function') callback({ success: true, messageId });
          }
        }
      } catch (err) {
        console.error('[Socket.io] Error deleting message:', err);
      }
    });

    // Clear whole conversation thread in real time
    socket.on('clearThread', async ({ partnerId }, callback) => {
      try {
        if (!user || !partnerId) return;

        await dbMessage.deleteMany({
          $or: [
            { sender: user._id || user.id, receiver: partnerId },
            { sender: partnerId, receiver: user._id || user.id },
          ],
        });

        const payload = { partnerId, clearedBy: userId };
        io.to(partnerId.toString()).emit('threadCleared', payload);
        io.to(userId).emit('threadCleared', payload);

        if (typeof callback === 'function') callback({ success: true, partnerId });
      } catch (err) {
        console.error('[Socket.io] Error clearing thread:', err);
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ receiverId }) => {
      if (user && receiverId) {
        io.to(receiverId.toString()).emit('user:typing', {
          senderId: userId,
          username: user.username,
        });
      }
    });

    socket.on('typing:stop', ({ receiverId }) => {
      if (user && receiverId) {
        io.to(receiverId.toString()).emit('user:stop_typing', {
          senderId: userId,
          username: user.username,
        });
      }
    });

    // Read receipts
    socket.on('messages:read', async ({ partnerId }) => {
      try {
        if (!user || !partnerId) return;
        await dbMessage.updateMany(
          { sender: partnerId, receiver: user._id || user.id, read: false },
          { $set: { read: true, readAt: new Date() } }
        );
        io.to(partnerId.toString()).emit('messages:read_receipt', {
          readBy: userId,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[Socket.io] Read receipt error:', err.message);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (userId && onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          dbUser.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
          io.emit('users:online', getOnlineUserIds());
        }
      }
    });
  });
};
