export default function TypingIndicator({ strangerName }) {
  return (
    <div className="flex gap-2 mb-2 animate-slideIn">
      <div className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-2xl rounded-bl-none shadow-md">
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
          <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
          <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        </div>
        <span className="text-xs font-semibold text-gray-600 ml-1">
          {strangerName || "Stranger"} is typing<span className="animate-pulse">...</span>
        </span>
      </div>
    </div>
  );
}
