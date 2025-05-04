
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
    // Get the player that was eliminated
    const player = this.players.get(data.id);
    
    // Check if only one player remains (game over condition) after this elimination
    // We do this check before removing the player from our map
    const willHaveOnePlayerRemaining = this.getRemainingPlayerCount() === 2;
    const willHaveNoPlayersRemaining = this.getRemainingPlayerCount() === 1;
    
    // Store the ID of the player who caused the elimination (for winner determination)
    const eliminatedBy = data.eliminatedBy;
    
    // Remove player immediately - the visual element is already removed in the Player class
    this.removePlayer(data.id);
    
    // Check game over conditions
    if (willHaveOnePlayerRemaining) {
      // Get the last remaining player (winner)
      const players = Array.from(this.players.values());
      if (players.length === 1) {
        const winner = players[0];
        console.log(`Game over! ${winner.nickname} is the last player standing with ${winner.getLives()} lives remaining!`);
        
        // Emit game:ended event with winner information
        eventBus.emit('game:ended', {
          winner: {
            id: winner.id,
            nickname: winner.nickname,
            lives: winner.getLives()
          },
          lastPlayerStanding: true
        });
      }
    } else if (willHaveNoPlayersRemaining) {
      // Check if the eliminator is still in the game state (might have been removed already)
      // This handles the case where the last two players eliminate each other
      if (eliminatedBy && eliminatedBy !== data.id) {
        // Try to find the eliminator in the game state (they might be a player who has lost lives but is still alive)
        const eliminator = this.getPlayer(eliminatedBy);
        if (eliminator) {
          console.log(`Game over! ${eliminator.nickname} won by eliminating the last opponent!`);
          eventBus.emit('game:ended', {
            winner: {
              id: eliminator.id,
              nickname: eliminator.nickname,
              lives: eliminator.getLives()
            },
            lastPlayerStanding: true
          });
          return;
        }
      }
      
      // If we get here, it's a true draw (no winner)
      console.log('Game over! No players remaining.');
      eventBus.emit('game:ended', {});
    }
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