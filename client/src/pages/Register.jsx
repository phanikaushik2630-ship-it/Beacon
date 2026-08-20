import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LiveBackground from '../components/LiveBackground';
import BeaconLogo, { MiniBeaconLogo } from '../components/BeaconLogo';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!username.trim()) {
      setLocalError('Please choose a username.');
      return;
    }

    if (username.trim().length < 2) {
      setLocalError('Username must be at least 2 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setLocalError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (!email.trim()) {
      setLocalError('Please enter your email.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        avatar: selectedAvatar,
      });
      navigate('/chat', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040207] flex flex-col relative overflow-hidden text-white select-none">
      {/* Dynamic Background */}
      <LiveBackground />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between px-8 sm:px-14 py-6 border-b border-pink-500/15">
        <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
          <MiniBeaconLogo size={28} />
          <span className="font-cinzel font-bold text-2xl tracking-wider beacon-name-glow">
            Beacon
          </span>
        </Link>

        <Link
          to="/login"
          className="text-xs sm:text-sm font-bold text-pink-200/90 hover:text-white px-4 py-2 rounded-full border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition-all font-syne"
        >
          Sign in
        </Link>
      </header>

      {/* Centered Register Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="join-card w-full max-w-lg rounded-2xl p-8 sm:p-10 title-reveal title-reveal-d2 my-auto">
          {/* Brand & Heading */}
          <div className="flex flex-col items-center justify-center mb-6">
            <BeaconLogo size={68} className="mb-3" />
            <h1 className="font-cinzel font-black text-3xl sm:text-4xl text-center tracking-wider beacon-hero-font mb-1">
              Beacon
            </h1>
            <p className="text-pink-200/80 text-sm text-center font-syne">
              Create an account to start chatting
            </p>
          </div>

          {/* Error Message */}
          {localError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-400/30 flex items-start gap-3 text-red-200 text-xs sm:text-sm msg-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{localError}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-pink-200/90 mb-1.5 uppercase tracking-wider font-syne">
                Username
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-4 w-4 h-4 text-pink-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (localError) setLocalError('');
                  }}
                  placeholder="e.g. alex_stone"
                  maxLength={30}
                  className="join-input w-full rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-pink-200/90 mb-1.5 uppercase tracking-wider font-syne">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 w-4 h-4 text-pink-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (localError) setLocalError('');
                  }}
                  placeholder="alex@example.com"
                  className="join-input w-full rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-pink-200/90 mb-1.5 uppercase tracking-wider font-syne">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 w-4 h-4 text-pink-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError('');
                    }}
                    placeholder="Min. 6 characters"
                    className="join-input w-full rounded-xl pl-11 pr-10 py-2.5 text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 text-pink-300/60 hover:text-white p-1 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-pink-200/90 mb-1.5 uppercase tracking-wider font-syne">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 w-4 h-4 text-pink-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (localError) setLocalError('');
                    }}
                    placeholder="Repeat password"
                    className="join-input w-full rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Profile Avatar */}
            <div>
              <label className="block text-xs font-bold text-pink-200/90 mb-1.5 uppercase tracking-wider font-syne">
                Profile Avatar <span className="text-pink-300/60 normal-case">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAvatar(null)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all font-syne ${
                    selectedAvatar === null
                      ? 'border-pink-400 bg-pink-500/20 text-white shadow-md shadow-pink-500/30'
                      : 'border-pink-500/20 bg-pink-500/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  Initials
                </button>
                {AVATAR_PRESETS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedAvatar(url)}
                    className={`rounded-full p-0.5 border-2 transition-all ${
                      selectedAvatar === url
                        ? 'border-pink-400 scale-110 shadow-md shadow-pink-500/50'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="preset" className="w-7 h-7 rounded-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !username.trim() || !email.trim() || !password || !confirmPassword}
              className="white-btn w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-4 shadow-xl shadow-pink-500/30"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 text-pink-600" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-5 pt-4 border-t border-pink-500/15 text-center">
            <p className="text-xs text-pink-200/70 font-syne">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-pink-400 hover:text-white hover:underline font-bold ml-1"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
