import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Wifi,
  WifiOff,
  Users,
  Search,
  MessageSquare,
  LogOut,
  Sparkles,
  Check,
  CheckCheck,
  UserPlus,
  ArrowLeft,
  X,
  MessageCircle,
  Smile,
  Image as ImageIcon,
  Download,
  FileText,
  FileJson,
  Trash2,
  AlertTriangle,
  Palette,
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
import BeaconLogo, { MiniBeaconLogo } from '../components/BeaconLogo';
import EmojiPicker from '../components/EmojiPicker';
import GifPicker from '../components/GifPicker';

/* ── Wallpaper Themes for Chat ── */
const WALLPAPER_THEMES = [
  { id: 'obsidian', name: 'Obsidian Night', bg: 'bg-[#08030e]', color: '#08030e' },
  { id: 'midnight', name: 'Midnight Violet', bg: 'bg-[#0e0419]', color: '#0e0419' },
  { id: 'pureBlack', name: 'Pitch Black', bg: 'bg-[#000000]', color: '#000000' },
  { id: 'deepSlate', name: 'Deep Slate', bg: 'bg-[#090d16]', color: '#090d16' },
  { id: 'darkWine', name: 'Dark Velvet', bg: 'bg-[#150410]', color: '#150410' },
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
    return 'Today';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
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

  // State
  const [conversations, setConversations] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('conversations');

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [latency, setLatency] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Modals & Popovers
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState(() => {
    return localStorage.getItem('beacon_chat_wallpaper') || 'obsidian';
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

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, scrollToBottom]);

  /* ──────────────────────────────────────────────────
     1. LOAD CONVERSATIONS & DIRECTORY
  ────────────────────────────────────────────────── */
  const loadConversations = useCallback(async () => {
    try {
      const data = await messageApi.getConversations();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('[Chat] Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadDirectory = useCallback(async (query = '') => {
    try {
      const data = await messageApi.getUsers(query);
      if (data.success) {
        setDirectoryUsers(data.users || []);
      }
    } catch (err) {
      console.error('[Chat] Failed to load users:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadDirectory();
  }, [loadConversations, loadDirectory]);

  useEffect(() => {
    loadDirectory(searchQuery.trim());
  }, [searchQuery, loadDirectory]);

  /* ──────────────────────────────────────────────────
     2. SELECT PARTNER & LOAD MESSAGE HISTORY
  ────────────────────────────────────────────────── */
  const selectPartner = async (partner) => {
    const partnerId = partner.id || partner._id || partner.partnerId;
    const partnerObj = {
      id: partnerId,
      username: partner.username || partner.partner?.username,
      email: partner.email || partner.partner?.email,
      avatar: partner.avatar || partner.partner?.avatar,
      lastSeen: partner.lastSeen || partner.partner?.lastSeen,
    };

    setActivePartner(partnerObj);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setShowBackupMenu(false);
    setLoadingMessages(true);

    try {
      const data = await messageApi.getMessageHistory(partnerId);
      if (data.success) {
        setMessages(data.messages || []);
        markMessagesRead(partnerId);

        setConversations((prev) =>
          prev.map((c) =>
            (c.partnerId === partnerId || c.partner?.id === partnerId || c.partner?._id === partnerId)
              ? { ...c, unreadCount: 0 }
              : c
          )
        );
      }
    } catch (err) {
      console.error('[Chat] Failed to load chat history:', err);
    } finally {
      setLoadingMessages(false);
      setTimeout(() => scrollToBottom(false), 50);
    }
  };

  /* ──────────────────────────────────────────────────
     3. SOCKET.IO EVENT HANDLERS
  ────────────────────────────────────────────────── */
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setSocketConnected(true);
      pingServer(({ latency: l }) => setLatency(l));
    };

    const onDisconnect = () => {
      setSocketConnected(false);
      setLatency(null);
    };

    const onUsersOnline = (userIds) => {
      setOnlineUserIds(new Set(userIds || []));
    };

    const onReceiveMessage = (newMsg) => {
      const currentActive = activePartnerRef.current;
      const currentActiveId = currentActive?.id;

      const senderId =
        typeof newMsg.sender === 'object' ? newMsg.sender._id || newMsg.sender.id : newMsg.sender;
      const receiverId =
        typeof newMsg.receiver === 'object'
          ? newMsg.receiver._id || newMsg.receiver.id
          : newMsg.receiver;

      const isCurrentThread =
        currentActiveId && (senderId === currentActiveId || receiverId === currentActiveId);

      if (isCurrentThread) {
        setMessages((prev) => {
          if (prev.some((m) => (m._id || m.id) === (newMsg._id || newMsg.id))) {
            return prev;
          }
          return [...prev, newMsg];
        });

        if (senderId === currentActiveId && senderId !== (user?._id || user?.id)) {
          markMessagesRead(currentActiveId);
        }
      }

      setConversations((prev) => {
        const otherUser =
          senderId === (user?._id || user?.id)
            ? newMsg.receiver
            : newMsg.sender;
        const otherUserId =
          typeof otherUser === 'object' ? otherUser._id || otherUser.id : otherUser;

        const existingIndex = prev.findIndex(
          (c) =>
            c.partnerId === otherUserId ||
            c.partner?.id === otherUserId ||
            c.partner?._id === otherUserId
        );

        const updatedItem = {
          partnerId: otherUserId,
          partner: typeof otherUser === 'object' ? otherUser : { id: otherUserId, username: 'User' },
          lastMessage: {
            id: newMsg._id || newMsg.id,
            content: newMsg.content,
            timestamp: newMsg.timestamp,
            sender: senderId,
            receiver: receiverId,
            read: newMsg.read,
          },
          unreadCount:
            (!isCurrentThread && senderId !== (user?._id || user?.id))
              ? (existingIndex >= 0 ? (prev[existingIndex].unreadCount || 0) + 1 : 1)
              : 0,
        };

        if (existingIndex >= 0) {
          const filtered = prev.filter((_, idx) => idx !== existingIndex);
          return [updatedItem, ...filtered];
        }
        return [updatedItem, ...prev];
      });
    };

    const onMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => (m._id || m.id) !== messageId));
      loadConversations();
    };

    const onThreadCleared = ({ partnerId }) => {
      if (activePartnerRef.current?.id === partnerId) {
        setMessages([]);
      }
      loadConversations();
    };

    const onUserTyping = ({ senderId }) => {
      setTypingUsers((prev) => new Set(prev).add(senderId));
    };

    const onUserStopTyping = ({ senderId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(senderId);
        return next;
      });
    };

    const onReadReceipt = ({ readBy }) => {
      if (activePartnerRef.current?.id === readBy) {
        setMessages((prev) =>
          prev.map((m) => {
            const senderId =
              typeof m.sender === 'object' ? m.sender._id || m.sender.id : m.sender;
            return senderId === (user?._id || user?.id) ? { ...m, read: true } : m;
          })
        );
      }
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('users:online', onUsersOnline);
    socket.on('receiveMessage', onReceiveMessage);
    socket.on('messageDeleted', onMessageDeleted);
    socket.on('threadCleared', onThreadCleared);
    socket.on('user:typing', onUserTyping);
    socket.on('user:stop_typing', onUserStopTyping);
    socket.on('messages:read_receipt', onReadReceipt);

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        pingServer(({ latency: l }) => setLatency(l));
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('users:online', onUsersOnline);
      socket.off('receiveMessage', onReceiveMessage);
      socket.off('messageDeleted', onMessageDeleted);
      socket.off('threadCleared', onThreadCleared);
      socket.off('user:typing', onUserTyping);
      socket.off('user:stop_typing', onUserStopTyping);
      socket.off('messages:read_receipt', onReadReceipt);
    };
  }, [user, loadConversations]);

  /* ──────────────────────────────────────────────────
     4. SEND / DELETE MESSAGE ACTIONS
  ────────────────────────────────────────────────── */
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || !activePartner) return;

    const messageContent = input.trim();
    setInput('');
    setShowEmojiPicker(false);
    setShowGifPicker(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStop(activePartner.id);

    sendDirectMessage(
      {
        receiverId: activePartner.id,
        content: messageContent,
      },
      (res) => {
        if (!res?.success) {
          console.error('[Chat] Failed to send message:', res?.error);
        }
      }
    );
  };

  const handleSelectEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSelectGif = (gifUrl) => {
    if (!activePartner) return;

    setShowGifPicker(false);
    setShowEmojiPicker(false);

    sendDirectMessage(
      {
        receiverId: activePartner.id,
        content: gifUrl,
      },
      (res) => {
        if (!res?.success) {
          console.error('[Chat] Failed to send GIF:', res?.error);
        }
      }
    );
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !activePartner) return;

    const msgId = messageToDelete._id || messageToDelete.id;
    setMessageToDelete(null);

    sendDeleteMessage({ messageId: msgId, partnerId: activePartner.id });

    try {
      await messageApi.deleteMessage(msgId);
    } catch (err) {
      console.warn('[Chat] Delete fallback:', err.message);
    }

    setMessages((prev) => prev.filter((m) => (m._id || m.id) !== msgId));
  };

  const confirmClearThread = async () => {
    if (!activePartner) return;

    setShowClearConfirm(false);
    setShowBackupMenu(false);

    sendClearThread({ partnerId: activePartner.id });

    try {
      await messageApi.clearThread(activePartner.id);
    } catch (err) {
      console.warn('[Chat] Clear thread fallback:', err.message);
    }

    setMessages([]);
    loadConversations();
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!activePartner) return;

    sendTypingStart(activePartner.id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop(activePartner.id);
    }, 2000);
  };

  /* ──────────────────────────────────────────────────
     5. BACKUP / EXPORT CHAT HANDLER
  ────────────────────────────────────────────────── */
  const handleExportChat = (format = 'txt') => {
    if (!activePartner || messages.length === 0) return;

    setShowBackupMenu(false);

    const partnerName = activePartner.username || 'user';
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'json') {
      const dataStr = JSON.stringify(
        {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          participants: {
            user: { username: user?.username, email: user?.email },
            partner: { username: activePartner.username, email: activePartner.email },
          },
          totalMessages: messages.length,
          messages: messages.map((m) => {
            const isMe =
              (typeof m.sender === 'object' ? m.sender._id || m.sender.id : m.sender) ===
              (user?._id || user?.id);
            return {
              id: m._id || m.id,
              sender: isMe ? user?.username : activePartner.username,
              timestamp: m.timestamp,
              content: m.content,
              read: m.read,
            };
          }),
        },
        null,
        2
      );

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beacon-backup-${partnerName}-${timestampStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      let textContent = `==========================================================\n`;
      textContent += `  BEACON CHAT BACKUP\n`;
      textContent += `  Participants: @${user?.username} & @${activePartner.username}\n`;
      textContent += `  Export Date:  ${new Date().toLocaleString()}\n`;
      textContent += `  Total Messages: ${messages.length}\n`;
      textContent += `==========================================================\n\n`;

      messages.forEach((m) => {
        const isMe =
          (typeof m.sender === 'object' ? m.sender._id || m.sender.id : m.sender) ===
          (user?._id || user?.id);
        const senderName = isMe ? `@${user?.username}` : `@${activePartner.username}`;
        const time = new Date(m.timestamp).toLocaleString();
        textContent += `[${time}] ${senderName}:\n${m.content}\n\n`;
      });

      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beacon-transcript-${partnerName}-${timestampStr}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPartnerOnline = activePartner && onlineUserIds.has(activePartner.id);
  const isPartnerTyping = activePartner && typingUsers.has(activePartner.id);

  return (
    <div
      className={`h-screen ${activeWallpaperObj.bg} flex overflow-hidden relative text-white select-none transition-colors duration-300`}
      style={{ backgroundColor: activeWallpaperObj.color }}
    >
      {/* ══════════════════════════════════════════════════
          SIDEBAR: CONVERSATIONS & DIRECTORY
      ══════════════════════════════════════════════════ */}
      <aside
        className={`sidebar-panel relative z-20 w-full md:w-80 lg:w-96 flex flex-col flex-shrink-0 transition-all ${
          activePartner ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-pink-500/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MiniBeaconLogo size={28} />
            <span className="font-cinzel font-bold text-2xl tracking-wider beacon-name-glow">
              Beacon
            </span>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono ${
                socketConnected
                  ? 'border-pink-500/40 text-pink-200 bg-pink-500/15 shadow-sm shadow-pink-500/20'
                  : 'border-zinc-800 text-zinc-500'
              }`}
            >
              {socketConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-pink-400" />
                  <span>{latency ? `${latency}ms` : 'ONLINE'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-zinc-500" />
                  <span>OFFLINE</span>
                </>
              )}
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign Out"
              className="text-pink-300/60 hover:text-white p-1.5 rounded-lg hover:bg-pink-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-pink-500/15">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-pink-300/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user or email…"
              className="join-input w-full rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-pink-300/30 font-sans focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-pink-300/40 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-pink-500/15 px-4 pt-2">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 py-2 text-xs font-bold font-syne flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'conversations'
                ? 'border-pink-400 text-white shadow-sm shadow-pink-500/30'
                : 'border-transparent text-pink-300/50 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Messages ({conversations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-2 text-xs font-bold font-syne flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'directory'
                ? 'border-pink-400 text-white shadow-sm shadow-pink-500/30'
                : 'border-transparent text-pink-300/50 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Users ({directoryUsers.length})</span>
          </button>
        </div>

        {/* ── CONVERSATIONS LIST ── */}
        {activeTab === 'conversations' && (
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
            {loadingConversations ? (
              <div className="text-center py-10 text-xs text-pink-200/50 font-syne">
                Loading conversations…
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-6">
                <MessageCircle className="w-8 h-8 text-pink-400/40 mx-auto mb-3" />
                <p className="font-bold text-sm text-white mb-1 font-syne">No active conversations</p>
                <p className="text-xs text-pink-200/50 mb-4 font-syne">
                  Find a user in the directory to start a direct message.
                </p>
                <button
                  onClick={() => setActiveTab('directory')}
                  className="white-btn px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Browse Directory</span>
                </button>
              </div>
            ) : (
              conversations.map((conv) => {
                const partnerId = conv.partnerId || conv.partner?.id || conv.partner?._id;
                const isSelected = activePartner?.id === partnerId;
                const isOnline = onlineUserIds.has(partnerId);
                const isTyping = typingUsers.has(partnerId);
                const isSender = conv.lastMessage?.sender === (user?._id || user?.id);

                return (
                  <button
                    key={partnerId}
                    onClick={() => selectPartner(conv.partner || { id: partnerId })}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-pink-600/20 border border-pink-400/40 shadow-md shadow-pink-500/20'
                        : 'hover:bg-pink-500/[0.08] border border-transparent'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        name={conv.partner?.username}
                        avatarUrl={conv.partner?.avatar}
                        size={42}
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#040207] ${
                          isOnline ? 'bg-pink-400 status-online' : 'bg-zinc-700'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-bold text-sm text-white truncate font-syne">
                          {conv.partner?.username || 'User'}
                        </p>
                        <span className="text-[10px] text-pink-300/60 font-mono ml-2 flex-shrink-0">
                          {formatTime(conv.lastMessage?.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-pink-200/70 truncate font-sans">
                          {isTyping ? (
                            <span className="text-pink-300 italic font-medium">typing…</span>
                          ) : (
                            <>
                              {isSender && <span className="text-pink-300/80 mr-1">You:</span>}
                              {isMediaUrl(conv.lastMessage?.content)
                                ? '🎬 Animated GIF / Image'
                                : conv.lastMessage?.content || 'Started conversation'}
                            </>
                          )}
                        </p>

                        {conv.unreadCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-bold text-[10px] font-mono shadow-sm shadow-pink-400/50 flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ── DIRECTORY LIST ── */}
        {activeTab === 'directory' && (
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
            <div className="px-3 py-1 flex items-center justify-between text-[11px] text-pink-300/60 font-mono uppercase tracking-wider">
              <span>Directory</span>
              <span>{directoryUsers.length}</span>
            </div>

            {directoryUsers.length === 0 ? (
              <div className="text-center py-10 text-xs text-pink-200/50 font-syne">
                {searchQuery ? 'No user matches that query.' : 'No other users registered.'}
              </div>
            ) : (
              directoryUsers.map((pilot) => {
                const pilotId = pilot.id || pilot._id;
                const isOnline = onlineUserIds.has(pilotId);
                const isSelected = activePartner?.id === pilotId;

                return (
                  <button
                    key={pilotId}
                    onClick={() => selectPartner(pilot)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-pink-600/20 border border-pink-400/40 shadow-md shadow-pink-500/20'
                        : 'hover:bg-pink-500/[0.08] border border-transparent'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar name={pilot.username} avatarUrl={pilot.avatar} size={40} />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#040207] ${
                          isOnline ? 'bg-pink-400 status-online' : 'bg-zinc-700'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate font-syne">
                        {pilot.username}
                      </p>
                      <p className="text-[11px] text-pink-300/60 font-mono truncate">
                        {pilot.email}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                          isOnline
                            ? 'border-pink-400/40 text-pink-300 bg-pink-500/10'
                            : 'border-zinc-800 text-zinc-500'
                        }`}
                      >
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Current User Card */}
        <div className="p-4 border-t border-pink-500/15 bg-[#0a0312]/80">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Avatar name={user?.username} avatarUrl={user?.avatar} size={38} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#040207] bg-pink-400 status-online" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate leading-tight font-syne">
                {user?.username}
              </p>
              <p className="text-[11px] text-pink-300/60 font-mono truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          MAIN MESSAGE THREAD PANE WITH BEACON IN THE MIDDLE
      ══════════════════════════════════════════════════ */}
      <main
        className={`flex-1 flex flex-col min-w-0 relative z-20 transition-all ${
          !activePartner ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activePartner ? (
          <>
            {/* Top Bar with "Beacon" in the exact Middle */}
            <header className="chat-topbar px-4 sm:px-6 py-3.5 flex items-center justify-between flex-shrink-0 relative">
              {/* Left: Active Partner Info */}
              <div className="flex items-center gap-3 min-w-0 z-10">
                <button
                  onClick={() => setActivePartner(null)}
                  className="md:hidden text-pink-200 hover:text-white p-1 -ml-1 flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative flex-shrink-0">
                  <Avatar
                    name={activePartner.username}
                    avatarUrl={activePartner.avatar}
                    size={38}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#040207] ${
                      isPartnerOnline ? 'bg-pink-400 status-online' : 'bg-zinc-700'
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="font-bold text-base sm:text-lg text-white leading-tight truncate font-syne">
                    {activePartner.username}
                  </h2>
                  <p className="text-[11px] font-mono flex items-center gap-1.5 text-pink-300/70 truncate">
                    {isPartnerTyping ? (
                      <span className="text-pink-300 italic animate-pulse">typing…</span>
                    ) : isPartnerOnline ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                        <span className="text-pink-300">Online</span>
                      </>
                    ) : (
                      <span className="text-zinc-500">Offline</span>
                    )}
                  </p>
                </div>
              </div>

              {/* ── BEACON NAME IN THE MIDDLE ── */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 pointer-events-none z-0">
                <MiniBeaconLogo size={24} />
                <span className="font-cinzel font-black text-xl tracking-widest beacon-hero-font">
                  Beacon
                </span>
              </div>

              {/* Right: Options & Backup */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono text-pink-200/70 flex-shrink-0 relative z-10">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBackupMenu((prev) => !prev)}
                    title="Options & Backup"
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono transition-all ${
                      showBackupMenu
                        ? 'bg-pink-600 text-white border-pink-400 shadow-sm shadow-pink-500/40'
                        : 'bg-pink-500/10 border-pink-500/30 text-pink-200 hover:text-white hover:bg-pink-500/20'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Options</span>
                  </button>

                  {/* Popover */}
                  {showBackupMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#0e0417]/95 border border-pink-500/30 rounded-2xl shadow-2xl p-2.5 z-50 msg-in backdrop-blur-xl">
                      {/* Wallpaper Color Selector */}
                      <div className="px-2 py-1 text-[10px] font-mono text-pink-300/70 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <Palette className="w-3 h-3 text-pink-400" />
                        <span>Chat Wallpaper Color</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 px-1 mb-2.5">
                        {WALLPAPER_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => handleSelectWallpaper(theme.id)}
                            title={theme.name}
                            className={`h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                              chatWallpaper === theme.id
                                ? 'border-pink-400 ring-2 ring-pink-500/50 scale-105 shadow-sm shadow-pink-500/40'
                                : 'border-white/20 hover:border-pink-400/50'
                            }`}
                            style={{ backgroundColor: theme.color }}
                          >
                            {chatWallpaper === theme.id && (
                              <Check className="w-3 h-3 text-pink-400" />
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="my-1 border-t border-pink-500/20" />

                      <div className="px-2 py-1 text-[10px] font-mono text-pink-300/60 uppercase tracking-wider mb-1">
                        Export & Options
                      </div>
                      <button
                        onClick={() => handleExportChat('txt')}
                        disabled={messages.length === 0}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-mono text-pink-100 hover:text-white hover:bg-pink-500/20 transition-colors disabled:opacity-30"
                      >
                        <FileText className="w-4 h-4 text-pink-400" />
                        <div className="flex flex-col">
                          <span>Text Transcript</span>
                          <span className="text-[10px] text-pink-300/50">.txt readable log</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleExportChat('json')}
                        disabled={messages.length === 0}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-mono text-pink-100 hover:text-white hover:bg-pink-500/20 transition-colors disabled:opacity-30"
                      >
                        <FileJson className="w-4 h-4 text-purple-400" />
                        <div className="flex flex-col">
                          <span>Full Data Backup</span>
                          <span className="text-[10px] text-pink-300/50">.json raw structure</span>
                        </div>
                      </button>

                      <div className="my-1 border-t border-pink-500/20" />

                      <button
                        onClick={() => {
                          setShowBackupMenu(false);
                          setShowClearConfirm(true);
                        }}
                        disabled={messages.length === 0}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                        <div className="flex flex-col">
                          <span>Clear Chat History</span>
                          <span className="text-[10px] text-red-400/60">Delete all messages</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-pink-500/25 bg-pink-500/10 text-pink-200">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>DIRECT</span>
                </div>
              </div>
            </header>

            {/* Messages Feed */}
            <div
              ref={messageContainerRef}
              className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4"
            >
              {loadingMessages ? (
                <div className="text-center py-16 text-xs text-pink-200/50 font-syne flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
                  <span>Loading messages…</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-400/30 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-7 h-7 text-pink-300" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1 font-syne">
                    Direct conversation with @{activePartner.username}
                  </h3>
                  <p className="text-xs text-pink-200/60 font-syne max-w-sm mx-auto">
                    Say hello with text, emojis 🙂, or animated GIFs 🎬!
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const senderId =
                    typeof msg.sender === 'object' ? msg.sender._id || msg.sender.id : msg.sender;
                  const isMe = senderId === (user?._id || user?.id);
                  const isMedia = isMediaUrl(msg.content);
                  const isJumbo = !isMedia && isEmojiOnly(msg.content);

                  const prevMsg = messages[index - 1];
                  const showDateDivider =
                    !prevMsg ||
                    new Date(prevMsg.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();

                  return (
                    <React.Fragment key={msg._id || msg.id || index}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-4">
                          <div className="px-3.5 py-1 rounded-full border border-pink-500/25 bg-[#150724]/90 text-[11px] font-syne font-bold text-pink-200 shadow-md">
                            {formatDateDivider(msg.timestamp)}
                          </div>
                        </div>
                      )}

                      <div
                        className={`group/msg flex items-end gap-2.5 msg-in ${
                          isMe ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {!isMe && (
                          <Avatar
                            name={activePartner.username}
                            avatarUrl={activePartner.avatar}
                            size={32}
                            className="mb-1"
                          />
                        )}

                        <div
                          className={`flex flex-col max-w-[82%] sm:max-w-[65%] ${
                            isMe ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 group/bubble">
                            {isMe && (
                              <button
                                type="button"
                                onClick={() => setMessageToDelete(msg)}
                                title="Delete message"
                                className="opacity-0 group-hover/msg:opacity-100 text-pink-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-pink-500/10 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Media Bubble */}
                            {isMedia ? (
                              <div
                                className={`rounded-2xl overflow-hidden border p-1 shadow-lg ${
                                  isMe
                                    ? 'bg-gradient-to-br from-pink-500/40 to-purple-600/30 border-pink-400 rounded-br-none shadow-[0_4px_24px_rgba(236,72,153,0.4)]'
                                    : 'bg-[#140624]/90 border-pink-500/30 rounded-bl-none'
                                }`}
                              >
                                <img
                                  src={msg.content}
                                  alt="Shared media"
                                  className="rounded-xl max-w-full sm:max-w-xs max-h-64 object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : isJumbo ? (
                              /* Jumbo Emojis */
                              <div className="text-4xl sm:text-5xl py-1 select-text">
                                {msg.content}
                              </div>
                            ) : (
                              /* Standard Message Bubble (Liquid Magenta Gradient for sent, Frosted Obsidian for received) */
                              <div
                                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                                  isMe
                                    ? 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 text-white font-medium rounded-br-none shadow-[0_4px_22px_rgba(217,70,239,0.45)] border border-pink-400/40'
                                    : 'bg-[#140624]/90 border border-pink-500/25 text-pink-50 rounded-bl-none shadow-sm'
                                }`}
                              >
                                {msg.content}
                              </div>
                            )}

                            {!isMe && (
                              <button
                                type="button"
                                onClick={() => setMessageToDelete(msg)}
                                title="Delete message"
                                className="opacity-0 group-hover/msg:opacity-100 text-pink-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-pink-500/10 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Timestamp & Read Receipt */}
                          <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-pink-300/60 font-mono">
                            <span>{formatTime(msg.timestamp)}</span>
                            {isMe && (
                              msg.read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-pink-300" title="Read" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-pink-400/60" title="Delivered" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="chat-input-bar relative z-20 px-4 sm:px-8 py-3.5 flex-shrink-0">
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={handleSelectEmoji}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              {showGifPicker && (
                <GifPicker
                  onSelect={handleSelectGif}
                  onClose={() => setShowGifPicker(false)}
                />
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker((prev) => !prev);
                    setShowGifPicker(false);
                  }}
                  title="Insert emoji"
                  className={`p-2.5 rounded-xl border transition-all ${
                    showEmojiPicker
                      ? 'bg-pink-600 text-white border-pink-400 shadow-sm shadow-pink-500/40'
                      : 'bg-pink-500/10 border-pink-500/25 text-pink-300 hover:text-white hover:bg-pink-500/20'
                  }`}
                >
                  <Smile className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowGifPicker((prev) => !prev);
                    setShowEmojiPicker(false);
                  }}
                  title="Send animated GIF"
                  className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                    showGifPicker
                      ? 'bg-pink-600 text-white border-pink-400 shadow-sm shadow-pink-500/40'
                      : 'bg-pink-500/10 border-pink-500/25 text-pink-300 hover:text-white hover:bg-pink-500/20'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">GIF</span>
                </button>

                <div className="flex-1 flex items-center gap-2 join-input rounded-xl px-4 py-2.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder={`Type a message to @${activePartner.username}…`}
                    className="flex-1 bg-transparent text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="h-10 w-10 flex-shrink-0 white-btn rounded-xl flex items-center justify-center text-pink-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-transform hover:scale-105"
                >
                  <Send className="w-4 h-4 text-pink-600" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* ── Empty State ── */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
            <BeaconLogo size={110} className="mb-6" />
            <h1 className="beacon-hero-font text-4xl sm:text-5xl text-white mb-2 tracking-widest">
              Beacon
            </h1>
            <p className="text-pink-200/80 text-lg max-w-md mb-6 tracking-wide font-syne">
              Select a conversation from the sidebar or open the User Directory to start messaging.
            </p>
            <button
              onClick={() => setActiveTab('directory')}
              className="white-btn px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-pink-500/30"
            >
              <Users className="w-4 h-4 text-pink-600" />
              <span>Browse User Directory</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Single Message Delete Modal ── */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md msg-in">
          <div className="join-card w-full max-w-sm rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2 font-syne">
              Delete this message?
            </h3>
            <p className="text-xs text-pink-200/70 font-sans mb-6 line-clamp-2 bg-[#150724]/90 p-2 rounded-lg border border-pink-500/20">
              "{messageToDelete.content}"
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-pink-500/30 bg-pink-500/10 text-xs font-mono text-pink-200 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessage}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono text-white font-bold transition-colors shadow-lg shadow-red-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Entire Thread Modal ── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md msg-in">
          <div className="join-card w-full max-w-sm rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-bold text-lg text-white mb-2 font-syne">
              Clear entire conversation?
            </h3>
            <p className="text-xs text-pink-200/70 font-sans mb-6">
              This will permanently delete all {messages.length} messages with @{activePartner?.username} for both users.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-pink-500/30 bg-pink-500/10 text-xs font-mono text-pink-200 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearThread}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-mono text-white font-bold transition-colors shadow-lg shadow-red-600/30"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Modal ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md msg-in">
          <div className="join-card w-full max-w-sm rounded-2xl p-6 text-center">
            <h3 className="font-bold text-xl text-white mb-2 font-syne">
              Sign out of Beacon?
            </h3>
            <p className="text-xs text-pink-200/60 font-syne mb-6">
              You will need to sign in again to access your messages.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-pink-500/30 bg-pink-500/10 text-sm font-syne text-pink-200 hover:text-white hover:bg-pink-500/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-syne text-white font-bold transition-colors shadow-lg shadow-red-600/30"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
