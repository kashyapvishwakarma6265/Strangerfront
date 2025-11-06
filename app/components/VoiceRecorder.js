'use client';

import { useState, useRef, useEffect } from 'react';

export default function VoiceRecorder({ onVoiceRecord, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.onstart = () => {
        console.log('🎤 Recording started');
        setIsRecording(true);
        setRecordingTime(0);

        timerIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 60) {
              stopRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`📦 Audio chunk received: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🎤 Recording stopped');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        console.log(`✅ Voice recorded: ${audioBlob.size} bytes, ${recordingTime}s`);

        onVoiceRecord({
          blob: audioBlob,
          url: audioUrl,
          duration: recordingTime,
        });

        setIsRecording(false);
        setRecordingTime(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch (error) {
      console.error('❌ Microphone error:', error);
      alert('❌ Microphone access denied. Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      streamRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);
      clearInterval(timerIntervalRef.current);
      console.log('❌ Recording cancelled');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 border border-yellow-500 rounded-lg animate-slideDown w-full">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        <span className="text-xs font-semibold text-yellow-800 flex-1">
          🎤 Recording: {formatTime(recordingTime)}
        </span>
        <button 
          onClick={stopRecording}
          className="px-3 py-1 bg-red-500 text-white text-xs rounded font-semibold hover:bg-red-600 transition"
          title="Stop Recording"
        >
          ⏹️ Stop
        </button>
        <button 
          onClick={cancelRecording}
          className="px-3 py-1 bg-gray-400 text-white text-xs rounded font-semibold hover:bg-gray-500 transition"
          title="Cancel Recording"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-lg flex items-center justify-center text-lg md:text-xl hover:shadow-md hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      title="Record Voice Message"
    >
      🎤
    </button>
  );
}
