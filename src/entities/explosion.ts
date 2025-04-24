// Explosion entity logic
import { eventBus } from '../../framework/events';
import { TILE_SIZE } from '../game/constants';
import { h, render } from '../../framework/dom';
import { ExplosionCoordinates } from './bomb';

export class Explosion {
  private element: HTMLElement | null = null;
  private animationDuration: number = 1000; // 1 second
  private removeTimer: number | null = null;
  private isRemoteExplosion: boolean = false;
  
  constructor(
    public id: string,
    public ownerId: string,
    public x: number, 
    public y: number, 
    public isCenter: boolean = false,
    isRemote: boolean = false
  ) {
    this.isRemoteExplosion = isRemote;
  }
  
  // Render the explosion to the DOM
  render(container: HTMLElement): void {
    // Create explosion element
    const explosionClass = this.isCenter ? 'explosion-center' : 'explosion';
    
    const explosionElement = h('div', {
      class: explosionClass,
      style: `
        position: absolute;
        left: ${this.x * TILE_SIZE}px;
        top: ${this.y * TILE_SIZE}px;
        width: ${TILE_SIZE}px;
        height: ${TILE_SIZE}px;
        background-color: #F39C12;
        border-radius: ${this.isCenter ? '50%' : '0'};
        animation: explosion-animation ${this.animationDuration}ms forwards;
        z-index: 10;
      `
    }, []);
    
    this.element = render(explosionElement) as HTMLElement;
    container.appendChild(this.element);
    
    // Set timer to remove explosion after animation completes
    this.removeTimer = window.setTimeout(() => {
      this.remove();
    }, this.animationDuration);
  }
  
  // Remove the explosion from the DOM
  remove(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
    
    // Clear timer if it exists
    if (this.removeTimer !== null) {
      window.clearTimeout(this.removeTimer);
      this.removeTimer = null;
    }
  }
  
  // Check if explosion is at specific coordinates
  isAt(x: number, y: number): boolean {
    return this.x === x && this.y === y;
  }
  
  // Check if this is a remote explosion
  isRemote(): boolean {
    return this.isRemoteExplosion;
  }
  
  // Create explosions from coordinates
  static createFromCoordinates(
    id: string,
    ownerId: string,
    coordinates: ExplosionCoordinates[],
    originX: number,
    originY: number,
    isRemote: boolean = false
  ): Explosion[] {
    return coordinates.map(coord => {
      const isCenter = coord.x === originX && coord.y === originY;
      return new Explosion(
        `${id}_${coord.x}_${coord.y}`,
        ownerId,
        coord.x,
        coord.y,
        isCenter,
        isRemote
      );
    });
  }
}
