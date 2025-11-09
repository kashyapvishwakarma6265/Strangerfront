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
  // onNext,
  sendingMedia,
  uploadProgress,
  // isWaiting,
}) {
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false);
  const textareaRef = useRef(null);

  // === Emoji Handler ===
  const handleEmojiSelect = (emoji) => {
    onChange({ target: { value: value + emoji } });
    setShowEmojiPicker(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 0);
  };

  // === Image Handler ===
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      alert('Please select an image under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onImageSelect({ base64: reader.result, name: file.name });
    reader.onerror = () => alert("Couldn't load image.");
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // === Video Handler ===
  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/') || file.size > 20 * 1024 * 1024) {
      alert('Please select a video under 20MB.');
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
      video.onerror = () => alert("Couldn't load video.");
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // === Voice Recording ===
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      let startTime = performance.now();

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const duration = Math.round((performance.now() - startTime) / 1000);
        onVoiceRecord({ blob, duration });
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      setIsRecording(true);
      mediaRecorder.start();
      startTime = performance.now();

      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      }, 60000);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
    }
  };

  // === Textarea Auto-resize ===
  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    onChange(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      if (value.trim() && !disabled && sendingMedia == null) {
        onSubmit(e);
      }
    }
  };

  return (
    <form
      className="w-full bg-white border-t border-gray-200 flex flex-col gap-1 px-2 py-2 sm:gap-2 sm:px-4 sm:py-3 sticky bottom-0"
      style={{ boxShadow: '0 -1px 8px rgba(60,60,60,0.05)' }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
        if (textareaRef.current) {
          textareaRef.current.style.height = '40px';
        }
      }}
      autoComplete="off"
    >
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-20">
          <EmojiPicker
            isOpen
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-2 relative">
        {/* Textarea + Paperclip */}
        <button
          type="button"
          onClick={() => {
            imageInputRef.current?.click();
            setShowAttachmentPopup(false);
          }}
          className="bg-blue-500 hover:bg-blue-600 rounded-full text-white p-3 transition flex items-center justify-center"
        >
          📷
        </button>
        <div className="flex-1 relative">

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            disabled={disabled || sendingMedia != null}
            className="w-full bg-gray-300 rounded-full resize-none px-4 py-2 pr-10 text-base border-none outline-none focus:ring-0"
            style={{ minHeight: 40, maxHeight: 100 }}
          />

          {/* Paperclip Button */}
          <button
            type="button"
            onClick={() => setShowAttachmentPopup(!showAttachmentPopup)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 transition"
            title="Attach"
          >
            📎
          </button>

          {/* Attachment Popup */}
          {showAttachmentPopup && (
            <div className="absolute bottom-12 right-0 bg-white border border-gray-200 shadow-lg rounded-lg p-2 flex flex-col z-10 w-40">

              <button
                type="button"
                onClick={() => {
                  videoInputRef.current?.click();
                  setShowAttachmentPopup(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-left text-sm"
              >
                🎥 Video
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(true);
                  setShowAttachmentPopup(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-left text-sm"
              >
                🙂 Emoji
              </button>
            </div>
          )}
        </div>

        {/* Send or Voice Button */}
        {value.trim() ? (
          <button
            type="submit"
            disabled={disabled || !value.trim() || sendingMedia != null}
            className="bg-blue-500 hover:bg-blue-600 rounded-full text-white p-3 transition flex items-center justify-center"
            title="Send"
          >
            ➢
          </button>
        ) : (
          <button
            type="button"
            onClick={isRecording ? () => setIsRecording(false) : startRecording}
            className={`${isRecording
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : 'bg-purple-500 hover:bg-purple-600'
              } rounded-full text-white p-3 transition flex items-center justify-center`}
            disabled={sendingMedia != null || disabled}
            title={isRecording ? 'Stop Recording' : 'Record Voice'}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
        )}
      </div>



      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoChange}
        className="hidden"
      />

      {/* Upload Progress Bar */}
      {sendingMedia && uploadProgress > 0 && (
        <div className="absolute left-0 bottom-0 w-full h-1 bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Waiting Indicator */}
      {/* {isWaiting && (
        <div className="absolute left-1/2 -top-8 transform -translate-x-1/2 text-xs text-gray-500 animate-pulse whitespace-nowrap">
          💭 Waiting for stranger...
        </div>
      )} */}
    </form>
  );
}