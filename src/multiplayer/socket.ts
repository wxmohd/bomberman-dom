// WebSocket client logic
import { io, Socket } from 'socket.io-client';
import { eventBus } from '../../framework/events';
import { EVENTS } from './events';

// Default server URL - change this to your actual server URL
const SERVER_URL = 'http://localhost:3000';

// Socket instance
let socket: Socket | null = null;

// Connection status
let isConnected = false;

/**
 * Connect to the game server
 * @param nickname Player's nickname
 * @returns Promise that resolves when connected
 */
export function connectToServer(nickname: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already connected, disconnect first
    if (socket) {
      socket.disconnect();
    }

    // Connect to the server
    socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: {
        nickname
      }
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket?.id);
      isConnected = true;
      
      // Emit join event with player nickname
      if (socket) {
        socket.emit(EVENTS.JOIN, { nickname });
      }
      
      // Notify the application about the connection
      eventBus.emit('socket:connected', { id: socket?.id });
      
      resolve();
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (socket) {
        eventBus.emit('socket:error', { error: 'Failed to connect to server' });
      }
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      isConnected = false;
      eventBus.emit('socket:disconnected', { reason });
    });

    // Set up event listeners for game events
    setupGameEventListeners();
  });
}

/**
 * Disconnect from the server
 */
export function disconnectFromServer(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
}

/**
 * Check if connected to the server
 * @returns Connection status
 */
export function isConnectedToServer(): boolean {
  return isConnected && socket?.connected === true;
}

/**
 * Send an event to the server
 * @param event Event name
 * @param data Event data
 */
export function sendToServer(event: string, data: any): void {
  if (!socket || !socket.connected) {
    console.error(`Cannot send event, not connected to server: ${event}`);
    return;
  }
  
  socket.emit(event, data);
}

/**
 * Set up listeners for game events from the server
 */
function setupGameEventListeners(): void {
  if (!socket) return;

  // Player joined event
  socket.on('player:joined', (data) => {
    eventBus.emit('player:joined', data);
  });

  // Player left event
  socket.on('player:left', (data) => {
    eventBus.emit('player:left', data);
  });

  // Player moved event
  socket.on(EVENTS.MOVE, (data) => {
    eventBus.emit('remote:player:moved', data);
  });

  // Player dropped bomb event
  socket.on(EVENTS.DROP_BOMB, (data) => {
    eventBus.emit('remote:bomb:dropped', data);
  });

  // Chat message received
  socket.on(EVENTS.CHAT, (data) => {
    eventBus.emit('chat:message:received', data);
  });

  // Game state update
  socket.on('game:state', (data) => {
    eventBus.emit('game:state:updated', data);
  });

  // Game started
  socket.on('game:started', (data) => {
    eventBus.emit('game:started', data);
  });

  // Game ended
  socket.on('game:ended', (data) => {
    eventBus.emit('game:ended', data);
  });
}

/**
 * Get the socket ID
 * @returns Socket ID if connected, null otherwise
 */
export function getSocketId(): string | null {
  return socket?.id || null;
}

/**
 * Get the socket instance
 */
export function getSocket(): any {
  return socket;
}