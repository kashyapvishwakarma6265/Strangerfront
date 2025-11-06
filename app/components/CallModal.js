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

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log('✅ Local stream attached');
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log('✅ Remote stream attached');
    }
  }, [remoteStream]);

  // Call duration timer
  useEffect(() => {
    if (!inCall) return;
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [inCall]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  // INCOMING CALL - Teal theme
  if (isIncoming && !inCall) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-teal-600 to-teal-800 flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center flex-1 justify-center space-y-8">
          <div className="relative">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-teal-700 flex items-center justify-center text-9xl shadow-2xl animate-pulse">👤</div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-teal-400 rounded-full flex items-center justify-center text-5xl animate-bounce">
              {callType === 'video' ? '📹' : '📞'}
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white">{callerName}</h1>
            <p className="text-xl md:text-2xl text-teal-100 mt-2 tracking-widest">{callType?.toUpperCase()} CALL</p>
          </div>

          <div className="flex gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        <div className="flex gap-12 pb-20">
          <button onClick={onReject} className="w-20 h-20 md:w-24 md:h-24 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-5xl text-white shadow-2xl transition-all transform hover:scale-110 active:scale-95">☎️</button>
          <button onClick={onAccept} className="w-20 h-20 md:w-24 md:h-24 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-5xl text-white shadow-2xl transition-all transform hover:scale-110 active:scale-95">✅</button>
        </div>
      </div>
    );
  }

  // VOICE CALL
  if (inCall && callType === 'voice') {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-teal-600 to-teal-800 flex flex-col items-center justify-between z-50 p-4">
        <div className="text-white text-center pt-8">
          <p className="text-sm opacity-70">📱 VOICE CALL</p>
        </div>

        <div className="flex flex-col items-center justify-center flex-1">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-teal-700 flex items-center justify-center text-9xl shadow-2xl">👤</div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-8">{callerName}</h1>
          <p className="text-5xl md:text-6xl font-bold text-teal-100 font-mono mt-6">{formatTime(callDuration)}</p>
        </div>

        <div className="flex gap-6 pb-12">
          <button onClick={() => { if (localStream) { localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled); setIsMuted(!isMuted); } }} className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-4xl shadow-lg transition-all transform hover:scale-110 active:scale-95 ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}>{isMuted ? '🔇' : '🔊'}</button>
          <button onClick={onHangup} className="w-20 h-20 md:w-24 md:h-24 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-5xl text-white shadow-2xl transition-all transform hover:scale-110 active:scale-95">☎️</button>
        </div>
      </div>
    );
  }

  // VIDEO CALL - Full screen with PIP
  if (inCall && callType === 'video') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden">
        <div className="flex-1 relative bg-black">
          {/* Remote Video - Full Screen */}
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />

          {/* Top Status Bar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center bg-black bg-opacity-60 rounded-lg px-4 py-2 z-10">
            <div className="text-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Connected
            </div>
            <div className="text-white text-2xl font-bold font-mono">{formatTime(callDuration)}</div>
          </div>

          {/* Local Video - Picture in Picture */}
          <div className="absolute bottom-24 right-4 w-28 h-40 md:w-40 md:h-56 rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-black z-20">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black bg-opacity-90 px-4 py-6 flex justify-center gap-6 border-t border-gray-700 flex-wrap z-20">
          <button onClick={() => { if (localStream) { localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled); setIsMuted(!isMuted); } }} className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg transition-all transform hover:scale-110 active:scale-95 ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}>{isMuted ? '🎤' : '🔊'}</button>
          <button onClick={() => { if (localStream) { localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled); setIsVideoOn(!isVideoOn); } }} className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg transition-all transform hover:scale-110 active:scale-95 ${isVideoOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}`}>{isVideoOn ? '📹' : '❌'}</button>
          <button className="w-16 h-16 md:w-20 md:h-20 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg transition-all transform hover:scale-110 active:scale-95">🔉</button>
          <button onClick={onHangup} className="w-20 h-20 md:w-24 md:h-24 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-4xl md:text-5xl text-white shadow-2xl transition-all transform hover:scale-110 active:scale-95">☎️</button>
          <button className="w-16 h-16 md:w-20 md:h-20 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg transition-all transform hover:scale-110 active:scale-95">🔄</button>
        </div>
      </div>
    );
  }

  return null;
}
