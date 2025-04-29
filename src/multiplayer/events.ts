// Custom multiplayer events (join, move, bomb, etc.)
export const EVENTS = {
  // Connection events
  JOIN: 'join',
  LEAVE: 'leave',
  DISCONNECT: 'disconnect',
  
  // Lobby events
  JOIN_LOBBY: 'join_lobby',
  LEAVE_LOBBY: 'leave_lobby',
  LOBBY_UPDATE: 'lobby_update',
  PLAYER_READY: 'player_ready',
  START_GAME: 'start_game',
  GAME_READY: 'game_ready',
  
  // Game events
  MOVE: 'move',
  DROP_BOMB: 'drop_bomb',
  COLLECT_POWERUP: 'collect_powerup',
  PLAYER_HIT: 'player_hit',
  PLAYER_ELIMINATED: 'player_eliminated',
  GAME_STATE_UPDATE: 'game_state_update',
  GAME_OVER: 'game_over',
  END_GAME: 'end_game',
  
  // Chat events
  CHAT: 'chat',
  
  // Player identification events
  PLAYER_NUMBER: 'player:number',
};

// Player data interface
export interface PlayerData {
  id: string;
  nickname: string;
  isReady?: boolean;
  color?: string;
  playerNumber?: number;
}

// Lobby data interface
export interface LobbyData {
  players: PlayerData[];
  maxPlayers: number;
  gameInProgress: boolean;
}

// Game state interface
export interface GameStateData {
  players: PlayerData[];
  gameStarted: boolean;
  gameOver: boolean;
  winner?: PlayerData;
}

// Join event data
export interface JoinEventData {
  nickname: string;
}

// Lobby update event data
export interface LobbyUpdateEventData {
  lobby: LobbyData;
}

// Player ready event data
export interface PlayerReadyEventData {
  playerId: string;
  isReady: boolean;
}

// Game start event data
export interface GameStartEventData {
  players: PlayerData[];
  mapSeed?: number;
}

// Move event data
export interface MoveEventData {
  playerId: string;
  x: number;
  y: number;
  direction: number;
}

// Drop bomb event data
export interface DropBombEventData {
  playerId: string;
  x: number;
  y: number;
  explosionRange: number;
}

// Collect powerup event data
export interface CollectPowerupEventData {
  playerId: string;
  powerupId: string;
  powerupType: string;
  x: number;
  y: number;
}

// Chat event data
export interface ChatEventData {
  playerId: string;
  nickname: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
  playerNumber?: number;
  isLocalPlayer?: boolean;
}
