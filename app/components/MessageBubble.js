export default function MessageBubble({ message, senderType }) {
    const isSender = senderType === 'you';
    return (
        <div className={`flex mb-2 ${isSender ? "justify-end" : "justify-start"}`}>
            <div className={`rounded-xl p-3 max-w-xs shadow-md ${isSender
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-gray-200 text-gray-900 rounded-bl-none"
                }`}>
                <div className={`text-xs font-bold mb-1 ${isSender ? "text-blue-200 text-right" : "text-gray-500 text-left"
                    }`}>
                    {isSender
                        ? `${message.userName || "You"} (Sent)`
                        : `${message.userName || "Anon"} (Received)`}
                </div>

                {message.type === 'text' && <span>{message.text}</span>}
                {message.type === 'image' && <img src={message.mediaUrl} alt="media" className="rounded max-w-full my-1" />}
                {message.type === 'video' && (
                    <video controls className="rounded max-w-full my-1" style={{ maxHeight: 240 }}>
                        <source src={message.mediaUrl} />
                    </video>
                )}
                {message.type === 'voice' && (
                    <audio controls className="w-full mt-1">
                        <source src={message.mediaUrl} />
                    </audio>
                )}
                <div className="text-[10px] mt-1 text-gray-300 text-right">{message.timestamp && (new Date(message.timestamp)).toLocaleTimeString()}</div>
            </div>
        </div>
    );
}
