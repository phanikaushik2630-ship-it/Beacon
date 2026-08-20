import React, { useMemo } from 'react';

export default function LiveBackground({ opacity = 1 }) {
  // Generate 40 lively floating paint droplets with varied magenta/violet tones
  const droplets = useMemo(() => {
    const dropletColors = ['#f472b6', '#e879f9', '#c084fc', '#fb7185', '#ffffff', '#a855f7'];

    return Array.from({ length: 40 }, (_, i) => {
      const size = Math.random() * 3.5 + 1.2;
      const duration = Math.random() * 12 + 8;
      const delay = Math.random() * 6;
      const color = dropletColors[i % dropletColors.length];

      return {
        id: `droplet-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size,
        duration,
        delay,
        color,
        opacity: Math.random() * 0.7 + 0.3,
      };
    });
  }, []);

  return (
    <div className="paint-bg-container" style={{ opacity }}>
      {/* ── 3D Liquid Paint Explosion Layer (Matches Reference Photo) ── */}
      <div className="paint-splash-layer" />

      {/* ── Ambient Radial Vignette & Depth ── */}
      <div className="paint-vignette" />

      {/* ── Fluid Glowing Magenta & Violet Ambient Orbs ── */}
      <div className="paint-fluid-orb paint-orb-magenta" />
      <div className="paint-fluid-orb paint-orb-violet" />

      {/* ── Floating Liquid Paint Droplets (Lively Fluid Motion) ── */}
      {droplets.map((d) => (
        <div
          key={d.id}
          className="paint-droplet"
          style={{
            left: d.left,
            top: d.top,
            width: `${d.size}px`,
            height: `${d.size}px`,
            backgroundColor: d.color,
            boxShadow: `0 0 10px 2px ${d.color}`,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            opacity: d.opacity,
          }}
        />
      ))}
    </div>
  );
}
