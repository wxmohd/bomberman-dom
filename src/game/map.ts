// Map generation and block placement
import { GRID_SIZE, TILE_SIZE } from './constants';
import { Block } from '../entities/block';
import { maybeSpawnPowerup } from './powerups';
import { eventBus } from '../../framework/events';

// Map cell types
export enum CellType {
  EMPTY = 0,
  WALL = 1,  // Indestructible
  BLOCK = 2, // Destructible
  POWERUP = 3,
  BOMB = 4,
  EXPLOSION = 5
}

// Map data structure
export interface MapData {
  grid: CellType[][];
  blocks: Block[];
  walls: Block[];
}

// Player starting positions (corners)
export const PLAYER_STARTING_POSITIONS = [
  { x: 1, y: 1 },                      // Top-left
  { x: GRID_SIZE - 2, y: 1 },          // Top-right
  { x: 1, y: GRID_SIZE - 2 },          // Bottom-left
  { x: GRID_SIZE - 2, y: GRID_SIZE - 2 } // Bottom-right
];

// Safe zones around player starting positions
const SAFE_ZONES = [
  // Top-left safe zone
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 },
  // Top-right safe zone
  { x: GRID_SIZE - 1, y: 0 }, { x: GRID_SIZE - 2, y: 0 }, { x: GRID_SIZE - 1, y: 1 }, 
  { x: GRID_SIZE - 2, y: 1 }, { x: GRID_SIZE - 3, y: 1 }, { x: GRID_SIZE - 2, y: 2 },
  // Bottom-left safe zone
  { x: 0, y: GRID_SIZE - 1 }, { x: 1, y: GRID_SIZE - 1 }, { x: 0, y: GRID_SIZE - 2 }, 
  { x: 1, y: GRID_SIZE - 2 }, { x: 2, y: GRID_SIZE - 2 }, { x: 1, y: GRID_SIZE - 3 },
  // Bottom-right safe zone
  { x: GRID_SIZE - 1, y: GRID_SIZE - 1 }, { x: GRID_SIZE - 2, y: GRID_SIZE - 1 }, 
  { x: GRID_SIZE - 1, y: GRID_SIZE - 2 }, { x: GRID_SIZE - 2, y: GRID_SIZE - 2 }, 
  { x: GRID_SIZE - 3, y: GRID_SIZE - 2 }, { x: GRID_SIZE - 2, y: GRID_SIZE - 3 }
];

// Check if a position is in a safe zone
function isInSafeZone(x: number, y: number): boolean {
  return SAFE_ZONES.some(pos => pos.x === x && pos.y === y);
}

// Initialize an empty grid
function createEmptyGrid(): CellType[][] {
  const grid: CellType[][] = [];
  
  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = CellType.EMPTY;
    }
  }
  
  return grid;
}

// Place walls in fixed positions (grid pattern and borders)
function placeWalls(grid: CellType[][]): Block[] {
  const walls: Block[] = [];
  
  // Place border walls
  for (let i = 0; i < GRID_SIZE; i++) {
    // Top and bottom borders
    grid[0][i] = CellType.WALL;
    grid[GRID_SIZE - 1][i] = CellType.WALL;
    
    walls.push(new Block(i, 0, true));
    walls.push(new Block(i, GRID_SIZE - 1, true));
    
    // Left and right borders
    grid[i][0] = CellType.WALL;
    grid[i][GRID_SIZE - 1] = CellType.WALL;
    
    if (i > 0 && i < GRID_SIZE - 1) { // Avoid duplicating corners
      walls.push(new Block(0, i, true));
      walls.push(new Block(GRID_SIZE - 1, i, true));
    }
  }
  
  // Place grid pattern walls (every 2 tiles)
  for (let y = 2; y < GRID_SIZE - 1; y += 2) {
    for (let x = 2; x < GRID_SIZE - 1; x += 2) {
      grid[y][x] = CellType.WALL;
      walls.push(new Block(x, y, true));
    }
  }
  
  return walls;
}

