// WebSocket client logic
import { io, Socket } from 'socket.io-client';
import { eventBus } from '../../framework/events';
import { EVENTS } from './events';

// Dynamically determine the server URL based on the current environment
// This allows connecting from other devices on the same network
const getServerUrl = () => {
  // Get the current hostname (works for both local and remote devices)
  const host = window.location.hostname;
  
  // The WebSocket server always runs on port 3000
  // But the game might be served from a different port (e.g., 5173 in development)
  const wsPort = '3000';
  
  // In development, Vite serves assets on port 5173 but WebSocket is on 3000
  // In production, both might be on the same port
  return `http://${host}:${wsPort}`;
};

// Get the server URL dynamically
const SERVER_URL = getServerUrl();

// Log the server URL for debugging
console.log('Connecting to WebSocket server at:', SERVER_URL);

// Socket instance
let socket: Socket | null = null;

// Connection status
let isConnected = false;

// Create socket connection
export function createSocketConnection(nickname: string): Socket {
  // Determine the server URL based on the current host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = 3000; // The port your server is running on
  
  const serverUrl = `${protocol}//${host}:${port}`;
  console.log(`Connecting to WebSocket server at: ${serverUrl}`);
  
  // Create socket with optimized transport options for gaming
  const socket = io(SERVER_URL, {
    transports: ['websocket'], // Force WebSocket transport only for lowest latency
    upgrade: false, // Disable transport upgrades
    reconnection: true, // Enable reconnection
    reconnectionAttempts: 10, // Try to reconnect more times
    reconnectionDelay: 500, // Wait less time before reconnecting
    timeout: 5000, // Shorter connection timeout
    forceNew: true, // Force a new connection each time
    multiplex: false, // Disable multiplexing for dedicated connection
    query: { nickname } // Pass nickname as a query parameter
  });
  
  // Set up connection event handlers
  socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    socket.sendBuffer = []; // Clear any buffered messages on connect
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });
  
  return socket;
}

// Reconnection tracking
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 1000; // 1 second

// Position tracking for reliable movement synchronization
let lastKnownPositions: {[playerId: string]: any} = {};
let positionBuffer: {[playerId: string]: any[]} = {}; // Buffer recent positions for interpolation
const POSITION_BUFFER_SIZE = 10; // Store last 10 positions for smooth interpolation

// Movement prediction configuration
const MOVEMENT_PREDICTION_ENABLED = true; // Enable client-side prediction
const MAX_POSITION_DELAY = 200; // Maximum milliseconds to wait before force-syncing position

// Network statistics for adaptive synchronization
let networkStats = {
  averagePing: 0,
  pingMeasurements: [] as number[],
  packetLoss: 0,
  lastSyncTime: 0,
  syncInterval: 50 // Start with 50ms sync interval, will adapt based on network conditions
};

