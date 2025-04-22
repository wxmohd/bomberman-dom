// Power-up generation and effects
import { h, render } from '../../framework/dom';
import { TILE_SIZE } from './constants';
import { eventBus } from '../../framework/events';
import { CellType } from './map';

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
  
  constructor(
    public x: number,
    public y: number,
    public type: PowerUpType
  ) {}
  
  // Render the power-up to the DOM
  render(container: HTMLElement): void {
    if (this.collected) return;
    
    // Determine color based on type
    let color;
    switch (this.type) {
      case PowerUpType.BOMB:
        color = '#ff0000'; // Red
        break;
      case PowerUpType.FLAME:
        color = '#ff9900'; // Orange
        break;
      case PowerUpType.SPEED:
        color = '#0099ff'; // Blue
        break;
    }
    
    // Create power-up element
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
        animation: powerup-pulse 1s infinite alternate;
      `
    }, []);
    
    this.element = render(powerupElement) as HTMLElement;
    container.appendChild(this.element);
  }
  
  // Collect the power-up
  collect(): void {
    if (this.collected) return;
    
    this.collected = true;
    
    // Add collection animation
    if (this.element) {
      this.element.style.animation = 'powerup-collect 0.3s forwards';
      
      // Remove element after animation
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
          this.element = null;
        }
      }, 300);
    }
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
  
  if (Math.random() < POWERUP_CHANCE) {
    // Determine power-up type
    const types = [PowerUpType.BOMB, PowerUpType.FLAME, PowerUpType.SPEED];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    // Create power-up
    const powerup = new PowerUp(x, y, randomType);
    activePowerUps.push(powerup);
    
    // Emit power-up spawned event
    eventBus.emit('powerup:spawned', { x, y, type: randomType });
    
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
    powerup.collect();
    
    // Apply power-up effect
    applyPowerUp(playerId, powerup.type);
    
    // Remove from active power-ups
    activePowerUps.splice(powerupIndex, 1);
    
    return true;
  }
  
  return false;
}

// Render all active power-ups
export function renderPowerUps(container: HTMLElement): void {
  activePowerUps.forEach(powerup => powerup.render(container));
}
