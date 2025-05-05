// Player renderer - handles visual representation of players
import { Player, Direction } from '../entities/player';
import { eventBus } from '../../framework/events';
import { h, render } from '../../framework/dom';

interface PlayerElement {
  container: HTMLElement;
  sprite: HTMLElement;
  healthBar: HTMLElement;
  nameTag: HTMLElement;
}

export class PlayerRenderer {
  private playerElements: Map<string, PlayerElement> = new Map();
  private cellSize: number;
  private playerColors: string[] = [
    '#3498db', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#f39c12'  // Orange
  ];
  
  constructor(private gameContainer: HTMLElement, cellSize: number = 40) {
    this.cellSize = cellSize;
    
    // Listen for player movement events
    eventBus.on('player:moved', this.updatePlayerPosition.bind(this));
    
    // Listen for player damage events
    eventBus.on('player:damaged', this.updatePlayerHealth.bind(this));
    
    // Listen for player invulnerability events
    eventBus.on('player:invulnerabilityStart', this.startInvulnerabilityEffect.bind(this));
    eventBus.on('player:invulnerabilityEnd', this.endInvulnerabilityEffect.bind(this));
    
    // Listen for player elimination events
    eventBus.on('player:eliminated', this.handlePlayerElimination.bind(this));
    
    // Add CSS styles
    this.addStyles();
  }

  // Add a player to be rendered
  public addPlayer(player: Player, colorIndex: number = 0): void {
    const position = player.getPosition();
    const color = this.playerColors[colorIndex % this.playerColors.length];
    
    // Create health indicators using the framework's h function
    const heartVNodes: any[] = [];
    for (let i = 0; i < player.getLives(); i++) {
      heartVNodes.push(h('div', { class: 'player-heart' }, []));
    }
    
    // Create health bar using the framework's h function
    const healthBarVNode = h('div', { class: 'player-health' }, heartVNodes);
    
    // Create player sprite using the framework's h function
    const spriteVNode = h('div', { 
      class: 'player-sprite',
      style: `background-color: ${color};`
    }, []);
    
    // Create name tag using the framework's h function
    const nameTagVNode = h('div', { class: 'player-name' }, [player.nickname]);
    
    // Create player container using the framework's h function
    const containerVNode = h('div', {
      class: 'player-container',
      style: `
        left: ${position.x * this.cellSize}px;
        top: ${position.y * this.cellSize}px;
      `
    }, [spriteVNode, healthBarVNode, nameTagVNode]);
    
    // Render the player container
    const container = render(containerVNode) as HTMLElement;
    
    // Add to game container
    this.gameContainer.appendChild(container);
    
    // Find the rendered elements
    const sprite = container.querySelector('.player-sprite') as HTMLElement;
    const healthBar = container.querySelector('.player-health') as HTMLElement;
    const nameTag = container.querySelector('.player-name') as HTMLElement;
    
    // Store reference
    this.playerElements.set(player.id, {
      container,
      sprite,
      healthBar,
      nameTag
    });
  }

  // Remove a player
  public removePlayer(playerId: string): void {
    const element = this.playerElements.get(playerId);
    if (element) {
      element.container.remove();
      this.playerElements.delete(playerId);
    }
  }

  // Update player position
  private updatePlayerPosition(data: any): void {
    const element = this.playerElements.get(data.id);
    if (!element) return;
    
    // Update position
    element.container.style.left = `${data.x * this.cellSize}px`;
    element.container.style.top = `${data.y * this.cellSize}px`;
  }

  // Update player health
  private updatePlayerHealth(data: any): void {
    const element = this.playerElements.get(data.id);
    if (!element) return;
    
    // Update health bar
    element.healthBar.innerHTML = '';
    
    // Create health indicators
    for (let i = 0; i < data.livesRemaining; i++) {
      const heart = document.createElement('div');
      heart.className = 'player-heart';
      element.healthBar.appendChild(heart);
    }
    
    // Add damage effect
    element.sprite.classList.add('player-damaged');
    setTimeout(() => {
      element.sprite.classList.remove('player-damaged');
    }, 300);
  }

  // Start invulnerability effect
  private startInvulnerabilityEffect(data: any): void {
    const element = this.playerElements.get(data.id);
    if (!element) return;
    
    element.sprite.classList.add('player-invulnerable');
  }

  // End invulnerability effect
  private endInvulnerabilityEffect(data: any): void {
    const element = this.playerElements.get(data.id);
    if (!element) return;
    
    element.sprite.classList.remove('player-invulnerable');
  }

  // Handle player elimination
  private handlePlayerElimination(data: any): void {
    const element = this.playerElements.get(data.id);
    if (!element) return;
    
    // Add elimination effect
    element.container.classList.add('player-eliminated');
    
    // Remove player after animation
    setTimeout(() => {
      this.removePlayer(data.id);
    }, 1000);
  }

  // Add CSS styles for player rendering
  private addStyles(): void {
    // Create style element using the framework's h function
    const styleVNode = h('style', {}, [
      `
      .player-container {
        position: absolute;
        width: ${this.cellSize}px;
        height: ${this.cellSize}px;
        transform: translate(-50%, -50%);
        z-index: 20;
        transition: left 0.1s, top 0.1s;
        pointer-events: none;
      }
      
      .player-sprite {
        position: absolute;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
      }
      
      .player-health {
        position: absolute;
        display: flex;
        justify-content: center;
        width: 100%;
        top: -15px;
      }
      
      .player-heart {
        width: 8px;
        height: 8px;
        background-color: #e74c3c;
        border-radius: 50%;
        margin: 0 2px;
      }
      
      .player-name {
        position: absolute;
        bottom: -20px;
        width: 100%;
        text-align: center;
        font-size: 12px;
        color: #333;
        font-weight: bold;
        text-shadow: 0 0 2px white;
      }
      
      .player-damaged {
        animation: damage-flash 0.3s;
      }
      
      @keyframes damage-flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      
      .player-invulnerable {
        animation: invulnerable-flash 0.5s infinite alternate;
      }
      
      @keyframes invulnerable-flash {
        0% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      .player-eliminated {
        animation: eliminated 1s forwards;
      }
      
      @keyframes eliminated {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.5; }
        100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
      }
      `
    ]);
    
    // Render and add style to document head
    const styleElement = render(styleVNode) as HTMLElement;
    document.head.appendChild(styleElement);
  }
}
