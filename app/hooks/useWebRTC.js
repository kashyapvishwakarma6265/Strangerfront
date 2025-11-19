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

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = peerConnection;

    if (typeof window !== 'undefined') {
      window.currentPeerConnection = peerConnection;
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('📡 Sending ICE candidate');
        socket.emit('webrtc:ice-candidate', { candidate: event.candidate });
      }
    };

    // FIXED: Properly handle remote tracks
    peerConnection.ontrack = (event) => {
      console.log('📹 Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log('📹 Setting remote stream with tracks:', event.streams[0].getTracks().length);
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        setCallState('connected');
      } else if (
        peerConnection.connectionState === 'disconnected' ||
        peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'closed'
      ) {
        endCall();
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE Connection state:', peerConnection.iceConnectionState);
    };

    return peerConnection;
  }, [socket]);

  const startLocalStream = useCallback(async (isVideo = true) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user',
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('🎥 Local stream started with tracks:', stream.getTracks().length);

      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please grant permissions.');
      throw error;
    }
  }, []);

  const endCall = useCallback(() => {
    console.log('📴 Ending call');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
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
  }, [socket, callState]);

  const initiateCall = useCallback(
    async (type = 'video') => {
      if (!socket || !isConnected) {
        console.error('❌ Socket not connected');
        return;
      }

      try {
        console.log(`📞 Initiating ${type} call`);
        setCallType(type);
        setCallState('calling');
        setIsIncoming(false);

        const stream = await startLocalStream(type === 'video');
        const peerConnection = createPeerConnection();

        // FIXED: Add tracks properly
        stream.getTracks().forEach((track) => {
          console.log(`Adding ${track.kind} track to peer connection`);
          peerConnection.addTrack(track, stream);
        });

        socket.emit('call:initiate', { callType: type });
      } catch (error) {
        console.error('❌ Error initiating call:', error);
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
      console.log('✅ Accepting call');
      setCallState('connecting');

      const stream = await startLocalStream(callType === 'video');
      const peerConnection = createPeerConnection();

      // FIXED: Add tracks properly
      stream.getTracks().forEach((track) => {
        console.log(`Adding ${track.kind} track to peer connection`);
        peerConnection.addTrack(track, stream);
      });

      socket.emit('call:accept', { to: remotePeerId });
    } catch (error) {
      console.error('❌ Error accepting call:', error);
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
      console.log('⚠️ Socket not available yet');
      return;
    }

    console.log('✅ Setting up WebRTC socket listeners');

    const handleIncomingCall = async ({ callType: type, from }) => {
      console.log(`📞 Incoming ${type} call from ${from}`);
      setCallType(type);
      setCallState('ringing');
      setIsIncoming(true);
      setRemotePeerId(from);
    };

    const handleCallAccepted = async ({ from }) => {
      console.log('✅ Call accepted by', from);
      setRemotePeerId(from);
      setCallState('connecting');

      try {
        const peerConnection = peerConnectionRef.current;
        if (peerConnection) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          console.log('📤 Sending offer');
          socket.emit('webrtc:offer', { offer });
        }
      } catch (error) {
        console.error('❌ Error creating offer:', error);
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
      console.log('📥 Received offer from', from);

      try {
        const peerConnection = peerConnectionRef.current;
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

          // Add pending ICE candidates
          pendingCandidatesRef.current.forEach(async (candidate) => {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          });
          pendingCandidatesRef.current = [];

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log('📤 Sending answer');
          socket.emit('webrtc:answer', { answer, to: from });
          setCallState('connected');
        }
      } catch (error) {
        console.error('❌ Error handling offer:', error);
      }
    };

    const handleAnswer = async ({ answer }) => {
      console.log('📥 Received answer');

      try {
        const peerConnection = peerConnectionRef.current;
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

          // Add pending ICE candidates
          pendingCandidatesRef.current.forEach(async (candidate) => {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          });
          pendingCandidatesRef.current = [];
          setCallState('connected');
        }
      } catch (error) {
        console.error('❌ Error handling answer:', error);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      console.log('📥 Received ICE candidate');

      try {
        const peerConnection = peerConnectionRef.current;
        if (peerConnection && peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
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
      console.log('🧹 Cleaning up WebRTC socket listeners');
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket, endCall]);

  // Function to update local stream (for camera switching)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.updateLocalStream = (newStream) => {
        setLocalStream(newStream);
        localStreamRef.current = newStream;
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete window.updateLocalStream;
      }
    };
  }, []);

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
