import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, MessageSquare, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LiveBackground from '../components/LiveBackground';
import BeaconLogo, { MiniBeaconLogo } from '../components/BeaconLogo';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#040207] flex flex-col relative overflow-hidden text-white select-none">
      {/* Dynamic Paint Splash Background */}
      <LiveBackground />

      {/* ── Top Navigation ── */}
      <header className="relative z-20 flex items-center justify-between px-8 sm:px-14 py-6 border-b border-pink-500/15">
        <div className="flex items-center gap-3">
          <MiniBeaconLogo size={28} />
          <span className="font-cinzel font-bold text-2xl tracking-wider beacon-name-glow">
            Beacon
          </span>
        </div>

        <nav className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/chat"
              className="white-btn px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <span>Open Chat (@{user?.username})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs sm:text-sm font-semibold text-pink-200/80 hover:text-white px-4 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="white-btn px-5 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Main Content (Centered) ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-16 pt-4 text-center">
        {/* Emblem */}
        <div className="mb-6 title-reveal title-reveal-d1">
          <BeaconLogo size={120} />
        </div>

        {/* Tagline */}
        <div className="flex items-center gap-2 mb-3 title-reveal title-reveal-d2 mx-auto">
          <span className="w-6 h-[2px] bg-pink-500 rounded-full" />
          <span className="text-pink-400 font-syne font-semibold text-xs tracking-wider uppercase">
            Real-Time Messaging
          </span>
        </div>

        {/* Centered Brand Title */}
        <h1
          className="beacon-hero-font text-[clamp(68px,14vw,144px)] leading-none text-center tracking-wider mb-2 title-reveal title-reveal-d2 select-none"
        >
          Beacon
        </h1>

        {/* Underline */}
        <div
          className="w-56 h-[3px] rounded-full mb-6 title-reveal title-reveal-d3 mx-auto"
          style={{
            background: 'linear-gradient(90deg, transparent, #f472b6, #ffffff, #d946ef, transparent)',
            boxShadow: '0 0 24px 6px rgba(236,72,153,0.85), 0 0 50px 12px rgba(217,70,239,0.5)',
          }}
        />

        {/* Subtitle */}
        <p className="text-pink-100 font-normal text-[clamp(17px,2.2vw,24px)] text-center mb-2 title-reveal title-reveal-d3 max-w-xl leading-relaxed">
          Fast, beautiful, and secure direct messaging designed for everyday conversations.
        </p>

        <p className="text-pink-300/80 text-xs tracking-[0.4em] uppercase mb-10 title-reveal title-reveal-d4 font-mono">
          INSTANT · SECURE · RELIABLE
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md title-reveal title-reveal-d4 mx-auto">
          {isAuthenticated ? (
            <Link
              to="/chat"
              className="white-btn w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-pink-500/30"
            >
              <MessageSquare className="w-5 h-5 text-pink-600" />
              <span>Go to Messages</span>
              <ArrowRight className="w-5 h-5 text-pink-600" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="white-btn flex-1 w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-pink-500/30"
              >
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4 text-pink-600" />
              </Link>
              <Link
                to="/login"
                className="white-outline-btn flex-1 w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2"
              >
                <span>Sign In</span>
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mt-14 title-reveal title-reveal-d4 mx-auto">
          <div className="glass-black rounded-2xl p-5 text-center border border-pink-500/25">
            <Zap className="w-5 h-5 text-pink-400 mx-auto mb-2" />
            <p className="font-bold text-sm text-white">Instant Delivery</p>
            <p className="text-xs text-pink-200/70 mt-1">Live WebSocket streaming</p>
          </div>
          <div className="glass-black rounded-2xl p-5 text-center border border-pink-500/25">
            <Shield className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <p className="font-bold text-sm text-white">Private & Secure</p>
            <p className="text-xs text-pink-200/70 mt-1">Encrypted JWT authentication</p>
          </div>
          <div className="glass-black rounded-2xl p-5 text-center border border-pink-500/25">
            <Sparkles className="w-5 h-5 text-pink-300 mx-auto mb-2" />
            <p className="font-bold text-sm text-white">Chat History</p>
            <p className="text-xs text-pink-200/70 mt-1">Persistent database backups</p>
          </div>
        </div>
      </main>
    </div>
  );
}
