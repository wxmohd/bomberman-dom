// WebSocket client logic
import { eventBus } from '../../framework/events';
import { Direction, PlayerPosition, PlayerStats } from '../entities/player';

// WebSocket connection
let socket: WebSocket | null = null;
let playerId: string | null = null;
let playerNickname: string | null = null;
let reconnectInterval: number | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Connection states
export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  RECONNECTING,
  FAILED
}

let connectionState: ConnectionState = ConnectionState.DISCONNECTED;

// Track connections by nickname and by connection ID
const connectionsByNickname = {};
const connectionsById = {};

// Get current connection state
export function getConnectionState(): ConnectionState {
  return connectionState;
}

// Connect to WebSocket server
export function connectToServer(nickname: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (connectionState === ConnectionState.CONNECTED) {
      resolve(true);
      return;
    }

    // Store nickname for reconnection purposes
    playerNickname = nickname;
    connectionState = ConnectionState.CONNECTING;
    
    // Create WebSocket connection
    // Use a direct WebSocket URL to connect to the server on port 3000
    const wsUrl = 'ws://localhost:3000';
    
    // Log the connection attempt
    
    console.log(`Connecting to WebSocket server at ${wsUrl}`);
    socket = new WebSocket(wsUrl);
    
    // Add connection timeout with a longer duration
    const connectionTimeout = setTimeout(() => {
      if (connectionState === ConnectionState.CONNECTING) {
        console.error('Connection timeout - server might not be running');
        connectionState = ConnectionState.FAILED;
        socket?.close();
        reject(new Error('Connection timeout'));
      }
    }, 10000); // 10 second timeout for slower connections
    
    // Connection opened
    socket.addEventListener('open', () => {
      console.log('Connected to server');
      connectionState = ConnectionState.CONNECTED;
      reconnectAttempts = 0;
      
      // Clear the connection timeout
      clearTimeout(connectionTimeout);
      
      // Send join message with nickname
      sendMessage({
        type: 'player:join',
        payload: { nickname }
      });
      
      // Emit connection event
      eventBus.emit('socket:connected');
      
      resolve(true);
    });
    
    // Connection error
    socket.addEventListener('error', (error) => {
      console.error('WebSocket connection error:', error);
      
      if (connectionState === ConnectionState.CONNECTING) {
        connectionState = ConnectionState.FAILED;
        reject(new Error('Failed to connect to server'));
      }
      
      // Emit error event
      eventBus.emit('socket:error', { error });
    });
    
    // Connection closed
    socket.addEventListener('close', () => {
      console.log('Disconnected from server');
      
      if (connectionState === ConnectionState.CONNECTED) {
        connectionState = ConnectionState.DISCONNECTED;
        
        // Attempt to reconnect
        attemptReconnect();
      }
      
      // Emit disconnection event
      eventBus.emit('socket:disconnected');
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (error) {
        console.error('Error parsing server message:', error);
      }
    });
  });
}

// Attempt to reconnect to the server
function attemptReconnect(): void {
  if (reconnectInterval !== null) {
    clearInterval(reconnectInterval);
  }
  
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    connectionState = ConnectionState.FAILED;
    eventBus.emit('socket:reconnectFailed');
    return;
  }
  
  connectionState = ConnectionState.RECONNECTING;
  reconnectAttempts++;
  
  // Emit reconnecting event
  eventBus.emit('socket:reconnecting', { attempt: reconnectAttempts });
  
  // Try to reconnect
  reconnectInterval = window.setTimeout(() => {
    console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    
    if (playerNickname) {
      connectToServer(playerNickname)
        .catch(() => {
          // If reconnection fails, try again
          attemptReconnect();
        });
    } else {
      // If no nickname is stored, we can't reconnect properly
      connectionState = ConnectionState.FAILED;
      eventBus.emit('socket:reconnectFailed');
    }
  }, 2000 * reconnectAttempts); // Increasing backoff
}

// Disconnect from the server
export function disconnectFromServer(): void {
  if (socket && connectionState === ConnectionState.CONNECTED) {
    socket.close();
  }
  
  // Clear reconnect interval if active
  if (reconnectInterval !== null) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
  
  connectionState = ConnectionState.DISCONNECTED;
  socket = null;
  playerId = null;
}

