'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import Chat from './Chat';

export default function AuthWrapper() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { user, loading } = useAuth();

  // Debug logs (keep in dev only)
  useEffect(() => {
    console.log('AuthWrapper state:', {
      userEmail: user?.email,
      loading,
      isLoginMode,
    });
  }, [user, loading, isLoginMode]);

  /* -------------------------------------------------
     1. Loading State – Spinner + Brand
  ------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        {/* Spinner */}
        <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-white border-t-transparent"></div>

        {/* App Name */}
        <h1 className="text-4xl font-bold tracking-tight">Blink Chat</h1>

        {/* Tagline with emoji */}
        <p className="mt-4 text-lg font-light">
          <span className="mr-1">Safe & 100% secure</span>
        </p>
      </div>
    );
  }

  /* -------------------------------------------------
     2. Not Authenticated – Show Login / Signup
  ------------------------------------------------- */
  if (!user) {
    return isLoginMode ? (
      <LoginForm onToggleMode={() => setIsLoginMode(false)} />
    ) : (
      <SignupForm onToggleMode={() => setIsLoginMode(true)} />
    );
  }

  /* -------------------------------------------------
     3. Authenticated – Show Chat
  ------------------------------------------------- */
  return <Chat />;
}