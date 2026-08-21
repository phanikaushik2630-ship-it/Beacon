import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Wifi,
  WifiOff,
  Search,
  MessageSquarePlus,
  LogOut,
  Check,
  CheckCheck,
  ArrowLeft,
  X,
  Smile,
  Image as ImageIcon,
  Download,
  FileText,
  FileJson,
  Trash2,
  AlertTriangle,
  Palette,
  Shield,
  MoreVertical,
  User,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messageApi } from '../services/api';
import {
  getSocket,
  sendDirectMessage,
  sendDeleteMessage,
  sendClearThread,
  sendTypingStart,
  sendTypingStop,
  markMessagesRead,
  pingServer,
} from '../services/socket';
import Avatar from '../components/Avatar';
import EmojiPicker from '../components/EmojiPicker';
import GifPicker from '../components/GifPicker';

/* ── Wallpaper Themes for WhatsApp-style Chat ── */
const WALLPAPER_THEMES = [
  { id: 'whatsappDark', name: 'WhatsApp Dark', bg: 'wa-chat-bg', color: '#0b141a' },
  { id: 'obsidian', name: 'Obsidian Night', bg: 'bg-[#08030e]', color: '#08030e' },
  { id: 'midnight', name: 'Midnight Slate', bg: 'bg-[#111b21]', color: '#111b21' },
  { id: 'pureBlack', name: 'Pitch Black', bg: 'bg-[#000000]', color: '#000000' },
  { id: 'deepSlate', name: 'Deep Navy', bg: 'bg-[#090d16]', color: '#090d16' },
];

/* ── Helpers ── */
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateDivider = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'TODAY';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'YESTERDAY';
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  }).toUpperCase();
};

const isMediaUrl = (text) => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return (
    (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
    (/\.(gif|jpg|jpeg|png|webp|svg)($|\?)/i.test(trimmed) ||
      trimmed.includes('giphy.com/media') ||
      trimmed.includes('tenor.com') ||
      trimmed.includes('images.unsplash.com'))
  );
};

