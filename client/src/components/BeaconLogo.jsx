import React from 'react';

export default function BeaconLogo({ size = 100, className = '' }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`logo-float ${className}`}
    >
      <defs>
        <linearGradient id="paintSplashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#f472b6" />
          <stop offset="70%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <radialGradient id="paintCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#fbcfe8" />
          <stop offset="70%" stopColor="#ec4899" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer Rotating Dashed Ring */}
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(r - 2, 4)}
        stroke="url(#paintSplashGrad)"
        strokeWidth="1.4"
        strokeDasharray="6 6"
        strokeOpacity="0.85"
        style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'ring-spin 18s linear infinite' }}
      />

      {/* Mid Solid Pure White & Magenta Ring */}
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(r - 14, 4)}
        stroke="#f472b6"
        strokeWidth="1.6"
        strokeOpacity="0.9"
      />

      {/* Inner Reverse Rotating Ring */}
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(r - 26, 4)}
        stroke="#e879f9"
        strokeWidth="1.2"
        strokeDasharray="4 8"
        strokeOpacity="0.75"
        style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'ring-spin-r 10s linear infinite' }}
      />

      {/* Cardinal Precision Ticks */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + (r - 4) * Math.sin(rad);
        const y1 = cy - (r - 4) * Math.cos(rad);
        const x2 = cx + (r - 14) * Math.sin(rad);
        const y2 = cy - (r - 14) * Math.cos(rad);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}

      {/* Signal Arcs */}
      <path
        d={`M ${cx - 18} ${cy} A 18 18 0 0 1 ${cx + 18} ${cy}`}
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - 28} ${cy + 4} A 28 28 0 0 1 ${cx + 28} ${cy + 4}`}
        stroke="#f472b6"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - 10} ${cy} A 10 10 0 0 1 ${cx + 10} ${cy}`}
        stroke="#e879f9"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center Glowing Core */}
      <circle cx={cx} cy={cy} r={10} fill="url(#paintCoreGlow)" />
      <circle cx={cx} cy={cy} r={4.5} fill="#ffffff" filter="drop-shadow(0 0 8px #ec4899)" />
      <circle cx={cx} cy={cy} r={2} fill="#040207" />
    </svg>
  );
}

export function MiniBeaconLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle
        cx="14"
        cy="14"
        r="12"
        stroke="#f472b6"
        strokeWidth="1.2"
        strokeDasharray="5 4"
        style={{ transformOrigin: '14px 14px', animation: 'ring-spin 14s linear infinite' }}
      />
      <circle cx="14" cy="14" r="7" stroke="#e879f9" strokeWidth="1.4" />
      <circle cx="14" cy="14" r="3" fill="#ffffff" filter="drop-shadow(0 0 5px #ec4899)" />
      <circle cx="14" cy="14" r="1.2" fill="#040207" />
    </svg>
  );
}
