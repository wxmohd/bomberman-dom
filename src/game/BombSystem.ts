// Bomb system - integrates all bomb mechanics components
import { BombManager } from './BombManager';
import { BombRenderer } from './BombRenderer';
import { BombController } from './BombController';
import { ExplosionHandler } from './ExplosionHandler';
import { eventBus } from '../../framework/events';

export class BombSystem {
  private bombManager: BombManager;
  private bombRenderer: BombRenderer;
  private bombController: BombController;
  private explosionHandler: ExplosionHandler;
  private lastUpdateTime: number = 0;
  private isRunning: boolean = false;

  constructor(gameContainer: HTMLElement, gridSize: number) {
    // Initialize all components
    this.bombManager = new BombManager();
    this.bombRenderer = new BombRenderer(gameContainer);
    this.bombController = new BombController(this.bombManager);
    this.explosionHandler = new ExplosionHandler(gridSize);
    
    // Add CSS styles for bombs and explosions
    BombRenderer.addStyles();
    
    // Listen for chain reaction events
    eventBus.on('bomb:chainReaction', this.handleChainReaction.bind(this));
  }

  // Start the bomb system
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.update();
  }

  // Stop the bomb system
  public stop(): void {
    this.isRunning = false;
  }

  // Main update loop
  private update(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // Update bomb rendering
    this.bombRenderer.renderBombs(this.bombManager.getAllBombs());
    
    // Continue the loop
    requestAnimationFrame(this.update.bind(this));
  }

  // Initialize a new player
  public initializePlayer(playerId: string): void {
    this.bombController.initializePlayer(playerId);
  }

  // Remove a player
  public removePlayer(playerId: string): void {
    this.bombController.removePlayer(playerId);
  }

  // Handle chain reaction events
  private handleChainReaction(data: { bombId: string, triggeredBy: string, x: number, y: number }): void {
    // Find the bomb at this position
    const allBombs = this.bombManager.getAllBombs();
    const bomb = allBombs.find(b => 
      Math.floor(b.x) === Math.floor(data.x) && 
      Math.floor(b.y) === Math.floor(data.y)
    );
    
    // If found, force it to explode immediately
    if (bomb) {
      bomb.forceExplode();
    }
  }

  // Update the grid for explosion handling
  public updateGrid(grid: any[][]): void {
    this.explosionHandler.updateGrid(grid);
  }

  // Get the bomb manager instance
  public getBombManager(): BombManager {
    return this.bombManager;
  }

  // Check if a position is in an explosion
  public isPositionInExplosion(x: number, y: number): boolean {
    return this.explosionHandler.isInExplosion(x, y);
  }

  // Place a bomb at a specific position (for programmatic bomb placement)
  public placeBomb(playerId: string, x: number, y: number, explosionRange?: number): boolean {
    return this.bombManager.placeBomb({
      ownerId: playerId,
      x,
      y,
      explosionRange: explosionRange || 1 // Default to 1 if not specified
    });
  }
}