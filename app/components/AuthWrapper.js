'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import Chat from './Chat';

export default function AuthWrapper() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('🎯 AuthWrapper state update:', { 
      userEmail: user?.email, 
      loading, 
      isLoginMode 
    });
  }, [user, loading, isLoginMode]);

  // Show loading spinner
  if (loading) {
    console.log('⏳ Still loading...');
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login/signup forms if not logged in
  if (!user) {
    console.log('📝 No user, showing login form');
    return isLoginMode ? (
      <LoginForm onToggleMode={() => setIsLoginMode(false)} />
    ) : (
      <SignupForm onToggleMode={() => setIsLoginMode(true)} />
    );
  }

  // Show chat if logged in
  console.log('✅ User logged in, showing chat page');
  return <Chat />;
}
