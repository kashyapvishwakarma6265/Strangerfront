'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export function useWebRTC(socket, isConnected) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState(null);
  const [isIncoming, setIsIncoming] = useState(false);
  const [remotePeerId, setRemotePeerId] = useState(null);

  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      console.log('⚠️ Peer connection already exists');
      return peerConnectionRef.current;
    }

    console.log('🔧 Creating new RTCPeerConnection');
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = peerConnection;

    if (typeof window !== 'undefined') {
      window.currentPeerConnection = peerConnection;
    }

    // ICE Candidate handler
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('📡 Sending ICE candidate');
        socket.emit('webrtc:ice-candidate', { candidate: event.candidate });
      }
    };

    // CRITICAL: Track handler for receiving remote media
    peerConnection.ontrack = (event) => {
      console.log('📹 ontrack fired! Track:', event.track.kind, event.track.id);
      console.log('Track details:', {
        kind: event.track.kind,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        muted: event.track.muted,
      });

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        console.log('✅ Remote stream received:', stream.id);
        console.log('Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.id}`));
        
        remoteStreamRef.current = stream;
        setRemoteStream(stream);

        // CRITICAL: For audio-only calls, play audio immediately
        if (event.track.kind === 'audio') {
          console.log('🔊 Audio track received, preparing playback');
        }
      }
    };

    // Connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        console.log('✅ Peer connection established');
        setCallState('connected');
      } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
        console.log('❌ Connection lost');
        endCall();
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', peerConnection.iceConnectionState);
    };

    peerConnection.onsignalingstatechange = () => {
      console.log('📶 Signaling state:', peerConnection.signalingState);
    };

    return peerConnection;
  }, [socket]);

  // CRITICAL: Enhanced stream acquisition with proper audio constraints
  const startLocalStream = useCallback(async (isVideo = true) => {
    try {
      console.log(`🎥 Starting ${isVideo ? 'video+audio' : 'audio-only'} stream...`);

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // CRITICAL: Ensure audio is always captured
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
        },
        video: isVideo
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user',
              frameRate: { ideal: 30 },
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Local stream obtained:', stream.id);
      console.log('📊 Stream tracks:');
      stream.getTracks().forEach((track) => {
        console.log(`  ✓ ${track.kind}: ${track.label} (enabled: ${track.enabled}, muted: ${track.muted})`);
      });

      // CRITICAL: Verify audio track exists and is active
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track obtained from getUserMedia');
      }

      console.log('🔊 Audio track verified:', audioTracks[0].label);

      setLocalStream(stream);
      localStreamRef.current = stream;
      
      return stream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('Microphone/Camera permission denied. Please allow access in browser settings.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone/camera found. Please connect a device.');
      } else {
        alert(`Media access error: ${error.message}`);
      }
      
      throw error;
    }
  }, []);

  const endCall = useCallback(() => {
    console.log('📴 Ending call...');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`🛑 Stopped ${track.kind} track`);
      });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      
      if (typeof window !== 'undefined') {
        window.currentPeerConnection = null;
      }
    }

    if (socket && callState !== 'idle') {
      socket.emit('call:end');
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setCallType(null);
    setIsIncoming(false);
    setRemotePeerId(null);
    pendingCandidatesRef.current = [];
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    console.log('✅ Call ended and cleaned up');
  }, [socket, callState]);

  const initiateCall = useCallback(
    async (type = 'video') => {
      if (!socket || !isConnected) {
        console.error('❌ Socket not connected');
        alert('Not connected to server. Please wait...');
        return;
      }

      try {
        console.log(`📞 Initiating ${type} call...`);
        setCallType(type);
        setCallState('calling');
        setIsIncoming(false);

        // Get local stream (audio for voice call, audio+video for video call)
        const stream = await startLocalStream(type === 'video');
        
        // Create peer connection
        const peerConnection = createPeerConnection();

        // CRITICAL: Add each track individually with proper stream association
        stream.getTracks().forEach((track) => {
          console.log(`➕ Adding ${track.kind} track to peer connection`);
          const sender = peerConnection.addTrack(track, stream);
          console.log(`✅ Sender created:`, sender);
        });

        // Verify senders
        const senders = peerConnection.getSenders();
        console.log(`📡 Total senders: ${senders.length}`);
        senders.forEach((sender, index) => {
          console.log(`  Sender ${index}: ${sender.track?.kind}`);
        });

        // Notify remote peer
        socket.emit('call:initiate', { callType: type });
        console.log('📤 Call initiate signal sent');
        
      } catch (error) {
        console.error('❌ Error initiating call:', error);
        alert('Failed to start call: ' + error.message);
        setCallState('idle');
      }
    },
    [socket, isConnected, startLocalStream, createPeerConnection]
  );

  const acceptCall = useCallback(async () => {
    if (!socket || !remotePeerId) {
      console.error('❌ Cannot accept call');
      return;
    }

    try {
      console.log('✅ Accepting call from:', remotePeerId);
      setCallState('connecting');

      // Get local stream
      const stream = await startLocalStream(callType === 'video');
      
      // Create peer connection
      const peerConnection = createPeerConnection();

      // CRITICAL: Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log(`➕ Adding ${track.kind} track to peer connection`);
        const sender = peerConnection.addTrack(track, stream);
        console.log(`✅ Sender created:`, sender);
      });

      // Verify senders
      const senders = peerConnection.getSenders();
      console.log(`📡 Total senders: ${senders.length}`);

      // Notify caller
      socket.emit('call:accept', { to: remotePeerId });
      console.log('📤 Call accept signal sent');
      
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      alert('Failed to accept call: ' + error.message);
      rejectCall();
    }
  }, [socket, remotePeerId, callType, startLocalStream, createPeerConnection]);

  const rejectCall = useCallback(() => {
    console.log('❌ Rejecting call');
    
    if (socket && remotePeerId) {
      socket.emit('call:reject', { to: remotePeerId });
    }
    
    endCall();
  }, [socket, remotePeerId, endCall]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') {
      return;
    }

    console.log('🔌 Setting up WebRTC socket listeners');

    const handleIncomingCall = async ({ callType: type, from }) => {
      console.log(`📞 Incoming ${type} call from:`, from);
      setCallType(type);
      setCallState('ringing');
      setIsIncoming(true);
      setRemotePeerId(from);
    };

    const handleCallAccepted = async ({ from }) => {
      console.log('✅ Call accepted by:', from);
      setRemotePeerId(from);
      setCallState('connecting');

      try {
        const peerConnection = peerConnectionRef.current;
        
        if (!peerConnection) {
          throw new Error('Peer connection not initialized');
        }

        console.log('📝 Creating offer...');
        
        // CRITICAL: Explicitly request audio and video in offer
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });

        console.log('📝 Setting local description...');
        await peerConnection.setLocalDescription(offer);

        console.log('📤 Sending offer');
        socket.emit('webrtc:offer', { offer });
        
      } catch (error) {
        console.error('❌ Error creating offer:', error);
        endCall();
      }
    };

    const handleCallRejected = () => {
      console.log('❌ Call rejected');
      alert('Call was rejected');
      endCall();
    };

    const handleCallEnded = () => {
      console.log('📴 Call ended by remote peer');
      endCall();
    };

    const handleOffer = async ({ offer, from }) => {
      console.log('📥 Received offer from:', from);

      try {
        const peerConnection = peerConnectionRef.current;
        
        if (!peerConnection) {
          throw new Error('Peer connection not initialized');
        }

        console.log('📝 Setting remote description (offer)...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Process pending ICE candidates
        if (pendingCandidatesRef.current.length > 0) {
          console.log(`📡 Adding ${pendingCandidatesRef.current.length} pending ICE candidates`);
          
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
          
          pendingCandidatesRef.current = [];
        }

        console.log('📝 Creating answer...');
        const answer = await peerConnection.createAnswer();

        console.log('📝 Setting local description (answer)...');
        await peerConnection.setLocalDescription(answer);

        console.log('📤 Sending answer');
        socket.emit('webrtc:answer', { answer, to: from });
        
        setCallState('connected');
        
      } catch (error) {
        console.error('❌ Error handling offer:', error);
        endCall();
      }
    };

    const handleAnswer = async ({ answer }) => {
      console.log('📥 Received answer');

      try {
        const peerConnection = peerConnectionRef.current;
        
        if (!peerConnection) {
          throw new Error('Peer connection not initialized');
        }

        console.log('📝 Setting remote description (answer)...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

        // Process pending ICE candidates
        if (pendingCandidatesRef.current.length > 0) {
          console.log(`📡 Adding ${pendingCandidatesRef.current.length} pending ICE candidates`);
          
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
          
          pendingCandidatesRef.current = [];
        }

        setCallState('connected');
        console.log('✅ Answer processed');
        
      } catch (error) {
        console.error('❌ Error handling answer:', error);
        endCall();
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      console.log('📥 Received ICE candidate');

      try {
        const peerConnection = peerConnectionRef.current;
        
        if (peerConnection && peerConnection.remoteDescription) {
          console.log('➕ Adding ICE candidate immediately');
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          console.log('⏳ Queuing ICE candidate');
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket, callType, endCall]);

  return {
    localStream,
    remoteStream,
    callState,
    callType,
    isIncoming,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
  };
}
