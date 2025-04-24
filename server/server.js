// WebSocket server for Bomberman game
const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);

// Create WebSocket server with proper configuration
const wss = new WebSocket.Server({ 
  server,
  // No path restriction to accept connections from any path
  perMessageDeflate: false // Disable per-message deflate to avoid issues
});

// Log when server starts
console.log('WebSocket server created');

// Debug: Log all WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  console.log(`Received upgrade request from ${request.url}`);
});

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve static files from the public directory
app.use(express.static('public'));

// We'll use the PORT defined at the end of the file

// Game sessions management
const gameSessions = {
  // There will be only one active game session at a time
  activeSession: {
    id: 'default-session',
    players: {},
    blocks: [],
    bombs: [],
    explosions: [],
    gameStarted: false,
    maxPlayers: 4,
    waitingTimer: null,
    gameTimer: null
  }
};

// Player positions in corners
const startPositions = [
  { x: 1, y: 1 },             // Top-left
  { x: 13, y: 1 },            // Top-right
  { x: 1, y: 11 },            // Bottom-left
  { x: 13, y: 11 }            // Bottom-right
];

// Track connections by nickname and by connection ID
const connectionsByNickname = {};
const connectionsById = {};

// Handle new WebSocket connection
wss.on('connection', (ws, req) => {
  console.log('New connection established');
  
  // Assign a unique connection ID
  ws.id = generateId();
  
  // Send welcome message
  sendToClient(ws, {
    type: 'connection:established',
    data: {
      message: 'Connected to Bomberman server',
      connectionId: ws.id
    }
  });
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      const { type, data } = parsedMessage;
      
      console.log(`Received message: ${type} from ${ws.nickname || 'unknown'}`);
      
      switch (type) {
        case 'player:join':
          handlePlayerJoin(ws, data);
          break;
        case 'player:move':
          handlePlayerMove(ws, data);
          break;
        case 'player:placeBomb':
          handlePlaceBomb(ws, data);
          break;
        case 'chat:message':
          handleChatMessage(ws, data);
          break;
        case 'game:start':
          console.log('Received game:start message from client');
          startGame();
          break;
        default:
          console.log(`Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('Error parsing server message:', error);
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client ${ws.connectionId} disconnected`);
    
    // Remove from connections by ID
    delete connectionsById[ws.connectionId];
    
    // If this connection has a player associated with it
    if (ws.playerId) {
      const nickname = ws.nickname;
      
      // Remove this connection from the player's connections
      if (connectionsByNickname[nickname]) {
        // Filter out this connection
        connectionsByNickname[nickname] = connectionsByNickname[nickname].filter(
          conn => conn.connectionId !== ws.connectionId
        );
        
        // If this was the last connection for this player, remove the player
        if (connectionsByNickname[nickname].length === 0) {
          console.log(`Player ${nickname} (${ws.playerId}) has no more connections, removing from game`);
          
          // Remove player from game state
          if (gameSessions.activeSession.players[ws.playerId]) {
            // Broadcast player left message
            broadcastToAll({
              type: 'player:left',
              data: {
                id: ws.playerId,
                nickname: nickname
              }
            });
            
            // Remove player from game state
            delete gameSessions.activeSession.players[ws.playerId];
            
            // Check if only one player remains
            if (gameSessions.activeSession.gameStarted) {
              checkGameEnd();
            }
            
            // Update waiting room for all clients
            updateWaitingRoom();
          }
          
          // Remove from nickname tracking
          delete connectionsByNickname[nickname];
        } else {
          console.log(`Player ${nickname} still has ${connectionsByNickname[nickname].length} active connections`);
        }
      }
    }
  });
  
  // Send initial waiting room state to new connection
  updateWaitingRoom();
});

// Handle different message types
function handleMessage(ws, data) {
  const { type, payload } = data;
  
  switch (type) {
    case 'player:join':
      handlePlayerJoin(ws, payload);
      break;
    case 'player:move':
      handlePlayerMove(ws, payload);
      break;
    case 'player:placeBomb':
      handlePlaceBomb(ws, payload);
      break;
    case 'chat:message':
      handleChatMessage(ws, payload);
      break;
    default:
      console.log(`Unknown message type: ${type}`);
  }
}

