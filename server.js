// Simple WebSocket server for Bomberman game
const WebSocket = require('ws');
const http = require('http');
const express = require('express');

// Create express app
const app = express();
const port = process.env.PORT || 5173;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();
let nextPlayerId = 1;

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Assign a unique ID to this connection
  const playerId = `player_${nextPlayerId++}`;
  
  // Store client connection
  clients.set(playerId, {
    ws,
    id: playerId,
    nickname: null,
    isReady: false
  });
  
  // Handle messages from client
  ws.on('message', (messageData) => {
    try {
      const message = JSON.parse(messageData);
      console.log('Received message:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'player:join':
          // Player joining the game
          const nickname = message.payload.nickname;
          
          // Update client data
          const client = clients.get(playerId);
          client.nickname = nickname;
          
          // Send player joined confirmation
          ws.send(JSON.stringify({
            type: 'player:joined',
            data: {
              id: playerId,
              nickname: nickname,
              isReconnection: false
            }
          }));
          
          // Broadcast new player to all clients
          broadcastToAll({
            type: 'player:new',
            data: {
              id: playerId,
              nickname: nickname
            }
          }, playerId);
          
          // Send waiting room update to all clients
          sendWaitingRoomUpdate();
          break;
          
        case 'player:move':
          // Broadcast player movement to all clients
          broadcastToAll({
            type: 'player:move',
            data: {
              id: playerId,
              ...message.payload
            }
          }, playerId);
          break;
          
        case 'player:placeBomb':
          // Broadcast bomb placement to all clients
          broadcastToAll({
            type: 'bomb:placed',
            data: {
              id: playerId,
              ...message.payload
            }
          });
          break;
          
        case 'chat:message':
          // Broadcast chat message to all clients
          broadcastToAll({
            type: 'chat:message',
            data: {
              id: playerId,
              nickname: clients.get(playerId).nickname,
              message: message.payload.message,
              timestamp: new Date().toISOString()
            }
          });
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Client ${playerId} disconnected`);
    
    // Get client data before removing
    const client = clients.get(playerId);
    
    // Remove client from list
    clients.delete(playerId);
    
    // Broadcast player left to all clients
    if (client && client.nickname) {
      broadcastToAll({
        type: 'player:left',
        data: {
          id: playerId,
          nickname: client.nickname
        }
      });
      
      // Send waiting room update
      sendWaitingRoomUpdate();
    }
  });
});

// Broadcast message to all clients except sender
function broadcastToAll(message, excludeId = null) {
  clients.forEach((client, id) => {
    if (excludeId && id === excludeId) return;
    
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

// Send waiting room update to all clients
function sendWaitingRoomUpdate() {
  const players = [];
  
  // Collect player data
  clients.forEach((client, id) => {
    if (client.nickname) {
      players.push({
        id: id,
        nickname: client.nickname,
        isReady: client.isReady
      });
    }
  });
  
  // Send update to all clients
  broadcastToAll({
    type: 'waitingRoom:update',
    data: {
      players: players
    }
  });
}

// Start the server
server.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
});
