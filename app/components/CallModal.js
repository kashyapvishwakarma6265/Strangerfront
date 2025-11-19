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
  const remoteAudioRef = useRef(null);
  
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [orientation, setOrientation] = useState('portrait');
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Detect orientation and window size
  useEffect(() => {
    const updateDimensions = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  // FIXED: Enhanced camera enumeration (runs after localStream for accurate labels on mobile)
  useEffect(() => {
    if (!localStream) return;

    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        console.log('📷 Available cameras:', cameras.map(c => ({ label: c.label || 'Unknown', deviceId: c.deviceId.substring(0, 8) + '...' })));
        setAvailableCameras(cameras);

        if (cameras.length > 0) {
          // Assume first is front on mobile; check label for accuracy
          const firstCamera = cameras[0];
          const isFront = firstCamera.label.toLowerCase().includes('front') || 
                          firstCamera.label.toLowerCase().includes('face') || 
                          firstCamera.label.toLowerCase().includes('user') ||
                          firstCamera.label === ''; // Fallback if label empty (common on mobile pre-perms)
          setIsFrontCamera(isFront);
          setCurrentCameraIndex(0);
        }
      } catch (error) {
        console.error('❌ Error getting cameras:', error);
      }
    };

    getCameras();

    const handleDeviceChange = () => getCameras();
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
  }, [localStream]);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream && callType === 'video') {
      console.log('🎥 Attaching local video stream');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localStream, callType]);

  // Attach remote stream to VIDEO element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && callType === 'video') {
      console.log('📹 Attaching remote video stream');
      
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.autoplay = true;
      remoteVideoRef.current.playsInline = true;
      
      remoteVideoRef.current.play().catch((err) => {
        console.error('❌ Remote video play error:', err);
      });
    }
  }, [remoteStream, callType]);

  // Attach remote stream to AUDIO element
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      console.log('🔊 Attaching remote audio stream');
      
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.autoplay = true;
      remoteAudioRef.current.muted = false;
      
      const playAudio = async () => {
        try {
          await remoteAudioRef.current.play();
          console.log('✅ Remote audio playing');
        } catch (err) {
          console.error('❌ Remote audio play error:', err);
          setTimeout(playAudio, 500);
        }
      };
      
      playAudio();
    }
  }, [remoteStream]);

  // Monitor remote tracks
  useEffect(() => {
    if (!remoteStream || !inCall) {
      setRemoteVideoEnabled(true);
      return;
    }

    const checkTracks = () => {
      const videoTracks = remoteStream.getVideoTracks();
      const audioTracks = remoteStream.getAudioTracks();
      
      const hasActiveVideo = videoTracks.some(
        (track) => track.enabled && track.readyState === 'live'
      );
      
      setRemoteVideoEnabled(hasActiveVideo);
    };

    checkTracks();
    const interval = setInterval(checkTracks, 1000);

    return () => clearInterval(interval);
  }, [remoteStream, inCall]);

  // Timer
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
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !newSpeakerState;
    }
    
    if (remoteVideoRef.current && callType === 'video') {
      remoteVideoRef.current.muted = !newSpeakerState;
    }
  };

  // FIXED: switchCamera - Use only ideal facingMode, add delay after stop, no deviceId, no alert, better scoping
  const switchCamera = async () => {
    if (!localStream) {
      console.warn('⚠️ Cannot switch: No local stream');
      return;
    }

    const oldVideoTrack = localStream.getVideoTracks()[0];
    if (!oldVideoTrack || oldVideoTrack.readyState === 'ended') {
      console.error('❌ No active old video track to replace');
      return;
    }

    const targetFacingMode = isFrontCamera ? 'environment' : 'user';
    console.log(`🔄 Switching to ${targetFacingMode} mode (from ${isFrontCamera ? 'front' : 'back'})`);

    // CRITICAL: Stop and remove old track FIRST with delay to release hardware
    oldVideoTrack.stop();
    localStream.removeTrack(oldVideoTrack);
    console.log('🛑 Old video track stopped and removed');

    // Delay to ensure hardware release (common mobile fix)
    await new Promise(resolve => setTimeout(resolve, 200));

    let newVideoTrack = null;
    let tempStream = null;
    let success = false;

    // Layer 1: Ideal facingMode only (avoids OverconstrainedError)
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: targetFacingMode } },
        audio: false,
      });
      newVideoTrack = tempStream.getVideoTracks()[0];
      console.log('✅ Ideal facingMode succeeded');
      success = true;
    } catch (error) {
      console.warn(`⚠️ Ideal facingMode failed (${error.name}):`, error.message);
    }

    // Layer 2: Fallback to no facingMode (let browser choose opposite)
    if (!success) {
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({
          video: true, // No constraints, browser picks available
          audio: false,
        });
        newVideoTrack = tempStream.getVideoTracks()[0];
        // Assume toggle based on previous
        console.log('✅ Unconstrained fallback succeeded (browser choice)');
        success = true;
      } catch (fallbackError) {
        console.error('❌ Unconstrained fallback failed:', fallbackError);
      }
    }

    if (!success || !newVideoTrack) {
      console.error('❌ All camera switch attempts failed');
      // Silent restore to front camera without alert
      try {
        console.log('🔄 Silently restoring front camera');
        const restoreStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' } },
          audio: false,
        });
        const restoreTrack = restoreStream.getVideoTracks()[0];
        localStream.addTrack(restoreTrack);
        setIsFrontCamera(true);
        console.log('✅ Front camera restored silently');
      } catch (restoreError) {
        console.error('❌ Failed to restore front camera:', restoreError);
        // If restore fails, end call or show toast (but no alert)
      }
      return; // Exit without alert
    }

    // Success: Add new track
    localStream.addTrack(newVideoTrack);
    console.log('➕ New video track added to local stream');

    // Replace in peer connection
    const peerConnection = window?.currentPeerConnection;
    if (peerConnection) {
      const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        try {
          await sender.replaceTrack(newVideoTrack);
          console.log('🔄 Track replaced in peer connection');
        } catch (replaceError) {
          console.error('❌ replaceTrack failed:', replaceError);
        }
      }
    }

    // Clean up tempStream
    if (tempStream) {
      tempStream.getTracks().forEach(track => {
        if (track !== newVideoTrack) track.stop();
      });
    }

    // Update state
    setIsFrontCamera(!isFrontCamera);

    // Optional: Apply mild constraints post-switch
    try {
      await newVideoTrack.applyConstraints({
        width: { ideal: 640 }, // Lower to avoid issues
        height: { ideal: 480 },
      });
      console.log('📐 Mild constraints applied');
    } catch (applyError) {
      console.warn('⚠️ Could not apply constraints:', applyError);
    }

    console.log('✅ Camera switch complete');
  };

  // Responsive layout calculations
  const getResponsiveStyles = () => {
    const isSmallScreen = windowSize.width < 640;
    const isTablet = windowSize.width >= 640 && windowSize.width < 1024;
    
    if (orientation === 'landscape') {
      return {
        container: 'flex-row',
        remoteVideo: 'flex-1',
        localVideo: isSmallScreen 
          ? 'w-1/4 h-32 absolute bottom-4 right-4 rounded-lg' 
          : 'w-1/4 h-40 absolute bottom-6 right-6 rounded-xl',
        controls: {
          container: 'p-4 pb-6',
          buttonSize: isSmallScreen ? 'w-12 h-12' : 'w-14 h-14',
          hangupSize: isSmallScreen ? 'w-14 h-14' : 'w-16 h-16',
          iconSize: isSmallScreen ? 'w-5 h-5' : 'w-6 h-6',
          gap: 'gap-3'
        },
        statusBar: 'p-3',
        userInfo: 'text-base'
      };
    }
    
    // Portrait mode
    return {
      container: 'flex-col',
      remoteVideo: 'flex-1',
      localVideo: isSmallScreen 
        ? 'w-24 h-32 absolute bottom-20 right-4 rounded-lg'
        : 'w-32 h-40 absolute bottom-24 right-6 rounded-xl',
      controls: {
        container: isSmallScreen ? 'p-4 pb-5' : 'p-6 pb-8',
        buttonSize: isSmallScreen ? 'w-14 h-14' : 'w-16 h-16',
        hangupSize: isSmallScreen ? 'w-16 h-16' : 'w-20 h-20',
        iconSize: isSmallScreen ? 'w-6 h-6' : 'w-7 h-7',
        gap: 'gap-4'
      },
      statusBar: isSmallScreen ? 'p-3' : 'p-4',
      userInfo: isSmallScreen ? 'text-sm' : 'text-base'
    };
  };

  const styles = getResponsiveStyles();

  // FIXED: Conditionally mirror local video only for front camera
  const localVideoMirrorClass = isFrontCamera ? 'transform scale-x-[-1]' : '';

  // INCOMING CALL UI - Responsive
  if (isIncoming && !inCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 safe-area-bottom">
        <div className="w-full max-w-sm mx-auto p-6 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl shadow-2xl text-center">
          <div className="mb-6">
            <div className={`${windowSize.width < 640 ? 'w-20 h-20' : 'w-24 h-24'} mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-lg`}>
              <User className={`${windowSize.width < 640 ? 'w-10 h-10' : 'w-12 h-12'} text-white`} />
            </div>
            <h2 className={`${windowSize.width < 640 ? 'text-xl' : 'text-2xl'} font-bold text-white mb-2`}>
              {callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
            </h2>
            <p className={`${windowSize.width < 640 ? 'text-base' : 'text-lg'} text-purple-200 font-medium`}>{callerName}</p>
            <p className={`${windowSize.width < 640 ? 'text-xs' : 'text-sm'} text-purple-300 mt-2`}>is calling you...</p>
          </div>

          <div className="flex gap-4 justify-center mt-8">
            <button
              onClick={onReject}
              className={`${windowSize.width < 640 ? 'w-14 h-14' : 'w-16 h-16'} bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95`}
            >
              <X className={`${windowSize.width < 640 ? 'w-6 h-6' : 'w-7 h-7'} text-white`} />
            </button>
            <button
              onClick={onAccept}
              className={`${windowSize.width < 640 ? 'w-14 h-14' : 'w-16 h-16'} bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 animate-pulse`}
            >
              <Phone className={`${windowSize.width < 640 ? 'w-6 h-6' : 'w-7 h-7'} text-white`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE CALL UI - Responsive
  if (inCall || (!isIncoming && localStream)) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex safe-area-bottom">
        {/* Hidden audio element */}
        <audio ref={remoteAudioRef} autoPlay playsInline />
        
        {/* Main video container */}
        <div className={`flex-1 flex ${styles.container} relative`}>
          
          {/* Remote Video Area */}
          <div className={`${styles.remoteVideo} relative bg-gray-900`}>
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
                    <span className={`text-white ${styles.userInfo} font-medium`}>{callerName}</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                  <CameraOff className={`${windowSize.width < 640 ? 'w-12 h-12' : 'w-16 h-16'} text-gray-500 mb-3`} />
                  <p className="text-gray-400 text-sm text-center px-4">{callerName}'s camera is off</p>
                </div>
              )
            ) : (
              // Voice call display
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
                <User className={`${windowSize.width < 640 ? 'w-16 h-16' : 'w-24 h-24'} text-white/30 mb-4`} />
                <p className="text-white/70 text-lg font-medium">{callerName}</p>
                <p className="text-white/50 text-sm mt-2">🔊 Voice Call</p>
                {remoteStream && (
                  <p className="text-green-400 text-xs mt-4">✓ Connected</p>
                )}
              </div>
            )}
          </div>

          {/* Local Video PIP */}
          {callType === 'video' && localStream && localStream.getVideoTracks().length > 0 && (
            <div className={`${styles.localVideo} overflow-hidden shadow-2xl border-2 border-white/20 bg-black`}>
              {isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${localVideoMirrorClass}`}
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

        {/* Status Bar */}
        <div className={`absolute top-0 left-0 right-0 ${styles.statusBar} bg-gradient-to-b from-black/80 to-transparent pointer-events-none`}>
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-semibold">
              {formatTime(callDuration)}
            </span>
          </div>
        </div>

        {/* Voice call local user display */}
        {callType === 'voice' && (
          <div className="absolute bottom-24 left-4 bg-black/60 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">You</p>
                <p className="text-green-400 text-xs">{isMuted ? '🔇 Muted' : '🎤 Speaking...'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Control Bar */}
        <div className={`absolute bottom-0 left-0 right-0 ${styles.controls.container} bg-gradient-to-t from-black/95 via-black/80 to-transparent`}>
          <div className={`flex items-center justify-center ${styles.controls.gap}`}>
            
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`${styles.controls.buttonSize} rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              {isMuted ? (
                <MicOff className={`${styles.controls.iconSize} text-white`} />
              ) : (
                <Mic className={`${styles.controls.iconSize} text-white`} />
              )}
            </button>

            {/* Video Toggle */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`${styles.controls.buttonSize} rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                  !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {isVideoEnabled ? (
                  <VideoIcon className={`${styles.controls.iconSize} text-white`} />
                ) : (
                  <VideoOff className={`${styles.controls.iconSize} text-white`} />
                )}
              </button>
            )}

            {/* Hang Up Button */}
            <button
              onClick={onHangup}
              className={`${styles.controls.hangupSize} bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 mx-2`}
            >
              <Phone className={`${styles.controls.iconSize} text-white transform rotate-[135deg]`} />
            </button>

            {/* Speaker Button */}
            <button
              onClick={toggleSpeaker}
              className={`${styles.controls.buttonSize} rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                isSpeakerOn ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isSpeakerOn ? (
                <Volume2 className={`${styles.controls.iconSize} text-white`} />
              ) : (
                <VolumeX className={`${styles.controls.iconSize} text-white`} />
              )}
            </button>

            {/* Camera Switch - Hide if only one camera to avoid failures */}
            {callType === 'video' && availableCameras.length > 1 && (
              <button
                onClick={switchCamera}
                className={`${styles.controls.buttonSize} bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95`}
                title="Switch Camera"
              >
                <RotateCcw className={`${styles.controls.iconSize} text-white`} />
              </button>
            )}
          </div>

          {/* Camera info for video calls */}
          {callType === 'video' && availableCameras.length > 0 && (
            <p className="text-center text-white/60 text-xs mt-3">
              {isFrontCamera ? '📱 Front Camera' : '📷 Back Camera'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}