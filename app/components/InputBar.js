'use client';

import { useRef, useState, useEffect } from 'react';

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
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // Cleanup on unmount or when component updates
  useEffect(() => {
    return () => {
      if (isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isRecording]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB for images)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onImageSelect({ base64: reader.result, name: file.name });
    reader.onerror = () => alert('Failed to read image');
    reader.readAsDataURL(file);
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB for videos)
    if (file.size > 10 * 1024 * 1024) {
      alert('Video must be less than 10MB');
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
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          onVideoSelect({
            base64: reader.result,
            thumbnail: canvas.toDataURL('image/jpeg', 0.7),
            duration: Math.ceil(video.duration),
            name: file.name,
          });
        }
      };

      video.onerror = () => alert('Failed to process video');
    };

    reader.onerror = () => alert('Failed to read video');
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        if (blob.size === 0) {
          alert('No audio recorded');
          return;
        }

        // Calculate duration
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
          onVoiceRecord({ blob, duration: Math.ceil(audio.duration) });
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          onVoiceRecord({ blob, duration: 0 }); // Fallback
        };

        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone error:', error);
      alert('Please allow microphone access');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-300 p-3 md:p-4">
      {/* Progress bar */}
      {sendingMedia && uploadProgress > 0 && (
        <div className="mb-2 h-1 bg-gray-300 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-150"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Waiting message */}
      {isWaiting && (
        <div className="mb-2 text-xs md:text-sm text-gray-600 text-center animate-pulse">
          💭 Waiting for stranger...
        </div>
      )}

      {/* LINE 1: Input + Send + Next */}
      <div className="flex gap-2 items-center mb-2">
        {/* Text input */}
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder="Type message..."
          disabled={disabled || sendingMedia !== null}
          className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 md:py-3 text-sm md:text-base focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
        />

        {/* Send button */}
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim() || sendingMedia !== null}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg"
          title="Send (Enter)"
        >
          📤
        </button>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={disabled}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg"
          title="Next Stranger"
        >
          ➡️
        </button>
      </div>

      {/* LINE 2: Media buttons */}
      <div className="flex gap-2 justify-center md:justify-start flex-wrap">
        {/* Image button */}
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={sendingMedia !== null || disabled}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg"
          title="Send Image"
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
          disabled={sendingMedia !== null || disabled}
          className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 text-white rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg"
          title="Send Video"
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
          disabled={sendingMedia !== null || disabled}
          className={`rounded-lg p-2 md:p-3 transition flex-shrink-0 text-lg text-white ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400'
          }`}
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {isRecording ? '⏹️' : '🎤'}
        </button>
      </div>
    </div>
  );
}