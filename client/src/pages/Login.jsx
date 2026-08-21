import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  KeyRound,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import LiveBackground from '../components/LiveBackground';
import BeaconLogo, { MiniBeaconLogo } from '../components/BeaconLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/chat';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalSuccess('');

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotSubmitting(true);

    try {
      const res = await authApi.forgotPassword({
        email: forgotEmail.trim(),
        newPassword: forgotNewPassword,
      });

      if (res.success) {
        setEmail(forgotEmail.trim());
        setPassword(forgotNewPassword);
        setLocalSuccess('Password reset successfully! Please click "Sign In".');
        setShowForgotModal(false);
        setForgotEmail('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      } else {
        setForgotError(res.error || 'Could not reset password.');
      }
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password. Please check your email address.');
    } finally {
      setForgotSubmitting(false);
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

          {/* Success Message */}
          {localSuccess && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-start gap-3 text-emerald-200 text-xs sm:text-sm msg-in shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug font-medium">{localSuccess}</div>
            </div>
          )}

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
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError('');
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-mono text-pink-400 hover:text-white hover:underline transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
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

      {/* ── FORGOT PASSWORD MODAL ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md msg-in">
          <div className="join-card w-full max-w-md rounded-2xl p-6 sm:p-8 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-pink-300/60 hover:text-white p-1 rounded-lg hover:bg-pink-500/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white font-syne">Reset Password</h3>
                <p className="text-xs text-pink-200/60 font-sans">
                  Enter your email and choose a new password
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-400/30 flex items-start gap-2.5 text-red-200 text-xs msg-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">{forgotError}</div>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-pink-200/80 mb-1 uppercase tracking-wider font-syne">
                  Account Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-pink-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                    placeholder="your-email@example.com"
                    className="join-input w-full rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-pink-200/80 mb-1 uppercase tracking-wider font-syne">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-pink-400 pointer-events-none" />
                  <input
                    type={showForgotPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => {
                      setForgotNewPassword(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                    placeholder="At least 6 characters"
                    className="join-input w-full rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPass((prev) => !prev)}
                    className="absolute right-3 text-pink-300/60 hover:text-white p-0.5"
                  >
                    {showForgotPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-pink-200/80 mb-1 uppercase tracking-wider font-syne">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-pink-400 pointer-events-none" />
                  <input
                    type={showForgotPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={forgotConfirmPassword}
                    onChange={(e) => {
                      setForgotConfirmPassword(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                    placeholder="Repeat new password"
                    className="join-input w-full rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-pink-300/30 font-sans focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-pink-500/30 bg-pink-500/10 text-xs font-mono text-pink-200 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="flex-1 py-2.5 rounded-xl white-btn text-xs font-bold font-syne flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/40 disabled:opacity-40"
                >
                  {forgotSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-600" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
