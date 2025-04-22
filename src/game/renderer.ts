// Game renderer for map, blocks, and power-ups
import { h, render } from '../../framework/dom';
import { GRID_SIZE, TILE_SIZE } from './constants';
import { MapData, CellType } from './map';
import { renderPowerUps } from './powerups';

// Main game container
let gameContainer: HTMLElement | null = null;
let mapContainer: HTMLElement | null = null;

// Initialize the game renderer
export function initRenderer(container: HTMLElement): void {
  // Create main game container
  const gameElement = h('div', {
    class: 'game-container',
    style: `
      position: relative;
      width: ${GRID_SIZE * TILE_SIZE}px;
      height: ${GRID_SIZE * TILE_SIZE}px;
      margin: 0 auto;
      background-color: #7ABD7E;
      overflow: hidden;
    `
  }, []);
  
  gameContainer = render(gameElement) as HTMLElement;
  container.appendChild(gameContainer);
  
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
