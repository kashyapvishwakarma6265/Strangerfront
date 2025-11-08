export default function MessageBubble({ message, senderType }) {
  const isSender = senderType === 'you';
  const isSent = message.isSent ?? false;
  const isDelivered = message.isDelivered ?? false;
  const isSeen = message.isSeen ?? false;

  return (
    <div className={`flex mb-3 px-3 ${isSender ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative p-3 sm:p-4 max-w-[100%] sm:max-w-[90%] rounded-3xl shadow-md transition-all
        ${isSender
            ? // 🌸 Sender bubble - soft pink gradient
        'bg-gradient-to-r from-pink-500/90 to-[#ff3e9e]/90 text-white rounded-br-md shadow-sm'
      : // 🖤 Receiver bubble - elegant dark mode with slight opacity
        'bg-[#2c2c2e]/90 text-gray-100 rounded-bl-md backdrop-blur-sm shadow-sm border border-white/10'
          }`}
      >
        {/* Username */}
        <div
          className={`text-[11px] sm:text-xs font-medium mb-1
          ${isSender ? 'text-pink-100 text-right' : 'text-gray-400 text-left'}`}
        >
          {isSender ? message.userName || 'You' : message.userName || 'Anon'}
        </div>

        {/* Text message */}
        {message.type === 'text' && (
          <p className="text-sm sm:text-base leading-snug break-words whitespace-pre-line">
            {message.text}
          </p>
        )}

        {/* Image message */}
        {message.type === 'image' && (
          <div className="overflow-hidden rounded-2xl my-1">
            <img
              src={message.mediaUrl}
              alt="media"
              className="rounded-2xl w-full max-h-72 object-cover hover:opacity-90 transition"
            />
          </div>
        )}

        {/* Video message */}
        {message.type === 'video' && (
          <video
            controls
            className="rounded-2xl w-full my-1 max-h-72 object-cover"
          >
            <source src={message.mediaUrl} />
          </video>
        )}

        {/* Voice message */}
        {message.type === 'voice' && (
          <audio
            controls
            className="w-[250px] mt-1 accent-[#ff3e9e]"
          >
            <source src={message.mediaUrl} />
          </audio>
        )}

        {/* Footer: time + ticks */}
        <div className="flex items-center justify-end gap-1 mt-1">
          {/* Time */}
          <div className={`text-[10px] sm:text-xs ${isSender ? 'text-pink-100' : 'text-gray-400'}`}>
            {message.timestamp &&
              new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
          </div>

          {/* Message ticks */}
          {isSender && (
            <div className="text-[11px] sm:text-xs">
              {isSeen ? (
                <span className="text-yellow-800 font-bold">✓✓</span>
              ) : isDelivered ? (
                <span className="text-blue-400 font-bold">✓✓</span>
              ) : isSent ? (
                <span className="text-gray-500 font-bold">✓</span>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
