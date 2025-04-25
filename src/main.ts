// Main entry point for Bomberman DOM game - Central backend for multiplayer functionality
import { initGame } from './game/init';
import { connectToServer, disconnectFromServer, sendToServer, getSocketId, isConnectedToServer, getSocket } from './multiplayer/socket';
import { initChat, addSystemMessage } from './multiplayer/chat';
import { initChatUI } from './ui/chatUI';
import { eventBus } from '../framework/events';
import { EVENTS, MoveEventData, DropBombEventData, CollectPowerupEventData } from './multiplayer/events';
import { Direction } from './entities/player';
import { initLobby } from './game/lobby';

// Connection state
let isConnected = false;
let playerId: string | null = null;
let socket: any = null;

document.addEventListener('DOMContentLoaded', () => {
  // Clear any existing content to prevent old styles from appearing
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '';
    
    // Apply base styles immediately
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.body.style.backgroundColor = '#1a1a1a';
    
    // Make container full-page
    app.style.width = '100vw';
    app.style.height = '100vh';
    app.style.position = 'relative';
    app.style.overflow = 'hidden';
    app.style.backgroundColor = '#1a1a1a';
    
    // Initialize the game immediately (skipping the old lobby)
    initGame();
    
    // Initialize the lobby directly from here
    // This ensures only one lobby is shown
    initLobby(app);
    
    // Remove any existing chat buttons that might be showing
    const existingButton = document.querySelector('.chat-toggle');
    if (existingButton) {
      existingButton.remove();
    }
    
    // Chat UI will be initialized after player enters nickname
  }
  
  // Listen for player login to initialize multiplayer
  eventBus.on('player:login', (data: { nickname: string }) => {
    // Initialize multiplayer when player logs in
    initializeMultiplayer(data.nickname);
  });
});

