'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initSocket } from '@/lib/socket';
import ChatHeader from './ChatHeader';
import InputBar from './InputBar';
import MessageWithUser from './MessageWithUser';
import MediaMessage from './MediaMessage';
import TypingIndicator from './TypingIndicator';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [strangerName, setStrangerName] = useState('Stranger');
  const [sendingMedia, setSendingMedia] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(new Map()); // Track pending media messages by temp ID
  const [isWaiting, setIsWaiting] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user, logout } = useAuth();
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    console.log('🔌 Initializing Socket.IO with keepalive');
    socketRef.current = initSocket();
    const socket = socketRef.current;

    socket.emit('user info', {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      setStatus('Connected');
      setIsConnected(true);
      setIsWaiting(false);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connect error:', error.message);
      setStatus('⚠️ Connection error - retrying...');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      setIsConnected(false);
      setStatus('❌ Disconnected: ' + reason);

      if (reason === 'io server disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          socket.connect();
        }, 2000);
      }
    });

    socket.on('waiting', (data) => {
      setStatus(data.message);
      setIsConnected(false);
      setIsWaiting(true);
      setStrangerName('Stranger');
    });

    socket.on('paired', (data) => {
      setCurrentRoom(data.roomId);
      setStatus('✅ Connected to a stranger');
      setIsConnected(true);
      setIsWaiting(false);
      setMessages([]);
      setStrangerName('Stranger');
    });

    socket.on('chat message', (data) => {
      console.log('💬 Message received:', data.type);

      if (data.userName && data.userName !== 'Anonymous') {
        setStrangerName(data.userName);
      }

      setMessages(prev => [...prev, {
        id: data.id || Date.now().toString(),
        text: data.message,
        type: data.type || 'text',
        mediaUrl: data.mediaUrl,
        thumbnail: data.thumbnail,
        duration: data.duration,
        senderType: 'stranger',
        userName: data.userName || 'Stranger',
        timestamp: new Date(),
      }]);

      setIsTyping(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    // Listen for upload acknowledgment from server for media messages
    socket.on('media upload ack', (data) => {
      console.log('✅ Media upload confirmed:', data);
      const { tempId, id, mediaUrl, thumbnail, duration } = data;
      
      setMessages(prev => {
        const updated = [...prev];
        const pendingIndex = updated.findIndex(msg => msg.tempId === tempId);
        if (pendingIndex !== -1) {
          updated[pendingIndex] = {
            ...updated[pendingIndex],
            id: id || tempId,
            mediaUrl: mediaUrl || updated[pendingIndex].mediaUrl,
            thumbnail: thumbnail || updated[pendingIndex].thumbnail,
            duration: duration || updated[pendingIndex].duration,
            status: 'confirmed' // Optional: track status if needed
          };
        }
        return updated;
      });

      // Remove from pending
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });

      setSendingMedia(null);
      setUploadProgress(0);
    });

    socket.on('typing', (data) => {
      setIsTyping(data.isTyping);
    });

    socket.on('stranger left', (data) => {
      console.log('👋 Stranger left');
      setStatus('❌ ' + data.message);
      setIsConnected(false);
      setCurrentRoom(null);
      setIsTyping(false);
      setStrangerName('Stranger');
      // Clear pending on disconnect
      setPendingMessages(new Map());
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('waiting');
      socket.off('paired');
      socket.off('chat message');
      socket.off('media upload ack'); // New listener cleanup
      socket.off('typing');
      socket.off('stranger left');
    };
  }, [user]);

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (isConnected && socketRef.current && currentRoom) {
      socketRef.current.emit('typing', {
        isTyping: true,
        roomId: currentRoom,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && currentRoom) {
          socketRef.current.emit('typing', {
            isTyping: false,
            roomId: currentRoom,
          });
        }
      }, 1000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!input.trim() || !isConnected || !socketRef.current || !currentRoom) {
      return;
    }

    const message = input.trim();

    socketRef.current.emit('chat message', {
      message,
      type: 'text',
      roomId: currentRoom,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
    });

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: message,
      type: 'text',
      senderType: 'you',
      userName: user.displayName || 'You',
      timestamp: new Date(),
    }]);

    setInput('');
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleVoiceRecord = async (voiceData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;

    const tempId = Date.now().toString();
    setSendingMedia('voice');
    setUploadProgress(5);

    // Add pending message immediately with placeholder
    setMessages(prev => [...prev, {
      id: tempId,
      tempId, // Track for replacement
      text: '🎤 Voice message (uploading...)',
      type: 'voice',
      mediaUrl: null, // Placeholder
      duration: voiceData.duration || 0,
      senderType: 'you',
      userName: user.displayName || 'You',
      timestamp: new Date(),
      status: 'uploading'
    }]);

    setPendingMessages(prev => new Map(prev).set(tempId, { type: 'voice', data: voiceData }));

    try {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = 5 + Math.round((e.loaded / e.total) * 85);
          setUploadProgress(progress);
        }
      };

      reader.onload = () => {
        setUploadProgress(100);
        const base64Audio = reader.result;

        // Emit with tempId for server to ack back
        socketRef.current.emit('chat message', {
          message: '🎤 Voice message',
          type: 'voice',
          mediaUrl: base64Audio,
          duration: voiceData.duration || 0,
          tempId, // Send tempId for matching ack
          roomId: currentRoom,
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
        });

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      };

      reader.readAsDataURL(voiceData.blob);
    } catch (error) {
      console.error('❌ Voice error:', error);
      // Remove pending on error
      setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      setSendingMedia(null);
      setUploadProgress(0);
    }
  };

  const handleImageSelect = async (imageData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;

    const tempId = Date.now().toString();
    setSendingMedia('image');
    setUploadProgress(5);

    // Add pending message immediately with placeholder
    setMessages(prev => [...prev, {
      id: tempId,
      tempId, // Track for replacement
      text: '📷 Image (uploading...)',
      type: 'image',
      mediaUrl: null, // Placeholder
      senderType: 'you',
      userName: user.displayName || 'You',
      timestamp: new Date(),
      status: 'uploading'
    }]);

    setPendingMessages(prev => new Map(prev).set(tempId, { type: 'image', data: imageData }));

    try {
      // Emit with tempId for server to ack back
      socketRef.current.emit('chat message', {
        message: '📷 Image',
        type: 'image',
        mediaUrl: imageData.base64,
        tempId, // Send tempId for matching ack
        roomId: currentRoom,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (error) {
      console.error('❌ Image error:', error);
      // Remove pending on error
      setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      setSendingMedia(null);
      setUploadProgress(0);
    }
  };

  const handleVideoSelect = async (videoData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;

    console.log('🎥 SENDING VIDEO');
    const tempId = Date.now().toString();
    setSendingMedia('video');
    setUploadProgress(5);

    // Add pending message immediately with placeholder
    setMessages(prev => [...prev, {
      id: tempId,
      tempId, // Track for replacement
      text: '🎥 Video (uploading...)',
      type: 'video',
      mediaUrl: null, // Placeholder
      thumbnail: null,
      duration: videoData.duration,
      senderType: 'you',
      userName: user.displayName || 'You',
      timestamp: new Date(),
      status: 'uploading'
    }]);

    setPendingMessages(prev => new Map(prev).set(tempId, { type: 'video', data: videoData }));

    try {
      let progress = 5;
      const startTime = Date.now();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        progress = 5 + (elapsed / 2000) * 95;

        if (progress >= 100) {
          progress = 100;
          clearInterval(intervalRef.current);
        }

        setUploadProgress(Math.floor(progress));
      }, 50);

      // Emit with tempId for server to ack back
      socketRef.current.emit('chat message', {
        message: '🎥 Video',
        type: 'video',
        mediaUrl: videoData.base64,
        thumbnail: videoData.thumbnail,
        duration: videoData.duration,
        tempId, // Send tempId for matching ack
        roomId: currentRoom,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (error) {
      console.error('❌ Video error:', error);
      alert('Error sending video: ' + error.message);
      // Remove pending on error
      setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setSendingMedia(null);
      setUploadProgress(0);
    }
  };

  const handleNext = () => {
    if (socketRef.current) {
      setMessages([]);
      setCurrentRoom(null);
      setIsTyping(false);
      setIsConnected(false);
      setIsWaiting(true);
      setStatus('Looking for a new stranger...');
      setStrangerName('Stranger');
      // Clear pending on next
      setPendingMessages(new Map());
      socketRef.current.emit('find next');
    }
  };

  const handleLogout = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    await logout();
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <ChatHeader status={status} user={user} onLogout={handleLogout} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-5 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <p className="text-gray-500 text-lg">
                {isConnected ? '✅ Start a conversation...' : '⏳ ' + status}
              </p>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                msg.type === 'text' ? (
                  <MessageWithUser
                    key={msg.id}
                    message={msg}
                    senderType={msg.senderType}
                    userName={msg.userName}
                  />
                ) : (
                  <MediaMessage
                    key={msg.id}
                    message={msg}
                    senderType={msg.senderType}
                  />
                )
              ))}

              {isTyping && <TypingIndicator strangerName={strangerName} />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <InputBar
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={!isConnected}
          onVoiceRecord={handleVoiceRecord}
          onImageSelect={handleImageSelect}
          onVideoSelect={handleVideoSelect}
          onNext={handleNext}
          sendingMedia={sendingMedia}
          uploadProgress={uploadProgress}
          isWaiting={isWaiting}
        />
      </div>
    </div>
  );
}