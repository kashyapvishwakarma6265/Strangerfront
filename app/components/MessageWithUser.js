'use client';

import { useState } from 'react';

export default function MessageWithUser({ message, senderType, userName }) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2 mb-2 ${senderType === 'you' ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-xs md:max-w-md ${senderType === 'you' ? '' : 'order-1'}`}>
        {senderType === 'stranger' && userName && (
          <p className="text-xs font-bold text-gray-600 mb-1 px-1">{userName}</p>
        )}
        
        <div className={`px-4 py-2 md:py-3 rounded-2xl shadow-md animate-scalePop relative group/message ${
          senderType === 'you'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-900 rounded-bl-none'
        }`}>
          <p className="text-sm md:text-base break-words">{message.text}</p>

          {/* Copy button on hover */}
          <button
            onClick={copyToClipboard}
            className={`absolute -top-8 right-0 p-1 rounded opacity-0 group-hover/message:opacity-100 transition-opacity text-xs font-semibold ${
              senderType === 'you' 
                ? 'bg-purple-700 text-white' 
                : 'bg-gray-300 text-gray-900'
            }`}
            title="Copy message"
          >
            {isCopied ? '✅ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