// Initialize multiplayer components
async function initializeMultiplayer(nickname: string) {
  try {
    // Store nickname in localStorage for persistence
    localStorage.setItem('playerNickname', nickname);
    
    // Connect to server
    await connectToServer(nickname);
    
    // Set connected state
    isConnected = true;
    playerId = getSocketId();
    socket = getSocket();
    
    // Set up event listeners after socket is initialized
    setupEventListeners();
    
    // Initialize chat with player nickname
    initChat(nickname);
    
    // Initialize chat UI but keep the button hidden until player joins the lobby
    const gameContainer = document.getElementById('app');
    if (gameContainer) {
      // Initialize chat UI (button will be hidden by default)
      initChatUI(gameContainer);
      
      // Note: We don't make the button visible here anymore
      // The button will be shown in the lobby.ts file after the player joins
      console.log('Chat UI initialized, button will be shown after joining lobby');
    }
    
    // Add system message
    addSystemMessage(`Connected to game server as ${nickname}`);
    
    // The JOIN_LOBBY event is now sent automatically in the socket.ts file
    // immediately after connection for instant lobby joining
    console.log('Lobby join will happen automatically on connection');
    
    console.log('Multiplayer initialized successfully');
  } catch (error) {
    console.error('Failed to initialize multiplayer:', error);
    // Show error message to user
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      z-index: 9999;
    `;
    errorMessage.textContent = 'Failed to connect to multiplayer server. Playing in offline mode.';
    document.body.appendChild(errorMessage);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 5000);
  }
}

/**
 * Set up event listeners for game events
 */
function setupEventListeners(): void {
  // Make sure socket is initialized
  if (!socket) {
    console.error('Socket is not initialized yet');
    return;
  }
  
  // Listen for lobby updates from server
  socket.on(EVENTS.LOBBY_UPDATE, (data) => {
    // Forward to event bus for lobby UI to handle
    eventBus.emit('lobby_update', data);
  });
  
  // Listen for game start from server
  socket.on(EVENTS.START_GAME, (data) => {
    // Forward to event bus
    eventBus.emit('game:started', data);
  });
  
  // Listen for errors from server
  socket.on('error', (data) => {
    // Forward to event bus
    eventBus.emit('error', data);
  });
  
  // Local player moved - send to server
  eventBus.on('player:moved', (data: { id: string, x: number, y: number }) => {
    // Only send if it's the local player
    if (data.id === playerId) {
      sendPlayerMove(data.x, data.y);
    }
  });
  
  // Local player placed bomb - send to server
  eventBus.on('bomb:placed', (data: { playerId: string, x: number, y: number, range: number }) => {
    // Only send if it's the local player
    if (data.playerId === playerId) {
      sendBombPlaced(data.x, data.y, data.range);
    }
  });
  
  // Local player collected powerup - send to server
  eventBus.on('powerup:collected', (data: { playerId: string, type: string, x: number, y: number }) => {
    // Only send if it's the local player
    if (data.playerId === playerId) {
      sendPowerupCollected(data.type, data.x, data.y);
    }
  });
  
  // Remote player moved - update game state
  eventBus.on('remote:player:moved', (data: MoveEventData) => {
    // Update remote player position
    eventBus.emit('remote:player:update', {
      id: data.playerId,
      x: data.x,
      y: data.y,
      direction: data.direction
    });
  });
  
  // Remote player placed bomb - update game state
  eventBus.on('remote:bomb:dropped', (data: DropBombEventData) => {
    // Create bomb at remote player's position
    eventBus.emit('remote:bomb:create', {
      ownerId: data.playerId,
      x: data.x,
      y: data.y,
      explosionRange: data.explosionRange
    });
  });
  
  // Player joined event
  eventBus.on('player:joined', (data: { id: string, nickname: string }) => {
    // Add system message
    addSystemMessage(`${data.nickname} joined the game`);
    
    // Add player to game
    eventBus.emit('player:add', {
      id: data.id,
      nickname: data.nickname
    });
  });
  
  // Player left event
  eventBus.on('player:left', (data: { id: string, nickname: string }) => {
    // Add system message
    addSystemMessage(`${data.nickname} left the game`);
    
    // Remove player from game
    eventBus.emit('player:remove', {
      id: data.id
    });
  });
  
  // Game state update
  eventBus.on('game:state:updated', (data) => {
    // Update game state
    eventBus.emit('game:state:update', data);
  });
  
  // Game started
  eventBus.on('game:started', (data) => {
    // Add system message
    addSystemMessage('Game started!');
    
    // Start game
    eventBus.emit('game:start', data);
  });
  
  // Game ended
  eventBus.on('game:ended', (data) => {
    // Add system message
    if (data.winner) {
      addSystemMessage(`Game over! ${data.winner.nickname} wins!`);
    } else {
      addSystemMessage('Game over!');
    }
    
    // End game
    eventBus.emit('game:end', data);
  });
  
  // Socket connection events
  eventBus.on('socket:disconnected', () => {
    isConnected = false;
    addSystemMessage('Disconnected from server. Attempting to reconnect...');
  });
  
  eventBus.on('socket:connected', () => {
    isConnected = true;
    playerId = getSocketId();
    addSystemMessage('Reconnected to server');
  });
  
  eventBus.on('socket:error', (data) => {
    addSystemMessage(`Connection error: ${data.error}`);
  });
}

/**
 * Send player movement to server
 * @param x X coordinate
 * @param y Y coordinate
 * @param direction Movement direction
 */
function sendPlayerMove(x: number, y: number, direction: Direction = Direction.NONE): void {
  if (!isConnected) return;
  
  const moveData: MoveEventData = {
    playerId: playerId || '',
    x,
    y,
    direction
  };
  
  sendToServer(EVENTS.MOVE, moveData);
}

/**
 * Send bomb placement to server
 * @param x X coordinate
 * @param y Y coordinate
 * @param range Explosion range
 */
function sendBombPlaced(x: number, y: number, range: number): void {
  if (!isConnected) return;
  
  const bombData: DropBombEventData = {
    playerId: playerId || '',
    x,
    y,
    explosionRange: range
  };
  
  sendToServer(EVENTS.DROP_BOMB, bombData);
}

/**
 * Send powerup collection to server
 * @param type Powerup type
 * @param x X coordinate
 * @param y Y coordinate
 */
function sendPowerupCollected(type: string, x: number, y: number): void {
  if (!isConnected) return;
  
  const powerupData: CollectPowerupEventData = {
    playerId: playerId || '',
    powerupId: `powerup_${Date.now()}`,
    powerupType: type,
    x,
    y
  };
  
  sendToServer(EVENTS.COLLECT_POWERUP, powerupData);
}

/**
 * Disconnect from multiplayer
 */
function disconnectMultiplayer(): void {
  disconnectFromServer();
  isConnected = false;
  playerId = null;
  
  // Add system message
  addSystemMessage('Disconnected from game server');
}

/**
 * Check if connected to multiplayer
 * @returns Connection status
 */
export function isMultiplayerConnected(): boolean {
  return isConnected;
}

/**
 * Get current player ID
 * @returns Player ID if connected, null otherwise
 */
export function getPlayerId(): string | null {
  return playerId;
}

/**
 * Send end game event to the server
 */
export function endCurrentGame(): void {
  if (!isConnected) return;
  
  console.log('Sending end game request to server');
  sendToServer(EVENTS.END_GAME, {});
}
