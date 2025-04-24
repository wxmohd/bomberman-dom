// Block entity logic
import { h, render } from '../../framework/dom';
import { TILE_SIZE } from '../game/constants';
import { eventBus } from '../../framework/events';

export class Block {
  private element: HTMLElement | null = null;
  private destroyed = false;
  
  constructor(
    public x: number, 
    public y: number, 
    public indestructible: boolean
  ) {}
  
  // Render the block to the DOM
  render(container: HTMLElement): void {
    if (this.destroyed) return;
    
    // Create block element
    const blockType = this.indestructible ? 'wall' : 'block';
    const blockColor = this.indestructible ? '#2C3E50' : '#E74C3C';
    
    const blockElement = h('div', {
      class: `${blockType}`,
      style: `
        position: absolute;
        left: ${this.x * TILE_SIZE}px;
        top: ${this.y * TILE_SIZE}px;
        width: ${TILE_SIZE}px;
        height: ${TILE_SIZE}px;
        background-color: ${blockColor};
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.2);
      `
    }, []);
    
    this.element = render(blockElement) as HTMLElement;
    container.appendChild(this.element);
  }
  
  // Destroy the block (only if destructible)
  destroy(): boolean {
    if (this.indestructible || this.destroyed) {
      return false;
    }
    
    this.destroyed = true;
    
    // Add destruction animation
    if (this.element) {
      // Add destruction animation class
      this.element.style.animation = 'block-destroy 0.3s forwards';
      
      // Remove element after animation
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
          this.element = null;
        }
      }, 300);
      
      // Emit block destroyed event
      eventBus.emit('block:destroyed', { x: this.x, y: this.y });
      
      return true;
    }
    
    return false;
  }
  
  // Check if block is at specific coordinates
  isAt(x: number, y: number): boolean {
    return this.x === x && this.y === y;
  }
  
  // Remove the block from the DOM
  remove(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }
}
