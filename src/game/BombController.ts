// Bomb controller - handles player input for bomb placement
import { BombManager } from './BombManager';
import { eventBus } from '../../framework/events';

interface PlayerPosition {
  id: string;
  x: number;
  y: number;
}

export class BombController {
  private playerPositions: Map<string, { x: number, y: number }> = new Map();
  private keyStates: Map<string, boolean> = new Map();
  private bombCooldowns: Map<string, number> = new Map();
  private cooldownTime: number = 500; // 500ms cooldown between bomb placements
  
  constructor(private bombManager: BombManager) {
    // Listen for player movement events to track positions
    eventBus.on('player:moved', this.updatePlayerPosition.bind(this));
    
    // Also listen for custom DOM events for testing
    window.addEventListener('player:moved', this.updatePlayerPosition.bind(this));
    
    // Set up keyboard event listeners
    this.setupKeyboardListeners();
  }

  // Update player position when they move
  private updatePlayerPosition(data: PlayerPosition | CustomEvent): void {
    // Handle both direct data and CustomEvent
    const playerData = (data as any).detail ? (data as any).detail : data;
    this.playerPositions.set(playerData.id, { x: playerData.x, y: playerData.y });
  }

  // Set up keyboard event listeners for bomb placement
  private setupKeyboardListeners(): void {
    // Map of player IDs to their bomb placement keys
    const playerBombKeys: Record<string, string> = {
      'player1': ' ',     // Space bar for player 1
      'player2': 'Enter', // Enter for player 2
      'player3': 'r',     // R key for player 3
      'player4': '0'      // 0 key for player 4 (numpad)
    };
    
    // Handle keydown events
    window.addEventListener('keydown', (event) => {
      // Check if this key is a bomb placement key for any player
      Object.entries(playerBombKeys).forEach(([playerId, key]) => {
        if (event.key === key) {
          this.keyStates.set(playerId, true);
          this.tryPlaceBomb(playerId);
        }
      });
    });
    
    // Handle keyup events
    window.addEventListener('keyup', (event) => {
      // Check if this key is a bomb placement key for any player
      Object.entries(playerBombKeys).forEach(([playerId, key]) => {
        if (event.key === key) {
          this.keyStates.set(playerId, false);
        }
      });
    });
  }

  // Try to place a bomb for a player
  private tryPlaceBomb(playerId: string): void {
    // Check if player is on cooldown
    const lastBombTime = this.bombCooldowns.get(playerId) || 0;
    const currentTime = Date.now();
    
    if (currentTime - lastBombTime < this.cooldownTime) {
      return; // Still on cooldown
    }
    
    // Get player position
    const position = this.playerPositions.get(playerId);
    if (!position) return;
    
    // Round position to grid coordinates
    const gridX = Math.floor(position.x);
    const gridY = Math.floor(position.y);
    
    // Check if there's already a bomb at this position
    const allBombs = this.bombManager.getAllBombs();
    const bombAtPosition = allBombs.some(bomb => 
      Math.floor(bomb.x) === gridX && 
      Math.floor(bomb.y) === gridY
    );
    
    if (bombAtPosition) return; // Can't place bomb where one already exists
    
    // Try to place the bomb
    const success = this.bombManager.placeBomb({
      ownerId: playerId,
      x: gridX,
      y: gridY
    });
    
    if (success) {
      // Set cooldown for this player
      this.bombCooldowns.set(playerId, currentTime);
      
      // Debug log player position
      console.log('Player position for bomb throw:', position);
      console.log('Bomb grid position:', { gridX, gridY });
      
      // Emit bomb:thrown event with player and bomb positions
      const eventData = {
        ownerId: playerId,
        playerX: position.x,
        playerY: position.y,
        bombX: gridX,
        bombY: gridY
      };
      
      console.log('Emitting bomb:thrown event with data:', eventData);
      eventBus.emit('bomb:thrown', eventData);
      
      // Also emit a DOM event for testing
      const customEvent = new CustomEvent('bomb:thrown', { detail: eventData });
      window.dispatchEvent(customEvent);
      
      // Play bomb placement sound
      this.playBombPlacementSound();
    }
  }

  // Play sound effect for bomb placement
  private playBombPlacementSound(): void {
    // Create a simple audio effect for bomb placement
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  }

  // Initialize a new player
  public initializePlayer(playerId: string): void {
    this.bombManager.initializePlayer(playerId);
  }

  // Remove a player
  public removePlayer(playerId: string): void {
    this.bombManager.removePlayer(playerId);
    this.playerPositions.delete(playerId);
    this.keyStates.delete(playerId);
    this.bombCooldowns.delete(playerId);
  }
}
