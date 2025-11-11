"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { initSocket } from "@/lib/socket";
import ChatHeader from "./ChatHeader";
import InputBar from "./InputBar";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import CallModal from "./CallModal";
import { useWebRTC } from "../hooks/useWebRTC";
import Image from "next/image";

import look from "@/public/look.gif";
import talk from "@/public/talk.gif";
import left from "@/public/left.gif";

export default function Chat() {
  /* ------------------- STATE & REFS ------------------- */
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Connecting...");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [strangerName, setStrangerName] = useState("Stranger");
  const [sendingMedia, setSendingMedia] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(new Map());
  const [isWaiting, setIsWaiting] = useState(false);
  const [strangerLeft, setStrangerLeft] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user, logout } = useAuth();
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const {
    localStream,
    remoteStream,
    callState,
    callType,
    isIncoming,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
  } = useWebRTC(socketRef.current, isConnected);
  /* ------------------- SOCKET SETUP ------------------- */
  
  useEffect(() => {
    if (!user) return;

    socketRef.current = initSocket();
    const socket = socketRef.current;

    socket.emit("user info", {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
    });

    socket.on("connect", () => {
      setStatus("Connected");
      setIsConnected(true);
      setIsWaiting(false);
      setStrangerLeft(false);
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
    });

    socket.on("connect_error", () =>
      setStatus("Warning: Connection error - retrying...")
    );

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      setStatus("Disconnected: " + reason);
      if (reason === "io server disconnect") {
        reconnectTimeoutRef.current = setTimeout(() => socket.connect(), 2000);
      }
    });

    socket.on("waiting", (data) => {
      setStatus(data.message);
      setIsConnected(false);
      setIsWaiting(true);
      setStrangerName("Stranger");
      setStrangerLeft(false);
    });

    socket.on("paired", (data) => {
      setCurrentRoom(data.roomId);
      setStatus("Connected to a stranger");
      setIsConnected(true);
      setIsWaiting(false);
      setMessages([]);
      setStrangerName("Stranger");
      setStrangerLeft(false);
    });

    socket.on("chat message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
           id: data.id || Date.now().toString(),
          text: data.message,
          type: data.type || 'text',
          mediaUrl: data.mediaUrl,
          thumbnail: data.thumbnail,
          duration: data.duration,
          senderType: 'stranger',
          userName: data.userName || 'Stranger',
          timestamp: new Date(),
          isSent: true,
          isDelivered: true,
          isSeen: true,
        },
      ]);
      setIsTyping(false);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    });

    socket.on("message status", ({ id, status }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id
            ? {
                ...msg,
                isSent: status === "sent" || msg.isSent,
                isDelivered: status === "delivered" || msg.isDelivered,
                isSeen: status === "seen" || msg.isSeen,
              }
            : msg
        )
      );
    });

    socket.on("media upload ack", () => {});

    socket.on("typing", (data) => setIsTyping(data.isTyping));

    socket.on("stranger left", (data) => {
      setStatus(data.message || "Stranger has left");
      setIsConnected(false);
      setCurrentRoom(null);
      setIsTyping(false);
      setStrangerName("Stranger");
      setPendingMessages(new Map());
      setStrangerLeft(true);
      setMessages([]); // Clear messages when stranger leaves for anonymous chat
    });

    return () => {
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      socket.off();
    };
  }, [user]);

  /* ------------------- CALL HANDLERS ------------------- */
  const handleVideoCall = () => {
    if (!isConnected) {
      alert("Please wait until connected with a stranger");
      return;
    }
    initiateCall("video");
  };

  const handleAudioCall = () => {
    if (!isConnected) {
      alert("Please wait until connected with a stranger");
      return;
    }
    initiateCall("voice");
  };

  /* ------------------- MARK SEEN ------------------- */
  useEffect(() => {
    if (!socketRef.current) return;
    messages
      .filter((m) => m.senderType === "stranger" && !m.isSeen)
      .forEach((m) => {
        socketRef.current.emit("message seen", { id: m.id });
      });
  }, [messages]);

  /* ------------------- INPUT HANDLERS ------------------- */
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (isConnected && socketRef.current && currentRoom) {
      socketRef.current.emit("typing", { isTyping: true, roomId: currentRoom });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && currentRoom) {
          socketRef.current.emit("typing", {
            isTyping: false,
            roomId: currentRoom,
          });
        }
      }, 1000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected || !socketRef.current || !currentRoom)
      return;

    const message = input.trim();
    const msgId = `${Date.now()}${Math.random().toString(36).slice(2)}`;

    socketRef.current.emit("chat message", {
      id: msgId,
      message,
      type: "text",
      roomId: currentRoom,
      userId: user.uid,
      userName: user.displayName || user.email,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        text: message,
        type: "text",
        senderType: "you",
        userName: user.displayName || user.email,
        timestamp: new Date(),
        isSent: false,
        isDelivered: false,
        isSeen: false,
      },
    ]);

    setInput("");
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );
  };

  /* ------------------- MEDIA HANDLERS ------------------- */
  const handleVoiceRecord = async (voiceData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;
    setSendingMedia("voice");
    setUploadProgress(5);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Audio = reader.result;
        socketRef.current.emit("chat message", {
          message: "Voice message",
          type: "voice",
          mediaUrl: base64Audio,
          duration: voiceData.duration || 0,
          roomId: currentRoom,
          userId: user.uid,
          userName: user.displayName || user.email,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: "Voice message",
            type: "voice",
            mediaUrl: base64Audio,
            senderType: "you",
            userName: user.displayName || user.email,
            timestamp: new Date(),
          },
        ]);

        setSendingMedia(null);
        setUploadProgress(100);
      };
      reader.readAsDataURL(voiceData.blob);
    } catch {
      setSendingMedia(null);
      setUploadProgress(0);
    }
  };

  const handleImageSelect = async (imageData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;
    setSendingMedia("image");
    setUploadProgress(5);

    try {
      socketRef.current.emit("chat message", {
        message: "Image",
        type: "image",
        mediaUrl: imageData.base64,
        roomId: currentRoom,
        userId: user.uid,
         userName: user.displayName || user.email,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "Image",
          type: "image",
          mediaUrl: imageData.base64,
          senderType: "you",
          userName: user.displayName || user.email,
          timestamp: new Date(),
        },
      ]);

      setSendingMedia(null);
      setUploadProgress(100);
    } catch {
      setSendingMedia(null);
      setUploadProgress(0);
    }
  };

  const handleVideoSelect = async (videoData) => {
    if (!isConnected || !socketRef.current || !currentRoom) return;
    setSendingMedia("video");
    setUploadProgress(5);

    try {
      socketRef.current.emit("chat message", {
        message: "Video",
        type: "video",
        mediaUrl: videoData.base64,
        thumbnail: videoData.thumbnail,
        duration: videoData.duration,
        roomId: currentRoom,
        userId: user.uid,
        userName: user.displayName || user.email,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "Video",
          type: "video",
          mediaUrl: videoData.base64,
          thumbnail: videoData.thumbnail,
          duration: videoData.duration,
          senderType: "you",
          userName: user.displayName || user.email,
          timestamp: new Date(),
        },
      ]);

      setSendingMedia(null);
      setUploadProgress(100);
    } catch {
      setSendingMedia(null);
      setUploadProgress(0);
    }
  };

  /* ------------------- NAVIGATION ------------------- */
  const handleNext = () => {
    if (!socketRef.current) return;

    // End call if active
    if (callState !== "idle") {
      endCall();
    }

    setMessages([]);
    setCurrentRoom(null);
    setIsTyping(false);
    setIsConnected(false);
    setIsWaiting(true);
    setStatus("Looking for a new stranger...");
    setStrangerName("Stranger");
    setPendingMessages(new Map());
    setStrangerLeft(false);
    socketRef.current.emit("find next");
  };

  const handleLogout = async () => {
    if (callState !== "idle") {
      endCall();
    }
    if (socketRef.current) socketRef.current.disconnect();
    await logout();
  };

  /* ------------------- RENDER ------------------- */
  return (
 <div className="flex flex-col h-[100dvh] bg-white min-h-[100dvh] md:h-screen">
  {/* ---------- HEADER ---------- */}
  <ChatHeader
    status={status}
    user={user}
    onLogout={handleLogout}
    isConnected={isConnected}
    onNext={handleNext}
    onVideoCall={handleVideoCall}
    onAudioCall={handleAudioCall}
    disabled={!isConnected || callState !== "idle"}
  />

  {/* ---------- CALL MODAL ---------- */}
  {callState !== "idle" && (
    <CallModal
      callType={callType}
      isIncoming={isIncoming}
      callerName={strangerName}
      onAccept={acceptCall}
      onReject={rejectCall}
      onHangup={endCall}
      localStream={localStream}
      remoteStream={remoteStream}
      inCall={callState === "connected"}
      isCaller={!isIncoming}
    />
  )}

  {/* ---------- MAIN AREA ---------- */}
  <main className="flex-1 flex flex-col overflow-hidden">
    {/* ---- MESSAGE LIST ---- */}
    <section className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2 sm:px-4 sm:py-3 md:px-6 md:py-4 overscroll-contain">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 sm:space-y-6 px-2 sm:px-4 min-h-[calc(100vh-200px)] md:min-h-[calc(100vh-250px)]">
          {strangerLeft ? (
            <div className="flex flex-col items-center space-y-3 sm:space-y-4 animate-fadeIn">
              <Image
                src={left}
                alt="Stranger left"
                width={64}
                height={64}
                className="object-contain drop-shadow-lg w-16 h-16 sm:w-20 sm:h-20"
                unoptimized
                priority
              />
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 leading-tight">
                Stranger has left the chat
              </p>
              <button
                onClick={handleNext}
                className="px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-full text-xs sm:text-sm font-medium hover:bg-blue-700 transition shadow-md min-w-[140px] sm:min-w-[160px]"
              >
                Find Someone New
              </button>
            </div>
          ) : isConnected ? (
            <div className="flex items-center space-x-2 sm:space-x-3 animate-fadeIn">
              <Image
                src={talk}
                alt="Ready to chat"
                width={48}
                height={48}
                className="object-contain drop-shadow-md w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0"
                unoptimized
                priority
              />
              <p className="text-lg sm:text-xl md:text-2xl font-semibold text-green-600 flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
                <span className="text-center">Start a conversation...</span>
              </p>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-3 animate-fadeIn flex-col sm:flex-row sm:justify-center">
              <Image
                src={look}
                alt="Connecting..."
                width={48}
                height={48}
                className="object-contain drop-shadow-md w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0"
                unoptimized
                priority
              />
              <p className="text-base sm:text-lg md:text-xl font-medium text-gray-600 text-center sm:text-left leading-tight">
                {status}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {messages.map((msg) => (
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
    </section>

    {/* ---- INPUT BAR ---- */}
    <div className="sticky bottom-0 w-full bg-white border-t border-gray-200 shadow-sm z-10 shrink-0">
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
  </main>
</div>
  );
}
