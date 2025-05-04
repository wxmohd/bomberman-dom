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
    const blockColor = this.indestructible ? '#4a4233' : '#e4c49b'; // Egyptian pyramid theme colors
    
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
        border: ${this.indestructible ? '2px solid #3a3426' : '2px solid #c4a67b'};
        border-radius: 0;
        box-shadow: ${this.indestructible ? 'inset 0 0 8px #2a261c' : 'inset 0 0 8px #d4b48b'};
        background-image: url('${this.indestructible ? '../img/wall (2).png' : '../img/Random.png'}');
        background-size: cover;
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
      // Add Powerpuff Girls themed destruction animation
      this.element.style.animation = 'block-destroy 0.5s forwards';
      // Add hearts and stars effect for Powerpuff Girls theme
      this.addDestructionEffects();
      
      // Remove element after animation
      setTimeout(() => {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
          this.element = null;
        }
      }, 500);
      
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
  
  // Add Egyptian themed destruction effects (sand particles and hieroglyphs)
  private addDestructionEffects(): void {
    if (!this.element || !this.element.parentNode) return;
    
    const container = this.element.parentNode as HTMLElement;
    const blockRect = this.element.getBoundingClientRect();
    const centerX = this.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = this.y * TILE_SIZE + TILE_SIZE / 2;
    
    // Create sand dust effect
    const dustCloud = document.createElement('div');
    dustCloud.style.cssText = `
      position: absolute;
      left: ${centerX}px;
      top: ${centerY}px;
      width: ${TILE_SIZE * 1.5}px;
      height: ${TILE_SIZE * 1.5}px;
      background-color: rgba(228, 196, 155, 0.7);
      border-radius: 50%;
      z-index: 90;
      transform: translate(-50%, -50%);
      animation: dust-cloud 0.8s forwards ease-out;
    `;
    container.appendChild(dustCloud);
    
    // Create 5 particles (hieroglyphs and sand particles)
    for (let i = 0; i < 5; i++) {
      const isHieroglyph = Math.random() > 0.5;
      const particle = document.createElement('div');
      
      // Random position offset
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      
      particle.style.cssText = `
        position: absolute;
        left: ${centerX + offsetX}px;
        top: ${centerY + offsetY}px;
        font-size: ${isHieroglyph ? '16px' : '8px'};
        color: ${isHieroglyph ? '#d4af37' : '#e4c49b'};
        z-index: 100;
        transform: translate(-50%, -50%);
        animation: particle-float 1s forwards ease-out;
      `;
      
      // Use Egyptian hieroglyph symbols or sand particle
      const hieroglyphs = ['☥', '𓂀', '𓃀', '𓆣', '𓇌', '𓊖'];
      particle.textContent = isHieroglyph ? hieroglyphs[Math.floor(Math.random() * hieroglyphs.length)] : '•';
      container.appendChild(particle);
      
      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1000);
    }
    
    // Add particle animation style if not already added
    if (!document.getElementById('particle-animation-style')) {
      const style = document.createElement('style');
      style.id = 'particle-animation-style';
      style.textContent = `
        @keyframes particle-float {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -150%) scale(1.5); opacity: 0; }
        }
        
        @keyframes dust-cloud {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
}