// Place destructible blocks randomly
function placeBlocks(grid: CellType[][]): Block[] {
  const blocks: Block[] = [];
  const blockDensity = 0.5; // 50% chance for available cells
  
  for (let y = 1; y < GRID_SIZE - 1; y++) {
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      // Skip if cell is already occupied or in a safe zone
      if (grid[y][x] !== CellType.EMPTY || isInSafeZone(x, y)) {
        continue;
      }
      
      // Random chance to place a block
      if (Math.random() < blockDensity) {
        grid[y][x] = CellType.BLOCK;
        blocks.push(new Block(x, y, false));
      }
    }
  }
  
  return blocks;
}

// Generate the complete map
export function generateMap(): MapData {
  const grid = createEmptyGrid();
  const walls = placeWalls(grid);
  const blocks = placeBlocks(grid);
  
  // Emit map generated event
  eventBus.emit('map:generated', { grid, walls, blocks });
  
  return { grid, walls, blocks };
}

// Get cell type at specific coordinates
export function getCellType(grid: CellType[][], x: number, y: number): CellType {
  // Check bounds
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
    return CellType.WALL; // Out of bounds is treated as wall
  }
  
  return grid[y][x];
}

// Check if a position is valid for movement
export function isValidPosition(grid: CellType[][], x: number, y: number): boolean {
  const cellType = getCellType(grid, x, y);
  return cellType === CellType.EMPTY || cellType === CellType.POWERUP;
}

// Destroy a block at specific coordinates
export function destroyBlock(mapData: MapData, x: number, y: number, fromExplosion: boolean = false): boolean {
  const { grid, blocks } = mapData;
  
  // Check if there's a destructible block at this position
  if (getCellType(grid, x, y) === CellType.BLOCK) {
    // Find the block object
    const blockIndex = blocks.findIndex(block => block.x === x && block.y === y);
    
    if (blockIndex !== -1) {
      const block = blocks[blockIndex];
      
      // Call the block's destroy method to trigger animation
      const destroyed = block.destroy();
      
      if (destroyed) {
        // Update grid
        grid[y][x] = CellType.EMPTY;
        
        // Remove block from blocks array after animation completes
        setTimeout(() => {
          const currentIndex = blocks.indexOf(block);
          if (currentIndex !== -1) {
            blocks.splice(currentIndex, 1);
          }
        }, 300); // Match the animation duration
        
        // Maybe spawn a powerup
        const powerup = maybeSpawnPowerup(x, y);
        
        // Emit block destroyed event with additional data
        eventBus.emit('block:destroyed', { 
          x, 
          y, 
          fromExplosion,
          powerupSpawned: powerup !== null
        });
        
        return true;
      }
    }
  }
  
  return false;
}

// Destroy blocks in an explosion area
export function destroyBlocksInExplosion(mapData: MapData, centerX: number, centerY: number, radius: number): void {
  // Directions: center, up, right, down, left
  const directions = [
    { dx: 0, dy: 0 },   // Center
    { dx: 0, dy: -1 },  // Up
    { dx: 1, dy: 0 },   // Right
    { dx: 0, dy: 1 },   // Down
    { dx: -1, dy: 0 }   // Left
  ];
  
  // Process each direction
  directions.forEach(({ dx, dy }) => {
    // Start from center for this direction
    let x = centerX;
    let y = centerY;
    
    // Extend in this direction up to radius or until hitting a wall
    for (let i = 0; i <= radius; i++) {
      const newX = x + (dx * i);
      const newY = y + (dy * i);
      
      // Check if position is within bounds
      if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
        break;
      }
      
      const cellType = getCellType(mapData.grid, newX, newY);
      
      // If it's a wall, stop the explosion in this direction
      if (cellType === CellType.WALL) {
        break;
      }
      
      // If it's a block, destroy it and stop the explosion in this direction
      if (cellType === CellType.BLOCK) {
        destroyBlock(mapData, newX, newY, true);
        break;
      }
      
      // Mark this cell as part of the explosion (for rendering)
      if (i > 0) { // Skip the center which will be handled by the bomb
        mapData.grid[newY][newX] = CellType.EXPLOSION;
        
        // Reset to empty after explosion animation
        setTimeout(() => {
          if (mapData.grid[newY][newX] === CellType.EXPLOSION) {
            mapData.grid[newY][newX] = CellType.EMPTY;
          }
        }, 1000); // Explosion duration
      }
    }
  });
}

// Reset the map for a new game
export function resetMap(): MapData {
  return generateMap();
}
