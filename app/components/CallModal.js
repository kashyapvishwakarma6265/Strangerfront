'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Phone,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
  User,
  Clock,
  CameraOff,
} from 'lucide-react';

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
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [orientation, setOrientation] = useState('portrait');

  // Detect device orientation
  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        setAvailableCameras(cameras);
      } catch (error) {
        console.error('❌ Error getting cameras:', error);
      }
    };

    getCameras();
    navigator.mediaDevices?.addEventListener('devicechange', getCameras);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', getCameras);
    };
  }, []);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.autoplay = true;
      localVideoRef.current.playsInline = true;
      
      localVideoRef.current.play().catch((err) => {
        console.error('❌ Local video play error:', err);
      });
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.autoplay = true;
      remoteVideoRef.current.playsInline = true;
      
      const playRemote = () => {
        remoteVideoRef.current?.play().catch((err) => {
          console.error('❌ Remote video play error:', err);
          setTimeout(playRemote, 500);
        });
      };
      
      playRemote();
    }
  }, [remoteStream]);

  // Monitor remote video tracks
  useEffect(() => {
    if (!remoteStream || !inCall) {
      setRemoteVideoEnabled(true);
      return;
    }

    const checkTracks = () => {
      const videoTracks = remoteStream.getVideoTracks();
      const hasActiveVideo = videoTracks.some(
        (track) => track.enabled && track.readyState === 'live'
      );
      setRemoteVideoEnabled(hasActiveVideo);
    };

    checkTracks();
    const interval = setInterval(checkTracks, 1000);

    return () => clearInterval(interval);
  }, [remoteStream, inCall]);

  // Call duration timer
  useEffect(() => {
    if (!inCall) {
      setCallDuration(0);
      return;
    }

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [inCall]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
    }
  };

  const switchCamera = async () => {
    if (!localStream || availableCameras.length <= 1) return;

    try {
      const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
      const nextCamera = availableCameras[nextIndex];

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextCamera.deviceId } },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];

      if (window.currentPeerConnection) {
        const sender = window.currentPeerConnection
          .getSenders()
          .find((s) => s.track?.kind === 'video');
        
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      localStream.removeTrack(oldVideoTrack);
      localStream.addTrack(newVideoTrack);
      oldVideoTrack.stop();

      setCurrentCameraIndex(nextIndex);
      setIsFrontCamera(nextCamera.label.toLowerCase().includes('front'));
    } catch (error) {
      console.error('❌ Camera switch failed:', error);
    }
  };

  // Responsive dimensions based on orientation
  const getVideoLayout = () => {
    if (orientation === 'landscape') {
      return {
        container: 'flex-row',
        remote: 'flex-1',
        local: 'w-1/3 max-w-xs absolute bottom-4 right-4 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20',
        localVideo: 'w-full h-32 object-cover transform scale-x-[-1]',
      };
    }
    
    // Portrait mode (default)
    return {
      container: 'flex-col',
      remote: 'flex-1',
      local: 'absolute bottom-20 right-4 w-24 h-32 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20',
      localVideo: 'w-full h-full object-cover transform scale-x-[-1]',
    };
  };

  const layout = getVideoLayout();

  // INCOMING CALL UI - Responsive
  if (isIncoming && !inCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm mx-auto p-6 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl shadow-2xl text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
            </h2>
            <p className="text-lg text-purple-200 font-medium">{callerName}</p>
            <p className="text-sm text-purple-300 mt-2">is calling you...</p>
          </div>

          <div className="flex gap-4 justify-center mt-8">
            <button
              onClick={onReject}
              className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={onAccept}
              className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 animate-pulse"
            >
              <Phone className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE CALL UI - Responsive layout
  if (inCall || (!isIncoming && localStream)) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex">
        {/* Main video area */}
        <div className={`flex-1 flex ${layout.container} relative`}>
          
          {/* Remote Video - Main area */}
          <div className={`${layout.remote} relative bg-gray-900`}>
            {callType === 'video' ? (
              remoteVideoEnabled && remoteStream ? (
                <>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 rounded-full">
                    <span className="text-white text-sm font-medium">{callerName}</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                  <CameraOff className="w-12 h-12 text-gray-500 mb-3" />
                  <p className="text-gray-400 text-sm px-4 text-center">{callerName}'s camera is off</p>
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
                <User className="w-16 h-16 text-white/30 mb-4" />
                <p className="text-white/70 text-base font-medium">{callerName}</p>
                <p className="text-white/50 text-xs mt-2">Voice Call</p>
              </div>
            )}
          </div>

          {/* Local Video - Picture-in-picture */}
          {callType === 'video' && localStream && (
            <div className={layout.local}>
              {isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={layout.localVideo}
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <CameraOff className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="absolute top-1 left-1 px-2 py-0.5 bg-black/60 rounded-full">
                <span className="text-white text-xs">You</span>
              </div>
            </div>
          )}
        </div>

        {/* Top Status Bar */}
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">
              {formatTime(callDuration)}
            </span>
          </div>
        </div>

        {/* Bottom Controls - Responsive sizing */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent ${
          orientation === 'landscape' ? 'pb-6' : 'pb-4'
        }`}>
          <div className={`flex items-center justify-center gap-2 ${
            orientation === 'landscape' ? 'gap-3' : 'gap-2'
          }`}>
            
            {/* Mute */}
            <button
              onClick={toggleMute}
              className={`rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                orientation === 'landscape' 
                  ? 'w-12 h-12' 
                  : 'w-14 h-14'
              } ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              {isMuted ? (
                <MicOff className={orientation === 'landscape' ? "w-5 h-5 text-white" : "w-6 h-6 text-white"} />
              ) : (
                <Mic className={orientation === 'landscape' ? "w-5 h-5 text-white" : "w-6 h-6 text-white"} />
              )}
            </button>

            {/* Video Toggle */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                  orientation === 'landscape' 
                    ? 'w-12 h-12' 
                    : 'w-14 h-14'
                } ${
                  !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {isVideoEnabled ? (
                  <VideoIcon className={orientation === 'landscape' ? "w-5 h-5 text-white" : "w-6 h-6 text-white"} />
                ) : (
                  <VideoOff className={orientation === 'landscape' ? "w-5 h-5 text-white" : "w-6 h-6 text-white"} />
                )}
              </button>
            )}

            {/* Hang Up - Central and larger */}
            <button
              onClick={onHangup}
              className={`bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${
                orientation === 'landscape' 
                  ? 'w-14 h-14 mx-2' 
                  : 'w-16 h-16 mx-1'
              }`}
            >
              <Phone className={orientation === 'landscape' ? "w-6 h-6 text-white transform rotate-[135deg]" : "w-7 h-7 text-white transform rotate-[135deg]"} />
            </button>

            {/* Speaker */}
            <button
              onClick={toggleSpeaker}
              className={`rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                orientation === 'landscape' 
                  ? 'w-12 h-12' 
                  : 'w-14 h-14'
              } ${
                isSpeakerOn ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isSpeakerOn ? (
                <Volume2 className={orientation === 'landscape' ? "w-5 h-5 text-white" : "w-6 h-6 text-white"} />
              ) : (
                <VolumeX className={orientation === 'landscape' ? "w-5 h-5 text-white" : "w-6 h-6 text-white"} />
              )}
            </button>

            {/* Switch Camera */}
            {callType === 'video' && availableCameras.length > 1 && (
              <button
                onClick={switchCamera}
                className={`rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                  orientation === 'landscape' 
                    ? 'w-12 h-12' 
                    : 'w-14 h-14'
                } bg-white/20 hover:bg-white/30 backdrop-blur-sm`}
              >
                <RotateCcw className={orientation === 'landscape' ? "w-5 h-5 text-white" : "w-6 h-6 text-white"} />
              </button>
            )}
          </div>

          {/* Camera info */}
          {callType === 'video' && availableCameras.length > 0 && (
            <p className="text-center text-white/60 text-xs mt-3">
              {isFrontCamera ? '📱 Front Camera' : '📷 Back Camera'}
            </p>
          )}
        </div>

        {/* Voice call user info for video calls */}
        {callType === 'voice' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-black/30 rounded-2xl p-6 backdrop-blur-sm">
              <User className="w-20 h-20 text-white/40 mx-auto mb-4" />
              <p className="text-white text-xl font-semibold">{callerName}</p>
              <p className="text-white/60 text-sm mt-2">Voice Call</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}