// Test file for bomb mechanics
import { BombSystem } from '../game/BombSystem';
import { h, render } from '../../framework/dom';
import { CollisionType } from '../game/ExplosionHandler';
import { eventBus } from '../../framework/events';

// Create a simple grid for testing
const GRID_SIZE = 10;
const CELL_SIZE = 40;

export function initBombTest() {
  // Create test container
  const app = document.getElementById('app');
  if (!app) return;
  
  // Add test CSS
  const linkElement = document.createElement('link');
  linkElement.rel = 'stylesheet';
  linkElement.href = '../src/styles/test.css';
  document.head.appendChild(linkElement);
  
  app.innerHTML = '';
  
  // Create game container
  const gameContainer = document.createElement('div');
  gameContainer.id = 'game-container';
  gameContainer.style.position = 'relative';
  gameContainer.style.width = `${GRID_SIZE * CELL_SIZE}px`;
  gameContainer.style.height = `${GRID_SIZE * CELL_SIZE}px`;
  gameContainer.style.backgroundColor = '#eee';
  gameContainer.style.border = '1px solid #333';
  
  app.appendChild(gameContainer);
  
  // Create grid
  const grid = createTestGrid();
  renderGrid(grid, gameContainer);
  
  // Initialize bomb system
  const bombSystem = new BombSystem(gameContainer, GRID_SIZE);
  
  // Initialize test player
  const playerId = 'player1';
  bombSystem.initializePlayer(playerId);
  
  // Update grid in bomb system
  bombSystem.updateGrid(convertGridForExplosionHandler(grid));
  
  // Start bomb system
  bombSystem.start();
  
  // Add test controls
  addTestControls(app, bombSystem, playerId, grid);
  
  // Add player avatar
  const playerAvatar = document.createElement('div');
  playerAvatar.id = 'player-avatar';
  playerAvatar.style.position = 'absolute';
  playerAvatar.style.width = '30px';
  playerAvatar.style.height = '30px';
  playerAvatar.style.backgroundColor = 'blue';
  playerAvatar.style.borderRadius = '50%';
  playerAvatar.style.left = '20px';
  playerAvatar.style.top = '20px';
  playerAvatar.style.transform = 'translate(-50%, -50%)';
  playerAvatar.style.zIndex = '20';
  
  gameContainer.appendChild(playerAvatar);
  
  // Add player movement
  let playerX = 0;
  let playerY = 0;
  
  document.addEventListener('keydown', (e) => {
    let newX = playerX;
    let newY = playerY;
    
    switch (e.key) {
      case 'ArrowUp':
        newY = Math.max(0, playerY - 1);
        break;
      case 'ArrowRight':
        newX = Math.min(GRID_SIZE - 1, playerX + 1);
        break;
      case 'ArrowDown':
        newY = Math.min(GRID_SIZE - 1, playerY + 1);
        break;
      case 'ArrowLeft':
        newX = Math.max(0, playerX - 1);
        break;
      case ' ': // Space to place bomb
        bombSystem.placeBomb(playerId, playerX, playerY);
        break;
    }
    
    // Check if new position is valid
    if (grid[newY][newX] === 0) { // Empty space
      playerX = newX;
      playerY = newY;
      
      // Update player position
      playerAvatar.style.left = `${playerX * CELL_SIZE + CELL_SIZE/2}px`;
      playerAvatar.style.top = `${playerY * CELL_SIZE + CELL_SIZE/2}px`;
      
      // Emit player movement event
      window.dispatchEvent(new CustomEvent('player:moved', { 
        detail: { id: playerId, x: playerX, y: playerY }
      }));
      
      // Also emit via eventBus for components using that
      eventBus.emit('player:moved', { id: playerId, x: playerX, y: playerY });
    }
  });
  
  // Custom event listener for player movement
  window.addEventListener('player:moved', (e: any) => {
    const detail = e.detail;
    console.log(`Player moved to (${detail.x}, ${detail.y})`);
  });
}

// Create a test grid (0 = empty, 1 = wall, 2 = block)
function createTestGrid() {
  const grid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
  
  // Add walls around the edges
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[0][i] = 1; // Top wall
    grid[GRID_SIZE-1][i] = 1; // Bottom wall
    grid[i][0] = 1; // Left wall
    grid[i][GRID_SIZE-1] = 1; // Right wall
  }
  
  // Add some blocks
  grid[2][2] = 2;
  grid[2][4] = 2;
  grid[2][6] = 2;
  grid[4][2] = 2;
  grid[4][4] = 2;
  grid[4][6] = 2;
  grid[6][2] = 2;
  grid[6][4] = 2;
  grid[6][6] = 2;
  
  // Make sure player starting position is clear
  grid[1][1] = 0;
  
  return grid;
}

