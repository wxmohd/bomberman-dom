// Game initialization logic
import { generateMap, resetMap } from './map';
import { initRenderer, renderMap, getMapContainer } from './renderer';
import { eventBus } from '../../framework/events';
import { clearPowerUps } from './powerups';
import { initPowerUpHUD, resetPowerUps } from './powerup-hud';
import { initLobby, playerStore } from './lobby';
import { Player } from '../entities/player';
import { PlayerController } from './PlayerController';
import { PlayerRenderer } from './PlayerRenderer';
import { BombSystem } from './BombSystem';
import { BombManager } from './BombManager';
import { BombController } from './BombController';
// import { addTestPlayer } from './test-player';
import { PLAYER_STARTING_POSITIONS } from './map';
import { TILE_SIZE } from './constants';

// Map data storage
let currentMapData: any = null;

// Initialize the game
export function initGame() {
  const app = document.getElementById('app');
  if (!app) return;
  
  // Clear any existing content to prevent old styles from appearing
  app.innerHTML = '';
  
  // Apply base styles to ensure consistent appearance
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
  
  // Skip the old lobby initialization - we'll handle this in main.ts directly
  // This prevents the brief flash of the old lobby
  
  // Create a controls container (will be hidden initially)
  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'game-controls';
  controlsContainer.style.margin = '10px';
  controlsContainer.style.textAlign = 'center';
  controlsContainer.style.display = 'none'; // Hide initially
  document.body.insertBefore(controlsContainer, app.nextSibling);
  
  // Create a button to generate the map
  const generateButton = document.createElement('button');
  generateButton.textContent = 'Generate Map';
  generateButton.style.margin = '10px';
  generateButton.style.padding = '8px 16px';
  generateButton.style.backgroundColor = '#4CAF50';
  generateButton.style.color = 'white';
  generateButton.style.border = 'none';
  generateButton.style.borderRadius = '4px';
  generateButton.style.cursor = 'pointer';
  generateButton.addEventListener('click', () => {
    startGame(app);
  });
  
  // Create an End Game button
  const endGameButton = document.createElement('button');
  endGameButton.textContent = 'End Game';
  endGameButton.style.margin = '10px';
  endGameButton.style.padding = '8px 16px';
  endGameButton.style.backgroundColor = '#f44336';
  endGameButton.style.color = 'white';
  endGameButton.style.border = 'none';
  endGameButton.style.borderRadius = '4px';
  endGameButton.style.cursor = 'pointer';
  endGameButton.addEventListener('click', () => {
    endGame();
  });
  
  // Create a reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Map';
  resetButton.style.margin = '10px';
  resetButton.style.padding = '8px 16px';
  resetButton.style.backgroundColor = '#f44336';
  resetButton.style.color = 'white';
  resetButton.style.border = 'none';
  resetButton.style.borderRadius = '4px';
  resetButton.style.cursor = 'pointer';
  resetButton.addEventListener('click', () => {
    resetGame(app);
  });
  
  // Add buttons to controls container
  controlsContainer.appendChild(generateButton);
  controlsContainer.appendChild(endGameButton);
  controlsContainer.appendChild(resetButton);
  
  // Listen for game start event (will be triggered by the lobby system)
  eventBus.on('game:start', (data) => {
    // Show controls when game starts
    if (controlsContainer) {
      controlsContainer.style.display = 'flex';
    }
    // Pass the game data to startGame to use the map seed
    startGame(app, data);
  });
  
  // Listen for game reset event
  eventBus.on('game:reset', () => {
    resetGame(app);
  });
}

