import React from 'react';

export default function Avatar({ name, size = 36, avatarUrl = null, className = '' }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User'}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover border border-white/40 flex-shrink-0 ${className}`}
      />
    );
  }

  const initials = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(size * 0.38, 10) }}
      className={`rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-white/30 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm shadow-white/10 select-none ${className}`}
    >
      {initials}
    </div>
  );
}
