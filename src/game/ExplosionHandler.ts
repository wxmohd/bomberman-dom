// Explosion handler - manages collision detection and effects of explosions
import { eventBus } from '../../framework/events';
import { ExplosionCoordinates } from '../entities/bomb';
import { GRID_WIDTH, GRID_HEIGHT } from './constants';

// Types of game elements that can be affected by explosions
export enum CollisionType {
  EMPTY = 'empty',
  WALL = 'wall',
  BLOCK = 'block',
  PLAYER = 'player',
  BOMB = 'bomb',
  POWERUP = 'powerup'
}

interface GridCell {
  type: CollisionType;
  id?: string; // For players, bombs, or powerups
}

interface ExplosionEvent {
  ownerId: string;
  origin: ExplosionCoordinates;
  coordinates: ExplosionCoordinates[];
}

export class ExplosionHandler {
  private gridWidth: number;
  private gridHeight: number;
  private grid: GridCell[][];
  
  constructor(gridWidth: number = GRID_WIDTH, gridHeight: number = GRID_HEIGHT) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    
    // Initialize empty grid
    this.grid = Array(gridHeight).fill(null).map(() => 
      Array(gridWidth).fill(null).map(() => ({ type: CollisionType.EMPTY }))
    );
    
    // Listen for explosion events
    eventBus.on('bomb:explode', this.handleExplosion.bind(this));
    
    // Listen for grid updates
    eventBus.on('grid:update', this.updateGrid.bind(this));
  }

  // Update the grid with current game state
  public updateGrid(newGrid: GridCell[][]): void {
    this.grid = newGrid;
  }

  // Handle an explosion event
  private handleExplosion(event: ExplosionEvent): void {
    const { ownerId, coordinates } = event;
    const processedCoordinates: ExplosionCoordinates[] = [];
    
    // Process explosion in each direction separately to handle blocking correctly
    const directions = [
      { dx: 0, dy: -1 }, // up
      { dx: 1, dy: 0 },  // right
      { dx: 0, dy: 1 },  // down
      { dx: -1, dy: 0 }  // left
    ];
    
    // Always include the origin point
    const origin = event.origin;
    this.processExplosionAt(origin.x, origin.y, ownerId);
    processedCoordinates.push(origin);
    
    // Process each direction
    directions.forEach(dir => {
      let blocked = false;
      
      // Get all coordinates in this direction
      const dirCoords = coordinates.filter(coord => {
        // Skip the origin point (already processed)
        if (coord.x === origin.x && coord.y === origin.y) return false;
        
        // Check if this coordinate is in the current direction
        const dx = coord.x - origin.x;
        const dy = coord.y - origin.y;
        
        // If dx is non-zero, dy must be zero and vice versa
        // And the signs must match the direction
        return (dx === 0 && dy * dir.dy > 0) || (dy === 0 && dx * dir.dx > 0);
      });
      
      // Sort by distance from origin
      dirCoords.sort((a, b) => {
        const distA = Math.abs(a.x - origin.x) + Math.abs(a.y - origin.y);
        const distB = Math.abs(b.x - origin.x) + Math.abs(b.y - origin.y);
        return distA - distB;
      });
      
      // Process each coordinate in order
      for (const coord of dirCoords) {
        if (blocked) break;
        
        // Process this coordinate
        const result = this.processExplosionAt(coord.x, coord.y, ownerId);
        processedCoordinates.push(coord);
        
        // If this was a wall or block, stop the explosion in this direction
        if (result === CollisionType.WALL || result === CollisionType.BLOCK) {
          blocked = true;
        }
      }
    });
    
    // Emit event with processed coordinates
    eventBus.emit('explosion:processed', {
      ownerId,
      coordinates: processedCoordinates
    });
  }

  // Process explosion at a specific coordinate
  private processExplosionAt(x: number, y: number, ownerId: string): CollisionType {
    // Check if coordinates are within grid bounds
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return CollisionType.EMPTY;
    }
    
    const cell = this.grid[y][x];
    
    switch (cell.type) {
      case CollisionType.WALL:
        // Walls block explosions but aren't affected
        return CollisionType.WALL;
        
      case CollisionType.BLOCK:
        // Blocks are destroyed by explosions
        eventBus.emit('block:destroyed', { x, y });
        return CollisionType.BLOCK;
        
      case CollisionType.PLAYER:
        // Players take damage from explosions
        if (cell.id) {
          eventBus.emit('player:hit', { 
            playerId: cell.id, 
            attackerId: ownerId,
            x, y
          });
        }
        return CollisionType.PLAYER;
        
      case CollisionType.BOMB:
        // Chain reaction - trigger other bombs
        if (cell.id) {
          eventBus.emit('bomb:chainReaction', { 
            bombId: cell.id,
            triggeredBy: ownerId,
            x, y
          });
        }
        return CollisionType.BOMB;
        
      case CollisionType.POWERUP:
        // Destroy powerups in explosion path
        if (cell.id) {
          eventBus.emit('powerup:destroyed', { 
            powerupId: cell.id,
            x, y
          });
        }
        return CollisionType.POWERUP;
        
      default:
        // Empty spaces just propagate the explosion
        return CollisionType.EMPTY;
    }
  }

  // Check if a coordinate is currently in an explosion
  public isInExplosion(x: number, y: number): boolean {
    const explosionElements = document.querySelectorAll('.explosion');
    
    for (let i = 0; i < explosionElements.length; i++) {
      const element = explosionElements[i];
      const explosionId = element.id;
      const [_, xStr, yStr] = explosionId.split('-');
      const expX = parseInt(xStr);
      const expY = parseInt(yStr);
      
      // Check if this explosion covers the given coordinates
      if (expX === x && expY === y) {
        return true;
      }
    }
    
    return false;
  }
}