// Handle player join
function handlePlayerJoin(ws, payload) {
  const { nickname } = payload;
  
  // Store nickname on the connection
  ws.nickname = nickname;
  
  // Check if game is already in progress
  if (gameSessions.activeSession.gameStarted) {
    sendToClient(ws, {
      type: 'game:error',
      data: {
        message: 'Game already in progress'
      }
    });
    return;
  }
  
  // Check if max players reached
  if (Object.keys(gameSessions.activeSession.players).length >= gameSessions.activeSession.maxPlayers) {
    sendToClient(ws, {
      type: 'game:error',
      data: {
        message: 'Game is full'
      }
    });
    return;
  }
  
  // This is a new player
  const playerId = generateId();
  ws.playerId = playerId;
  
  // Initialize connection tracking for this nickname
  if (!connectionsByNickname[nickname]) {
    connectionsByNickname[nickname] = [];
  }
  connectionsByNickname[nickname].push(ws);
  
  // Add player to game state
  const playerIndex = Object.keys(gameSessions.activeSession.players).length;
  const position = startPositions[playerIndex];
  
  gameSessions.activeSession.players[playerId] = {
    id: playerId,
    nickname,
    position: { ...position },
    lives: 3,
    stats: {
      speed: 3,
      bombCapacity: 1,
      explosionRange: 1
    }
  };
  
  // Send confirmation to the client
  sendToClient(ws, {
    type: 'player:joined',
    data: {
      id: playerId,
      position,
      nickname,
      isReconnection: false
    }
  });
  
  // Broadcast new player to all clients
  broadcastToAll({
    type: 'player:new',
    data: {
      id: playerId,
      nickname,
      position
    }
  });
  
  console.log(`New player ${nickname} joined with ID ${playerId}`);
  
  // Update waiting room state for all clients
  updateWaitingRoom();
  
  // Send current game state to the new connection
  sendGameState(ws);
}

// Send current game state to a client
function sendGameState(ws) {
  const gameSession = gameSessions.activeSession;
  
  // Send all existing players
  Object.values(gameSession.players).forEach(player => {
    if (player.id !== ws.playerId) {
      sendToClient(ws, {
        type: 'player:new',
        data: {
          id: player.id,
          nickname: player.nickname,
          position: player.position
        }
      });
    }
  });
  
  // Send all active bombs
  gameSession.bombs.forEach(bomb => {
    sendToClient(ws, {
      type: 'bomb:placed',
      data: {
        id: bomb.id,
        ownerId: bomb.ownerId,
        position: bomb.position,
        range: bomb.range
      }
    });
  });
  
  // Send all blocks
  if (gameSession.blocks.length > 0) {
    sendToClient(ws, {
      type: 'map:blocks',
      data: {
        blocks: gameSession.blocks
      }
    });
  }
  
  // If game is in progress, send game started event
  if (gameSession.gameStarted) {
    sendToClient(ws, {
      type: 'game:inProgress',
      data: {
        players: Object.values(gameSession.players).map(p => ({
          id: p.id,
          nickname: p.nickname,
          position: p.position,
          lives: p.lives,
          stats: p.stats
        }))
      }
    });
  }
}

// Handle player movement
function handlePlayerMove(ws, payload) {
  const { direction, position } = payload;
  const playerId = ws.playerId;
  
  // Validate player exists
  if (!gameSessions.activeSession.players[playerId]) return;
  
  // Update player position
  gameSessions.activeSession.players[playerId].position = position;
  
  // Broadcast position update to all clients
  broadcastToAll({
    type: 'player:moved',
    data: {
      id: playerId,
      position,
      direction
    }
  });
}

// Handle bomb placement
function handlePlaceBomb(ws, payload) {
  const { position, range } = payload;
  const playerId = ws.playerId;
  
  // Validate player exists
  if (!gameSessions.activeSession.players[playerId]) return;
  
  // Generate bomb ID
  const bombId = generateId();
  
  // Add bomb to game state
  gameSessions.activeSession.bombs.push({
    id: bombId,
    ownerId: playerId,
    position,
    range: range || gameSessions.activeSession.players[playerId].stats.explosionRange,
    placedAt: Date.now()
  });
  
  // Broadcast bomb placement to all clients
  broadcastToAll({
    type: 'bomb:placed',
    data: {
      id: bombId,
      ownerId: playerId,
      position,
      range: range || gameSessions.activeSession.players[playerId].stats.explosionRange
    }
  });
  
  // Schedule bomb explosion
  setTimeout(() => {
    handleBombExplosion(bombId);
  }, 3000);
}

