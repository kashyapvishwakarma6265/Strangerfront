'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Phone, Mic, MicOff, Video, VideoOff, Volume2, VolumeX,
  RotateCcw, X, User, Clock, Signal, Camera, CameraOff
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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        console.log('Available cameras:', cameras);
      } catch (error) {
        console.error('Error getting cameras:', error);
      }
    };

    getCameras();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getCameras);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getCameras);
    };
  }, []);

  // Attach streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Monitor remote tracks
  useEffect(() => {
    if (!remoteStream || !inCall) {
      setRemoteVideoEnabled(true);
      setRemoteAudioEnabled(true);
      return;
    }

    const update = () => {
      const videoOn = remoteStream.getVideoTracks().some(t => t.enabled);
      const audioOn = remoteStream.getAudioTracks().some(t => t.enabled);
      setRemoteVideoEnabled(videoOn);
      setRemoteAudioEnabled(audioOn);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [remoteStream, inCall]);

  // Timer
  useEffect(() => {
    if (!inCall) {
      setCallDuration(0);
      return;
    }
    const t = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [inCall]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = async () => {
    if (!remoteVideoRef.current) return;
    try {
      if ('setSinkId' in HTMLMediaElement.prototype) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const speakers = devices.filter(d => d.kind === 'audiooutput');
        const newSink = isSpeakerOn ? 'default' : speakers[0]?.deviceId || 'default';
        await remoteVideoRef.current.setSinkId(newSink);
      }
      setIsSpeakerOn(!isSpeakerOn);
    } catch (err) {
      console.error('Speaker toggle failed:', err);
    }
  };

  // Enhanced Camera Switch Logic
  const switchCamera = async () => {
    if (!localStream) return;

    try {
      // If we have multiple cameras, cycle through them
      if (availableCameras.length > 1) {
        const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
        const nextCamera = availableCameras[nextIndex];

        console.log('Switching to camera:', nextCamera.label, nextCamera.deviceId);

        const constraints = {
          video: {
            deviceId: { exact: nextCamera.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        };

        // Get new stream with specific camera
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newVideoTrack = newStream.getVideoTracks()[0];
        const audioTracks = localStream.getAudioTracks();

        if (!newVideoTrack) {
          throw new Error('No video track found in new stream');
        }

        // Replace video track in all RTCPeerConnection senders
        if (window.RTCPeerConnection) {
          const pc = window.currentPeerConnection;
          if (pc) {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newVideoTrack);
            }
          }
        }

        // Create new local stream with new video and existing audio
        const updatedStream = new MediaStream();
        
        // Add new video track
        updatedStream.addTrack(newVideoTrack);
        
        // Add existing audio tracks
        audioTracks.forEach(track => {
          updatedStream.addTrack(track);
        });

        // Update local stream reference
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = updatedStream;
        }

        // Stop old video tracks
        localStream.getVideoTracks().forEach(track => track.stop());

        // Update state
        const isFront = nextCamera.label.toLowerCase().includes('front') || 
                       nextIndex === 0; // Assume first camera is front
        setIsFrontCamera(isFront);
        setCurrentCameraIndex(nextIndex);

        // Update parent component's local stream if possible
        if (typeof window.updateLocalStream === 'function') {
          window.updateLocalStream(updatedStream);
        }

      } else {
        // Fallback to facingMode if only one camera or deviceId fails
        const constraints = {
          video: {
            facingMode: isFrontCamera ? 'environment' : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        const newTrack = newStream.getVideoTracks()[0];
        const audioTracks = localStream.getAudioTracks();

        if (window.RTCPeerConnection) {
          const pc = window.currentPeerConnection;
          if (pc) {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              await sender.replaceTrack(newTrack);
            }
          }
        }

        const updatedStream = new MediaStream();
        updatedStream.addTrack(newTrack);
        audioTracks.forEach(track => updatedStream.addTrack(track));

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = updatedStream;
        }

        localStream.getVideoTracks().forEach(track => track.stop());
        setIsFrontCamera(!isFrontCamera);

        if (typeof window.updateLocalStream === 'function') {
          window.updateLocalStream(updatedStream);
        }
      }

    } catch (err) {
      console.error('Camera switch failed:', err);
    }
  };

  // INCOMING CALL
  if (isIncoming && !inCall) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 flex flex-col items-center justify-center z-50 p-4 supports-[backdrop-filter]:backdrop-blur-sm">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 text-center space-y-8 max-w-md w-full">
          <div className="relative mx-auto">
            <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center border-4 border-white/30 animate-pulse">
              {callType === 'video' ? <Video className="w-16 h-16 text-white" /> : <Phone className="w-16 h-16 text-white" />}
            </div>
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-400 to-teal-400 opacity-60 animate-spin-slow"></div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">{callerName}</h1>
            <p className="text-xl text-white/90">{callType === 'video' ? 'Video Call' : 'Voice Call'}</p>
          </div>

          <div className="flex justify-center space-x-8">
            <button onClick={onReject} className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 active:scale-95 transition">
              <X className="w-10 h-10 text-white" />
            </button>
            <button onClick={onAccept} className="w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 active:scale-95 transition">
              <Phone className="w-10 h-10 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VOICE CALL
  if (inCall && callType === 'voice') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex flex-col justify-between z-50 supports-[backdrop-filter]:backdrop-blur-sm">
        <audio ref={remoteVideoRef} autoPlay playsInline />
        <audio ref={localVideoRef} autoPlay muted playsInline />

        <div className="text-center pt-safe-offset-8">
          <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur rounded-full px-4 py-2 text-white text-sm">
            <Signal className="w-4 h-4 text-green-400 animate-pulse" />
            <span>{formatTime(callDuration)}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <div className="w-40 h-40 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center border-4 border-white/30">
              {remoteAudioEnabled ? <User className="w-20 h-20 text-white" /> : <MicOff className="w-20 h-20 text-yellow-400" />}
            </div>
            <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-40 animate-pulse"></div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white">{callerName}</h1>
            <p className="text-5xl font-mono text-white/90 mt-4">{formatTime(callDuration)}</p>
          </div>
        </div>

        <div className="pb-safe-offset-8 flex justify-center gap-6 p-6">
          <button onClick={toggleMute} className={`w-16 h-16 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600/80'} hover:scale-110 transition`}>
            {isMuted ? <MicOff className="w-8 h-8 text-white mx-auto" /> : <Mic className="w-8 h-8 text-white mx-auto" />}
          </button>
          <button onClick={toggleSpeaker} className={`w-16 h-16 rounded-full ${isSpeakerOn ? 'bg-green-500' : 'bg-gray-600/80'} hover:scale-110 transition`}>
            {isSpeakerOn ? <Volume2 className="w-8 h-8 text-white mx-auto" /> : <VolumeX className="w-8 h-8 text-white mx-auto" />}
          </button>
          <button onClick={onHangup} className="w-20 h-20 bg-red-500 rounded-full hover:scale-110 transition">
            <Phone className="w-10 h-10 text-white mx-auto" />
          </button>
        </div>
      </div>
    );
  }

  // VIDEO CALL - NO MIRROR EFFECT + CAMERA SWITCHING
  if (inCall && callType === 'video') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Remote Video Background */}
        <div className="flex-1 relative">
          {remoteVideoEnabled ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center">
              <User className="w-24 h-24 text-white mb-4" />
              <p className="text-3xl text-white font-bold">{callerName}</p>
              <p className="text-lg text-gray-400 mt-2 flex items-center gap-2">
                <VideoOff className="w-6 h-6" /> Video paused
              </p>
            </div>
          )}

          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 pt-safe-offset-4 px-4 pb-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex justify-between items-center text-white">
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-3 py-1.5">
                <Signal className="w-4 h-4 text-green-400 animate-pulse" />
                <span className="text-sm">Secure • {formatTime(callDuration)}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-3 py-1.5">
                <Camera className="w-4 h-4 text-white" />
                <span className="text-sm">
                  {isFrontCamera ? 'Front Camera' : 'Back Camera'}
                </span>
              </div>
            </div>
          </div>

          {/* Local Preview (PIP) - No mirror effect */}
          <div className="absolute bottom-24 right-2 w-24 h-32 sm:w-32 sm:h-44 bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(1)' }} // Remove mirror effect
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-white font-medium">You</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gradient-to-t from-black/90 to-black/50 backdrop-blur-lg p-3 sm:p-4 pb-safe-offset-4">
          <div className="flex justify-center items-center gap-2 sm:gap-4">
            {/* Mute Button */}
            <button 
              onClick={toggleMute} 
              className={`p-3 sm:p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-white/20'} backdrop-blur hover:scale-110 transition transform active:scale-95`}
            >
              {isMuted ? 
                <MicOff className="w-5 h-5 sm:w-7 sm:h-7 text-white" /> : 
                <Mic className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              }
            </button>

            {/* Camera Switch Button - Always show if video call */}
            <button 
              onClick={switchCamera} 
              className="p-3 sm:p-4 rounded-full bg-white/20 backdrop-blur hover:scale-110 transition transform active:scale-95"
              title={`Switch to ${isFrontCamera ? 'back' : 'front'} camera`}
            >
              <RotateCcw className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </button>

            {/* Camera Status Indicator */}
            <div className="p-3 sm:p-4 rounded-full bg-white/20 backdrop-blur">
              {isFrontCamera ? 
                <Camera className="w-5 h-5 sm:w-7 sm:h-7 text-green-400" /> : 
                <CameraOff className="w-5 h-5 sm:w-7 sm:h-7 text-yellow-400" />
              }
            </div>

            {/* Speaker Button */}
            <button 
              onClick={toggleSpeaker} 
              className={`p-3 sm:p-4 rounded-full ${isSpeakerOn ? 'bg-green-500' : 'bg-white/20'} backdrop-blur hover:scale-110 transition transform active:scale-95`}
            >
              {isSpeakerOn ? 
                <Volume2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" /> : 
                <VolumeX className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              }
            </button>

            {/* Hangup Button */}
            <button 
              onClick={onHangup} 
              className="p-4 sm:p-5 bg-red-500 rounded-full hover:scale-110 transition transform active:scale-95"
            >
              <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </button>
          </div>

          {/* Camera Info */}
          <div className="mt-3 text-center">
            <p className="text-xs text-white/70">
              {availableCameras.length > 1 
                ? `${availableCameras.length} cameras available • Current: ${isFrontCamera ? 'Front' : 'Back'}`
                : `1 camera available • ${isFrontCamera ? 'Front' : 'Back'}`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}