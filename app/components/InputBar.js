'use client';

import { useRef, useState } from 'react';

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
  const mediaRecorderRef = useRef(null);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImageSelect({ base64: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
          duration: Math.ceil(video.duration),
          name: file.name,
        });
      };
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => onVoiceRecord({ blob, duration: 0 });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      alert('Please allow microphone access');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-300 p-3 md:p-4">
      {/* Progress */}
      {sendingMedia && uploadProgress > 0 && (
        <div className="mb-2 h-1 bg-gray-300 rounded overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {/* Waiting message */}
      {isWaiting && (
        <div className="mb-2 text-xs md:text-sm text-gray-600 text-center">
          💭 Waiting for stranger...
        </div>
      )}

      {/* LINE 1: Input + Send + Next */}
      <div className="flex gap-2 items-center mb-2">
        {/* Text input - FULL WIDTH */}
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Type message..."
          disabled={disabled || sendingMedia !== null}
          className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 md:py-3 text-sm md:text-base focus:outline-none focus:border-blue-500"
        />

        {/* Send button */}
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim() || sendingMedia !== null}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg"
          title="Send"
        >
          📤
        </button>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={disabled}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg"
          title="Next"
        >
          ➡️
        </button>
      </div>

      {/* LINE 2: Media buttons */}
      <div className="flex gap-2 justify-center md:justify-start">
        {/* Image button */}
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={sendingMedia !== null}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg"
          title="Image"
        >
          📷
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />

        {/* Video button */}
        <button
          onClick={() => videoInputRef.current?.click()}
          disabled={sendingMedia !== null}
          className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 text-white rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg"
          title="Video"
        >
          🎥
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          className="hidden"
        />

        {/* Voice button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={sendingMedia !== null}
          className={`rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg text-white ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400'
          }`}
          title="Voice"
        >
          {isRecording ? '⏹️' : '🎤'}
        </button>
      </div>
    </div>
  );
}
