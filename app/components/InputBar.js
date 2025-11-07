import { useRef, useState } from 'react';
import EmojiPicker from './EmojiPicker';

export default function InputBar({
  value,
  onChange,
  onSubmit,
  disabled,
  onImageSelect,
  onVideoSelect,
  onVoiceRecord,
  onNext,
  sendingMedia,
  uploadProgress,
  isWaiting,
}) {
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Emoji append handler
  const handleEmojiSelect = (emoji) => {
    onChange({ target: { value: value + emoji } });
    setShowEmojiPicker(false);
  };

  // Image select handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      alert('Please select an image below 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onImageSelect({ base64: reader.result, name: file.name });
    reader.onerror = () => alert("Image couldn't be loaded.");
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Video select handler
  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/') || file.size > 20 * 1024 * 1024) {
      alert('Please select a video below 20MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const video = document.createElement('video');
      video.src = reader.result;
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        onVideoSelect({
          base64: reader.result,
          thumbnail: canvas.toDataURL('image/jpeg', 0.7),
          duration: Math.round(video.duration),
          name: file.name,
        });
      };
      video.onerror = () => alert("Video couldn't be loaded.");
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice recording handler
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onVoiceRecord({ blob, duration: 0 });
        setIsRecording(false);
      };
      setIsRecording(true);
      mediaRecorder.start();
      setTimeout(() => { if (mediaRecorder.state !== 'inactive') mediaRecorder.stop(); }, 60000);
    } catch (err) {
      alert('Microphone error. Please allow permission.');
    }
  };

  // The key change: wrap in <form> and onSubmit goes to your parent
  return (
    <form
      className="bg-white border-t border-gray-300 p-3 md:p-4 flex flex-col relative"
      onSubmit={e => {
        e.preventDefault(); // Prevents page reload
        onSubmit(e);         // Calls parent (Chat) handleSubmit, always
      }}
      autoComplete="off"
    >
      {showEmojiPicker && (
        <EmojiPicker
          isOpen
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {sendingMedia && uploadProgress > 0 && (
        <div className="mb-2 h-1 bg-gray-300 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {isWaiting && (
        <div className="mb-2 text-xs text-gray-600 text-center animate-pulse">
          💭 Waiting for stranger...
        </div>
      )}

      <div className="flex gap-2 items-center mb-2">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Type message…"
          disabled={disabled || sendingMedia != null}
          className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 md:py-3 text-base focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          autoFocus
        />
       
        <button
          type="submit"
          disabled={disabled || !value.trim() || sendingMedia != null}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2"
          title="Send"
        >📤</button>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg p-2"
          title="Next Stranger"
        >➡️</button>
         <button
          type="button"
          className="bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg p-2"
          title="Send Emoji"
          onClick={() => setShowEmojiPicker(true)}
          disabled={sendingMedia != null || disabled}
        >🙂</button>
      </div>

      <div className="flex gap-2 justify-start flex-wrap">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={sendingMedia != null || disabled}
          className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-2"
          title="Send Image"
        >📷</button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={sendingMedia != null || disabled}
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg p-2"
          title="Send Video"
        >🎥</button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          className="hidden"
        />

        <div>
          {isRecording ? (
            <button
              type="button"
              onClick={() => setIsRecording(false)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-2 ml-2"
              disabled={disabled}
              title="Stop Recording"
            >⏹ Stop</button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-2"
              disabled={sendingMedia != null || disabled}
              title="Record Voice"
            >🎤 Record</button>
          )}
          {isRecording && <span className="ml-2 text-red-500 font-bold">Recording...</span>}
        </div>
      </div>
    </form>
  );
}