const isEmojiOnly = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}){1,3}$/u;
  return emojiRegex.test(trimmed);
};

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Conversations & Contacts
  const [conversations, setConversations] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & UI Controls
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Status & Connection
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [latency, setLatency] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());

  // Wallpaper Setting
  const [chatWallpaper, setChatWallpaper] = useState(() => {
    return localStorage.getItem('beacon_chat_wallpaper') || 'whatsappDark';
  });

  const handleSelectWallpaper = (themeId) => {
    setChatWallpaper(themeId);
    localStorage.setItem('beacon_chat_wallpaper', themeId);
  };

  const activeWallpaperObj =
    WALLPAPER_THEMES.find((w) => w.id === chatWallpaper) || WALLPAPER_THEMES[0];

  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activePartnerRef = useRef(activePartner);

  useEffect(() => {
    activePartnerRef.current = activePartner;
  }, [activePartner]);

  // Auto-scroll helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  }, []);

  // Fetch initial conversations and contacts
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const [convRes, usersRes] = await Promise.all([
        messageApi.getConversations(),
        messageApi.getUsers(),
      ]);

      if (convRes.success) {
        setConversations(convRes.conversations || []);
      }
      if (usersRes.success) {
        setAllContacts(usersRes.users || []);
      }
    } catch (err) {
      console.error('[ChatPage] Failed to fetch chat data:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Socket.io Connection & Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (socket.connected) {
      setSocketConnected(true);
    }

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => {
      setSocketConnected(false);
      setLatency(null);
    };

    const handleUsersOnline = (userIds) => {
      setOnlineUserIds(new Set(userIds.map((id) => id.toString())));
    };

    const handleReceiveMessage = (msg) => {
      const senderId = (msg.sender?._id || msg.sender?.id || msg.sender).toString();
      const currentPartnerId = activePartnerRef.current
        ? (activePartnerRef.current._id || activePartnerRef.current.id).toString()
        : null;

      // Update active thread
      if (currentPartnerId && senderId === currentPartnerId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        markMessagesRead(senderId);
        setTimeout(() => scrollToBottom(true), 50);
      }

      // Update sidebar conversation list
      setConversations((prev) => {
        const partnerUser = msg.sender?.username ? msg.sender : msg.receiver;
        const pId = senderId === user?.id ? (msg.receiver?._id || msg.receiver?.id || msg.receiver).toString() : senderId;

        const filtered = prev.filter((c) => c.partnerId.toString() !== pId);
        const existing = prev.find((c) => c.partnerId.toString() === pId);

        const updatedConv = {
          partnerId: pId,
          partner: existing?.partner || partnerUser || { id: pId, username: 'User' },
          lastMessage: {
            id: msg._id,
            sender: senderId,
            receiver: (msg.receiver?._id || msg.receiver?.id || msg.receiver).toString(),
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            read: senderId === user?.id || currentPartnerId === pId,
          },
          unreadCount:
            currentPartnerId === pId || senderId === user?.id
              ? 0
              : (existing?.unreadCount || 0) + 1,
        };

        return [updatedConv, ...filtered];
      });
    };

    const handleMessageDeleted = ({ messageId, partnerId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      setConversations((prev) =>
        prev.map((c) => {
          if (c.partnerId === partnerId && c.lastMessage?.id === messageId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                content: '🚫 This message was deleted',
              },
            };
          }
          return c;
        })
      );
    };

    const handleThreadCleared = ({ partnerId }) => {
      const currentPartnerId = activePartnerRef.current
        ? (activePartnerRef.current._id || activePartnerRef.current.id).toString()
        : null;

      if (currentPartnerId === partnerId) {
        setMessages([]);
      }
      setConversations((prev) => prev.filter((c) => c.partnerId !== partnerId));
    };

    const handleUserTyping = ({ senderId }) => {
      setTypingUsers((prev) => new Set([...prev, senderId.toString()]));
    };

    const handleUserStopTyping = ({ senderId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(senderId.toString());
        return next;
      });
    };

    const handleReadReceipt = ({ readBy }) => {
      const currentPartnerId = activePartnerRef.current
        ? (activePartnerRef.current._id || activePartnerRef.current.id).toString()
        : null;

      if (currentPartnerId === readBy) {
        setMessages((prev) =>
          prev.map((m) => (m.sender === user?.id || m.sender?._id === user?.id ? { ...m, read: true } : m))
        );
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('users:online', handleUsersOnline);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('threadCleared', handleThreadCleared);
    socket.on('user:typing', handleUserTyping);
    socket.on('user:stop_typing', handleUserStopTyping);
    socket.on('messages:read_receipt', handleReadReceipt);

    // Heartbeat latency ping
    const pingInterval = setInterval(async () => {
      if (socket.connected) {
        const lat = await pingServer();
        setLatency(lat);
      }
    }, 10000);

    return () => {
      clearInterval(pingInterval);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('users:online', handleUsersOnline);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('threadCleared', handleThreadCleared);
      socket.off('user:typing', handleUserTyping);
      socket.off('user:stop_typing', handleUserStopTyping);
      socket.off('messages:read_receipt', handleReadReceipt);
    };
  }, [user?.id, scrollToBottom]);

  // Load chat history when selecting a contact
  const handleSelectChat = async (contact) => {
    if (!contact) return;
    const partnerId = (contact._id || contact.id).toString();

    setActivePartner(contact);
    setShowOptionsMenu(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setShowNewChatModal(false);

    try {
      setLoadingMessages(true);
      const res = await messageApi.getMessages(partnerId);
      if (res.success) {
        setMessages(res.messages || []);
        markMessagesRead(partnerId);

        // Reset unread count on selected conversation
        setConversations((prev) =>
          prev.map((c) => (c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c))
        );

        setTimeout(() => scrollToBottom(false), 50);
      }
    } catch (err) {
      console.error('[ChatPage] Failed to fetch message history:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || !activePartner) return;

    const content = input.trim();
    setInput('');
    setShowEmojiPicker(false);
    setShowGifPicker(false);

    const partnerId = (activePartner._id || activePartner.id).toString();
    sendTypingStop(partnerId);

    // Optimistic message
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      sender: {
        _id: user?.id,
        id: user?.id,
        username: user?.username,
        avatar: user?.avatar,
      },
      receiver: {
        _id: partnerId,
        id: partnerId,
        username: activePartner.username,
        avatar: activePartner.avatar,
      },
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 20);

    try {
      const res = await sendDirectMessage(partnerId, content);
      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? res.message : m))
        );

        // Update sidebar preview
        setConversations((prev) => {
          const filtered = prev.filter((c) => c.partnerId !== partnerId);
          return [
            {
              partnerId,
              partner: activePartner,
              lastMessage: {
                id: res.message._id,
                sender: user?.id,
                receiver: partnerId,
                content,
                timestamp: res.message.timestamp || new Date().toISOString(),
                read: false,
              },
              unreadCount: 0,
            },
            ...filtered,
          ];
        });
      }
    } catch (err) {
      console.error('[ChatPage] Message send error:', err);
    }
  };

  // Send GIF
  const handleSendGif = (gifUrl) => {
    if (!gifUrl || !activePartner) return;
    setInput(gifUrl);
    setTimeout(() => {
      const partnerId = (activePartner._id || activePartner.id).toString();
      sendDirectMessage(partnerId, gifUrl).then((res) => {
        if (res.success && res.message) {
          setMessages((prev) => [...prev, res.message]);
          setTimeout(() => scrollToBottom(true), 20);
        }
      });
      setInput('');
      setShowGifPicker(false);
    }, 10);
  };

  // Typing debounce
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!activePartner) return;

    const partnerId = (activePartner._id || activePartner.id).toString();
    sendTypingStart(partnerId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop(partnerId);
    }, 2000);
  };

  // Delete message
  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      const partnerId = activePartner
        ? (activePartner._id || activePartner.id).toString()
        : null;
      await sendDeleteMessage(messageToDelete._id, partnerId);
      setMessages((prev) => prev.filter((m) => m._id !== messageToDelete._id));
      setMessageToDelete(null);
    } catch (err) {
      console.error('[ChatPage] Delete message failed:', err);
    }
  };

  // Clear chat thread
  const confirmClearThread = async () => {
    if (!activePartner) return;
    const partnerId = (activePartner._id || activePartner.id).toString();
    try {
      await sendClearThread(partnerId);
      setMessages([]);
      setConversations((prev) => prev.filter((c) => c.partnerId !== partnerId));
      setShowClearConfirm(false);
      setShowOptionsMenu(false);
    } catch (err) {
      console.error('[ChatPage] Clear thread failed:', err);
    }
  };

  // Export Chat
  const handleExportChat = (format = 'txt') => {
    if (!activePartner || messages.length === 0) return;
    const partnerName = activePartner.username || 'user';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let dataContent = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'json') {
      dataContent = JSON.stringify(
        {
          partner: activePartner,
          exportedAt: new Date().toISOString(),
          totalMessages: messages.length,
          messages,
        },
        null,
        2
      );
      mimeType = 'application/json';
      ext = 'json';
    } else {
      dataContent = messages
        .map((m) => {
          const senderName =
            (m.sender?._id || m.sender?.id || m.sender) === user?.id
              ? user?.username
              : partnerName;
          const time = new Date(m.timestamp).toLocaleString();
          return `[${time}] ${senderName}: ${m.content}`;
        })
        .join('\n');
    }

    const blob = new Blob([dataContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beacon-chat-${partnerName}-${timestamp}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowBackupMenu(false);
    setShowOptionsMenu(false);
  };

  // Filter conversations & contacts for real-time WhatsApp search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.partner?.username?.toLowerCase().includes(query) ||
      c.lastMessage?.content?.toLowerCase().includes(query)
    );
  });

  const activePartnerId = activePartner
    ? (activePartner._id || activePartner.id).toString()
    : null;
  const isPartnerOnline = activePartnerId ? onlineUserIds.has(activePartnerId) : false;
  const isPartnerTyping = activePartnerId ? typingUsers.has(activePartnerId) : false;

  return (
    <div className="h-[100dvh] w-screen flex overflow-hidden bg-[#111b21] text-[#e9edef] select-none font-sans">
      {/* ═══════════════════════════════════════════════════
          LEFT SIDEBAR (WhatsApp Chats List)
      ═══════════════════════════════════════════════════ */}
      <aside
        className={`${
          activePartner ? 'hidden md:flex' : 'flex'
        } w-full md:w-[380px] lg:w-[420px] h-full flex-col bg-[#111b21] border-r border-[#202c33] flex-shrink-0 relative z-20`}
      >
        {/* Sidebar Header */}
        <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222e35]">
          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                username={user?.username || 'You'}
                avatarUrl={user?.avatar}
                size="w-9 h-9"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#202c33] ${
                  socketConnected ? 'bg-[#00a884]' : 'bg-[#ef4444]'
                }`}
              />
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-sm text-[#e9edef] block truncate max-w-[130px]">
                {user?.username || 'You'}
              </span>
              <span className="text-[11px] text-[#8696a0] font-mono">
                {socketConnected
                  ? latency !== null
                    ? `${latency}ms`
                    : 'connected'
                  : 'connecting…'}
              </span>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 text-[#aebac1]">
            {/* New Chat Button */}
            <button
              onClick={() => {
                setNewChatSearch('');
                setShowNewChatModal(true);
              }}
              title="New chat"
              className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </button>

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Log out"
              className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#ef4444] transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* WhatsApp Search Bar */}
        <div className="p-2 bg-[#111b21] border-b border-[#222e35]">
          <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884]">
            <Search className="w-4 h-4 text-[#8696a0] mr-3 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start new chat"
              className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] w-full focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#8696a0] hover:text-[#e9edef] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat List (WhatsApp Style) */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]/50">
          {loadingConversations ? (
            <div className="flex flex-col items-center justify-center h-48 text-[#8696a0] gap-2">
              <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading chats…</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-[#8696a0] flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-[#00a884] mb-3">
                <MessageSquarePlus className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[#e9edef] mb-1">
                {searchQuery ? 'No chats found' : 'No conversations yet'}
              </p>
              <p className="text-xs mb-4">
                {searchQuery
                  ? 'Try searching for another name or keyword'
                  : 'Start a new chat with your contacts'}
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Chat</span>
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected =
                activePartnerId &&
                activePartnerId === (conv.partner?.id || conv.partner?._id || conv.partnerId).toString();
              const isOnline = onlineUserIds.has(conv.partnerId.toString());
              const isTyping = typingUsers.has(conv.partnerId.toString());
              const isMine = conv.lastMessage?.sender === user?.id;

              return (
                <div
                  key={conv.partnerId}
                  onClick={() => handleSelectChat(conv.partner)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#2a3942]'
                      : 'hover:bg-[#202c33]'
                  }`}
                >
                  {/* Contact Avatar with Online Dot */}
                  <div className="relative flex-shrink-0">
                    <Avatar
                      username={conv.partner?.username || 'User'}
                      avatarUrl={conv.partner?.avatar}
                      size="w-12 h-12"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full ring-2 ring-[#111b21]" />
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-[#e9edef] truncate">
                        {conv.partner?.username || 'User'}
                      </h4>
                      <span className="text-[11px] text-[#8696a0] font-mono flex-shrink-0 ml-2">
                        {formatTime(conv.lastMessage?.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-[#8696a0] truncate">
                        {isTyping ? (
                          <span className="text-[#00a884] italic font-medium">
                            typing…
                          </span>
                        ) : (
                          <>
                            {isMine && (
                              <CheckCheck
                                className={`w-3.5 h-3.5 flex-shrink-0 ${
                                  conv.lastMessage?.read
                                    ? 'text-[#53bdeb]'
                                    : 'text-[#8696a0]'
                                }`}
                              />
                            )}
                            <span className="truncate">
                              {conv.lastMessage?.content || 'No messages'}
                            </span>
                          </>
                        )}
                      </div>

                      {conv.unreadCount > 0 && (
                        <span className="ml-2 w-5 h-5 rounded-full bg-[#00a884] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* WhatsApp Mobile Floating Action Button (FAB) */}
        <div className="md:hidden absolute bottom-5 right-5 z-30 pointer-events-auto">
          <button
            onClick={() => {
              setNewChatSearch('');
              setShowNewChatModal(true);
            }}
            className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all ring-4 ring-[#111b21]"
            title="Start New Chat"
          >
            <MessageSquarePlus className="w-6 h-6" />
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          RIGHT MAIN CHAT PANE (Ditto WhatsApp)
      ═══════════════════════════════════════════════════ */}
      <main className="flex-1 h-full flex flex-col relative bg-[#0b141a]">
        {activePartner ? (
          <>
            {/* WhatsApp Chat Header */}
            <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222e35] z-10">
              <div className="flex items-center gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={() => setActivePartner(null)}
                  className="md:hidden p-1.5 -ml-1 text-[#8696a0] hover:text-[#e9edef] rounded-full hover:bg-[#374248]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Partner Avatar */}
                <div className="relative">
                  <Avatar
                    username={activePartner.username}
                    avatarUrl={activePartner.avatar}
                    size="w-10 h-10"
                  />
                  {isPartnerOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] rounded-full ring-2 ring-[#202c33]" />
                  )}
                </div>

                {/* Name & Online Status */}
                <div className="leading-tight">
                  <h3 className="font-semibold text-sm text-[#e9edef]">
                    {activePartner.username}
                  </h3>
                  <span className="text-xs">
                    {isPartnerTyping ? (
                      <span className="text-[#00a884] font-medium">typing…</span>
                    ) : isPartnerOnline ? (
                      <span className="text-[#00a884]">online</span>
                    ) : (
                      <span className="text-[#8696a0]">offline</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons & Menu */}
              <div className="flex items-center gap-1 text-[#aebac1] relative">
                {/* Options Menu Toggle */}
                <button
                  onClick={() => setShowOptionsMenu((prev) => !prev)}
                  className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors"
                  title="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* WhatsApp Options Popover */}
                {showOptionsMenu && (
                  <div className="absolute right-0 top-12 w-56 rounded-xl bg-[#233138] border border-[#2a3942] shadow-2xl py-2 z-50 msg-in">
                    {/* Wallpaper Presets */}
                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8696a0]">
                      Chat Wallpaper
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 px-3 py-1.5 border-b border-[#2a3942] mb-1">
                      {WALLPAPER_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handleSelectWallpaper(theme.id)}
                          title={theme.name}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            chatWallpaper === theme.id
                              ? 'border-[#00a884] scale-110'
                              : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: theme.color }}
                        />
                      ))}
                    </div>

                    {/* Export Chat */}
                    <button
                      onClick={() => handleExportChat('txt')}
                      className="w-full px-4 py-2 text-left text-xs text-[#e9edef] hover:bg-[#182229] flex items-center gap-2.5"
                    >
                      <Download className="w-4 h-4 text-[#00a884]" />
                      <span>Export chat (.txt)</span>
                    </button>

                    <button
                      onClick={() => handleExportChat('json')}
                      className="w-full px-4 py-2 text-left text-xs text-[#e9edef] hover:bg-[#182229] flex items-center gap-2.5"
                    >
                      <FileJson className="w-4 h-4 text-[#00a884]" />
                      <span>Export chat (.json)</span>
                    </button>

                    {/* Clear Chat */}
                    <button
                      onClick={() => {
                        setShowOptionsMenu(false);
                        setShowClearConfirm(true);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-[#ef4444] hover:bg-[#182229] flex items-center gap-2.5 border-t border-[#2a3942] mt-1"
                    >
                      <Trash2 className="w-4 h-4 text-[#ef4444]" />
                      <span>Clear messages</span>
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* WhatsApp Chat Messages Feed */}
            <div
              ref={messageContainerRef}
              className={`flex-1 overflow-y-auto p-4 space-y-3 ${activeWallpaperObj.bg}`}
              style={{
                backgroundColor: activeWallpaperObj.color,
              }}
            >
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-[#8696a0]">
                  <div className="w-7 h-7 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="wa-date-pill px-4 py-1.5 text-xs text-[#8696a0] mb-3">
                    🔒 Messages are end-to-end synced in real-time
                  </div>
                  <p className="text-sm text-[#8696a0]">
                    Send a message or wave 👋 to start chatting with{' '}
                    <span className="text-[#e9edef] font-semibold">
                      {activePartner.username}
                    </span>
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const senderId = (msg.sender?._id || msg.sender?.id || msg.sender).toString();
                  const isMine = senderId === user?.id;
                  const prevMsg = messages[index - 1];
                  const showDateDivider =
                    !prevMsg ||
                    new Date(prevMsg.timestamp).toDateString() !==
                      new Date(msg.timestamp).toDateString();

                  const isGif = isMediaUrl(msg.content);
                  const isLargeEmoji = isEmojiOnly(msg.content);

                  return (
                    <React.Fragment key={msg._id || index}>
                      {/* Date Divider (WhatsApp Pill) */}
                      {showDateDivider && (
                        <div className="flex justify-center my-3">
                          <span className="wa-date-pill px-3 py-1 text-[11px] font-medium tracking-wide">
                            {formatDateDivider(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`flex w-full group ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2 msg-in shadow-md ${
                            isMine
                              ? 'wa-sent-bubble'
                              : 'wa-received-bubble'
                          }`}
                        >
                          {/* Message Content */}
                          {isGif ? (
                            <div className="rounded-lg overflow-hidden my-1 max-w-sm">
                              <img
                                src={msg.content}
                                alt="GIF"
                                className="w-full h-auto max-h-64 object-cover rounded-lg"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <p
                              className={`leading-relaxed break-words ${
                                isLargeEmoji
                                  ? 'text-3xl py-1'
                                  : 'text-sm text-[#e9edef]'
                              }`}
                            >
                              {msg.content}
                            </p>
                          )}

                          {/* Time & Double Checks */}
                          <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 float-right ml-3 select-none">
                            <span className="text-[10px] text-[#8696a0] font-mono">
                              {formatTime(msg.timestamp)}
                            </span>
                            {isMine && (
                              <CheckCheck
                                className={`w-3.5 h-3.5 ${
                                  msg.read
                                    ? 'text-[#53bdeb]'
                                    : 'text-[#8696a0]'
                                }`}
                              />
                            )}
                          </div>

                          {/* Delete Message Button on Hover */}
                          {isMine && (
                            <button
                              onClick={() => setMessageToDelete(msg)}
                              className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#182229] text-[#ef4444] border border-[#2a3942] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* WhatsApp Input Bar */}
            <footer className="bg-[#202c33] px-3 py-2.5 flex items-center gap-2 border-t border-[#222e35] relative z-20">
              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker((prev) => !prev);
                    setShowGifPicker(false);
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    showEmojiPicker
                      ? 'text-[#00a884] bg-[#2a3942]'
                      : 'text-[#8696a0] hover:text-[#e9edef]'
                  }`}
                  title="Emojis"
                >
                  <Smile className="w-6 h-6" />
                </button>

                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setInput((prev) => prev + emoji);
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>

              {/* GIF Picker Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowGifPicker((prev) => !prev);
                    setShowEmojiPicker(false);
                  }}
                  className={`px-2 py-1 rounded-md text-xs font-bold font-mono transition-colors ${
                    showGifPicker
                      ? 'text-[#00a884] bg-[#2a3942]'
                      : 'text-[#8696a0] hover:text-[#e9edef]'
                  }`}
                  title="GIFs"
                >
                  GIF
                </button>

                {showGifPicker && (
                  <GifPicker
                    onSelect={handleSendGif}
                    onClose={() => setShowGifPicker(false)}
                  />
                )}
              </div>

              {/* Text Input Form */}
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type a message"
                  className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                />
              </form>

              {/* WhatsApp Rounded Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 disabled:hover:bg-[#00a884] text-white flex items-center justify-center transition-all flex-shrink-0 shadow-md"
                title="Send message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </footer>
          </>
        ) : (
          /* WhatsApp Empty Splash Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#222e35] text-center border-b-[6px] border-[#00a884]">
            <div className="max-w-md flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-[#111b21] border border-[#2a3942] flex items-center justify-center mb-6 shadow-2xl">
                <Shield className="w-10 h-10 text-[#00a884]" />
              </div>

              <h2 className="text-2xl font-bold text-[#e9edef] mb-2">
                Beacon Web
              </h2>

              <p className="text-sm text-[#8696a0] leading-relaxed mb-6">
                Send and receive messages seamlessly with real-time direct chat,
                read receipts, and instant presence synchronization.
              </p>

              <button
                onClick={() => {
                  setNewChatSearch('');
                  setShowNewChatModal(true);
                }}
                className="px-6 py-3 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-lg hover:scale-105"
              >
                <MessageSquarePlus className="w-5 h-5" />
                <span>Start a New Chat</span>
              </button>

              <div className="mt-12 flex items-center gap-1.5 text-xs text-[#8696a0]">
                <Shield className="w-3.5 h-3.5 text-[#00a884]" />
                <span>End-to-end encrypted feel with persistent storage</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════
          NEW CHAT MODAL (WhatsApp Contacts Picker)
      ═══════════════════════════════════════════════════ */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm msg-in">
          <div className="w-full max-w-md rounded-2xl bg-[#111b21] border border-[#2a3942] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222e35]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-semibold text-base text-[#e9edef]">New Chat</h3>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 text-[#8696a0] hover:text-[#e9edef]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 bg-[#111b21] border-b border-[#222e35]">
              <div className="flex items-center bg-[#202c33] rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-[#8696a0] mr-2 flex-shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder="Search contacts by name or email…"
                  className="bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] w-full focus:outline-none"
                />
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]">
              {allContacts
                .filter((c) => {
                  if ((c._id || c.id) === user?.id) return false;
                  if (!newChatSearch.trim()) return true;
                  const q = newChatSearch.toLowerCase();
                  return (
                    c.username?.toLowerCase().includes(q) ||
                    c.email?.toLowerCase().includes(q)
                  );
                })
                .map((contact) => {
                  const contactId = (contact._id || contact.id).toString();
                  const isOnline = onlineUserIds.has(contactId);

                  return (
                    <div
                      key={contactId}
                      onClick={() => handleSelectChat(contact)}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#202c33] cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <Avatar
                          username={contact.username}
                          avatarUrl={contact.avatar}
                          size="w-11 h-11"
                        />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full ring-2 ring-[#111b21]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-[#e9edef] truncate">
                          {contact.username}
                        </h4>
                        <p className="text-xs text-[#8696a0] truncate">
                          {contact.email || `@${contact.username}`}
                        </p>
                      </div>

                      <span className="text-[11px] text-[#00a884] font-medium font-mono">
                        {isOnline ? 'online' : 'message'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MESSAGE MODAL ── */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm msg-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#111b21] border border-[#2a3942] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#e9edef] mb-2">
              Delete message?
            </h3>
            <p className="text-xs text-[#8696a0] mb-5">
              This message will be removed from this conversation thread in real time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMessageToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#2a3942] bg-[#202c33] text-xs font-semibold text-[#8696a0] hover:text-[#e9edef]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMessage}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-xs font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLEAR THREAD MODAL ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm msg-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#111b21] border border-[#2a3942] p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-[#ef4444]/20 flex items-center justify-center text-[#ef4444] mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#e9edef] mb-2">
              Clear this chat?
            </h3>
            <p className="text-xs text-[#8696a0] mb-5">
              All messages with {activePartner?.username} will be cleared. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#2a3942] bg-[#202c33] text-xs font-semibold text-[#8696a0] hover:text-[#e9edef]"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearThread}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-xs font-semibold text-white"
              >
                Clear Messages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRM MODAL ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm msg-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#111b21] border border-[#2a3942] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#e9edef] mb-2">
              Log out of Beacon?
            </h3>
            <p className="text-xs text-[#8696a0] mb-5">
              You will be returned to the landing page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#2a3942] bg-[#202c33] text-xs font-semibold text-[#8696a0] hover:text-[#e9edef]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-xs font-semibold text-white"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
