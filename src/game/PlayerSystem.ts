// Player system - integrates all player-related components
import { Player } from '../entities/player';
import { PlayerController } from './PlayerController';
import { PlayerRenderer } from './PlayerRenderer';
import { BombSystem } from './BombSystem';
import { eventBus } from '../../framework/events';

export class PlayerSystem {
  private players: Map<string, Player> = new Map();
  private playerController: PlayerController;
  private playerRenderer: PlayerRenderer;
  private nextColorIndex: number = 0;
  
  constructor(
    gameContainer: HTMLElement, 
    bombSystem: BombSystem, 
    gridSize: number, 
    cellSize: number = 40
  ) {
    // Initialize components
    this.playerController = new PlayerController(bombSystem, gridSize);
    this.playerRenderer = new PlayerRenderer(gameContainer, cellSize);
    
    // Listen for player elimination events
    eventBus.on('player:eliminated', this.handlePlayerElimination.bind(this));
  }

  // Add a player to the system
  public addPlayer(id: string, nickname: string, startX: number, startY: number): Player {
    // Create player entity
    const player = new Player(id, nickname, startX, startY);
    
    // Add to tracking
    this.players.set(id, player);
    
    // Add to controller and renderer
    this.playerController.addPlayer(player);
    this.playerRenderer.addPlayer(player, this.nextColorIndex++);
    
    // Emit player added event
    eventBus.emit('player:added', {
      id,
      nickname,
      position: { x: startX, y: startY }
    });
    
    return player;
  }

  // Remove a player from the system
  public removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    // Remove from tracking
    this.players.delete(playerId);
    
    // Remove from controller and renderer
    this.playerController.removePlayer(playerId);
    this.playerRenderer.removePlayer(playerId);
    
    // Emit player removed event
    eventBus.emit('player:removed', { id: playerId });
  }

  // Handle player elimination
  private handlePlayerElimination(data: { id: string, eliminatedBy: string }): void {
    // Remove player after a delay (to allow for animation)
    setTimeout(() => {
      this.removePlayer(data.id);
    }, 1000);
  }

  // Get all players
  public getPlayers(): Map<string, Player> {
    return this.players;
  }

  // Get a specific player
  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  // Get number of remaining players
  public getRemainingPlayerCount(): number {
    return this.players.size;
  }

  // Check if a specific player is still in the game
  public isPlayerActive(playerId: string): boolean {
    return this.players.has(playerId);
  }
}