// Track sequence numbers to handle out-of-order packets
let lastSequenceNumber: {[playerId: string]: number} = {};

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

    // Reset reconnection attempts
    reconnectAttempts = 0;

    // Connect to the server with optimized settings for network performance and reliability
    socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
      timeout: 5000, // 5 seconds timeout
      transports: ['websocket'], // Force WebSocket transport for better performance
      upgrade: false, // Disable transport upgrades
      forceNew: true, // Force a new connection
      multiplex: false, // Disable multiplexing for dedicated connection
      // Retry configuration
      randomizationFactor: 0.5, // Add randomization to reconnection attempts
      query: {
        nickname, // Pass the nickname as a query parameter
        clientTime: Date.now().toString() // Send client time for potential time synchronization
      }
    });
    
    // Set custom ping interval after connection (socket.io-client doesn't support these in options)
    if (socket) {
      // @ts-ignore - These are valid socket.io properties but might not be in the type definitions
      socket.io.opts.pingInterval = 2000; // Send ping packet every 2 seconds (default is 25s)
      // @ts-ignore
      socket.io.opts.pingTimeout = 3000; // Consider connection closed if no pong received after 3s
    }

    // Handle connection events
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket?.id);
      isConnected = true;
      reconnectAttempts = 0; // Reset reconnection attempts on successful connection
      
      // Store the socket ID in localStorage for player identification
      if (socket?.id) {
        localStorage.setItem('socketId', socket.id);
        localStorage.setItem('playerId', socket.id); // Ensure playerId is also set
        console.log('Stored socket ID in localStorage:', socket.id);
      }
      
      // Emit join event with player nickname
      if (socket) {
        socket.emit(EVENTS.JOIN, { nickname });
        
        // Immediately join lobby after connection
        socket.emit(EVENTS.JOIN_LOBBY, {});
        console.log('Instantly joining lobby after connection');
        
        // If we have last known positions, restore them after reconnection
        const playerId = localStorage.getItem('playerId');
        if (playerId && lastKnownPositions[playerId]) {
          console.log('Restoring last known position after reconnection');
          setTimeout(() => {
            socket?.emit(EVENTS.MOVE, lastKnownPositions[playerId]);
          }, 500); // Small delay to ensure server is ready
        }
      }
      
      // Notify the application about the connection
      eventBus.emit('socket:connected', { id: socket?.id });
      
      resolve();
    });

    socket?.on('connect_error', (error) => {
      console.error('Connection error:', error);
      reconnectAttempts++;
      
      if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
        console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
        // The socket.io client will handle reconnection automatically
      } else {
        console.error('Max reconnection attempts reached');
        if (socket) {
          eventBus.emit('socket:error', { error: 'Failed to connect to server after multiple attempts' });
        }
        reject(error);
      }
    });

    socket?.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      isConnected = false;
      
      // Attempt to reconnect if it was not an intentional disconnect
      if (reason !== 'io client disconnect') {
        console.log('Attempting to reconnect...');
        // The socket.io client will handle reconnection automatically
      }
      
      eventBus.emit('socket:disconnected', { reason });
    });
    
    // Handle reconnection attempts
    socket?.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
      eventBus.emit('socket:reconnecting', { attempt: attemptNumber });
    });
    
    // Handle successful reconnection
    socket?.on('reconnect', () => {
      console.log('Successfully reconnected to server');
      isConnected = true;
      eventBus.emit('socket:reconnected');
    });
    
    // Handle failed reconnection
    socket?.on('reconnect_failed', () => {
      console.error('Failed to reconnect to server');
      eventBus.emit('socket:reconnect_failed');
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

// Queue for messages that couldn't be sent due to connection issues
const messageQueue: {event: string, data: any}[] = [];

/**
 * Send an event to the server
 * @param event Event name
 * @param data Event data
 */
export function sendToServer(event: string, data: any): void {
  // If not connected, queue the message for later
  if (!socket || !isConnected) {
    messageQueue.push({ event, data });
    return;
  }
  
  // If connected, send immediately
  try {
    socket.emit(event, data);
  } catch (error) {
    console.error(`Error sending ${event} event:`, error);
    messageQueue.push({event, data});
  }
}

/**
 * Process any queued messages that couldn't be sent due to connection issues
 */
function processMessageQueue(): void {
  console.log(`Processing ${messageQueue.length} queued messages`);
  
  if (!socket || !socket.connected) {
    console.error('Cannot process message queue, still not connected');
    return;
  }
  
  // First prioritize movement messages - only send the most recent one per player
  const movementMessages = messageQueue.filter(msg => msg.event === EVENTS.MOVE);
  const otherMessages = messageQueue.filter(msg => msg.event !== EVENTS.MOVE);
  
  // Group movement messages by player ID
  const playerMovements: {[playerId: string]: any} = {};
  movementMessages.forEach(msg => {
    if (msg.data.playerId) {
      playerMovements[msg.data.playerId] = msg;
    }
  });
  
  // Send only the most recent movement message per player
  Object.values(playerMovements).forEach(message => {
    if (message) {
      console.log(`Sending queued movement for player: ${message.data.playerId}`);
      socket?.emit(message.event, message.data);
    }
  });
  
  // Send all other messages
  otherMessages.forEach(message => {
    console.log(`Sending queued message: ${message.event}`);
    socket?.emit(message.event, message.data);
  });
  
  // Clear the queue
  messageQueue.length = 0;
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

  // Basic player movement handler
  socket.on(EVENTS.MOVE, (data) => {
    // Make sure the data includes a playerId
    if (!data.playerId && data.id) {
      data.playerId = data.id;
    }
    
    // Just forward the event to the event bus
    eventBus.emit('remote:player:moved', data);
  });

  // Player dropped bomb event
  socket.on(EVENTS.DROP_BOMB, (data) => {
    console.log('Received remote bomb placement:', data);
    eventBus.emit('remote:bomb:dropped', data);
  });
  
  // Bomb explosion event
  socket.on(EVENTS.BOMB_EXPLODE, (data) => {
    console.log('Received bomb explosion from server:', data);
    // Make sure we have all required data for the explosion
    if (!data.x || !data.y || !data.explosionRange) {
      console.error('Missing required data for bomb explosion:', data);
      return;
    }
    // Forward the complete data to the event bus
    eventBus.emit('remote:bomb:explode', data);
  });
  
  // Block destroyed event
  socket.on(EVENTS.BLOCK_DESTROYED, (data) => {
    console.log('Received block destruction:', data);
    eventBus.emit('remote:block:destroyed', data);
  });
  
  // Power-up spawned event
  socket.on(EVENTS.POWERUP_SPAWNED, (data) => {
    console.log('Received power-up spawn from server:', data);
    
    // Make sure we have all required data
    if (data.x === undefined || data.y === undefined || !data.type) {
      console.error('Missing required data for power-up spawn:', data);
      return;
    }
    
    // Create the power-up directly using the PowerUp class
    import('../game/powerups').then(({ PowerUp, PowerUpType, getActivePowerUps }) => {
      // Check if there's already a power-up at this position
      const existingPowerups = getActivePowerUps();
      const existingPowerup = existingPowerups.find(p => p.isAt(data.x, data.y));
      if (existingPowerup) {
        console.log('Power-up already exists at this position, skipping creation');
        return;
      }
      
      // Convert string type to PowerUpType enum
      let powerupType;
      switch (data.type.toUpperCase()) {
        case 'BOMB':
          powerupType = PowerUpType.BOMB;
          break;
        case 'FLAME':
          powerupType = PowerUpType.FLAME;
          break;
        case 'SPEED':
          powerupType = PowerUpType.SPEED;
          break;
        default:
          console.error(`Unknown power-up type: ${data.type}`);
          return;
      }
      
      // Create the power-up directly
      const powerup = new PowerUp(data.x, data.y, powerupType);
      
      // Render the power-up
      import('../game/renderer').then(({ getMapContainer }) => {
        const mapContainer = getMapContainer();
        if (mapContainer) {
          powerup.render(mapContainer);
          console.log(`Created power-up from server at (${data.x}, ${data.y}) of type ${powerupType}`);
        }
      });
    });
  });
  
  // Handle player number assignment
  socket.on(EVENTS.PLAYER_NUMBER, (data) => {
    console.log('Received player number:', data);
    
    // Store player number in localStorage
    if (data.playerNumber) {
      localStorage.setItem('playerNumber', data.playerNumber.toString());
      console.log('Stored player number in localStorage:', data.playerNumber);
      
      // Force refresh the player info display
      const playerInfo = document.getElementById('player-info');
      if (playerInfo) {
        const nickname = localStorage.getItem('nickname') || 'Player';
        const playerNumber = data.playerNumber;
        const playerColor = data.color || '#FF0000';
        
        playerInfo.innerHTML = `
          <div style="margin-bottom: 5px; font-weight: bold;">You: ${nickname} (P${playerNumber})</div>
          <div style="width: 20px; height: 20px; background-color: ${playerColor}; border-radius: 50%; display: inline-block; margin-right: 5px;"></div>
        `;
      }
    }
    
    // Emit event for other components to react
    eventBus.emit('player:number:assigned', data);
  });

  // Chat message received
  socket.on(EVENTS.CHAT, (data) => {
    console.log('Socket received chat message:', data);
    
    // Add a flag to indicate if this is the local player's message
    const localPlayerId = localStorage.getItem('playerId');
    data.isLocalPlayer = data.playerId === localPlayerId;
    
    console.log(`Chat from ${data.nickname} (${data.isLocalPlayer ? 'local' : 'remote'} player)`);
    
    // Emit event for the chat UI to display the message
    eventBus.emit('chat:message:received', data);
  });
  
  // Also listen for the raw 'chat' event as a fallback
  socket.on('chat', (data) => {
    console.log('Socket received raw chat event:', data);
    
    // Add a flag to indicate if this is the local player's message
    const localPlayerId = localStorage.getItem('playerId');
    data.isLocalPlayer = data.playerId === localPlayerId;
    
    console.log(`Chat from ${data.nickname} (${data.isLocalPlayer ? 'local' : 'remote'} player)`);
    
    // Emit event for the chat UI to display the message
    eventBus.emit('chat:message:received', data);
  });

  // Game state update
  socket.on('game:state', (data) => {
    eventBus.emit('game:state:updated', data);
  });

  // Game countdown
  socket.on('game:countdown', (data) => {
    console.log('Countdown received:', data);
    eventBus.emit('game:countdown', data);
  });

  // Game started
  socket.on('game:started', (data) => {
    eventBus.emit('game:started', data);
  });

  // Game ended
  socket.on('game:ended', (data) => {
    console.log('Game ended event received from server:', data);
    eventBus.emit('game:ended', data);
  });

  // Player eliminated
  socket.on('player:eliminated', (data) => {
    console.log('Player eliminated event received from server:', data);
    // Forward to event bus
    eventBus.emit('remote:player:eliminated', data);
  });

  // Power-up collected event
  socket.on(EVENTS.COLLECT_POWERUP, (data) => {
    console.log('Received power-up collection from server:', data);
    
    // Make sure we have all required data
    if (data.x === undefined || data.y === undefined || !data.playerId || !data.powerupType) {
      console.error('Missing required data for power-up collection:', data);
      return;
    }
    
    // Skip if this is the local player (they've already collected it)
    const localPlayerId = localStorage.getItem('playerId');
    if (data.playerId === localPlayerId) {
      console.log('Skipping remote power-up collection for local player');
      return;
    }
    
    // Emit event to remove the power-up from the game
    eventBus.emit('remote:powerup:collected', {
      x: data.x,
      y: data.y,
      playerId: data.playerId,
      type: data.powerupType
    });
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
 * @returns The current socket instance or null if not connected
 */
export function getSocket(): Socket | null {
  return socket;
}