// Integrated test for Bomberman game mechanics
import { BombSystem } from '../game/BombSystem';
import { PlayerSystem } from '../game/PlayerSystem';
import { PowerUpSystem } from '../game/PowerUpSystem';
import { CollisionType } from '../game/ExplosionHandler';
import { eventBus } from '../../framework/events';

// Game constants
const GRID_SIZE = 13;
const CELL_SIZE = 40;

export function initGameTest() {
  // Create test container
  const app = document.getElementById('app');
  if (!app) return;
  
  // Add test CSS
  const linkElement = document.createElement('link');
  linkElement.rel = 'stylesheet';
  linkElement.href = '../src/styles/test.css';
  document.head.appendChild(linkElement);
  
  // Add game-specific styles
  addGameStyles();
  
  app.innerHTML = '';
  
  // Create game header
  const header = document.createElement('div');
  header.className = 'game-header';
  header.innerHTML = '<h2>Bomberman DOM - Test Environment</h2>';
  app.appendChild(header);
  
  // Create game container
  const gameContainer = document.createElement('div');
  gameContainer.id = 'game-container';
  gameContainer.className = 'game-grid';
  
  app.appendChild(gameContainer);
  
  // Create grid
  const grid = createGameGrid();
  renderGrid(grid, gameContainer);
  
  // Initialize game systems
  const bombSystem = new BombSystem(gameContainer, GRID_SIZE);
  const playerSystem = new PlayerSystem(gameContainer, bombSystem, GRID_SIZE, CELL_SIZE);
  const powerUpSystem = new PowerUpSystem(gameContainer, CELL_SIZE);
  
  // Update grid in bomb system
  bombSystem.updateGrid(convertGridForExplosionHandler(grid));
  
  // Start bomb system
  bombSystem.start();
  
  // Add players at the four corners
  const player1 = playerSystem.addPlayer('player1', 'Player 1', 1, 1);
  const player2 = playerSystem.addPlayer('player2', 'Player 2', GRID_SIZE - 2, 1);
  const player3 = playerSystem.addPlayer('player3', 'Player 3', 1, GRID_SIZE - 2);
  const player4 = playerSystem.addPlayer('player4', 'Player 4', GRID_SIZE - 2, GRID_SIZE - 2);
  
  // Update grid in event system (for collision detection)
  eventBus.emit('grid:update', convertGridForExplosionHandler(grid));
  
  // Set up event listeners for game events
  setupEventListeners(grid);
  
  // Add game controls and info panel
  addGameControls(app, playerSystem, bombSystem, powerUpSystem, grid);
  
  // Start game loop for performance monitoring
  startGameLoop();
}

// Create a game grid with walls and blocks
function createGameGrid() {
  const grid = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
  
  // Add walls around the edges
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[0][i] = 1; // Top wall
    grid[GRID_SIZE-1][i] = 1; // Bottom wall
    grid[i][0] = 1; // Left wall
    grid[i][GRID_SIZE-1] = 1; // Right wall
  }
  
  // Add walls in a pattern (every other cell)
  for (let y = 2; y < GRID_SIZE - 2; y += 2) {
    for (let x = 2; x < GRID_SIZE - 2; x += 2) {
      grid[y][x] = 1; // Wall
    }
  }
  
  // Add some random blocks (destructible)
  for (let y = 1; y < GRID_SIZE - 1; y++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      // Skip walls and player starting positions
      if (grid[y][x] === 1) continue;
      if ((x === 1 && y === 1) || // Player 1
          (x === GRID_SIZE - 2 && y === 1) || // Player 2
          (x === 1 && y === GRID_SIZE - 2) || // Player 3
          (x === GRID_SIZE - 2 && y === GRID_SIZE - 2)) { // Player 4
        continue;
      }
      
      // Also skip cells adjacent to player starting positions
      if ((x <= 2 && y <= 2) || // Near Player 1
          (x >= GRID_SIZE - 3 && y <= 2) || // Near Player 2
          (x <= 2 && y >= GRID_SIZE - 3) || // Near Player 3
          (x >= GRID_SIZE - 3 && y >= GRID_SIZE - 3)) { // Near Player 4
        continue;
      }
      
      // 40% chance to place a block
      if (Math.random() < 0.4) {
        grid[y][x] = 2; // Block
      }
    }
  }
  
  return grid;
}

