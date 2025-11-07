import io from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 100 * 1024 * 1024, // 100MB to match server
    timeout: 120000,
    upgrade: true,
    rememberUpgrade: true,
    autoConnect: true,
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ Reconnect error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Reconnection failed');
  });

  return socket;
};

export const getSocket = () => socket;

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};