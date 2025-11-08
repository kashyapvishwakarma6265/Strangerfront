'use client';

export default function ChatHeader({ 
  status, 
  user, 
  onLogout,
  isConnected,
  onNext,
  disabled = false
}) {
  return (
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white px-3 md:px-6 py-2.5 md:py-4 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
      
      {/* Left - Title */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 w-full md:w-auto">
        <div className="w-10 h-10 md:w-10 md:h-10 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-base md:text-xl flex-shrink-0">
          💬
        </div>
        <div className="min-w-0">
          <h1 className="text-base md:text-3xl font-bold truncate">Blink Chat</h1>
          <p className="text-xs md:text-sm opacity-90 truncate ">{status}</p>
        </div>
      </div>

      {/* Center - Status Indicator (Hidden on small screens) */}
      {/* {isConnected && (
        <div className="hidden md:flex items-center gap-2 text-xs md:text-sm flex-shrink-0">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>Connected</span>
        </div>
      )} */}

      {/* Right - User Info + Logout + Next */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xl md:text-xl font-semibold truncate max-w-[400px] sm:max-w-xs text-right">
            {user?.displayName || user?.email?.split('@')[0] || 'Guest'}
          </span>
          <button
            onClick={onLogout}
            className="px-2.5 md:px-4 py-1.5 md:py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-xs md:text-base font-semibold whitespace-nowrap"
          >
            Logout
          </button>
        </div>

        {/* Next Button - Always below Logout */}
        <button
          type="button"
          onClick={() => {
            if (!disabled && typeof onNext === "function") {
              onNext();
            }
          }}
          disabled={disabled}
          className="bg-white bg-opacity-20 hover:bg-opacity-30 disabled:bg-grey bg-opacity-20 disabled:cursor-not-allowed text-white rounded-full px-4 py-2 transition flex items-center gap-1.5 text-sm font-medium w-full sm:w-auto justify-center"
          title="Next Stranger"
        >
          Next Stranger
        </button>
      </div>
    </div>
  );
}