// Render the grid
function renderGrid(grid: number[][], container: HTMLElement) {
  // Set container dimensions
  container.style.width = `${GRID_SIZE * CELL_SIZE}px`;
  container.style.height = `${GRID_SIZE * CELL_SIZE}px`;
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x.toString();
      cell.dataset.y = y.toString();
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

// Set up event listeners for game events
function setupEventListeners(grid: number[][]) {
  // Handle block destruction
  eventBus.on('block:destroyed', (data: { x: number, y: number }) => {
    // Update the grid
    if (data.x >= 0 && data.x < grid.length && data.y >= 0 && data.y < grid[0].length) {
      grid[data.y][data.x] = 0; // Set to empty
      
      // Update the visual representation
      const cell = document.querySelector(`.cell[data-x="${data.x}"][data-y="${data.y}"]`);
      if (cell) {
        cell.classList.remove('cell-block');
        cell.classList.add('cell-empty');
      }
      
      // Update collision map
      eventBus.emit('grid:update', convertGridForExplosionHandler(grid));
    }
  });
  
  // Handle player elimination
  eventBus.on('player:eliminated', (data: { id: string, eliminatedBy: string }) => {
    console.log(`Player ${data.id} was eliminated by ${data.eliminatedBy}`);
    
    // Check for game over condition
    setTimeout(() => {
      const remainingPlayers = document.querySelectorAll('.player-container');
      if (remainingPlayers.length <= 1) {
        const winner = remainingPlayers[0]?.querySelector('.player-name')?.textContent || 'No one';
        alert(`Game Over! ${winner} wins!`);
      }
    }, 1500);
  });
}

// Add game controls and info panel
function addGameControls(
  app: HTMLElement, 
  playerSystem: PlayerSystem, 
  bombSystem: BombSystem,
  powerUpSystem: PowerUpSystem,
  grid: number[][]
) {
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'game-controls';
  
  // Add instructions
  const instructions = document.createElement('div');
  instructions.className = 'instructions';
  instructions.innerHTML = `
    <h3>Game Controls</h3>
    <div class="controls-grid">
      <div class="control-column">
        <h4>Player 1 (Blue)</h4>
        <p>Move: Arrow Keys</p>
        <p>Bomb: SPACE</p>
      </div>
      <div class="control-column">
        <h4>Player 2 (Red)</h4>
        <p>Move: WASD</p>
        <p>Bomb: E</p>
      </div>
      <div class="control-column">
        <h4>Player 3 (Green)</h4>
        <p>Move: IJKL</p>
        <p>Bomb: O</p>
      </div>
      <div class="control-column">
        <h4>Player 4 (Orange)</h4>
        <p>Move: Numpad 8456</p>
        <p>Bomb: Numpad 0</p>
      </div>
    </div>
  `;
  controlsContainer.appendChild(instructions);
  
  // Add debug info panel
  const debugInfo = document.createElement('div');
  debugInfo.className = 'debug-info';
  controlsContainer.appendChild(debugInfo);
  
  // Add FPS counter
  const fpsCounter = document.createElement('div');
  fpsCounter.className = 'fps-counter';
  fpsCounter.textContent = 'FPS: 0';
  controlsContainer.appendChild(fpsCounter);
  
  // Add to app
  app.appendChild(controlsContainer);
  
  // Update debug info when player stats change
  eventBus.on('player:statsUpdate', () => updateDebugInfo(debugInfo, playerSystem));
  eventBus.on('player:damaged', () => updateDebugInfo(debugInfo, playerSystem));
  eventBus.on('player:eliminated', () => updateDebugInfo(debugInfo, playerSystem));
  
  // Initial update
  updateDebugInfo(debugInfo, playerSystem);
  
  // Store FPS counter reference for the game loop
  (window as any).fpsCounter = fpsCounter;
}

// Update debug info
function updateDebugInfo(debugElement: HTMLElement, playerSystem: PlayerSystem): void {
  let infoHTML = '<h3>Player Stats</h3>';
  
  const players = playerSystem.getPlayers();
  players.forEach((player, id) => {
    const stats = player.getStats();
    const lives = player.getLives();
    
    // Determine player color
    let color = '#333';
    switch (id) {
      case 'player1': color = '#3498db'; break;
      case 'player2': color = '#e74c3c'; break;
      case 'player3': color = '#2ecc71'; break;
      case 'player4': color = '#f39c12'; break;
    }
    
    infoHTML += `
      <div class="player-stats" style="border-left: 4px solid ${color}">
        <h4>${player.nickname}</h4>
        <div class="stats-grid">
          <div class="stat-item">Lives: ${lives}</div>
          <div class="stat-item">Speed: ${stats.speed.toFixed(1)}</div>
          <div class="stat-item">Bombs: ${stats.bombCapacity}</div>
          <div class="stat-item">Range: ${stats.explosionRange}</div>
        </div>
      </div>
    `;
  });
  
  debugElement.innerHTML = infoHTML;
}

// Start game loop for performance monitoring
function startGameLoop() {
  let lastTime = performance.now();
  let frameCount = 0;
  let lastFpsUpdate = 0;
  
  function gameLoop(timestamp: number) {
    // Calculate FPS
    frameCount++;
    const elapsed = timestamp - lastFpsUpdate;
    
    if (elapsed >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      const fpsCounter = (window as any).fpsCounter;
      if (fpsCounter) {
        fpsCounter.textContent = `FPS: ${fps}`;
        
        // Color based on performance
        if (fps >= 55) {
          fpsCounter.style.color = '#2ecc71'; // Green for good performance
        } else if (fps >= 30) {
          fpsCounter.style.color = '#f39c12'; // Orange for acceptable
        } else {
          fpsCounter.style.color = '#e74c3c'; // Red for poor
        }
      }
      
      frameCount = 0;
      lastFpsUpdate = timestamp;
    }
    
    // Continue the loop
    requestAnimationFrame(gameLoop);
  }
  
  // Start the loop
  requestAnimationFrame(gameLoop);
}

// Add game-specific styles
function addGameStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    
    .game-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .game-grid {
      position: relative;
      margin: 0 auto;
      border: 2px solid #333;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAIAAACRXR/mAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAABnSURBVHja7M5BDQAwDASh+je9/YvYqQrWTiLgHADgP0lSvfdZVZKZJFFbkqO2JMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMx8MwAr2hjDDYbBVQAAAABJRU5ErkJggg==');
      background-repeat: repeat;
      overflow: hidden;
    }
    
    .cell {
      position: absolute;
      box-sizing: border-box;
    }
    
    .cell-empty {
      background-color: transparent;
    }
    
    .cell-wall {
      background-color: #555;
      border: 1px solid #333;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }
    
    .cell-block {
      background-color: #a0522d;
      border: 1px solid #8b4513;
      box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.3);
    }
    
    .game-controls {
      max-width: ${GRID_SIZE * CELL_SIZE}px;
      margin: 20px auto;
      padding: 15px;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .instructions h3 {
      margin-top: 0;
      text-align: center;
      color: #333;
    }
    
    .controls-grid {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    
    .control-column {
      flex: 1;
      min-width: 120px;
      padding: 10px;
    }
    
    .control-column h4 {
      margin-top: 0;
      margin-bottom: 10px;
    }
    
    .control-column p {
      margin: 5px 0;
      font-size: 14px;
    }
    
    .debug-info {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    
    .debug-info h3 {
      margin-top: 0;
      text-align: center;
      color: #333;
    }
    
    .player-stats {
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
      padding-left: 15px;
    }
    
    .player-stats h4 {
      margin-top: 0;
      margin-bottom: 10px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 5px;
    }
    
    .stat-item {
      font-size: 14px;
      color: #555;
    }
    
    .fps-counter {
      margin-top: 15px;
      text-align: center;
      font-weight: bold;
      font-size: 16px;
    }
  `;
  
  document.head.appendChild(styleElement);
}
