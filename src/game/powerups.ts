// Power-up generation and effects
import { h, render } from '../../framework/dom';
import { TILE_SIZE } from './constants';
import { eventBus } from '../../framework/events';
import { CellType } from './map';

// Add CSS styles for power-up animations
const addPowerUpStyles = () => {
  if (document.getElementById('powerup-styles')) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'powerup-styles';
  styleEl.textContent = `
    @keyframes powerup-pulse {
      0% { transform: scale(1); box-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
      100% { transform: scale(1.1); box-shadow: 0 0 10px rgba(255, 255, 255, 0.8); }
    }
    
    @keyframes powerup-collect {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.8; }
      100% { transform: scale(0); opacity: 0; }
    }
    
    @keyframes powerup-spawn {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.2); opacity: 0.9; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    .powerup {
      transition: all 0.2s ease;
    }
    
    .powerup:hover {
      filter: brightness(1.2);
    }
    
    .powerup-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      color: white;
      font-weight: bold;
    }
  `;
  
  document.head.appendChild(styleEl);
};

// Initialize styles
addPowerUpStyles();

// Power-up types
export enum PowerUpType {
  BOMB = 'bomb',   // Increases bomb count
  FLAME = 'flame', // Increases explosion range
  SPEED = 'speed'  // Increases movement speed
}

// Power-up class
export class PowerUp {
  private element: HTMLElement | null = null;
  private collected = false;
  private createdAt: number;
  
  constructor(
    public x: number,
    public y: number,
    public type: PowerUpType
  ) {
    this.createdAt = Date.now();
  }
  
  // Get icon for power-up type
  private getIcon(): string {
    switch (this.type) {
      case PowerUpType.BOMB:
        return '💣';
      case PowerUpType.FLAME:
        return '🔥';
      case PowerUpType.SPEED:
        return '⚡';
      default:
        return '?';
    }
  }
  
  // Get color for power-up type
  private getColor(): string {
    switch (this.type) {
      case PowerUpType.BOMB:
        return '#ff3333'; // Bright red
      case PowerUpType.FLAME:
        return '#ff9500'; // Bright orange
      case PowerUpType.SPEED:
        return '#00aaff'; // Bright blue
      default:
        return '#ffffff';
    }
  }
  
  // Render the power-up to the DOM
  render(container: HTMLElement): void {
    if (this.collected) return;
    
    // Remove existing element if it exists
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    const color = this.getColor();
    const icon = this.getIcon();
    
    // Create power-up element with icon
    const powerupElement = h('div', {
      class: `powerup powerup-${this.type}`,
      style: `
        position: absolute;
        left: ${this.x * TILE_SIZE + TILE_SIZE / 4}px;
        top: ${this.y * TILE_SIZE + TILE_SIZE / 4}px;
        width: ${TILE_SIZE / 2}px;
        height: ${TILE_SIZE / 2}px;
        background-color: ${color};
        border-radius: 50%;
        z-index: 2;
        box-shadow: 0 0 8px ${color}80;
        animation: powerup-pulse 1s infinite alternate;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: ${TILE_SIZE / 4}px;
      `
    }, [icon]);
    
    this.element = render(powerupElement) as HTMLElement;
    
    // Add spawn animation
    this.element.style.animation = 'powerup-spawn 0.3s ease-out forwards, powerup-pulse 1s infinite alternate 0.3s';
    
    container.appendChild(this.element);
  }
  
