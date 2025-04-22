// Player controller - handles keyboard input for player movement and actions
import { Player, Direction } from '../entities/player';
import { eventBus } from '../../framework/events';
import { BombSystem } from './BombSystem';

interface KeyState {
  up: boolean;
  right: boolean;
  down: boolean;
  left: boolean;
  bomb: boolean;
}

export class PlayerController {
  private players: Map<string, Player> = new Map();
  private keyStates: Map<string, KeyState> = new Map();
  private lastUpdateTime: number = 0;
  private collisionMap: boolean[][] = [];
  
  constructor(private bombSystem: BombSystem, private gridSize: number) {
    // Initialize collision map
    this.resetCollisionMap();
    
    // Set up keyboard event listeners
    this.setupKeyboardListeners();
    
    // Listen for collision map updates
    eventBus.on('grid:update', this.updateCollisionMap.bind(this));
    
    // Start the update loop
    this.lastUpdateTime = performance.now();
    this.update();
  }

  // Add a player to be controlled
  public addPlayer(player: Player): void {
    this.players.set(player.id, player);
    
    // Initialize key state for this player
    this.keyStates.set(player.id, {
      up: false,
      right: false,
      down: false,
      left: false,
      bomb: false
    });
    
    // Initialize player in bomb system
    this.bombSystem.initializePlayer(player.id);
  }

  // Remove a player
  public removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.keyStates.delete(playerId);
    this.bombSystem.removePlayer(playerId);
  }

  // Set up keyboard event listeners
  private setupKeyboardListeners(): void {
    // Define key mappings for different players
    const keyMappings: Record<string, Record<string, string[]>> = {
      'player1': {
        up: ['ArrowUp', 'w', 'W'],
        right: ['ArrowRight', 'd', 'D'],
        down: ['ArrowDown', 's', 'S'],
        left: ['ArrowLeft', 'a', 'A'],
        bomb: [' '] // Space
      },
      'player2': {
        up: ['w', 'W'],
        right: ['d', 'D'],
        down: ['s', 'S'],
        left: ['a', 'A'],
        bomb: ['e', 'E']
      },
      'player3': {
        up: ['i', 'I'],
        right: ['l', 'L'],
        down: ['k', 'K'],
        left: ['j', 'J'],
        bomb: ['o', 'O']
      },
      'player4': {
        up: ['8'],
        right: ['6'],
        down: ['5'],
        left: ['4'],
        bomb: ['0']
      }
    };
    
    // Handle keydown events
    window.addEventListener('keydown', (event) => {
      // Check for each player's controls
      Object.entries(keyMappings).forEach(([playerId, controls]) => {
        const keyState = this.keyStates.get(playerId);
        if (!keyState) return;
        
        // Check each control type
        Object.entries(controls).forEach(([control, keys]) => {
          if (keys.includes(event.key)) {
            keyState[control as keyof KeyState] = true;
            
            // If this is a bomb key, try to place a bomb
            if (control === 'bomb') {
              this.tryPlaceBomb(playerId);
            }
          }
        });
      });
    });
    
    // Handle keyup events
    window.addEventListener('keyup', (event) => {
      // Check for each player's controls
      Object.entries(keyMappings).forEach(([playerId, controls]) => {
        const keyState = this.keyStates.get(playerId);
        if (!keyState) return;
        
        // Check each control type
        Object.entries(controls).forEach(([control, keys]) => {
          if (keys.includes(event.key)) {
            keyState[control as keyof KeyState] = false;
          }
        });
      });
    });
  }

  // Main update loop
  private update(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // Update each player
    this.players.forEach((player, id) => {
      const keyState = this.keyStates.get(id);
      if (!keyState) return;
      
      // Determine movement direction
      let direction = Direction.NONE;
      
      if (keyState.up) direction = Direction.UP;
      else if (keyState.right) direction = Direction.RIGHT;
      else if (keyState.down) direction = Direction.DOWN;
      else if (keyState.left) direction = Direction.LEFT;
      
      // Move player
      player.move(direction, deltaTime, this.checkCollision.bind(this));
    });
    
    // Continue the loop
    requestAnimationFrame(this.update.bind(this));
  }

  // Try to place a bomb for a player
  private tryPlaceBomb(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    const position = player.getPosition();
    const gridX = Math.floor(position.x);
    const gridY = Math.floor(position.y);
    
    // Try to place a bomb at the player's position
    this.bombSystem.placeBomb(playerId, gridX, gridY);
  }

  // Check for collision at a position
  private checkCollision(x: number, y: number): boolean {
    // Convert to grid coordinates
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    // Check grid boundaries
    if (gridX < 0 || gridX >= this.gridSize || gridY < 0 || gridY >= this.gridSize) {
      return true; // Collision with boundary
    }
    
    // Check collision map
    return this.collisionMap[gridY][gridX];
  }

  // Reset collision map
  private resetCollisionMap(): void {
    this.collisionMap = Array(this.gridSize).fill(false).map(() => 
      Array(this.gridSize).fill(false)
    );
  }

  // Update collision map from grid data
  private updateCollisionMap(grid: any[][]): void {
    // Reset collision map
    this.resetCollisionMap();
    
    // Update based on grid data
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        
        // Check if this cell blocks movement
        if (cell.type === 'wall' || cell.type === 'block') {
          this.collisionMap[y][x] = true;
        }
      }
    }
  }
}
