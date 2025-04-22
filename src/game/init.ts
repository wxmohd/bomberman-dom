// Game initialization logic
import { generateMap, resetMap, destroyBlocksInExplosion, destroyBlock, CellType } from './map';
import { initRenderer, renderMap } from './renderer';
import { eventBus } from '../../framework/events';
import { clearPowerUps, maybeSpawnPowerup } from './powerups';
import { GRID_SIZE } from './constants';

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
  
  // Create a button to test the map generation
  const testButton = document.createElement('button');
  testButton.textContent = 'Generate Test Map';
  testButton.style.margin = '10px';
  testButton.addEventListener('click', () => {
    startGame(app);
  });
  
  // Add initial button to the controls container
  controlsContainer.appendChild(testButton);
  
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
  resetButton.addEventListener('click', () => {
    resetGame(container);
  });
  
  // Create the test explosion button
  const testExplosionButton = document.createElement('button');
  testExplosionButton.textContent = 'Test Explosion';
  testExplosionButton.style.margin = '10px';
  testExplosionButton.addEventListener('click', () => {
    if (currentMapData) {
      testExplosion();
    } else {
      alert('Generate a map first!');
    }
  });
  
  // Add buttons to the controls container
  controlsContainer.appendChild(resetButton);
  controlsContainer.appendChild(testExplosionButton);
  
  // Clear main container
  container.innerHTML = '';
  
  // Initialize renderer
  initRenderer(container);
  
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

// Test function to demonstrate explosions and block destruction
function testExplosion() {
  if (!currentMapData) {
    console.error('No map data available');
    return;
  }
  
  console.log('Starting test explosion...');
  
  // Find a suitable position for the test explosion
  const { grid } = currentMapData;
  let centerX = Math.floor(GRID_SIZE / 2);
  let centerY = Math.floor(GRID_SIZE / 2);
  
  console.log('Explosion center:', { x: centerX, y: centerY });
  console.log('Current map data:', currentMapData);
  
  // Manually create explosion cells for testing
  // Mark the center and adjacent cells as explosions
  const directions = [
    { dx: 0, dy: 0 },   // Center
    { dx: 0, dy: -1 },  // Up
    { dx: 1, dy: 0 },   // Right
    { dx: 0, dy: 1 },   // Down
    { dx: -1, dy: 0 }   // Left
  ];
  
  directions.forEach(({ dx, dy }) => {
    const x = centerX + dx;
    const y = centerY + dy;
    
    // Check bounds
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      // Only place explosion in empty cells or destroy blocks
      const cellType = grid[y][x];
      
      if (cellType === CellType.EMPTY) {
        grid[y][x] = CellType.EXPLOSION;
        console.log(`Placed explosion at ${x},${y}`);
        
        // Reset after animation
        setTimeout(() => {
          if (grid[y][x] === CellType.EXPLOSION) {
            grid[y][x] = CellType.EMPTY;
          }
        }, 1000);
      } else if (cellType === CellType.BLOCK) {
        // Find the actual block object
        const blockObj = currentMapData.blocks.find(block => block.x === x && block.y === y);
        if (blockObj) {
          // Call the block's destroy method directly
          const destroyed = blockObj.destroy();
          
          // Update the grid
          if (destroyed) {
            grid[y][x] = CellType.EMPTY;
            
            // Remove from blocks array after animation completes
            setTimeout(() => {
              const blockIndex = currentMapData.blocks.findIndex(b => b === blockObj);
              if (blockIndex !== -1) {
                currentMapData.blocks.splice(blockIndex, 1);
              }
            }, 300);
            
            // Maybe spawn a powerup
            const powerup = maybeSpawnPowerup(x, y);
            
            console.log(`Successfully destroyed block at ${x},${y}. Powerup spawned: ${powerup !== null}`);
          } else {
            console.log(`Failed to destroy block at ${x},${y}`);
          }
        } else {
          console.log(`Could not find block object at ${x},${y}`);
        }
      }
    }
  });
  
  // Re-render the map to show the explosion
  renderMap(currentMapData);
  
  console.log('Test explosion completed');
}
