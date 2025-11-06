'use client';

import { useState, useRef, useEffect } from 'react';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
  '🤪', '😌', '😔', '😑', '😐', '😏', '😒', '😞',
  '👍', '👎', '👏', '🙌', '🤝', '❤️', '🧡', '💛',
  '💚', '💙', '💜', '🎉', '🎊', '🎈', '🎁', '🔥',
  '💯', '✨', '⭐', '🌟', '💫', '👋', '😂', '😍',
  '🥺', '😠', '😡', '🤬', '😤', '😎', '🤓', '😴'
];

export default function EmojiPicker({ onEmojiSelect, isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEmojis = EMOJIS.filter(emoji => 
    emoji.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      className="absolute bottom-full left-0 z-50 bg-white rounded-xl shadow-2xl border border-gray-300 mb-2 w-80 animate-slideUp"
      ref={pickerRef}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex gap-2">
        <input
          type="text"
          placeholder="Search emojis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        <button 
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 font-bold w-8 h-8 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 p-3 max-h-48 overflow-y-auto scrollbar-thin">
        {filteredEmojis.length > 0 ? (
          filteredEmojis.map((emoji, index) => (
            <button
              key={index}
              className="p-2 text-2xl hover:bg-gray-100 rounded-lg transition-all hover:scale-125 active:scale-100"
              onClick={() => {
                onEmojiSelect(emoji);
                onClose();
              }}
              title={emoji}
            >
              {emoji}
            </button>
          ))
        ) : (
          <div className="col-span-8 text-center py-4 text-gray-500 text-sm">
            No emojis found
          </div>
        )}
      </div>
    </div>
  );
}
