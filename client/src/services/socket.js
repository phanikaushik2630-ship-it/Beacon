import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

let socket = null;

/**
 * Initialize and get the authenticated Socket.io client instance
 * @returns {Socket}
 */
export const getSocket = () => {
  const token = localStorage.getItem('beacon_token');

  if (!socket || (token && !socket.auth?.token)) {
    if (socket) {
      socket.disconnect();
    }

    socket = io(SERVER_URL, {
      autoConnect: true,
      auth: {
        token: token || '',
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket.io] Authenticated connection established with ID:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.io] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.io] Disconnected:', reason);
    });
  }

  return socket;
};

/**
 * Send 1-to-1 direct message
 * @param {Object} payload { receiverId, content }
 * @param {Function} callback
 */
export const sendDirectMessage = ({ receiverId, content }, callback) => {
  const s = getSocket();
  s.emit('sendMessage', { receiverId, content }, callback);
};

/**
 * Delete a message in real-time
 * @param {Object} payload { messageId, partnerId }
 * @param {Function} callback
 */
export const sendDeleteMessage = ({ messageId, partnerId }, callback) => {
  const s = getSocket();
  s.emit('deleteMessage', { messageId, partnerId }, callback);
};

/**
 * Clear entire conversation thread in real-time
 * @param {Object} payload { partnerId }
 * @param {Function} callback
 */
export const sendClearThread = ({ partnerId }, callback) => {
  const s = getSocket();
  s.emit('clearThread', { partnerId }, callback);
};

/**
 * Emit typing start indicator to partner
 * @param {string} receiverId
 */
export const sendTypingStart = (receiverId) => {
  const s = getSocket();
  s.emit('typing:start', { receiverId });
};

/**
 * Emit typing stop indicator to partner
 * @param {string} receiverId
 */
export const sendTypingStop = (receiverId) => {
  const s = getSocket();
  s.emit('typing:stop', { receiverId });
};

/**
 * Emit mark as read event
 * @param {string} partnerId
 */
export const markMessagesRead = (partnerId) => {
  const s = getSocket();
  s.emit('messages:read', { partnerId });
};

/**
 * Send ping check to test real-time latency
 * @param {Function} callback
 */
export const pingServer = (callback) => {
  const s = getSocket();
  const start = Date.now();
  s.emit('ping_check', { clientTime: start }, (data) => {
    const latency = Date.now() - start;
    if (callback) callback({ latency, serverTime: data?.receivedAt });
  });
};

/**
 * Disconnect socket cleanly
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