// Handle bomb explosion
function handleBombExplosion(bombId) {
  // Find bomb in game state
  const bombIndex = gameSessions.activeSession.bombs.findIndex(bomb => bomb.id === bombId);
  if (bombIndex === -1) return;
  
  const bomb = gameSessions.activeSession.bombs[bombIndex];
  
  // Calculate explosion coordinates
  const explosionCoords = calculateExplosionCoordinates(
    bomb.position.x, 
    bomb.position.y, 
    bomb.range
  );
  
  // Remove bomb from game state
  gameSessions.activeSession.bombs.splice(bombIndex, 1);
  
  // Add explosion to game state
  const explosionId = generateId();
  gameSessions.activeSession.explosions.push({
    id: explosionId,
    ownerId: bomb.ownerId,
    coordinates: explosionCoords,
    createdAt: Date.now()
  });
  
  // Broadcast explosion to all clients
  broadcastToAll({
    type: 'bomb:explode',
    data: {
      id: bombId,
      ownerId: bomb.ownerId,
      coordinates: explosionCoords
    }
  });
  
  // Check for player hits and block destruction
  processExplosionEffects(explosionCoords, bomb.ownerId);
  
  // Remove explosion after animation time
  setTimeout(() => {
    // Find explosion in game state
    const explosionIndex = gameSessions.activeSession.explosions.findIndex(exp => exp.id === explosionId);
    if (explosionIndex !== -1) {
      gameSessions.activeSession.explosions.splice(explosionIndex, 1);
    }
  }, 1000);
}

// Process effects of explosion (player hits, block destruction)
function processExplosionEffects(coordinates, attackerId) {
  // Check for player hits
  Object.keys(gameSessions.activeSession.players).forEach(playerId => {
    const player = gameSessions.activeSession.players[playerId];
    
    // Check if player position matches any explosion coordinate
    const isHit = coordinates.some(coord => 
      coord.x === player.position.x && coord.y === player.position.y
    );
    
    if (isHit && player.lives > 0) {
      // Reduce player lives
      player.lives--;
      
      // Broadcast player hit
      broadcastToAll({
        type: 'player:hit',
        data: {
          id: playerId,
          attackerId,
          livesRemaining: player.lives
        }
      });
      
      // Check if player is eliminated
      if (player.lives <= 0) {
        broadcastToAll({
          type: 'player:eliminated',
          data: {
            id: playerId,
            eliminatedBy: attackerId
          }
        });
        
        // Check if game has ended
        checkGameEnd();
      }
    }
  });
  
  // TODO: Handle block destruction and power-up spawning
}

// Calculate explosion coordinates
function calculateExplosionCoordinates(x, y, range) {
  const coordinates = [{ x, y }]; // Center of explosion
  
  // Directions: up, right, down, left
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ];
  
  directions.forEach(dir => {
    for (let i = 1; i <= range; i++) {
      coordinates.push({
        x: x + (dir.dx * i),
        y: y + (dir.dy * i)
      });
    }
  });
  
  return coordinates;
}

// Handle chat messages
function handleChatMessage(ws, payload) {
  console.log('Handling chat message:', payload);
  
  // Check if payload is properly structured
  if (!payload || (!payload.message && !(payload.payload && payload.payload.message))) {
    console.error('Invalid chat message payload:', payload);
    return;
  }
  
  // Extract message from payload (handle both formats)
  const message = payload.message || (payload.payload && payload.payload.message);
  const playerId = ws.playerId;
  
  // Validate player exists
  if (!gameSessions.activeSession.players[playerId]) return;
  
  // Get player nickname
  const nickname = gameSessions.activeSession.players[playerId].nickname;
  
  // Broadcast chat message to all clients
  broadcastToAll({
    type: 'chat:message',
    data: {
      id: playerId,
      nickname,
      message,
      timestamp: Date.now()
    }
  });
}

