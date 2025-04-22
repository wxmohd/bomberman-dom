// Power-up system - handles power-up generation and effects
import { eventBus } from '../../framework/events';

export enum PowerUpType {
  BOMB = 'bomb',      // Increases bomb capacity
  FLAME = 'flame',    // Increases explosion range
  SPEED = 'speed',    // Increases movement speed
  LIFE = 'life'       // Extra life
}

interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
}

export class PowerUpSystem {
  private powerUps: Map<string, PowerUp> = new Map();
  private nextId: number = 1;
  
  constructor(private gameContainer: HTMLElement, private cellSize: number = 40) {
    // Listen for block destruction events
    eventBus.on('block:destroyed', this.handleBlockDestroyed.bind(this));
    
    // Listen for power-up collection events
    eventBus.on('player:moved', this.checkPowerUpCollection.bind(this));
    
    // Listen for power-up destruction events (from explosions)
    eventBus.on('powerup:destroyed', this.removePowerUp.bind(this));
    
    // Add CSS styles
    this.addStyles();
  }

  // Handle block destruction - chance to spawn power-up
  private handleBlockDestroyed(data: { x: number, y: number }): void {
    // 30% chance to spawn a power-up when a block is destroyed
    if (Math.random() < 0.3) {
      this.spawnPowerUp(data.x, data.y);
    }
  }

  // Spawn a power-up at the specified position
  private spawnPowerUp(x: number, y: number): void {
    // Select a random power-up type
    const types = Object.values(PowerUpType);
    const type = types[Math.floor(Math.random() * types.length)] as PowerUpType;
    
    // Create power-up
    const id = `powerup-${this.nextId++}`;
    const powerUp: PowerUp = { id, type, x, y };
    
    // Add to tracking
    this.powerUps.set(id, powerUp);
    
    // Create visual element
    this.createPowerUpElement(powerUp);
    
    // Emit event
    eventBus.emit('powerup:spawned', { id, type, x, y });
  }

  // Create visual element for a power-up
  private createPowerUpElement(powerUp: PowerUp): void {
    const element = document.createElement('div');
    element.id = powerUp.id;
    element.className = 'power-up';
    element.classList.add(`power-up-${powerUp.type}`);
    element.style.left = `${powerUp.x * this.cellSize + this.cellSize/2}px`;
    element.style.top = `${powerUp.y * this.cellSize + this.cellSize/2}px`;
    
    // Add icon based on type
    let icon = '';
    switch (powerUp.type) {
      case PowerUpType.BOMB:
        icon = '💣';
        break;
      case PowerUpType.FLAME:
        icon = '🔥';
        break;
      case PowerUpType.SPEED:
        icon = '👟';
        break;
      case PowerUpType.LIFE:
        icon = '❤️';
        break;
    }
    
    element.textContent = icon;
    
    // Add to game container
    this.gameContainer.appendChild(element);
  }

  // Check if a player has collected a power-up
  private checkPowerUpCollection(data: { id: string, x: number, y: number }): void {
    const playerX = Math.floor(data.x);
    const playerY = Math.floor(data.y);
    
    // Check all power-ups
    this.powerUps.forEach((powerUp, id) => {
      if (Math.floor(powerUp.x) === playerX && Math.floor(powerUp.y) === playerY) {
        // Player has collected this power-up
        this.applyPowerUp(powerUp, data.id);
        this.removePowerUp({ powerupId: id });
      }
    });
  }

  // Apply a power-up to a player
  private applyPowerUp(powerUp: PowerUp, playerId: string): void {
    let value = 0;
    
    switch (powerUp.type) {
      case PowerUpType.BOMB:
        // Get current bomb capacity and increase by 1
        eventBus.emit('powerup:applied', { 
          playerId, 
          type: 'bombCapacity', 
          value: 0 // Will be determined by BombManager
        });
        break;
        
      case PowerUpType.FLAME:
        // Get current explosion range and increase by 1
        eventBus.emit('powerup:applied', { 
          playerId, 
          type: 'explosionRange', 
          value: 0 // Will be determined by BombManager
        });
        break;
        
      case PowerUpType.SPEED:
        // Increase speed by 0.5
        eventBus.emit('powerup:applied', { 
          playerId, 
          type: 'speed', 
          value: 0 // Will be determined by Player
        });
        break;
        
      case PowerUpType.LIFE:
        // Add an extra life
        eventBus.emit('powerup:applied', { 
          playerId, 
          type: 'extraLife', 
          value: 1
        });
        break;
    }
    
    // Emit collection event
    eventBus.emit('powerup:collected', {
      playerId,
      type: powerUp.type,
      x: powerUp.x,
      y: powerUp.y
    });
  }

  // Remove a power-up
  private removePowerUp(data: { powerupId: string }): void {
    const powerUp = this.powerUps.get(data.powerupId);
    if (!powerUp) return;
    
    // Remove visual element
    const element = document.getElementById(powerUp.id);
    if (element) {
      element.remove();
    }
    
    // Remove from tracking
    this.powerUps.delete(data.powerupId);
  }

  // Add CSS styles for power-ups
  private addStyles(): void {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .power-up {
        position: absolute;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.8);
        transform: translate(-50%, -50%);
        z-index: 8;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 20px;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        animation: power-up-pulse 1s infinite alternate;
      }
      
      @keyframes power-up-pulse {
        0% { transform: translate(-50%, -50%) scale(0.9); }
        100% { transform: translate(-50%, -50%) scale(1.1); }
      }
      
      .power-up-bomb {
        background-color: rgba(52, 152, 219, 0.7);
      }
      
      .power-up-flame {
        background-color: rgba(231, 76, 60, 0.7);
      }
      
      .power-up-speed {
        background-color: rgba(46, 204, 113, 0.7);
      }
      
      .power-up-life {
        background-color: rgba(155, 89, 182, 0.7);
      }
    `;
    
    document.head.appendChild(styleElement);
  }
}
