// Test file for player mechanics
import { BombSystem } from '../game/BombSystem';
import { PlayerSystem } from '../game/PlayerSystem';
import { PowerUpSystem } from '../game/PowerUpSystem';
import { CollisionType } from '../game/ExplosionHandler';
import { eventBus } from '../../framework/events';

// Create a simple grid for testing
const GRID_SIZE = 10;
const CELL_SIZE = 40;

export function initPlayerTest() {
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
  
  // Initialize systems
  const bombSystem = new BombSystem(gameContainer, GRID_SIZE);
  const playerSystem = new PlayerSystem(gameContainer, bombSystem, GRID_SIZE, CELL_SIZE);
  const powerUpSystem = new PowerUpSystem(gameContainer, CELL_SIZE);
  
  // Update grid in bomb system
  bombSystem.updateGrid(convertGridForExplosionHandler(grid));
  
  // Start bomb system
  bombSystem.start();
  
  // Add test players
  const player1 = playerSystem.addPlayer('player1', 'Player 1', 1, 1);
  const player2 = playerSystem.addPlayer('player2', 'Player 2', GRID_SIZE - 2, 1);
  const player3 = playerSystem.addPlayer('player3', 'Player 3', 1, GRID_SIZE - 2);
  const player4 = playerSystem.addPlayer('player4', 'Player 4', GRID_SIZE - 2, GRID_SIZE - 2);
  
  // Update grid in event system (for collision detection)
  eventBus.emit('grid:update', convertGridForExplosionHandler(grid));
  
  // Add test controls
  addTestControls(app, playerSystem, bombSystem, powerUpSystem, grid);
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
  
  // Add some blocks in a pattern
  for (let y = 2; y < GRID_SIZE - 2; y++) {
    for (let x = 2; x < GRID_SIZE - 2; x++) {
      if (y % 2 === 0 && x % 2 === 0) {
        grid[y][x] = 2; // Block
      }
    }
  }
  
  // Make sure player starting positions are clear
  grid[1][1] = 0; // Player 1
  grid[1][GRID_SIZE-2] = 0; // Player 2
  grid[GRID_SIZE-2][1] = 0; // Player 3
  grid[GRID_SIZE-2][GRID_SIZE-2] = 0; // Player 4
  
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
function addTestControls(
  app: HTMLElement, 
  playerSystem: PlayerSystem, 
  bombSystem: BombSystem,
  powerUpSystem: PowerUpSystem,
  grid: number[][]
) {
  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'controls-container';
  
  // Add instructions
  const instructions = document.createElement('div');
  instructions.innerHTML = `
    <h3>Player System Test</h3>
    <p><strong>Player 1:</strong> Arrow keys to move, SPACE to place bomb</p>
    <p><strong>Player 2:</strong> WASD to move, E to place bomb</p>
    <p><strong>Player 3:</strong> IJKL to move, O to place bomb</p>
    <p><strong>Player 4:</strong> Numpad 8456 to move, 0 to place bomb</p>
  `;
  controlsContainer.appendChild(instructions);
  
  // Add power-up spawn button
  const spawnPowerUpButton = document.createElement('button');
  spawnPowerUpButton.textContent = 'Spawn Random Power-up';
  spawnPowerUpButton.addEventListener('click', () => {
    // Find a random empty cell
    let x, y;
    do {
      x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
    } while (grid[y][x] !== 0);
    
    // Emit block destroyed event to trigger power-up spawn
    eventBus.emit('block:destroyed', { x, y });
  });
  controlsContainer.appendChild(spawnPowerUpButton);
  
  // Add damage player button
  const damagePlayerButton = document.createElement('button');
  damagePlayerButton.textContent = 'Damage Player 1';
  damagePlayerButton.addEventListener('click', () => {
    eventBus.emit('player:hit', { 
      playerId: 'player1', 
      attackerId: 'test',
      x: 0, 
      y: 0 
    });
  });
  controlsContainer.appendChild(damagePlayerButton);
  
  // Add debug info
  const debugInfo = document.createElement('div');
  debugInfo.id = 'debug-info';
  debugInfo.style.marginTop = '10px';
  debugInfo.style.fontFamily = 'monospace';
  controlsContainer.appendChild(debugInfo);
  
  // Listen for player stats updates
  eventBus.on('player:statsUpdate', (data: any) => {
    updateDebugInfo(debugInfo, playerSystem);
  });
  
  // Listen for player damage
  eventBus.on('player:damaged', (data: any) => {
    updateDebugInfo(debugInfo, playerSystem);
  });
  
  // Initial debug info update
  updateDebugInfo(debugInfo, playerSystem);
  
  app.appendChild(controlsContainer);
}

// Update debug info
function updateDebugInfo(debugElement: HTMLElement, playerSystem: PlayerSystem): void {
  let infoHTML = '<h4>Player Stats:</h4>';
  
  const players = playerSystem.getPlayers();
  players.forEach((player, id) => {
    const stats = player.getStats();
    const lives = player.getLives();
    
    infoHTML += `
      <div style="margin-bottom: 8px;">
        <strong>${player.nickname}</strong> (${id})<br>
        Lives: ${lives}<br>
        Speed: ${stats.speed}<br>
        Bomb Capacity: ${stats.bombCapacity}<br>
        Explosion Range: ${stats.explosionRange}<br>
      </div>
    `;
  });
  
  debugElement.innerHTML = infoHTML;
}
