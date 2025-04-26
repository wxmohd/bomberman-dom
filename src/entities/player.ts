// Player entity logic
import { eventBus } from '../../framework/events';
import { TILE_SIZE } from '../game/constants';
import { EVENTS } from '../multiplayer/events';
import { sendToServer } from '../multiplayer/socket';

export enum Direction {
  UP,
  RIGHT,
  DOWN,
  LEFT,
  NONE
}

export interface PlayerPosition {
  x: number;
  y: number;
}

export interface PlayerStats {
  speed: number;
  bombCapacity: number;
  explosionRange: number;
}

// Interface for block destruction
export interface DestroyedBlock {
  x: number;
  y: number;
  type: string;
}

export class Player {
  // Position and movement
  private x: number = 0;
  private y: number = 0;
  private direction: Direction = Direction.NONE;
  private moving: boolean = false;
  private speed: number = 3; // Grid cells per second
  
  // Player state
  private lives: number = 3;
  private invulnerable: boolean = false;
  private invulnerabilityTimer: number | null = null;
  private invulnerabilityDuration: number = 2000; // 2 seconds
  
  // Power-up stats
  private bombCapacity: number = 1;
  private explosionRange: number = 1;
  
  // Visual representation
  private playerElement: HTMLElement | null = null;
  private nameTagElement: HTMLElement | null = null;
  
  // Bomb cooldown
  private bombCooldown: boolean = false;
  private bombCooldownTime: number = 1000; // 1 second cooldown
  
  // Track placed bombs
  private activeBombs: number = 0;
  
  // DOM container reference
  private gameContainer: HTMLElement | null = null;
  
  constructor(
    public id: string, 
    public nickname: string,
    startX: number = 0,
    startY: number = 0,
    container?: HTMLElement
  ) {
    this.x = startX;
    this.y = startY;
    
    // Store container reference if provided
    if (container) {
      this.gameContainer = container;
      this.createPlayerElement(container);
    }
    
    // Listen for power-up events
    eventBus.on('powerup:applied', this.handlePowerUp.bind(this));
    
    // Listen for hit events
    eventBus.on('player:hit', this.handleHit.bind(this));
    
    // Set up keyboard controls if this is the local player
    if (this.isLocalPlayer()) {
      this.setupKeyboardControls();
    }
  }
  
  // Get current position
  public getPosition(): PlayerPosition {
    return { x: this.x, y: this.y };
  }
  
  // Set position (for initialization or teleportation)
  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    
    // Update visual position
    this.updateVisualPosition();
    
