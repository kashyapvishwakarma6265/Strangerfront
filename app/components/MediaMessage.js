'use client';

import { useState } from 'react';

export default function MediaMessage({ message, senderType }) {
  const [loadError, setLoadError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadMedia = async () => {
    try {
      setIsDownloading(true);
      console.log('📥 Starting download...');

      // Create a temporary link element
      const link = document.createElement('a');
      link.href = message.mediaUrl;
      
      // Determine filename based on type
      let filename = 'download';
      if (message.type === 'video') {
        filename = `video-${Date.now()}.mp4`;
      } else if (message.type === 'image') {
        filename = `image-${Date.now()}.jpg`;
      } else if (message.type === 'voice') {
        filename = `voice-${Date.now()}.mp3`;
      }

      link.download = filename;
      link.setAttribute('download', filename);
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ Download started:', filename);
      setIsDownloading(false);
    } catch (error) {
      console.error('❌ Download error:', error);
      alert('Error downloading file: ' + error.message);
      setIsDownloading(false);
    }
  };

  const downloadMediaFromBase64 = async () => {
    try {
      setIsDownloading(true);
      console.log('📥 Converting and downloading...');

      // Convert Base64 to Blob
      const response = await fetch(message.mediaUrl);
      const blob = await response.blob();

      // Create object URL from blob
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;

      let filename = 'download';
      if (message.type === 'video') {
        filename = `video-${Date.now()}.mp4`;
      } else if (message.type === 'image') {
        filename = `image-${Date.now()}.jpg`;
      } else if (message.type === 'voice') {
        filename = `voice-${Date.now()}.mp3`;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(blobUrl);

      console.log('✅ Downloaded:', filename);
      setIsDownloading(false);
    } catch (error) {
      console.error('❌ Download error:', error);
      alert('Error downloading file');
      setIsDownloading(false);
    }
  };

  if (message.type === 'image') {
    return (
      <div className={`flex ${senderType === 'you' ? 'justify-end' : 'justify-start'} mb-2 group`}>
        <div className="max-w-xs md:max-w-md relative">
          {loadError ? (
            <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 text-center text-red-600 text-sm font-semibold">
              ❌ Image failed to load
            </div>
          ) : (
            <div className="relative group/image">
              <img 
                src={message.mediaUrl} 
                alt="Sent image" 
                className="max-w-full max-h-80 rounded-2xl shadow-md object-cover animate-scalePop"
                onError={() => {
                  console.error('❌ Image load error');
                  setLoadError(true);
                }}
                loading="lazy"
              />
              
              {/* Download button on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-40 rounded-2xl transition-all flex items-center justify-center gap-2 opacity-0 group-hover/image:opacity-100">
                <button
                  onClick={downloadMediaFromBase64}
                  disabled={isDownloading}
                  className="p-2 bg-white rounded-full hover:bg-gray-200 transition active:scale-95 disabled:opacity-60"
                  title="Download Image"
                >
                  {isDownloading ? '⏳' : '📥'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'video') {
    return (
      <div className={`flex ${senderType === 'you' ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="max-w-xs md:max-w-md">
          {loadError ? (
            <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 text-center text-red-600 text-sm font-semibold">
              ❌ Video failed to load
            </div>
          ) : (
            <div className="relative group/video">
              <video 
                src={message.mediaUrl} 
                controls 
                className="w-full max-h-80 rounded-2xl shadow-md object-contain bg-black"
                poster={message.thumbnail}
                onError={(e) => {
                  console.error('❌ Video load error:', e);
                  setLoadError(true);
                }}
                controlsList="nodownload"
                preload="metadata"
              />
              
              {message.duration && (
                <span className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded font-semibold">
                  ⏱️ {message.duration}s
                </span>
              )}

              {/* Download button overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover/video:opacity-100 transition-opacity">
                <button
                  onClick={downloadMediaFromBase64}
                  disabled={isDownloading}
                  className="p-2 bg-white rounded-full hover:bg-gray-200 transition active:scale-95 disabled:opacity-60 shadow-md"
                  title="Download Video"
                >
                  {isDownloading ? '⏳' : '📥'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'voice') {
    return (
      <div className={`flex ${senderType === 'you' ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-md max-w-xs animate-scalePop group/voice">
          {/* Play Button */}
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center hover:shadow-md transition-all active:scale-95 flex-shrink-0"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          {/* Audio Player */}
          <audio 
            src={message.mediaUrl} 
            controls 
            className="flex-1 h-8"
            autoPlay={isPlaying}
            onError={(e) => {
              console.error('❌ Audio load error:', e);
              setLoadError(true);
            }}
            controlsList="nodownload"
          />
          
          {/* Duration */}
          {message.duration && (
            <span className="text-xs font-semibold text-gray-600 min-w-max">
              {message.duration}s
            </span>
          )}

          {/* Download Button */}
          <button
            onClick={downloadMediaFromBase64}
            disabled={isDownloading}
            className="p-2 bg-white rounded-full hover:bg-gray-200 transition active:scale-95 disabled:opacity-60 flex-shrink-0"
            title="Download Voice"
          >
            {isDownloading ? '⏳' : '📥'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
