// Game renderer for map, blocks, and power-ups
import { h, render } from '../../framework/dom';
import { eventBus } from '../../framework/events';
import { GRID_SIZE, TILE_SIZE } from './constants';
import { MapData, CellType } from './map';
import { renderPowerUps } from './powerups';

// Main game container
let gameContainer: HTMLElement | null = null;
let mapContainer: HTMLElement | null = null;

// Initialize the game renderer
export function initRenderer(container: HTMLElement): void {
  // Add CSS for game positioning
  const gameStyles = document.createElement('style');
  gameStyles.textContent = `
    .game-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      background-color: #222;
      position: absolute;
      top: 0;
      left: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    
    .game-container {
      position: relative;
      width: ${GRID_SIZE * TILE_SIZE}px;
      height: ${GRID_SIZE * TILE_SIZE}px;
      background-color: #7ABD7E;
      overflow: hidden;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
      border-radius: 8px;
      transform-origin: center center;
      /* Calculate scale based on viewport size */
      transform: scale(min(calc(90vh / ${GRID_SIZE * TILE_SIZE}), calc(90vw / ${GRID_SIZE * TILE_SIZE})));
    }
    
    .reset-button {
      position: absolute;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background-color: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 16px;
      z-index: 1000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    }
    
    .reset-button:hover {
      background-color: #d32f2f;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    
    /* Dynamic scaling handles all screen sizes */
  `;
  document.head.appendChild(gameStyles);
  
  // Create a wrapper for centering
  const wrapperElement = document.createElement('div');
  wrapperElement.className = 'game-wrapper';
  container.appendChild(wrapperElement);
  
  // Create main game container
  const gameElement = h('div', {
    class: 'game-container',
    style: `
      position: relative;
      width: ${GRID_SIZE * TILE_SIZE}px;
      height: ${GRID_SIZE * TILE_SIZE}px;
      background-color: #7ABD7E;
      overflow: hidden;
    `
  }, []);
  
  gameContainer = render(gameElement) as HTMLElement;
  wrapperElement.appendChild(gameContainer);
  
  // Add reset button directly to the wrapper
  const resetButton = document.createElement('button');
  resetButton.className = 'reset-button';
  resetButton.textContent = 'Reset Map';
  resetButton.addEventListener('click', () => {
    // Emit reset event
    eventBus.emit('game:reset', {});
  });
  wrapperElement.appendChild(resetButton);
  
  // Create map container
  const mapElement = h('div', {
    class: 'map-container',
    style: `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `
  }, []);
  
  mapContainer = render(mapElement) as HTMLElement;
  gameContainer.appendChild(mapContainer);
  
  // Add CSS for animations
  addAnimationStyles();
}

// Render the map
export function renderMap(mapData: MapData): void {
  if (!mapContainer) return;
  
  // Clear previous map
  mapContainer.innerHTML = '';
  
  // Render walls and blocks
  mapData.walls.forEach(wall => wall.render(mapContainer!));
  mapData.blocks.forEach(block => block.render(mapContainer!));
  
  // Render explosions
  renderExplosions(mapData.grid, mapContainer);
  
  // Render power-ups
  renderPowerUps(mapContainer);
}

// Render explosion cells
function renderExplosions(grid: CellType[][], container: HTMLElement): void {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === CellType.EXPLOSION) {
        renderExplosionCell(x, y, container);
      }
    }
  }
}

// Render a single explosion cell
function renderExplosionCell(x: number, y: number, container: HTMLElement): void {
  const explosionElement = h('div', {
    class: 'explosion',
    style: `
      position: absolute;
      left: ${x * TILE_SIZE}px;
      top: ${y * TILE_SIZE}px;
      width: ${TILE_SIZE}px;
      height: ${TILE_SIZE}px;
      background-color: rgba(255, 100, 0, 0.8);
      border-radius: 5px;
      z-index: 5;
      box-shadow: 0 0 20px 5px rgba(255, 100, 0, 0.8);
      animation: explosion-pulse 0.5s infinite alternate;
    `
  }, [
    // Add inner flame element for better visual effect
    h('div', {
      style: `
        position: absolute;
        left: 20%;
        top: 20%;
        width: 60%;
        height: 60%;
        background-color: rgba(255, 220, 0, 0.9);
        border-radius: 50%;
        animation: inner-flame 0.3s infinite alternate;
      `
    }, [])
  ]);
  
  container.appendChild(render(explosionElement));
  
  // Log to confirm explosion is being rendered
  console.log(`Rendered explosion at ${x},${y}`);
}

// Add CSS animations for blocks and power-ups
function addAnimationStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes block-destroy {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
      100% { transform: scale(0); opacity: 0; }
    }
    
    @keyframes powerup-pulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.1); }
    }
    
    @keyframes powerup-collect {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.7; }
      100% { transform: scale(0); opacity: 0; }
    }
    
    @keyframes explosion-pulse {
      0% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 10px rgba(255, 100, 0, 0.7); }
      100% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 20px rgba(255, 100, 0, 0.9); }
    }
    
    @keyframes inner-flame {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(1.2); opacity: 1; }
    }
  `;
  
  document.head.appendChild(style);
}

// Get the game container
export function getGameContainer(): HTMLElement | null {
  return gameContainer;
}

// Get the map container
export function getMapContainer(): HTMLElement | null {
  return mapContainer;
}

// Clean up the renderer
export function cleanupRenderer(): void {
  if (gameContainer && gameContainer.parentNode) {
    gameContainer.parentNode.removeChild(gameContainer);
  }
  
  gameContainer = null;
  mapContainer = null;
}
