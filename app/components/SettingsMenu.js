'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsMenu({ isOpen, onClose, onLogout }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-sm h-screen overflow-y-auto shadow-2xl animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-2xl font-bold"
          >
            ✕
          </button>

          <div className="space-y-6">
            {/* Account Section */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Account</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <p className="text-gray-600">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Display Name</label>
                  <p className="text-gray-600">{user?.displayName || 'Anonymous'}</p>
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">⚙️ Settings</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition">
                  🔔 Notifications
                </button>
                <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition">
                  🌙 Dark Mode
                </button>
                <button className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition">
                  🔒 Privacy
                </button>
              </div>
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
