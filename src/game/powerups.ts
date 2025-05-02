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
  private _collected = false;
  public createdAt: number;
  
  // Public getter for collected state
  get collected(): boolean {
    return this._collected;
  }
  
  // Check if power-up has a visible DOM element
  hasVisibleElement(): boolean {
    return this.element !== null && this.element.parentNode !== null;
  }
  
  constructor(
    public x: number,
    public y: number,
    public type: PowerUpType
  ) {
    this.createdAt = Date.now();
  }
  
  // Get icon image path for power-up type
  private getIcon(): string {
    switch (this.type) {
      case PowerUpType.BOMB:
        return 'img/Bomb.png';
      case PowerUpType.FLAME:
        return 'img/Fire.png';
      case PowerUpType.SPEED:
        return 'img/Speed.png';
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
    
    // Create a direct DOM element instead of using h function
    this.element = document.createElement('div');
    this.element.className = `powerup powerup-${this.type}`;
    
    // Set the data-type attribute directly
    this.element.setAttribute('data-type', this.type);
    
    const color = this.getColor();
    const iconPath = this.getIcon();
    
    // Set styles directly
    this.element.style.position = 'absolute';
    this.element.style.left = `${this.x * TILE_SIZE}px`; // Use full tile position
    this.element.style.top = `${this.y * TILE_SIZE}px`; // Use full tile position
    this.element.style.width = `${TILE_SIZE}px`; // Use full tile size
    this.element.style.height = `${TILE_SIZE}px`; // Use full tile size
    this.element.style.backgroundColor = 'transparent'; // Transparent background to show image
    this.element.style.zIndex = '50';
    this.element.style.boxShadow = `0 0 10px ${color}, 0 0 15px ${color}`;
    this.element.style.display = 'flex';
    this.element.style.justifyContent = 'center';
    this.element.style.alignItems = 'center';
    this.element.style.pointerEvents = 'none';
    
    // Create and add image element
    const imgElement = document.createElement('img');
    imgElement.src = iconPath;
    imgElement.alt = this.type;
    imgElement.style.width = '80%';
    imgElement.style.height = '80%';
    imgElement.style.objectFit = 'contain';
    imgElement.style.display = 'block';
    imgElement.style.margin = 'auto';
    imgElement.onerror = () => {
      console.error(`Failed to load image: ${iconPath}`);
      // Fallback to emoji if image fails to load
      this.element!.textContent = this.type === PowerUpType.BOMB ? '💣' : 
                                 this.type === PowerUpType.FLAME ? '🔥' : 
                                 this.type === PowerUpType.SPEED ? '⚡' : '?';
    };
    this.element.appendChild(imgElement);
    
    // Log image path for debugging
    console.log(`Loading powerup image: ${iconPath}`);
    
    // Add spawn animation
    this.element.style.animation = 'powerup-spawn 0.3s ease-out forwards, powerup-pulse 1s infinite alternate 0.3s';
    
    // Add to container
    container.appendChild(this.element);
    
    // Log for debugging
    console.log(`Rendered power-up at (${this.x}, ${this.y}) with type ${this.type}`);
  }
  
  // Collect the power-up
  collect(playerId: string): void {
    if (this._collected) return;
    
    this._collected = true;
    
    // Add collection animation
    if (this.element) {
      // Change animation
      this.element.style.animation = 'powerup-collect 0.5s forwards';
      
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
    
    // Note: We no longer emit powerup:collected event here to avoid duplicate events
    // The event is already emitted in the player.ts file when the player collects the powerup
    // This prevents the counter from increasing by 2 instead of 1
  }
  
  // Check if power-up is at specific coordinates
  isAt(x: number, y: number): boolean {
    return Math.floor(this.x) === Math.floor(x) && Math.floor(this.y) === Math.floor(y);
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
  // 3% chance to spawn a power-up (making powerups very rare and special)
  const POWERUP_CHANCE = 0.05;
  
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
  // This function is now deprecated - we use visual verification instead
  // We'll keep it for backward compatibility but mark it in the logs
  console.log(`WARNING: Using deprecated applyPowerUp function. Use visual verification instead.`);
  
  // We no longer emit events from here - the Player.checkForVisiblePowerUp method handles this
}

// Check for power-up at position and collect if found
export function checkAndCollectPowerUp(x: number, y: number, playerId: string): boolean {
  // Make sure we have active power-ups to check
  if (activePowerUps.length === 0) {
    return false;
  }

  // Find a power-up at this position
  const powerupIndex = activePowerUps.findIndex(p => p.isAt(x, y));
  
  if (powerupIndex !== -1) {
    const powerup = activePowerUps[powerupIndex];
    
    // Extra checks to ensure this is a valid power-up:
    // 1. Must exist
    // 2. Must not be already collected
    // 3. Must have a DOM element (visible)
    // 4. Must be older than 500ms (to avoid collecting during spawn animation)
    if (!powerup || 
        powerup.collected || 
        !powerup.hasVisibleElement() || 
        Date.now() - powerup.createdAt < 500) {
      return false;
    }
    
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
  activePowerUps.forEach(powerUp => powerUp.render(container));
}

// Initialize powerup system with websocket support
export function initPowerupSystem(): void {
  // Setup event listeners for websocket events
  setupPowerupEventListeners();
  
  console.log('Powerup system initialized with websocket support');
}

// Setup event listeners for powerup websocket events
function setupPowerupEventListeners(): void {
  // Listen for remote powerup spawned events
  eventBus.on('remote:powerup:spawned', (data: { x: number, y: number, type: string }) => {
    console.log(`Remote powerup spawned at (${data.x}, ${data.y}) with type ${data.type}`);
    
    // Convert server powerup type to local enum
    let powerupType: PowerUpType;
    switch (data.type) {
      case 'BOMB':
        powerupType = PowerUpType.BOMB;
        break;
      case 'FLAME':
        powerupType = PowerUpType.FLAME;
        break;
      case 'SPEED':
        powerupType = PowerUpType.SPEED;
        break;
      default:
        powerupType = PowerUpType.BOMB; // Default fallback
    }
    
    // Check if there's already a powerup at this position
    const existingPowerup = activePowerUps.find(p => p.isAt(data.x, data.y));
    if (existingPowerup) return;
    
    // Create and add the powerup
    const powerup = new PowerUp(data.x, data.y, powerupType);
    activePowerUps.push(powerup);
  });
  
  // Listen for remote powerup collected events
  eventBus.on('remote:powerup:collected', (data: { x: number, y: number, playerId: string }) => {
    console.log(`Remote powerup collected at (${data.x}, ${data.y}) by player ${data.playerId}`);
    
    // Find the powerup at this position
    const powerupIndex = activePowerUps.findIndex(p => p.isAt(data.x, data.y));
    if (powerupIndex !== -1) {
      const powerup = activePowerUps[powerupIndex];
      
      // Collect the powerup
      powerup.collect(data.playerId);
      
      // Remove from active powerups
      activePowerUps.splice(powerupIndex, 1);
    }
  });
}
