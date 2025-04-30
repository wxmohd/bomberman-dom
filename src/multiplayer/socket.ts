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
      
      // Store the socket ID in localStorage for player identification
      if (socket?.id) {
        localStorage.setItem('socketId', socket.id);
        console.log('Stored socket ID in localStorage:', socket.id);
      }
      
      // Emit join event with player nickname
      if (socket) {
        socket.emit(EVENTS.JOIN, { nickname });
        
        // Immediately join lobby after connection
        socket.emit(EVENTS.JOIN_LOBBY, {});
        console.log('Instantly joining lobby after connection');
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

// Queue for messages that couldn't be sent due to connection issues
const messageQueue: {event: string, data: any}[] = [];

/**
 * Send an event to the server
 * @param event Event name
 * @param data Event data
 */
export function sendToServer(event: string, data: any): void {
  if (!socket || !socket.connected) {
    console.log(`Queueing event for later, not connected to server: ${event}`);
    // Add to queue to send when connection is established
    messageQueue.push({event, data});
    
    // Make sure we have a listener for when connection is established
    if (socket) {
      socket.once('connect', () => {
        // Process queued messages
        processMessageQueue();
      });
    }
    return;
  }
  
  // If connected, send immediately
  socket.emit(event, data);
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
  
  // Send all queued messages
  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    if (message) {
      console.log(`Sending queued message: ${message.event}`);
      socket.emit(message.event, message.data);
    }
  }
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
    console.log('Received remote player movement:', data);
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
 * @returns The current socket instance or null if not connected
 */
export function getSocket(): Socket | null {
  return socket;
}