  // Collect the power-up
  collect(playerId: string): void {
    if (this.collected) return;
    
    this.collected = true;
    
    // Add collection animation
    if (this.element) {
      // Change animation
      this.element.style.animation = 'powerup-collect 0.5s forwards';
      
      // Create a floating notification
      const notification = document.createElement('div');
      notification.className = 'powerup-notification';
      notification.textContent = `${this.getIcon()} +1`;
      notification.style.cssText = `
        position: absolute;
        left: ${this.x * TILE_SIZE + TILE_SIZE / 2}px;
        top: ${this.y * TILE_SIZE}px;
        color: ${this.getColor()};
        font-weight: bold;
        font-size: 16px;
        text-shadow: 0 0 3px white;
        z-index: 10;
        pointer-events: none;
        animation: float-up 1.5s forwards;
      `;
      
      // Add float-up animation if it doesn't exist
      if (!document.getElementById('float-up-animation')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'float-up-animation';
        styleEl.textContent = `
          @keyframes float-up {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-50px); opacity: 0; }
          }
        `;
        document.head.appendChild(styleEl);
      }
      
      // Add notification to the DOM
      document.body.appendChild(notification);
      
      // Remove notification after animation
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 1500);
      
      // Remove element after animation
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
          this.element = null;
        }
      }, 500);
      
      // Play collection sound (to be implemented by audio team)
      eventBus.emit('sound:play', { sound: 'powerup-collect' });
    }
    
    // Emit power-up collected event with details
    eventBus.emit('powerup:collected', { 
      playerId, 
      type: this.type,
      position: { x: this.x, y: this.y }
    });
  }
  
  // Check if power-up is at specific coordinates
  isAt(x: number, y: number): boolean {
    return this.x === x && this.y === y;
  }
  
  // Remove the power-up from the DOM
  remove(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }
}

// Store active power-ups
let activePowerUps: PowerUp[] = [];

// Get all active power-ups
export function getActivePowerUps(): PowerUp[] {
  return activePowerUps;
}

// Clear all power-ups (for map reset)
export function clearPowerUps(): void {
  activePowerUps.forEach(powerup => powerup.remove());
  activePowerUps = [];
}

// Spawn a power-up with a chance
export function maybeSpawnPowerup(x: number, y: number): PowerUp | null {
  // 30% chance to spawn a power-up
  const POWERUP_CHANCE = 0.3;
  
  // Check if there's already a power-up at this position
  const existingPowerup = activePowerUps.find(p => p.isAt(x, y));
  if (existingPowerup) return null;
  
  if (Math.random() < POWERUP_CHANCE) {
    // Weighted probability for power-up types
    // Bomb: 40%, Flame: 30%, Speed: 30%
    const typeRoll = Math.random();
    let selectedType: PowerUpType;
    
    if (typeRoll < 0.4) {
      selectedType = PowerUpType.BOMB;
    } else if (typeRoll < 0.7) {
      selectedType = PowerUpType.FLAME;
    } else {
      selectedType = PowerUpType.SPEED;
    }
    
    // Create power-up
    const powerup = new PowerUp(x, y, selectedType);
    activePowerUps.push(powerup);
    
    // Log power-up spawn
    console.log(`Spawned ${selectedType} power-up at (${x}, ${y})`);
    
    // Emit power-up spawned event with more details
    eventBus.emit('powerup:spawned', { 
      x, 
      y, 
      type: selectedType,
      timestamp: Date.now()
    });
    
    return powerup;
  }
  
  return null;
}

// Apply power-up effect to player
export function applyPowerUp(playerId: string, type: PowerUpType): void {
  // Emit power-up collected event (will be handled by player.ts)
  eventBus.emit('powerup:collected', { playerId, type });
}

// Check for power-up at position and collect if found
export function checkAndCollectPowerUp(x: number, y: number, playerId: string): boolean {
  const powerupIndex = activePowerUps.findIndex(p => p.isAt(x, y));
  
  if (powerupIndex !== -1) {
    const powerup = activePowerUps[powerupIndex];
    
    // Collect the power-up and pass the player ID
    powerup.collect(playerId);
    
    // Apply power-up effect
    applyPowerUp(playerId, powerup.type);
    
    // Remove from active power-ups
    activePowerUps.splice(powerupIndex, 1);
    
    console.log(`Player ${playerId} collected a ${powerup.type} power-up at (${x}, ${y})`);
    
    return true;
  }
  
  return false;
}

// Render all active power-ups
export function renderPowerUps(container: HTMLElement): void {
  activePowerUps.forEach(powerup => powerup.render(container));
}
