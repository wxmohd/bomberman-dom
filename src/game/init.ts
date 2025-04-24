// Game initialization logic
import { generateMap, resetMap } from './map';
import { initRenderer, renderMap, getMapContainer } from './renderer';
import { eventBus } from '../../framework/events';
import { clearPowerUps } from './powerups';
import { initPowerUpHUD, resetPowerUps } from './powerup-hud';
import { createPowerUpTestButton } from './power-up-test';
import { initLobby, playerStore } from './lobby';
import { Player } from '../entities/player';
import { PlayerController } from './PlayerController';
import { PlayerRenderer } from './PlayerRenderer';
import { BombSystem } from './BombSystem';
import { BombManager } from './BombManager';
import { BombController } from './BombController';
import { addTestPlayer } from './test-player';
import { PLAYER_STARTING_POSITIONS } from './map';
import { TILE_SIZE } from './constants';

// Map data storage
let currentMapData: any = null;

// Initialize the game
export function initGame() {
  const app = document.getElementById('app');
  if (!app) return;
  
  // Initialize the lobby system
  initLobby(app);
  
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
  
  // Add buttons to the controls container
  controlsContainer.appendChild(generateButton);
  controlsContainer.appendChild(resetButton);
  
  // Listen for game start event (will be triggered by the lobby system)
  eventBus.on('game:start', (data) => {
    // Show controls when game starts
    if (controlsContainer) {
      controlsContainer.style.display = 'flex';
    }
    startGame(app);
  });
  
  // Listen for game reset event
  eventBus.on('game:reset', () => {
    resetGame(app);
  });
}

// Start a new game
function startGame(container: HTMLElement) {
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
  const { players, currentPlayer } = playerStore.getState();
  
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
  
  // Create power-up test buttons
  createPowerUpTestButton();
  
  // Generate map
  currentMapData = generateMap();
  
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
  
  // Initialize player controller with the grid size
  const playerController = new PlayerController(bombSystem, currentMapData.grid.length);
  
  // Render map first
  renderMap(currentMapData);
  
  // Get the map container for direct player addition
  const gameMapContainer = getMapContainer();
  if (!gameMapContainer) {
    console.error('Map container not found!');
    return;
  }
  
  // Add a test player directly to the map AFTER rendering
  setTimeout(() => {
    addTestPlayer(gameMapContainer);
    console.log('Added test player with direct DOM manipulation');
  }, 100);
  
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
