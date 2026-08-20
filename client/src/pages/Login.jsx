import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LiveBackground from '../components/LiveBackground';
import BeaconLogo, { MiniBeaconLogo } from '../components/BeaconLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/chat';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
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
          to="/register"
          className="text-xs sm:text-sm font-bold text-pink-200/90 hover:text-white px-4 py-2 rounded-full border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 transition-all font-syne"
        >
          Create account
        </Link>
      </header>

      {/* Centered Login Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="join-card w-full max-w-md rounded-2xl p-8 sm:p-10 title-reveal title-reveal-d2">
          {/* Brand & Heading */}
          <div className="flex flex-col items-center justify-center mb-6">
            <BeaconLogo size={68} className="mb-3" />
            <h1 className="font-cinzel font-black text-3xl sm:text-4xl text-center tracking-wider beacon-hero-font mb-1">
              Beacon
            </h1>
            <p className="text-pink-200/80 text-sm text-center font-syne">
              Sign in to continue to your messages
            </p>
          </div>

          {/* Error Message */}
          {localError && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-400/30 flex items-start gap-3 text-red-200 text-xs sm:text-sm msg-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{localError}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-pink-200/90 mb-1.5 uppercase tracking-wider font-syne">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 w-4 h-4 text-pink-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (localError) setLocalError('');
                  }}
                  placeholder="alex@example.com"
                  className="join-input w-full rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-pink-200/90 uppercase tracking-wider font-syne">
                  Password
                </label>
              </div>
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
                  placeholder="••••••••"
                  className="join-input w-full rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 text-pink-300/60 hover:text-white p-1 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="white-btn w-full py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-4 shadow-xl shadow-pink-500/30"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                  <span>Signing In…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-pink-600" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 pt-5 border-t border-pink-500/15 text-center">
            <p className="text-xs text-pink-200/70 font-syne">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-pink-400 hover:text-white hover:underline font-bold ml-1"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
