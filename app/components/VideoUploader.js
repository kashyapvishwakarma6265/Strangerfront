'use client';

import { useRef, useState } from 'react';

export default function VideoUploader({ onVideoSelect, disabled }) {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('🎥 Video selected:', file.name, 'Size:', (file.size / (1024 * 1024)).toFixed(2) + 'MB');

    if (!file.type.startsWith('video/')) {
      alert('❌ Please select a video file');
      return;
    }

    // STRICT size limit
    const maxSize = 3 * 1024 * 1024; // 3MB max
    if (file.size > maxSize) {
      alert(`❌ Video is TOO LARGE!\n\nYour file: ${(file.size / (1024 * 1024)).toFixed(2)}MB\nMax allowed: 3MB\n\n💡 Compress using:\n- Handbrake\n- Online-convert.com\n- FFmpeg`);
      return;
    }

    setIsLoading(true);

    try {
      console.log('⚡ Processing video...');

      // Generate thumbnail
      const thumbnail = await generateQuickThumbnail(file);

      // Get duration
      let duration = 0;
      try {
        duration = await getVideoDuration(file);
      } catch (error) {
        console.warn('⚠️ Could not get duration');
      }

      // Read file as Base64
      const base64Data = await fileToBase64(file);

      console.log('✅ Video ready:', {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
        duration: duration + 's',
        base64Size: (base64Data.length / (1024 * 1024)).toFixed(2) + 'MB',
      });

      const videoData = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        duration: duration,
        thumbnail: thumbnail,
        base64: base64Data,
      };

      onVideoSelect(videoData);
      setIsLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to process video: ' + error.message);
      setIsLoading(false);
    }
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';

        const timeout = setTimeout(() => {
          resolve(0);
        }, 2000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve(Math.round(video.duration));
        };

        video.onerror = () => {
          clearTimeout(timeout);
          resolve(0);
        };

        video.src = URL.createObjectURL(file);
      } catch (error) {
        resolve(0);
      }
    });
  };

  const generateQuickThumbnail = (file) => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        const timeout = setTimeout(() => {
          resolve(null);
        }, 1000);

        video.onloadedmetadata = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 56;

            const ctx = canvas.getContext('2d');
            video.currentTime = 0;

            video.onseeked = () => {
              ctx.drawImage(video, 0, 0, 100, 56);
              clearTimeout(timeout);
              resolve(canvas.toDataURL('image/jpeg', 0.2));
            };
          } catch (e) {
            clearTimeout(timeout);
            resolve(null);
          }
        };

        video.onerror = () => {
          clearTimeout(timeout);
          resolve(null);
        };

        video.src = URL.createObjectURL(file);
      } catch (error) {
        resolve(null);
      }
    });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isLoading}
        className="relative w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg flex items-center justify-center text-lg md:text-xl hover:shadow-md hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        title="Send Video (Max 3MB)"
      >
        {isLoading ? '⏳' : '🎥'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
}
