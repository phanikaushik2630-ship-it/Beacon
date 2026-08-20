import React, { useState } from 'react';
import { Search, X, Smile, Flame, Heart, Sparkles, Coffee, ThumbsUp } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: Smile,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
      '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
      '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖',
      '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯',
      '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔',
      '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
      '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷'
    ],
  },
  {
    name: 'Gestures',
    icon: ThumbsUp,
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪',
      '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '👑'
    ],
  },
  {
    name: 'Hearts & Vibes',
    icon: Heart,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✨', '🌟', '💫', '⚡️', '🔥', '💥', '☄️', '🪐', '🌙', '🌌'
    ],
  },
  {
    name: 'Cosmic & Celestial',
    icon: Sparkles,
    emojis: [
      '🚀', '🛸', '🛰', '🪐', '🌌', '🌠', '☄️', '⭐️', '🌟', '✨',
      '🌙', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '☀️', '🌤',
      '📡', '🔭', '🧭', '🔮', '💎', '🕯', '💡', '🎆', '🎇', '⚡️'
    ],
  },
  {
    name: 'Activity & Food',
    icon: Coffee,
    emojis: [
      '☕️', '🍵', '🧃', '🥤', '🍺', '🍻', '🥂', '🍷', '🍕', '🍔',
      '🍟', '🌮', '🍿', '🍣', '🍩', '🍪', '🎂', '🍰', '🍫', '🍦',
      '🎮', '🕹', '🎧', '🎤', '🎬', '🎨', '🎯', '🎲', '🚀', '🏆'
    ],
  },
];

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCat, setActiveCat] = useState(0);
  const [search, setSearch] = useState('');

  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : EMOJI_CATEGORIES[activeCat].emojis;

  return (
    <div className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-4 z-50 w-72 sm:w-80 bg-zinc-950/95 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-2xl p-3 msg-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="font-playfair italic font-bold text-xs text-white flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5 text-white" />
          <span>Select Emoji</span>
        </span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="my-2 relative flex items-center">
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter emojis…"
          className="w-full bg-zinc-900/80 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 font-sans"
        />
      </div>

      {/* Category Icons */}
      {!search.trim() && (
        <div className="flex items-center justify-between px-1 py-1 mb-2 bg-white/5 rounded-xl border border-white/10">
          {EMOJI_CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            const isActive = activeCat === idx;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCat(idx)}
                title={cat.name}
                className={`p-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-white text-black shadow-sm shadow-white/30 scale-105'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1 custom-scroll">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => onSelect(emoji)}
            className="h-8 w-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/15 hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
