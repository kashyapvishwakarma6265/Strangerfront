'use client';

export default function ChatHeader({ 
  status, 
  user, 
  onLogout,
  isConnected,
}) {
  return (
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white px-3 md:px-6 py-2.5 md:py-4 shadow-lg flex justify-between items-center gap-2 md:gap-4 flex-wrap md:flex-nowrap">
      {/* Left - Title */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        <div className="w-7 h-7 md:w-10 md:h-10 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-base md:text-xl flex-shrink-0">
          💬
        </div>
        <div className="min-w-0">
          <h1 className="text-base md:text-2xl font-bold truncate">Blink Chat</h1>
          <p className="text-xs md:text-sm opacity-90 truncate">{status}</p>
        </div>
      </div>

      {/* Center - Status Indicator - Hide on small screens */}
      {isConnected && (
        <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm flex-shrink-0">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>Connected</span>
        </div>
      )}

      {/* Right - User Info & Logout */}
      <div className="flex items-center gap-1.5 md:gap-4 min-w-0 flex-shrink-0">
        <span className="text-xs md:text-sm font-semibold text-right truncate max-w-xs">
          {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
        </span>
        <button
          onClick={onLogout}
          className="px-2.5 md:px-4 py-1.5 md:py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-xs md:text-base font-semibold flex-shrink-0"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