// Send message to the server
export function sendMessage(message: any): boolean {
  if (!socket || connectionState !== ConnectionState.CONNECTED) {
    console.error('Cannot send message: not connected to server');
    return false;
  }
  
  try {
    socket.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

// Handle messages from the server
function handleServerMessage(message: any): void {
  console.log('Received server message:', message);
  const { type, data } = message;
  
  switch (type) {
    case 'connection:established':
      console.log('Connection established with server:', data.message);
      eventBus.emit('connection:established', data);
      break;
      
    case 'waitingRoom:update':
      console.log('Waiting room update:', data);
      // Update the player store with the players from the server
      import('../game/lobby').then(({ playerStore }) => {
        const currentState = playerStore.getState();
        let currentPlayer = currentState.currentPlayer;
        
        // If we have a yourId field, find the current player in the players list
        if (data.yourId && currentPlayer) {
          // Find the current player in the updated players list
          const updatedCurrentPlayer = data.players.find(p => p.id === data.yourId);
          if (updatedCurrentPlayer) {
            // Update the current player with server data but keep local properties
            currentPlayer = {
              ...currentPlayer,
              ...updatedCurrentPlayer
            };
          }
        }
        
        // Update the player store with all players from the server
        playerStore.setState({
          ...currentState,
          players: data.players,
          currentPlayer: currentPlayer
        });
        
        console.log('Updated player store with players:', data.players);
        
        // Emit waiting room update event
        eventBus.emit('waitingRoom:update', data);
      });
      break;
      
    case 'player:joined':
      // Store player ID
      playerId = data.id;
      
      // Check if this is a reconnection
      if (data.isReconnection) {
        console.log('Reconnected to existing game session');
        eventBus.emit('player:reconnected', data);
      } else {
        // New player join
        eventBus.emit('player:joined', data);
      }
      break;
      
    case 'player:new':
      // A new player has joined
      console.log('New player joined:', data);
      eventBus.emit('player:new', data);
      break;
      
    case 'player:left':
      // A player has left
      console.log('Player left:', data);
      eventBus.emit('player:left', data);
      break;
      
    case 'player:moved':
      // A player has moved
      eventBus.emit('player:moved', data);
      break;
      
    case 'player:hit':
      // A player was hit by an explosion
      eventBus.emit('player:hit', data);
      break;
      
    case 'player:eliminated':
      // A player was eliminated
      eventBus.emit('player:eliminated', data);
      break;
      
    case 'bomb:placed':
      // A bomb was placed
      eventBus.emit('bomb:placed', data);
      break;
      
    case 'bomb:explode':
      // A bomb has exploded
      eventBus.emit('bomb:explode', data);
      break;
      
    case 'map:blocks':
      // Map blocks data
      eventBus.emit('map:blocks', data);
      break;
      
    case 'game:error':
      // Game error
      console.error('Game error:', data.message);
      eventBus.emit('game:error', data);
      break;
      
    case 'game:countdown':
      // Game countdown update
      eventBus.emit('game:countdown', data);
      break;
      
    case 'game:start':
      // Game has started
      eventBus.emit('game:start', data);
      break;
      
    case 'game:end':
      // Game has ended
      eventBus.emit('game:end', data);
      break;
      
    case 'game:reset':
      // Game has been reset
      eventBus.emit('game:reset');
      break;
      
    case 'game:inProgress':
      // Game is already in progress
      eventBus.emit('game:inProgress', data);
      break;
      
    case 'chat:message':
      // Chat message received
      eventBus.emit('chat:message', data);
      break;
      
    case 'powerup:spawned':
      // A power-up was spawned
      eventBus.emit('powerup:spawned', data);
      break;
      
    case 'powerup:collected':
      // A power-up was collected
      eventBus.emit('powerup:collected', data);
      break;
      
    // Removed duplicate waitingRoom:update case
      
    default:
      console.log(`Unknown message type: ${type}`);
  }
}

// Player entity WebSocket integration
export function sendPlayerMove(position: PlayerPosition, direction: Direction): void {
  sendMessage({
    type: 'player:move',
    payload: {
      position,
      direction
    }
  });
}

// Bomb entity WebSocket integration
export function sendPlaceBomb(position: PlayerPosition, range: number): void {
  sendMessage({
    type: 'player:placeBomb',
    payload: {
      position,
      range
    }
  });
}

// Chat WebSocket integration
export function sendChatMessage(message: string): void {
  console.log('Sending chat message:', message);
  sendMessage({
    type: 'chat:message',
    data: {
      message
    }
  });
}

// This function is already defined above
// Removed duplicate declaration

// Get player ID
export function getPlayerId(): string | null {
  return playerId;
}

// Get player nickname
export function getPlayerNickname(): string | null {
  return playerNickname;
}