    // Emit position update event
    this.emitPositionUpdate();
  }
  
  // Create the player's visual element
  private createPlayerElement(container: HTMLElement): void {
    console.log(`Creating player element for player ${this.id} (${this.nickname}) at position ${this.x},${this.y}`);
    console.log(`Container:`, container);
    
    // Create player element
    const playerEl = document.createElement('div');
    playerEl.className = 'player';
    playerEl.id = `player-${this.id}`;
    
    // Style the player
    playerEl.style.position = 'absolute';
    playerEl.style.left = `${this.x * TILE_SIZE}px`;
    playerEl.style.top = `${this.y * TILE_SIZE}px`;
    playerEl.style.width = `${TILE_SIZE}px`;
    playerEl.style.height = `${TILE_SIZE}px`;
    playerEl.style.backgroundColor = this.isLocalPlayer() ? '#FF0000' : '#0000FF'; // Red for local, blue for remote
    playerEl.style.borderRadius = '50%';
    playerEl.style.zIndex = '1000';
    playerEl.style.boxShadow = '0 0 15px 5px rgba(255,0,0,0.7)';
    playerEl.style.border = '2px solid white';
    playerEl.style.boxSizing = 'border-box';
    playerEl.style.transition = 'left 0.1s, top 0.1s';
    
    console.log(`Player element created:`, playerEl);
    
    // Add inner element for better visibility
    const innerElement = document.createElement('div');
    innerElement.style.position = 'absolute';
    innerElement.style.width = '60%';
    innerElement.style.height = '60%';
    innerElement.style.top = '20%';
    innerElement.style.left = '20%';
    innerElement.style.backgroundColor = 'white';
    innerElement.style.borderRadius = '50%';
    playerEl.appendChild(innerElement);
    
    // Add name tag
    const nameTag = document.createElement('div');
    nameTag.textContent = this.isLocalPlayer() ? `${this.nickname} (You)` : this.nickname;
    nameTag.style.position = 'absolute';
    nameTag.style.bottom = '100%';
    nameTag.style.left = '50%';
    nameTag.style.transform = 'translateX(-50%)';
    nameTag.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    nameTag.style.color = 'white';
    nameTag.style.padding = '2px 5px';
    nameTag.style.borderRadius = '3px';
    nameTag.style.fontSize = '12px';
    nameTag.style.whiteSpace = 'nowrap';
    
    playerEl.appendChild(nameTag);
    
    // Add to container
    container.appendChild(playerEl);
    console.log(`Player element added to container`);
    
    // Store references
    this.playerElement = playerEl;
    this.nameTagElement = nameTag;
    
    // Force a reflow to ensure the player is visible
    void playerEl.offsetWidth;
    
    // Double-check that the player is in the DOM
    setTimeout(() => {
      const playerInDOM = document.getElementById(`player-${this.id}`);
      if (playerInDOM) {
        console.log(`Player ${this.id} is in the DOM`);
      } else {
        console.error(`Player ${this.id} is NOT in the DOM!`);
        // Try adding it again
        if (this.gameContainer) {
          this.gameContainer.appendChild(playerEl);
          console.log(`Attempted to add player element again`);
        }
      }
    }, 500);
    
    // Add CSS for player animations
    if (!document.getElementById('player-animations')) {
      const style = document.createElement('style');
      style.id = 'player-animations';
      style.textContent = `
        @keyframes player-pulse {
          0% { transform: scale(1); box-shadow: 0 0 15px 5px rgba(255,0,0,0.7); }
          100% { transform: scale(1.1); box-shadow: 0 0 20px 8px rgba(255,0,0,0.9); }
        }
        
        .player.local {
          animation: player-pulse 0.8s infinite alternate;
        }
        
        .player.invulnerable {
          opacity: 0.7;
          animation: player-pulse 0.3s infinite alternate;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add local player class if this is the local player
    if (this.isLocalPlayer()) {
      playerEl.classList.add('local');
    }
  }
  
  // Update the visual position of the player
  private updateVisualPosition(): void {
    if (this.playerElement) {
      this.playerElement.style.left = `${this.x * TILE_SIZE}px`;
      this.playerElement.style.top = `${this.y * TILE_SIZE}px`;
    }
  }
  
  // Get current direction
  public getDirection(): Direction {
    return this.direction;
  }
  
  // Set direction (for remote player synchronization)
  public setDirection(direction: Direction): void {
    this.direction = direction;
    this.moving = direction !== Direction.NONE;
  }
  
  // Move in a direction
  public move(direction: Direction, deltaTime: number, collisionCallback: (x: number, y: number) => boolean): void {
    if (direction === Direction.NONE) {
      this.moving = false;
      return;
    }
    
    this.direction = direction;
    this.moving = true;
    
    // Calculate new position based on direction and speed
    let newX = this.x;
    let newY = this.y;
    const distance = this.speed * (deltaTime / 1000); // Convert to seconds
    
    switch (direction) {
      case Direction.UP:
        newY -= distance;
        break;
      case Direction.RIGHT:
        newX += distance;
        break;
      case Direction.DOWN:
        newY += distance;
        break;
      case Direction.LEFT:
        newX -= distance;
        break;
    }
    
    // Check collision at new position
    if (!collisionCallback(newX, newY)) {
      // No collision, update position
      this.x = newX;
      this.y = newY;
      
      // Update visual position
      this.updateVisualPosition();
      
      // Emit position update event
      this.emitPositionUpdate();
    }
  }
  
  // Check if this is the local player
  private isLocalPlayer(): boolean {
    // This would be implemented based on your player ID system
    const storedPlayerId = localStorage.getItem('playerId');
    console.log(`Checking if player ${this.id} is local player. Stored ID: ${storedPlayerId}`);
    return this.id === storedPlayerId;
  }
  
  // Set up keyboard controls for the local player
  private setupKeyboardControls(): void {
    console.log(`Setting up keyboard controls for player ${this.id} (isLocalPlayer: ${this.isLocalPlayer()})`);
    
    // Only set up controls for the local player
    if (!this.isLocalPlayer()) {
      console.log(`Not setting up keyboard controls for remote player ${this.id}`);
      return;
    }
    
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log(`Key pressed: ${event.key} for player ${this.id}`);
      
      // Skip if player is not in the game
      if (!this.playerElement) {
        console.log('Player element not found, skipping keyboard input');
        return;
      }
      
      let newX = this.x;
      let newY = this.y;
      const speed = 1; // Full tile movement for better grid alignment
      
      switch (event.key) {
        case 'ArrowUp':
          newY -= speed;
          this.direction = Direction.UP;
          break;
        case 'ArrowRight':
          newX += speed;
          this.direction = Direction.RIGHT;
          break;
        case 'ArrowDown':
          newY += speed;
          this.direction = Direction.DOWN;
          break;
        case 'ArrowLeft':
          newX -= speed;
          this.direction = Direction.LEFT;
          break;
        case ' ': // Spacebar
          this.placeBomb();
          return; // Skip movement for bomb placement
        default:
          return; // Skip for other keys
      }
      
      console.log(`Attempting to move from (${this.x},${this.y}) to (${newX},${newY})`);
      
      // Check if the new position is valid
      if (this.isValidPosition(newX, newY)) {
        this.x = newX;
        this.y = newY;
        this.updateVisualPosition();
        this.emitPositionUpdate();
        console.log(`Moved to (${this.x},${this.y})`);
      } else {
        console.log(`Invalid position: (${newX},${newY})`);
      }
      
      // Send position to server for multiplayer sync
      sendToServer(EVENTS.MOVE, {
        x: this.x,
        y: this.y,
        direction: this.direction
      });
    };
    
    // Add event listener for keydown
    document.addEventListener('keydown', handleKeyDown);
    
    // Log that keyboard controls are set up
    console.log(`Keyboard controls set up for player ${this.id}`);
  }
  
  // Check if a position is valid for movement
  private isValidPosition(x: number, y: number): boolean {
    // Prevent going out of bounds
    if (x < 1 || y < 1 || x >= 14 || y >= 14) {
      return false;
    }
    
    // Get grid coordinates
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    // Check for fixed walls (grid pattern)
    if (gridX % 2 === 0 && gridY % 2 === 0) {
      return false; // Wall at even coordinates
    }
    
    // Check for border walls
    if (gridX === 0 || gridY === 0 || gridX === 14 || gridY === 14) {
      return false;
    }
    
    // Check for green spaces - always allow movement
    const greenSpaces = Array.from(document.querySelectorAll('.green-space')).filter(el => {
      const style = window.getComputedStyle(el);
      const left = parseInt(style.left) / TILE_SIZE;
      const top = parseInt(style.top) / TILE_SIZE;
      return Math.floor(left) === gridX && Math.floor(top) === gridY;
    });
    
    if (greenSpaces.length > 0) {
      return true; // Can walk through green spaces
    }
    
    // Check for blocks (destructible blocks)
    const blockElements = document.querySelectorAll('.block');
    for (let i = 0; i < blockElements.length; i++) {
      const block = blockElements[i] as HTMLElement;
      const blockX = Math.floor(parseInt(block.style.left) / TILE_SIZE);
      const blockY = Math.floor(parseInt(block.style.top) / TILE_SIZE);
      
      if (blockX === gridX && blockY === gridY) {
        return false; // Can't walk through blocks
      }
    }
    
    // Check for bombs
    const bombElements = document.querySelectorAll('.bomb');
    for (let i = 0; i < bombElements.length; i++) {
      const bomb = bombElements[i] as HTMLElement;
      const bombX = Math.floor(parseInt(bomb.style.left) / TILE_SIZE);
      const bombY = Math.floor(parseInt(bomb.style.top) / TILE_SIZE);
      
      if (bombX === gridX && bombY === gridY) {
        return false; // Can't walk through bombs
      }
    }
    
    return true; // No obstacles found
  }
  
  // Emit position update event
  private emitPositionUpdate(): void {
    eventBus.emit('player:moved', {
      id: this.id,
      x: this.x,
      y: this.y
    });
  }
  
  // Handle power-up application
  private handlePowerUp(data: any): void {
    // Only process if this is for this player
    if (data.playerId !== this.id) return;
    
    switch (data.type) {
      case 'bombCapacity':
        this.bombCapacity = data.value;
        break;
      case 'explosionRange':
        this.explosionRange = data.value;
        break;
      case 'speed':
        this.speed = data.value;
        break;
      case 'extraLife':
        this.lives += 1;
        break;
    }
    
    // Emit stats update event
    this.emitStatsUpdate();
  }
  
  // Handle being hit by an explosion
  private handleHit(data: any): void {
    // Only process if this is for this player
    if (data.playerId !== this.id) return;
    
    // If player is invulnerable, ignore the hit
    if (this.invulnerable) return;
    
    // Reduce lives
    this.lives -= 1;
    
    // Emit hit event
    eventBus.emit('player:damaged', {
      id: this.id,
      livesRemaining: this.lives
    });
    
    // Make player invulnerable temporarily
    this.setInvulnerable();
    
    // Check if player is eliminated
    if (this.lives <= 0) {
      eventBus.emit('player:eliminated', {
        id: this.id,
        eliminatedBy: data.attackerId
      });
    }
  }
  
  // Make player temporarily invulnerable
  private setInvulnerable(): void {
    this.invulnerable = true;
    
    // Clear any existing timer
    if (this.invulnerabilityTimer !== null) {
      window.clearTimeout(this.invulnerabilityTimer);
    }
    
    // Set invulnerability timer
    this.invulnerabilityTimer = window.setTimeout(() => {
      this.invulnerable = false;
      this.invulnerabilityTimer = null;
      
      // Emit invulnerability end event
      eventBus.emit('player:invulnerabilityEnd', { id: this.id });
    }, this.invulnerabilityDuration);
    
    // Emit invulnerability start event
    eventBus.emit('player:invulnerabilityStart', { id: this.id });
  }
  
  // Get player stats
  public getStats(): PlayerStats {
    return {
      speed: this.speed,
      bombCapacity: this.bombCapacity,
      explosionRange: this.explosionRange
    };
  }
  
  // Emit stats update event
  private emitStatsUpdate(): void {
    eventBus.emit('player:statsUpdate', {
      id: this.id,
      stats: this.getStats(),
      lives: this.lives
    });
  }
  
  // Get remaining lives
  public getLives(): number {
    return this.lives;
  }
  
  // Check if player is invulnerable
  public isInvulnerable(): boolean {
    return this.invulnerable;
  }
  
  // Check if player is moving
  public isMoving(): boolean {
    return this.moving;
  }
  
  // Stop movement
  public stopMovement(): void {
    this.moving = false;
    this.direction = Direction.NONE;
  }
  
  // Place a bomb at the player's current position
  public placeBomb(): void {
    // Skip if player is not in the game
    if (!this.playerElement || !this.gameContainer) return;
    
    // Check bomb cooldown
    if (this.bombCooldown) return;
    
    // Check if player has reached bomb capacity
    if (this.activeBombs >= this.bombCapacity) return;
    
    // Get the exact player position
    const gridX = Math.floor(this.x);
    const gridY = Math.floor(this.y);
    
    // Check if there's already a bomb at this position
    const existingBombs = document.querySelectorAll('.bomb');
    for (let i = 0; i < existingBombs.length; i++) {
      const bomb = existingBombs[i] as HTMLElement;
      const bombX = Math.floor(parseInt(bomb.style.left) / TILE_SIZE);
      const bombY = Math.floor(parseInt(bomb.style.top) / TILE_SIZE);
      
      if (bombX === gridX && bombY === gridY) {
        return; // Don't place another bomb here
      }
    }
    
    // Create bomb element
    const bomb = document.createElement('div');
    bomb.className = 'bomb';
    bomb.style.cssText = `
      position: absolute;
      left: ${gridX * TILE_SIZE}px;
      top: ${gridY * TILE_SIZE}px;
      width: ${TILE_SIZE}px;
      height: ${TILE_SIZE}px;
      background-color: black;
      border-radius: 50%;
      z-index: 800;
      animation: bomb-pulse 0.5s infinite alternate;
      border: 2px solid white;
      box-sizing: border-box;
    `;
    
    // Add a fuse to make the bomb more visible
    const fuse = document.createElement('div');
    fuse.style.cssText = `
      position: absolute;
      top: -5px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 10px;
      background-color: #FF4500;
      z-index: 801;
    `;
    bomb.appendChild(fuse);
    
    // Add bomb to the container
    this.gameContainer.appendChild(bomb);
    
    // Increment active bombs count
    this.activeBombs++;
    
    // Set bomb cooldown
    this.bombCooldown = true;
    setTimeout(() => {
      this.bombCooldown = false;
    }, this.bombCooldownTime);
    
    // Send bomb placement to server
    sendToServer(EVENTS.DROP_BOMB, {
      x: gridX,
      y: gridY,
      explosionRange: this.explosionRange
    });
    
    // Emit bomb placed event
    eventBus.emit('bomb:placed', {
      playerId: this.id,
      x: gridX,
      y: gridY,
      range: this.explosionRange
    });
    
    // Explode after 2 seconds
    setTimeout(() => {
      // Remove the bomb element
      bomb.remove();
      
      // Decrement active bombs count
      this.activeBombs--;
      
      // Create explosion
      this.createExplosion(gridX, gridY, this.explosionRange);
    }, 2000);
  }
  
  // Create explosion effect
  private createExplosion(x: number, y: number, radius: number): void {
    if (!this.gameContainer) return;
    
    // Track which blocks have been destroyed to avoid duplicates
    const destroyedBlocks: Set<string> = new Set();
    
    // Create center explosion
    const centerExplosion = document.createElement('div');
    centerExplosion.className = 'explosion center';
    centerExplosion.style.cssText = `
      position: absolute;
      left: ${x * TILE_SIZE}px;
      top: ${y * TILE_SIZE}px;
      width: ${TILE_SIZE}px;
      height: ${TILE_SIZE}px;
      background-color: yellow;
      border-radius: 50%;
      z-index: 900;
      animation: explosion 0.5s forwards;
    `;
    if (this.gameContainer) {
      this.gameContainer.appendChild(centerExplosion);
    }
    
    // Remove explosion after animation
    setTimeout(() => {
      centerExplosion.remove();
    }, 500);
    
    // Destroy block at center if there is one
    this.destroyBlockAt(x, y, destroyedBlocks);
    
    // Create explosion in four directions
    const directions = [
      { dx: 0, dy: -1, name: 'up' },    // Up
      { dx: 1, dy: 0, name: 'right' },  // Right
      { dx: 0, dy: 1, name: 'down' },   // Down
      { dx: -1, dy: 0, name: 'left' }   // Left
    ];
    
    // For each direction, create explosion blocks up to the radius
    directions.forEach(dir => {
      for (let i = 1; i <= radius; i++) {
        const explosionX = x + (dir.dx * i);
        const explosionY = y + (dir.dy * i);
        
        // Check if this position is valid for explosion
        if (!this.isValidExplosionPosition(explosionX, explosionY)) {
          break; // Stop this direction if hit a wall
        }
        
        // Create explosion element
        const explosion = document.createElement('div');
        explosion.className = `explosion ${dir.name}`;
        explosion.style.cssText = `
          position: absolute;
          left: ${explosionX * TILE_SIZE}px;
          top: ${explosionY * TILE_SIZE}px;
          width: ${TILE_SIZE}px;
          height: ${TILE_SIZE}px;
          background-color: orange;
          z-index: 40;
          animation: explosion 0.5s forwards;
        `;
        
        if (this.gameContainer) {
          this.gameContainer.appendChild(explosion);
        }
        
        // Check if there's a block at this position and destroy it
        const wasDestroyed = this.destroyBlockAt(explosionX, explosionY, destroyedBlocks);
        
        // Remove explosion after animation
        setTimeout(() => {
          explosion.remove();
        }, 500);
        
        // If a block was destroyed, stop the explosion in this direction
        if (wasDestroyed) {
          break;
        }
      }
    });
    
    // Add CSS for bomb and explosion animations if not already added
    if (!document.getElementById('bomb-animations')) {
      const style = document.createElement('style');
      style.id = 'bomb-animations';
      style.textContent = `
        @keyframes bomb-pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.2); background-color: #555; }
        }
        
        @keyframes explosion {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        
        @keyframes block-destroy {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(0); opacity: 0; }
        }
        
        @keyframes green-space-appear {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .green-space {
          animation: green-space-appear 0.3s forwards;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Check if an explosion can reach this position
  private isValidExplosionPosition(x: number, y: number): boolean {
    // Can't explode through walls
    if (x % 2 === 0 && y % 2 === 0) {
      return false; // Wall at even coordinates
    }
    
    // Can't explode through border walls
    if (x === 0 || y === 0 || x === 14 || y === 14) {
      return false;
    }
    
    return true;
  }
  
  // Destroy a block at the specified coordinates
  private destroyBlockAt(x: number, y: number, destroyedBlocks: Set<string>): boolean {
    if (!this.gameContainer) return false;
    
    // Create a key for this position
    const posKey = `${x},${y}`;
    
    // Skip if already destroyed
    if (destroyedBlocks.has(posKey)) {
      return false;
    }
    
    // Find red blocks at this position
    const redBlocks = Array.from(document.querySelectorAll('.block')).filter(el => {
      const style = window.getComputedStyle(el);
      const left = parseInt(style.left) / TILE_SIZE;
      const top = parseInt(style.top) / TILE_SIZE;
      
      return Math.floor(left) === Math.floor(x) && Math.floor(top) === Math.floor(y);
    });
    
    if (redBlocks.length > 0) {
      // Mark as destroyed
      destroyedBlocks.add(posKey);
      
      // Process each red block
      redBlocks.forEach(block => {
        const blockEl = block as HTMLElement;
        
        // Animate block destruction
        blockEl.style.animation = 'block-destroy 0.5s forwards';
        
        // Create a green space where the block was
        const greenSpace = document.createElement('div');
        greenSpace.className = 'green-space';
        greenSpace.style.position = 'absolute';
        greenSpace.style.left = blockEl.style.left;
        greenSpace.style.top = blockEl.style.top;
        greenSpace.style.width = `${TILE_SIZE}px`;
        greenSpace.style.height = `${TILE_SIZE}px`;
        greenSpace.style.backgroundColor = '#7ABD7E'; // Green color
        greenSpace.style.zIndex = '5'; // Below player but above background
        
        // Add green space to the game container
        if (this.gameContainer) {
          this.gameContainer.appendChild(greenSpace);
        }
        
        // Remove block after animation
        setTimeout(() => {
          blockEl.remove();
        }, 500);
        
        // Emit block destroyed event
        eventBus.emit('block:destroyed', {
          x: Math.floor(x),
          y: Math.floor(y),
          type: 'destructible'
        });
      });
      
      return true; // Block was destroyed
    }
    
    return false; // No block was destroyed
  }
}
