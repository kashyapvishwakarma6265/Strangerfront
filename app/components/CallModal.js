'use client';
import { useEffect, useRef, useState } from 'react';

export default function CallModal({
  callType,
  isIncoming,
  callerName,
  onAccept,
  onReject,
  onHangup,
  localStream,
  remoteStream,
  inCall,
  isCaller,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);

  // Draggable PIP state
  const [pipPosition, setPipPosition] = useState({ x: window.innerWidth - 200, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const pipRef = useRef(null);

  // Attach streams to media elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => {
        console.error('❌ Error playing local stream:', err);
      });
      console.log('✅ Local stream attached');
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => {
        console.error('❌ Error playing remote stream:', err);
      });
      console.log('✅ Remote stream attached');
    }
  }, [remoteStream]);

  // Debug logging for remote stream
  useEffect(() => {
    if (!remoteStream) return;
    
    const audioTracks = remoteStream.getAudioTracks();
    console.log('Remote audio tracks:', audioTracks);
    
    audioTracks.forEach((track, index) => {
      console.log(`Track ${index}:`, {
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label
      });
    });
  }, [remoteStream]);

  // Monitor remote stream states
  useEffect(() => {
    if (!remoteStream || !inCall) {
      setRemoteVideoEnabled(true);
      setRemoteAudioEnabled(true);
      return;
    }

    const updateStreamStates = () => {
      const videoTracks = remoteStream.getVideoTracks();
      const audioTracks = remoteStream.getAudioTracks();

      const videoEnabled = videoTracks.length > 0 && videoTracks.some(track => track.enabled);
      const audioEnabled = audioTracks.length > 0 && audioTracks.some(track => track.enabled);

      setRemoteVideoEnabled(videoEnabled);
      setRemoteAudioEnabled(audioEnabled);
    };

    updateStreamStates();
    const interval = setInterval(updateStreamStates, 1000);
    return () => clearInterval(interval);
  }, [remoteStream, inCall]);

  // Call duration timer
  useEffect(() => {
    if (!inCall) {
      setCallDuration(0);
      return;
    }

    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [inCall]);

  // Draggable PIP logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !pipRef.current) return;

      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Bounds checking
      const maxX = window.innerWidth - 200; // Assuming PIP width ~200px
      const maxY = window.innerHeight - 300; // Assuming PIP height ~300px (including controls)

      setPipPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'VIDEO') {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - pipPosition.x,
        y: e.clientY - pipPosition.y,
      };
      e.preventDefault();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleSpeaker = async () => {
    if (!remoteVideoRef.current) return;
    
    try {
      if (typeof remoteVideoRef.current.setSinkId === 'function') {
        // Switch between default output and speaker
        const sinkId = isSpeakerOn ? 'default' : '';
        await remoteVideoRef.current.setSinkId(sinkId);
        setIsSpeakerOn(!isSpeakerOn);
      } else {
        // Fallback: adjust volume
        remoteVideoRef.current.volume = isSpeakerOn ? 0.5 : 1.0;
        setIsSpeakerOn(!isSpeakerOn);
      }
    } catch (err) {
      console.error('Speaker toggle error:', err);
    }
  };

  // INCOMING CALL - Elegant gradient with animations
  if (isIncoming && !inCall) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 flex flex-col items-center justify-center z-50 p-6">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>

        <div className="relative z-10 flex flex-col items-center space-y-8 max-w-md w-full">
          {/* Animated caller avatar */}
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white bg-opacity-20 backdrop-blur-lg flex items-center justify-center text-6xl md:text-7xl shadow-2xl border-4 border-white border-opacity-30 animate-pulse">
              {callType === 'video' ? '📹' : '📞'}
            </div>
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-400 to-teal-400 opacity-60 animate-spin-slow"></div>
          </div>
          {/* Caller info */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              {callerName}
            </h1>
            <div className="flex items-center justify-center space-x-2 text-white text-opacity-90">
              <span className="text-xl">{callType === 'video' ? '🎥 Video Call' : '🎵 Voice Call'}</span>
            </div>
          </div>
          {/* Animated dots */}
          <div className="flex space-x-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-white rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
          {/* Action buttons */}
          <div className="flex space-x-8 pt-4">
            {/* Reject button */}
            <button
              onClick={onReject}
              className="group relative w-20 h-20 md:w-24 md:h-24 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-4xl text-white shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 hover:rotate-12"
            >
              <span className="transition-transform group-hover:scale-110">📵</span>
              <div className="absolute -inset-2 bg-red-400 rounded-full opacity-0 group-hover:opacity-30 blur-md transition-opacity"></div>
            </button>
            {/* Accept button */}
            <button
              onClick={onAccept}
              className="group relative w-20 h-20 md:w-24 md:h-24 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-4xl text-white shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 hover:-rotate-12"
            >
              <span className="transition-transform group-hover:scale-110">✅</span>
              <div className="absolute -inset-2 bg-green-400 rounded-full opacity-0 group-hover:opacity-30 blur-md transition-opacity"></div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VOICE CALL - Elegant interface
  if (inCall && callType === 'voice') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex flex-col items-center justify-between z-50 p-6">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>

        {/* Hidden Audio Elements */}
        <audio 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline
          className="hidden"
        />
        <audio 
          ref={localVideoRef} 
          autoPlay 
          muted 
          playsInline
          className="hidden"
        />

        {/* Header */}
        <div className="relative z-10 text-white text-center pt-8 w-full">
          <div className="flex items-center justify-center space-x-2 text-sm bg-black bg-opacity-30 rounded-full px-4 py-2 inline-block">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>VOICE CALL • {formatTime(callDuration)}</span>
          </div>
        </div>
        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 space-y-8 w-full max-w-md">
          {/* Animated avatar */}
          <div className="relative">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-full bg-white bg-opacity-20 backdrop-blur-lg flex items-center justify-center text-8xl shadow-2xl border-4 border-white border-opacity-30">
              {remoteAudioEnabled ? '👤' : '🔇'}
            </div>
            <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-40 animate-pulse"></div>
          </div>
          {/* Caller info */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
              {callerName}
            </h1>
            <p className="text-4xl md:text-5xl font-bold text-white text-opacity-90 font-mono tracking-wider">
              {formatTime(callDuration)}
            </p>
            {!remoteAudioEnabled && (
              <p className="text-lg text-yellow-300 flex items-center justify-center space-x-2">
                <span>🔇</span>
                <span>Remote audio muted</span>
              </p>
            )}
          </div>
        </div>
        {/* Controls */}
        <div className="relative z-10 flex space-x-6 pb-12">
          <button
            onClick={toggleMute}
            className={`group w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-600 bg-opacity-80 hover:bg-gray-700'
            }`}
          >
            <span className="transition-transform group-hover:scale-110">
              {isMuted ? '🎤' : '🔊'}
            </span>
          </button>
          <button
            onClick={toggleSpeaker}
            className={`group w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              isSpeakerOn
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-gray-600 bg-opacity-80 hover:bg-gray-700'
            }`}
          >
            <span className="transition-transform group-hover:scale-110">
              {isSpeakerOn ? '🔊' : '🔈'}
            </span>
          </button>
          <button
            onClick={onHangup}
            className="group w-20 h-20 md:w-24 md:h-24 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-4xl text-white shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95"
          >
            <span className="transition-transform group-hover:scale-110">📞</span>
            <div className="absolute -inset-2 bg-red-400 rounded-full opacity-0 group-hover:opacity-30 blur-md transition-opacity"></div>
          </button>
        </div>
      </div>
    );
  }

  // VIDEO CALL - Premium full-screen experience
  if (inCall && callType === 'video') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden">
        {/* Remote Video - Full Screen */}
        <div className="flex-1 relative bg-gray-900">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Remote video off state */}
          {!remoteVideoEnabled && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center z-10">
              <div className="text-8xl mb-4">👤</div>
              <h2 className="text-3xl font-bold text-white">{callerName}</h2>
              <p className="text-lg text-gray-400 mt-2 flex items-center space-x-2">
                <span>🎥</span>
                <span>Video is off</span>
              </p>
              {!remoteAudioEnabled && (
                <p className="text-sm text-yellow-400 mt-1 flex items-center space-x-1">
                  <span>🔇</span>
                  <span>Audio muted</span>
                </p>
              )}
            </div>
          )}

          {/* Status Bar */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center bg-black bg-opacity-60 backdrop-blur-lg rounded-2xl px-6 py-3 z-20 border border-white border-opacity-20">
            <div className="text-white flex items-center space-x-3">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">Secure Connection</span>
            </div>
            <div className="text-white text-xl font-bold font-mono bg-black bg-opacity-40 px-3 py-1 rounded-lg">
              {formatTime(callDuration)}
            </div>
          </div>

          {/* Local Video - Draggable PIP */}
          <div
            ref={pipRef}
            className="absolute w-32 h-48 md:w-44 md:h-64 rounded-2xl overflow-hidden border-4 border-white border-opacity-40 shadow-2xl bg-black z-20 transition-all duration-300 hover:scale-105 hover:border-opacity-60 cursor-move"
            style={{
              left: `${pipPosition.x}px`,
              top: `${pipPosition.y}px`,
            }}
            onMouseDown={handleMouseDown}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
                <div className="text-4xl">📷</div>
              </div>
            )}
            {/* Local video status */}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 rounded-full px-2 py-1 text-xs text-white">
              {isMuted ? '🔇' : '🎤'} {isVideoOn ? '📹' : '❌'}
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-black bg-opacity-90 backdrop-blur-lg px-6 py-6 flex justify-center space-x-4 border-t border-gray-800 z-20">
          {[
            {
              icon: isMuted ? '🎤' : '🔊',
              label: isMuted ? 'Unmute' : 'Mute',
              onClick: toggleMute,
              active: !isMuted,
              color: isMuted ? 'red' : 'gray'
            },
            {
              icon: isVideoOn ? '📹' : '❌',
              label: isVideoOn ? 'Camera Off' : 'Camera On',
              onClick: toggleVideo,
              active: isVideoOn,
              color: isVideoOn ? 'gray' : 'red'
            },
            {
              icon: isSpeakerOn ? '🔊' : '🔈',
              label: isSpeakerOn ? 'Speaker Off' : 'Speaker On',
              onClick: toggleSpeaker,
              active: isSpeakerOn,
              color: isSpeakerOn ? 'green' : 'gray'
            },
            {
              icon: '📞',
              label: 'Hang Up',
              onClick: onHangup,
              active: false,
              color: 'red',
              large: true
            },
            {
              icon: '🔄',
              label: 'Switch Camera',
              onClick: () => console.log('Switch camera'),
              active: false,
              color: 'gray'
            }
          ].map((button, index) => (
            <button
              key={index}
              onClick={button.onClick}
              className={`group relative flex flex-col items-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                button.large ? 'w-20 h-20' : 'w-16 h-16'
              }`}
            >
              <div className={`w-full h-full rounded-2xl flex items-center justify-center text-2xl shadow-2xl transition-all duration-300 ${
                button.color === 'red'
                  ? 'bg-red-500 hover:bg-red-600'
                  : button.color === 'green'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-600 bg-opacity-80 hover:bg-gray-700'
              }`}>
                <span className="transition-transform group-hover:scale-110">
                  {button.icon}
                </span>
              </div>
              <span className="absolute -bottom-6 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                {button.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}