// Render the grid
function renderGrid(grid: number[][], container: HTMLElement) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.width = `${CELL_SIZE}px`;
      cell.style.height = `${CELL_SIZE}px`;
      cell.style.left = `${x * CELL_SIZE}px`;
      cell.style.top = `${y * CELL_SIZE}px`;
      
      switch (grid[y][x]) {
        case 0: // Empty
          cell.classList.add('cell-empty');
          break;
        case 1: // Wall
          cell.classList.add('cell-wall');
          break;
        case 2: // Block
          cell.classList.add('cell-block');
          break;
      }
      
      container.appendChild(cell);
    }
  }
}

// Convert grid for explosion handler
function convertGridForExplosionHandler(grid: number[][]) {
  return grid.map(row => 
    row.map(cell => {
      switch (cell) {
        case 0: return { type: CollisionType.EMPTY };
        case 1: return { type: CollisionType.WALL };
        case 2: return { type: CollisionType.BLOCK };
        default: return { type: CollisionType.EMPTY };
      }
    })
  );
}

// Add test controls
function addTestControls(app: HTMLElement, bombSystem: BombSystem, playerId: string, grid: number[][]) {
  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'controls-container';
  
  // Add instructions
  const instructions = document.createElement('div');
  instructions.innerHTML = `
    <h3>Bomb Test Controls</h3>
    <p><strong>Movement:</strong> Use arrow keys to move the player</p>
    <p><strong>Place Bomb:</strong> Press SPACE to place a bomb</p>
    <p><strong>Power-ups:</strong> Use buttons below to test bomb features</p>
  `;
  controlsContainer.appendChild(instructions);
  
  // Add bomb placement button
  const placeBombButton = document.createElement('button');
  placeBombButton.textContent = 'Place Bomb at Player Position';
  placeBombButton.style.margin = '5px';
  placeBombButton.addEventListener('click', () => {
    const playerAvatar = document.getElementById('player-avatar');
    if (playerAvatar) {
      const x = parseInt(playerAvatar.style.left) / CELL_SIZE;
      const y = parseInt(playerAvatar.style.top) / CELL_SIZE;
      bombSystem.placeBomb(playerId, Math.floor(x), Math.floor(y));
    }
  });
  controlsContainer.appendChild(placeBombButton);
  
  // Add upgrade buttons
  const upgradeBombButton = document.createElement('button');
  upgradeBombButton.textContent = 'Upgrade Bomb Capacity';
  upgradeBombButton.style.margin = '5px';
  upgradeBombButton.addEventListener('click', () => {
    bombSystem.getBombManager().upgradeBombCapacity(playerId);
    const stats = bombSystem.getBombManager().getPlayerBombStats(playerId);
    if (stats) {
      console.log(`Player bomb capacity upgraded to ${stats.maxBombs}`);
    }
  });
  controlsContainer.appendChild(upgradeBombButton);
  
  const upgradeRangeButton = document.createElement('button');
  upgradeRangeButton.textContent = 'Upgrade Explosion Range';
  upgradeRangeButton.style.margin = '5px';
  upgradeRangeButton.addEventListener('click', () => {
    bombSystem.getBombManager().upgradeExplosionRange(playerId);
    const stats = bombSystem.getBombManager().getPlayerBombStats(playerId);
    if (stats) {
      console.log(`Player explosion range upgraded to ${stats.explosionRange}`);
    }
  });
  controlsContainer.appendChild(upgradeRangeButton);
  
  // Add debug info
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.marginTop = '10px';
  debugInfo.style.fontFamily = 'monospace';
  controlsContainer.appendChild(debugInfo);
  
  // Update debug info
  setInterval(() => {
    const stats = bombSystem.getBombManager().getPlayerBombStats(playerId);
    if (stats) {
      debugInfo.innerHTML = `
        <div>Bomb Capacity: ${stats.maxBombs}</div>
        <div>Active Bombs: ${stats.activeBombs}</div>
        <div>Explosion Range: ${stats.explosionRange}</div>
      `;
    }
  }, 100);
  
  app.appendChild(controlsContainer);
}
