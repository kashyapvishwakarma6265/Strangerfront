import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;
  
  const ioUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!ioUrl) {
    console.error("❌ NEXT_PUBLIC_SOCKET_URL is not set. Please check your .env.local file!");
    return null;
  }

  socket = io(ioUrl, {
    /* options */
  });
  return socket;
};
