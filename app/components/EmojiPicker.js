const EMOJIS = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😍','👍','👏','❤️','🎉','🔥','✨'];
export default function EmojiPicker({ isOpen, onEmojiSelect, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="absolute bottom-full left-0 z-50 bg-white border rounded-xl shadow p-2 w-72">
      <div className="flex flex-wrap gap-1">
        {EMOJIS.map(e => (
          <button key={e} className="text-2xl p-2" onClick={() => onEmojiSelect(e)}>
            {e}
          </button>
        ))}
      </div>
      <button className="mt-2 text-sm text-gray-500" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