// Update waiting room state
function updateWaitingRoom() {
  // Get all players from the active session
  const players = Object.values(gameSessions.activeSession.players).map(p => ({
    id: p.id,
    nickname: p.nickname,
    ready: true, // All players are ready by default
    color: p.color || '#' + Math.floor(Math.random()*16777215).toString(16) // Generate random color if not set
  }));
  
  // Get the total player count
  const playerCount = players.length;
  
  console.log(`Updating waiting room: ${playerCount} players`);
  console.log('Players:', JSON.stringify(players));
  
  // Send individual updates to each client with their ID highlighted
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.playerId) {
      sendToClient(client, {
        type: 'waitingRoom:update',
        data: {
          players: players,
          count: playerCount,
          maxPlayers: gameSessions.activeSession.maxPlayers,
          yourId: client.playerId
        }
      });
    }
  });
  
  // Also broadcast to all clients (for those who might not have an ID yet)
  broadcastToAll({
    type: 'waitingRoom:update',
    data: {
      players: players,
      count: playerCount,
      maxPlayers: gameSessions.activeSession.maxPlayers
    }
  });
  
  // Check if we should start the game
  if (playerCount >= 2) {
    // If we have 4 players, start immediately
    if (playerCount === gameSessions.activeSession.maxPlayers) {
      startGameCountdown(10);
    } 
    // If we have 2-3 players, start after 20 seconds
    else if (!gameSessions.activeSession.waitingTimer) {
      gameSessions.activeSession.waitingTimer = setTimeout(() => {
        startGameCountdown(10);
      }, 20000);
    }
  } else {
    // Clear countdown if players drop below 2
    if (gameSessions.activeSession.waitingTimer) {
      clearTimeout(gameSessions.activeSession.waitingTimer);
      gameSessions.activeSession.waitingTimer = null;
    }
  }
}

// Start game countdown
function startGameCountdown(seconds) {
  // Clear any existing waiting timer
  if (gameSessions.activeSession.waitingTimer) {
    clearTimeout(gameSessions.activeSession.waitingTimer);
    gameSessions.activeSession.waitingTimer = null;
  }
  
  // Broadcast countdown start
  broadcastToAll({
    type: 'game:countdown',
    data: {
      seconds
    }
  });
  
  // Start countdown
  let remainingSeconds = seconds;
  const countdownInterval = setInterval(() => {
    remainingSeconds--;
    
    // Broadcast countdown update
    broadcastToAll({
      type: 'game:countdown',
      data: {
        seconds: remainingSeconds
      }
    });
    
    // Start game when countdown reaches 0
    if (remainingSeconds <= 0) {
      clearInterval(countdownInterval);
      startGame();
    }
  }, 1000);
}

// Start the game
function startGame() {
  gameSessions.activeSession.gameStarted = true;
  
  // Generate map blocks
  generateMap();
  
  // Broadcast game start
  broadcastToAll({
    type: 'game:start',
    data: {
      players: Object.values(gameSessions.activeSession.players).map(p => ({
        id: p.id,
        nickname: p.nickname,
        position: p.position,
        lives: p.lives,
        stats: p.stats
      })),
      blocks: gameSessions.activeSession.blocks
    }
  });
}

// Generate map with walls and blocks
function generateMap() {
  // TODO: Implement map generation with walls and destructible blocks
  // For now, just create a basic map structure
  gameSessions.activeSession.blocks = [];
}

// Check if game has ended (only one player left)
function checkGameEnd() {
  const alivePlayers = Object.values(gameSessions.activeSession.players).filter(p => p.lives > 0);
  
  if (alivePlayers.length <= 1 && gameSessions.activeSession.gameStarted) {
    // Game has ended
    const winner = alivePlayers[0];
    
    // Broadcast game end
    broadcastToAll({
      type: 'game:end',
      data: {
        winner: winner ? {
          id: winner.id,
          nickname: winner.nickname
        } : null
      }
    });
    
    // Reset game state after a delay
    setTimeout(resetGameState, 5000);
  }
}

// Reset game state
function resetGameState() {
  // Create a new game session
  gameSessions.activeSession = {
    id: generateId(),
    players: {},
    blocks: [],
    bombs: [],
    explosions: [],
    gameStarted: false,
    maxPlayers: 4,
    waitingTimer: null,
    gameTimer: null
  };
  
  // Reset connection tracking but keep the connections
  // This allows players to stay connected but need to rejoin
  Object.keys(connectionsByNickname).forEach(nickname => {
    const connections = connectionsByNickname[nickname];
    connections.forEach(conn => {
      // Keep the connection but remove the player ID
      delete conn.playerId;
    });
  });
  
  // Broadcast game reset
  broadcastToAll({
    type: 'game:reset'
  });
}

// Send message to a specific client
function sendToClient(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Broadcast message to all connected clients
function broadcastToAll(message) {
  console.log(`Broadcasting: ${message.type}`, message.data ? message.data : '');
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Generate a unique ID
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Start the server on a different port than the Vite dev server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is ready to accept connections`);
});

// This was a duplicate broadcastToAll function - removed
