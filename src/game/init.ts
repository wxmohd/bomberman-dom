// Game initialization logic
import { generateMap, resetMap } from './map';
import { initRenderer, renderMap } from './renderer';
import { eventBus } from '../../framework/events';
import { clearPowerUps } from './powerups';
import { initPowerUpHUD, resetPowerUps } from './powerup-hud';
import { createPowerUpTestButton } from './power-up-test';

// Map data storage
let currentMapData: any = null;

// Initialize the game
export function initGame() {
  const app = document.getElementById('app');
  if (!app) return;
  
  // For now, just show a basic UI until Member 4 implements the lobby
  app.innerHTML = '<h1>Bomberman DOM</h1>';
  
  // Create a controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'game-controls';
  controlsContainer.style.margin = '10px';
  controlsContainer.style.textAlign = 'center';
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
  
  // Listen for game start event (will be triggered by Member 4's lobby system)
  eventBus.on('game:start', () => {
    startGame(app);
  });
  
  // Listen for game reset event
  eventBus.on('game:reset', () => {
    resetGame(app);
  });
}

// Start a new game
function startGame(container: HTMLElement) {
  // Create a controls container that won't be cleared
  let controlsContainer = document.getElementById('game-controls');
  if (!controlsContainer) {
    controlsContainer = document.createElement('div');
    controlsContainer.id = 'game-controls';
    controlsContainer.style.margin = '10px';
    controlsContainer.style.textAlign = 'center';
    document.body.insertBefore(controlsContainer, container);
  } else {
    // Clear existing controls
    controlsContainer.innerHTML = '';
  }
  
  // Create the reset button
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
    resetGame(container);
  });
  
  // Add button to the controls container
  controlsContainer.appendChild(resetButton);
  
  // Clear main container
  container.innerHTML = '';
  
  // Initialize renderer
  initRenderer(container);
  
  // Initialize power-up HUD
  initPowerUpHUD();
  
  // Create power-up test buttons
  createPowerUpTestButton();
  
  // Generate map
  currentMapData = generateMap();
  
  // Render map
  renderMap(currentMapData);
  
  // Emit map ready event (for other members to handle)
  eventBus.emit('map:ready', { mapData: currentMapData });
  
  console.log('Map generated:', currentMapData);
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
