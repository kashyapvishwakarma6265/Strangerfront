'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginForm({ onToggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { login, googleLogin, resetPassword, error: authError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await googleLogin();
    } catch (err) {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetSent(true);
      setTimeout(() => {
        setShowResetForm(false);
        setResetEmail('');
        setResetSent(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  if (showResetForm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-slideUp">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">🔑 Reset Password</h2>
          <p className="text-gray-600 text-center text-sm mb-6">Enter your email to receive reset link</p>

          {resetSent && (
            <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700 text-sm rounded animate-slideDown">
              ✅ Password reset email sent! Check your inbox.
            </div>
          )}

          {(error || authError) && !resetSent && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm rounded animate-slideDown">
              {error || authError}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={resetLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-60"
            >
              {resetLoading ? '⏳ Sending...' : '📧 Send Reset Email'}
            </button>
          </form>

          <button
            onClick={() => setShowResetForm(false)}
            className="mt-4 w-full text-center text-blue-600 font-semibold hover:text-blue-700 transition"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-slideUp">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🔷 Welcome Back</h2>
          <p className="text-gray-600 text-sm">Login to your account</p>
        </div>

        {(error || authError) && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm rounded animate-slideDown">
            {error || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-60"
          >
            {loading ? '⏳ Logging in...' : '🔐 Login'}
          </button>
        </form>

        <button
          onClick={() => setShowResetForm(true)}
          className="block w-full text-center text-blue-600 font-semibold mb-6 hover:text-blue-700 transition"
        >
          🔑 Forgot Password?
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 bg-white text-gray-600 text-sm">OR</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 bg-white border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-60 mb-6"
        >
          🔷 Continue with Google
        </button>

        <p className="text-center text-gray-600 text-sm">
          Don't have an account?{' '}
          <button
            onClick={onToggleMode}
            className="text-blue-600 font-semibold hover:text-blue-700 transition"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
}
