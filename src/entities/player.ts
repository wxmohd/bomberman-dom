// Player entity logic
import { eventBus } from '../../framework/events';

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
  
  constructor(
    public id: string, 
    public nickname: string,
    startX: number = 0,
    startY: number = 0
  ) {
    this.x = startX;
    this.y = startY;
    
    // Listen for power-up events
    eventBus.on('powerup:applied', this.handlePowerUp.bind(this));
    
    // Listen for hit events
    eventBus.on('player:hit', this.handleHit.bind(this));
  }
  
  // Get current position
  public getPosition(): PlayerPosition {
    return { x: this.x, y: this.y };
  }
  
  // Set position (for initialization or teleportation)
  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    
    // Emit position update event
    this.emitPositionUpdate();
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
      
      // Emit position update event
      this.emitPositionUpdate();
    }
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
}
