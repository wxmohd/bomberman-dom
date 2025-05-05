// Bomb visual representation and rendering
import { h, render, VNode } from '../../framework/dom';
import { Bomb } from '../entities/bomb';
import { eventBus } from '../../framework/events';

export class BombRenderer {
  private explosionElements: Map<string, { 
    element: HTMLElement, 
    timestamp: number 
  }> = new Map();
  private explosionDuration: number = 1000; // Explosion effect lasts 1 second

  constructor(private gameContainer: HTMLElement) {
    // Listen for bomb explosion events
    eventBus.on('bomb:explode', this.handleBombExplosion.bind(this));

    // Set up animation loop for bomb countdown visualization
    this.startAnimationLoop();
  }

  // Render all bombs on the map
  public renderBombs(bombs: Bomb[]): void {
    // Remove any old bomb elements that no longer exist
    this.removeOldBombElements(bombs);
    
    // Render each bomb
    bombs.forEach(bomb => {
      this.renderBomb(bomb);
    });
  }

  // Render a single bomb
  private renderBomb(bomb: Bomb): void {
    const bombId = `bomb-${bomb.ownerId}-${bomb.x}-${bomb.y}`;
    let bombElement = document.getElementById(bombId);
    
    // If the bomb element doesn't exist yet, create it
    if (!bombElement && !bomb.hasExploded()) {
      // Create the bomb element using the framework's h function
      const bombVNode = h('div', {
        id: bombId,
        class: 'bomb',
        style: `
          left: ${bomb.x * 40}px;
          top: ${bomb.y * 40}px;
        `
      }, [
        // Create the timer element
        h('div', {
          class: 'bomb-timer'
        }, [])
      ]);
      
      // Render the bomb element using the framework's render function
      const renderedBomb = render(bombVNode) as HTMLElement;
      
      // Add to the container
      this.gameContainer.appendChild(renderedBomb);
    }
    
    // Update bomb timer visualization if bomb still exists
    if (bombElement && !bomb.hasExploded()) {
      const timerElement = bombElement.querySelector('.bomb-timer') as HTMLElement;
      if (timerElement) {
        const remainingTime = bomb.getRemainingTime();
        const timerPercentage = (remainingTime / 3000) * 100;
        timerElement.style.width = `${timerPercentage}%`;
      }
    }
  }

  // Remove bomb elements that no longer exist in the game state
  private removeOldBombElements(currentBombs: Bomb[]): void {
    const bombElements = this.gameContainer.querySelectorAll('.bomb');
    
    bombElements.forEach(element => {
      const bombId = element.id;
      const [_, ownerId, xStr, yStr] = bombId.split('-');
      const x = parseInt(xStr);
      const y = parseInt(yStr);
      
      // Check if this bomb still exists in the current bombs list
      const bombExists = currentBombs.some(bomb => 
        bomb.ownerId === ownerId && 
        bomb.x === x && 
        bomb.y === y &&
        !bomb.hasExploded()
      );
      
      if (!bombExists) {
        element.remove();
      }
    });
  }

  // Handle bomb explosion event
  private handleBombExplosion(data: { 
    ownerId: string, 
    origin: { x: number, y: number }, 
    coordinates: { x: number, y: number }[] 
  }): void {
    // Remove the bomb element
    const bombId = `bomb-${data.ownerId}-${data.origin.x}-${data.origin.y}`;
    const bombElement = document.getElementById(bombId);
    if (bombElement) {
      bombElement.remove();
    }
    
    // Create explosion elements for each affected coordinate
    data.coordinates.forEach(coord => {
      this.createExplosionElement(coord.x, coord.y);
    });
  }

  // Create an explosion element at the specified coordinates
  private createExplosionElement(x: number, y: number): void {
    const explosionId = `explosion-${x}-${y}`;
    
    // Check if there's already an explosion at this location
    if (this.explosionElements.has(explosionId)) {
      // Reset the timestamp to extend the explosion duration
      this.explosionElements.get(explosionId)!.timestamp = Date.now();
      return;
    }
    
    // Create a new explosion element using the framework's h function
    const explosionVNode = h('div', {
      id: explosionId,
      class: 'explosion',
      style: `
        left: ${x * 40}px;
        top: ${y * 40}px;
      `
    }, []);
    
    // Render the explosion element using the framework's render function
    const renderedExplosion = render(explosionVNode) as HTMLElement;
    
    // Add to the container
    this.gameContainer.appendChild(renderedExplosion);
    
    // Add to tracking map with current timestamp
    this.explosionElements.set(explosionId, {
      element: renderedExplosion,
      timestamp: Date.now()
    });
    
    // Emit event for explosion at this coordinate
    eventBus.emit('explosion:created', { x, y });
  }

  // Start animation loop for updating bomb countdown visuals and removing expired explosions
  private startAnimationLoop(): void {
    const updateAnimations = () => {
      // Remove expired explosion elements
      const currentTime = Date.now();
      this.explosionElements.forEach((data, id) => {
        if (currentTime - data.timestamp > this.explosionDuration) {
          data.element.remove();
          this.explosionElements.delete(id);
          
          // Extract coordinates from the ID
          const [_, xStr, yStr] = id.split('-');
          const x = parseInt(xStr);
          const y = parseInt(yStr);
          
          // Emit event for explosion removal
          eventBus.emit('explosion:removed', { x, y });
        }
      });
      
      // Continue the animation loop
      requestAnimationFrame(updateAnimations);
    };
    
    // Start the animation loop
    requestAnimationFrame(updateAnimations);
  }

  // Add CSS styles for bombs and explosions
  public static addStyles(): void {
    // Create style element using the framework's h function
    const styleVNode = h('style', {}, [
      `
      .bomb {
        position: absolute;
        width: 30px;
        height: 30px;
        background-color: #333;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 10;
      }
      
      .bomb-pulse {
        animation: pulse 0.5s infinite alternate;
      }
      
      @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(0.9); }
        100% { transform: translate(-50%, -50%) scale(1.1); }
      }
      
      .bomb-timer {
        position: absolute;
        bottom: -5px;
        left: 0;
        height: 3px;
        background-color: red;
        transition: width 0.1s linear;
      }
      
      .explosion {
        position: absolute;
        width: 40px;
        height: 40px;
        background-color: rgba(255, 100, 0, 0.7);
        border-radius: 5px;
        transform: translate(-50%, -50%);
        z-index: 5;
        animation: explode 1s forwards;
      }
      
      @keyframes explode {
        0% { 
          opacity: 1;
          transform: translate(-50%, -50%) scale(0.5);
          background-color: rgba(255, 200, 0, 0.9);
        }
        50% { 
          opacity: 0.8;
          transform: translate(-50%, -50%) scale(1.2);
          background-color: rgba(255, 100, 0, 0.8);
        }
        100% { 
          opacity: 0;
          transform: translate(-50%, -50%) scale(1);
          background-color: rgba(255, 0, 0, 0.5);
        }
      }
      `
    ]);
    
    // Render the style element using the framework's render function
    const renderedStyle = render(styleVNode) as HTMLElement;
    
    // Add to document head
    document.head.appendChild(renderedStyle);
  }
}