// Start a new game
function startGame(container: HTMLElement, gameData?: any) {
  // Clear main container
  container.innerHTML = '';
  
  // Set full page styles for game container
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.width = '100vw';
  document.body.style.height = '100vh';
  document.body.style.backgroundColor = '#222';
  
  // Make container full-page
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  
  // Initialize renderer first
  initRenderer(container);
  
  // Get player data from the store
  const { players } = playerStore.getState();
  
  // IMPORTANT: Always use the first player as the local player for simplicity
  // This ensures consistent behavior in single-player mode
  if (players.length > 0) {
    localStorage.setItem('playerId', players[0].id);
    console.log(`Setting local player ID to first player: ${players[0].id}`);
  } else {
    console.error('No players available!');
  }
  
  // Get the current player from the players list (should be the first player)
  const currentPlayer = players.length > 0 ? players[0] : null;
  
  // Double-check that the player ID is set correctly
  if (currentPlayer) {
    // Force the ID to match the first player
    localStorage.setItem('playerId', currentPlayer.id);
    console.log(`Confirmed player ID in localStorage: ${currentPlayer.id}`);
    
    // Also store in session storage as a backup
    sessionStorage.setItem('playerId', currentPlayer.id);
    console.log(`Also stored in sessionStorage: ${currentPlayer.id}`);
  } else {
    console.error('No current player found!');
  }
  
  // Create a controls container that won't be cleared
  let controlsContainer = document.getElementById('game-controls');
  if (!controlsContainer) {
    controlsContainer = document.createElement('div');
    controlsContainer.id = 'game-controls';
    controlsContainer.style.position = 'fixed';
    controlsContainer.style.top = '20px';
    controlsContainer.style.right = '20px';
    controlsContainer.style.zIndex = '1000';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.flexDirection = 'column';
    controlsContainer.style.gap = '10px';
    document.body.appendChild(controlsContainer);
  } else {
    // Clear existing controls
    controlsContainer.innerHTML = '';
  }
  
  // Create the reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Map';
  resetButton.style.padding = '10px 20px';
  resetButton.style.backgroundColor = '#f44336';
  resetButton.style.color = 'white';
  resetButton.style.border = 'none';
  resetButton.style.borderRadius = '4px';
  resetButton.style.cursor = 'pointer';
  resetButton.style.fontWeight = 'bold';
  resetButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
  resetButton.style.transition = 'all 0.2s ease';
  resetButton.addEventListener('mouseover', () => {
    resetButton.style.backgroundColor = '#d32f2f';
    resetButton.style.transform = 'translateY(-2px)';
    resetButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  });
  resetButton.addEventListener('mouseout', () => {
    resetButton.style.backgroundColor = '#f44336';
    resetButton.style.transform = 'translateY(0)';
    resetButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
  });
  resetButton.addEventListener('click', () => {
    resetGame(container);
  });
  
  // Add button to the controls container
  controlsContainer.appendChild(resetButton);
  
  // Create player info display
  const playerInfo = document.createElement('div');
  playerInfo.id = 'player-info';
  playerInfo.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    z-index: 100;
  `;
  
  if (currentPlayer) {
    playerInfo.innerHTML = `
      <div style="margin-bottom: 5px; font-weight: bold;">You: ${currentPlayer.nickname}</div>
      <div style="width: 20px; height: 20px; background-color: ${currentPlayer.color}; border-radius: 50%; display: inline-block; margin-right: 5px;"></div>
    `;
  }
  
  document.body.appendChild(playerInfo);
  
  // Initialize power-up HUD
  initPowerUpHUD();
  
  // Generate map with seed from server if available
  if (gameData && gameData.mapSeed) {
    console.log(`Using server-provided map seed: ${gameData.mapSeed}`);
    currentMapData = generateMap(gameData.mapSeed);
  } else {
    console.log('No map seed provided, generating random map');
    currentMapData = generateMap();
  }
  
  // Initialize bomb system and player mechanics
  const mapContainer = getMapContainer();
  if (!mapContainer) return;
  
  // Create a bomb system with the map container and grid size
  const bombSystem = new BombSystem(mapContainer, currentMapData.grid.length);
  
  // Get the bomb manager from the bomb system
  const bombManager = bombSystem.getBombManager();
  
  // Start the bomb system
  bombSystem.start();
  
  // Update the bomb system with the current grid
  bombSystem.updateGrid(currentMapData.grid);
  
  // Create real players instead of test player
  console.log('Attempting to create players...');
  console.log('Map container:', mapContainer);
  console.log('Current player:', currentPlayer);
  console.log('All players:', players);
  console.log('Starting positions:', PLAYER_STARTING_POSITIONS);
  
  // Ensure map container exists
  let mapContainerElement = mapContainer;
  if (!mapContainerElement) {
    console.error('Map container is missing! Creating it...');
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
      mapContainerElement = document.createElement('div');
      mapContainerElement.id = 'map-container';
      mapContainerElement.style.position = 'relative';
      mapContainerElement.style.width = `${currentMapData.width * TILE_SIZE}px`;
      mapContainerElement.style.height = `${currentMapData.height * TILE_SIZE}px`;
      gameArea.appendChild(mapContainerElement);
      console.log('Created map container:', mapContainerElement);
    } else {
      console.error('Game area not found! Cannot create map container.');
    }
  }
  
  if (mapContainerElement) {
    // First, create all players using direct DOM approach for reliability
    players.forEach((playerData, index) => {
      const isLocalPlayer = playerData.id === localStorage.getItem('playerId');
      const pos = isLocalPlayer ? 
        PLAYER_STARTING_POSITIONS[0] : // Use first position for local player
        PLAYER_STARTING_POSITIONS[(index) % PLAYER_STARTING_POSITIONS.length];
      
      console.log(`Creating ${isLocalPlayer ? 'local' : 'remote'} player: ${playerData.nickname} at position: ${pos.x},${pos.y}`);
      
      // Create with direct DOM first to ensure visibility
      createPlayerDirectly(mapContainerElement, playerData.id, playerData.nickname, pos.x, pos.y);
      
      // Then try with Player class for full functionality
      try {
        const player = new Player(
          playerData.id,
          playerData.nickname,
          pos.x,
          pos.y,
          mapContainerElement
        );
        console.log(`Created player instance: ${player.nickname}`);
      } catch (error) {
        console.error(`Error creating player ${playerData.nickname} with Player class:`, error);
      }
    });
    
    // Verify players are in the DOM after a short delay
    setTimeout(() => {
      const playerElements = document.querySelectorAll('.player');
      console.log(`Found ${playerElements.length} player elements in the DOM`);
      
      if (playerElements.length === 0) {
        console.error('No player elements found in the DOM after creation!');
        
        // Last resort: create a test player directly
        if (currentPlayer) {
          console.log('Creating test player as last resort...');
          createPlayerDirectly(mapContainer, 'test-player', 'Test Player', 1, 1);
        }
      }
    }, 1000);
  } else {
    console.error('Cannot create players: map container is still missing');
  }
  
  // Function to create player directly with DOM manipulation as fallback
function createPlayerDirectly(container: HTMLElement, id: string, nickname: string, x: number, y: number): void {
  console.log(`Creating player directly with DOM: ${nickname} at ${x},${y}`);
  
  // Create player element
  const playerEl = document.createElement('div');
  playerEl.className = 'player';
  playerEl.id = `player-${id}`;
  
  // Style the player
  playerEl.style.position = 'absolute';
  playerEl.style.left = `${x * TILE_SIZE}px`;
  playerEl.style.top = `${y * TILE_SIZE}px`;
  playerEl.style.width = `${TILE_SIZE}px`;
  playerEl.style.height = `${TILE_SIZE}px`;
  playerEl.style.backgroundColor = id === localStorage.getItem('playerId') ? '#FF0000' : '#0000FF'; // Red for local, blue for remote
  playerEl.style.borderRadius = '50%';
  playerEl.style.zIndex = '1000';
  playerEl.style.boxShadow = '0 0 15px 5px rgba(255,0,0,0.7)';
  playerEl.style.border = '2px solid white';
  playerEl.style.boxSizing = 'border-box';
  
  // Add inner element for better visibility
  const innerElement = document.createElement('div');
  innerElement.style.position = 'absolute';
  innerElement.style.width = '70%';
  innerElement.style.height = '70%';
  innerElement.style.left = '15%';
  innerElement.style.top = '15%';
  innerElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
  innerElement.style.borderRadius = '50%';
  playerEl.appendChild(innerElement);
  
  // Add name tag
  const nameTag = document.createElement('div');
  nameTag.className = 'player-name';
  nameTag.textContent = nickname;
  nameTag.style.position = 'absolute';
  nameTag.style.bottom = `${TILE_SIZE + 5}px`;
  nameTag.style.left = '50%';
  nameTag.style.transform = 'translateX(-50%)';
  nameTag.style.color = 'white';
  nameTag.style.fontWeight = 'bold';
  nameTag.style.textShadow = '1px 1px 2px black';
  nameTag.style.whiteSpace = 'nowrap';
  nameTag.style.fontSize = '12px';
  
  // Add to player
  playerEl.appendChild(nameTag);
  
  // Add to container
  container.appendChild(playerEl);
  console.log('Player element added directly to DOM');
  
  // Force a reflow
  void playerEl.offsetWidth;
}

// Render map first
  renderMap(currentMapData);
  
  // Emit map ready event with player data
  eventBus.emit('map:ready', { 
    mapData: currentMapData,
    players,
    currentPlayer
  });
  
  console.log('Map generated with players:', players);
}

// Reset the game
function resetGame(container: HTMLElement) {
  // Clear power-ups
  clearPowerUps();
  
  // Reset power-up HUD
  resetPowerUps();
  
  // Reset map
  currentMapData = resetMap();
  
  // Re-render map
  renderMap(currentMapData);
  
  // Emit map reset event
  eventBus.emit('map:reset', { mapData: currentMapData });
  
  console.log('Map reset:', currentMapData);
}

// Get current map data
export function getCurrentMapData() {
  return currentMapData;
}

import { endCurrentGame } from '../main';

// End the current game and return to lobby
export function endGame() {
  console.log('Ending game...');
  
  // Send end game event to the server
  endCurrentGame();
  
  // Emit end game event to event bus
  eventBus.emit('game:end', {});
  
  // Reset the game state
  resetGame(document.getElementById('app') as HTMLElement);
  
  // Reset player store state
  playerStore.setState({
    gameState: 'login',
    players: [],
    lobbyData: null
  });
  
  // Show the lobby again
  const app = document.getElementById('app');
  if (app) {
    initLobby(app);
  }
  
  // Hide controls
  const controlsContainer = document.getElementById('game-controls');
  if (controlsContainer) {
    controlsContainer.style.display = 'none';
  }
}
