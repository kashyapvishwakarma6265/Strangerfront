'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initSocket } from '@/lib/socket';
import ChatHeader from './ChatHeader';
import InputBar from './InputBar';
import MessageBubble from './MessageBubble';
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
  const [pendingMessages, setPendingMessages] = useState(new Map());
  const [isWaiting, setIsWaiting] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user, logout } = useAuth();
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    socketRef.current = initSocket();
    const socket = socketRef.current;

    socket.emit('user info', {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
    });

    socket.on('connect', () => {
      setStatus('Connected');
      setIsConnected(true);
      setIsWaiting(false);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    });
    socket.on('connect_error', () => setStatus('⚠️ Connection error - retrying...'));
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setStatus('❌ Disconnected: ' + reason);
      if (reason === 'io server disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => socket.connect(), 2000);
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
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    socket.on('media upload ack', (data) => { /* ...your logic here... */ });
    socket.on('typing', (data) => setIsTyping(data.isTyping));
    socket.on('stranger left', (data) => {
      setStatus('❌ ' + data.message);
      setIsConnected(false);
      setCurrentRoom(null);
      setIsTyping(false);
      setStrangerName('Stranger');
      setPendingMessages(new Map());
    });

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('waiting');
      socket.off('paired');
      socket.off('chat message');
      socket.off('media upload ack');
      socket.off('typing');
      socket.off('stranger left');
    };
  }, [user]);

  // Typing handler
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (isConnected && socketRef.current && currentRoom) {
      socketRef.current.emit('typing', {
        isTyping: true,
        roomId: currentRoom,
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && currentRoom) {
          socketRef.current.emit('typing', { isTyping: false, roomId: currentRoom });
        }
      }, 1000);
    }
  };

  // Text send
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected || !socketRef.current || !currentRoom) return;
    const message = input.trim();
    socketRef.current.emit('chat message', {
      message,
      type: 'text',
      roomId: currentRoom,
      userId: user.uid,
      userName: user.displayName || user.email,
      mediaUrl: null,
      thumbnail: null,
      duration: null,
    });
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: message,
      type: 'text',
      senderType: 'you',
      userName: user.displayName || user.email,
      timestamp: new Date(),
    }]);
    setInput('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // Voice send
  const handleVoiceRecord = async (voiceData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;
    setSendingMedia('voice');
    setUploadProgress(5);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Audio = reader.result;
        socketRef.current.emit('chat message', {
          message: '🎤 Voice message',
          type: 'voice',
          mediaUrl: base64Audio,
          duration: voiceData.duration || 0,
          roomId: currentRoom,
          userId: user.uid,
          userName: user.displayName || user.email,
          thumbnail: null,
        });
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: '🎤 Voice message',
          type: 'voice',
          mediaUrl: base64Audio,
          senderType: 'you',
          userName: user.displayName || user.email,
          timestamp: new Date(),
        }]);
        setSendingMedia(null);
        setUploadProgress(100);
      };
      reader.readAsDataURL(voiceData.blob);
    } catch (error) {
      setSendingMedia(null);
      setUploadProgress(0);
    }
  };

  // Image send
  const handleImageSelect = async (imageData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;
    setSendingMedia('image');
    setUploadProgress(5);
    try {
      socketRef.current.emit('chat message', {
        message: '📷 Image',
        type: 'image',
        mediaUrl: imageData.base64,
        roomId: currentRoom,
        userId: user.uid,
        userName: user.displayName || user.email,
        thumbnail: null,
        duration: null,
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: '📷 Image',
        type: 'image',
        mediaUrl: imageData.base64,
        senderType: 'you',
        userName: user.displayName || user.email,
        timestamp: new Date(),
      }]);
      setSendingMedia(null);
      setUploadProgress(100);
    } catch (error) {
      setSendingMedia(null);
      setUploadProgress(0);
    }
  };

  // Video send
  const handleVideoSelect = async (videoData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;
    setSendingMedia('video');
    setUploadProgress(5);
    try {
      socketRef.current.emit('chat message', {
        message: '🎥 Video',
        type: 'video',
        mediaUrl: videoData.base64,
        thumbnail: videoData.thumbnail,
        duration: videoData.duration,
        roomId: currentRoom,
        userId: user.uid,
        userName: user.displayName || user.email,
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: '🎥 Video',
        type: 'video',
        mediaUrl: videoData.base64,
        thumbnail: videoData.thumbnail,
        duration: videoData.duration,
        senderType: 'you',
        userName: user.displayName || user.email,
        timestamp: new Date(),
      }]);
      setSendingMedia(null);
      setUploadProgress(100);
    } catch (error) {
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
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  senderType={msg.senderType}
                />
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
