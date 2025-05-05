// Direct player implementation with no dependencies
import { TILE_SIZE } from './constants';
import { h, render } from '../../framework/dom';

// Add a player directly to the DOM
export function addDirectPlayer(): void {
  // Get the app container
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }
  
  // Position at top-left corner
  const x = 1;
  const y = 1;
  
  // Create player element using the framework's h function
  const playerVNode = h('div', {
    id: 'direct-player',
    style: `
      position: absolute;
      left: ${x * TILE_SIZE}px;
      top: ${y * TILE_SIZE}px;
      width: ${TILE_SIZE}px;
      height: ${TILE_SIZE}px;
      background-color: #FF0000;
      border-radius: 50%;
      z-index: 9999;
      box-shadow: 0 0 20px 10px rgba(255,0,0,0.8);
      border: 3px solid white;
      box-sizing: border-box;
      animation: player-pulse 0.8s infinite alternate;
      pointer-events: none;
    `
  }, []);
  
  // Render and add player to the DOM
  const playerElement = render(playerVNode) as HTMLElement;
  app.appendChild(playerElement);
  
  console.log('Added direct player to the DOM at', x, y);
  
  // Add CSS animation using the framework's h function
  const styleVNode = h('style', {}, [
    `
    @keyframes player-pulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.2); }
    }
    `
  ]);
  
  // Render and add style to the document head
  const styleElement = render(styleVNode) as HTMLElement;
  document.head.appendChild(styleElement);
  
  // Set up keyboard controls
  window.addEventListener('keydown', (event) => {
    // Get the current player element
    const playerElement = document.getElementById('direct-player');
    if (!playerElement) return;
    
    const currentLeft = parseInt(playerElement.style.left) || x * TILE_SIZE;
    const currentTop = parseInt(playerElement.style.top) || y * TILE_SIZE;
    
    let newLeft = currentLeft;
    let newTop = currentTop;
    
    const step = TILE_SIZE / 2;
    
    switch (event.key) {
      case 'ArrowUp':
        newTop = Math.max(TILE_SIZE, currentTop - step);
        break;
      case 'ArrowRight':
        newLeft = Math.min((15 * TILE_SIZE), currentLeft + step);
        break;
      case 'ArrowDown':
        newTop = Math.min((15 * TILE_SIZE), currentTop + step);
        break;
      case 'ArrowLeft':
        newLeft = Math.max(TILE_SIZE, currentLeft - step);
        break;
      case ' ': // Space bar for bomb
        placeBomb(currentLeft, currentTop);
        break;
    }
    
    playerElement.style.left = `${newLeft}px`;
    playerElement.style.top = `${newTop}px`;
  });
  
  // Place a bomb
  function placeBomb(x: number, y: number): void {
    // Round to grid position
    const gridX = Math.round(x / TILE_SIZE) * TILE_SIZE;
    const gridY = Math.round(y / TILE_SIZE) * TILE_SIZE;
    
    // Create bomb element
    const bomb = document.createElement('div');
    bomb.style.cssText = `
      position: absolute;
      left: ${gridX}px;
      top: ${gridY}px;
      width: ${TILE_SIZE}px;
      height: ${TILE_SIZE}px;
      background-color: #333;
      border-radius: 50%;
      z-index: 50;
      animation: bomb-pulse 0.5s infinite alternate;
    `;
    
    // Add to container
    if (app) {
      app.appendChild(bomb);
    }
    
    // Set explosion timer
    setTimeout(() => {
      // Remove bomb
      bomb.remove();
      
      // Create explosion
      createExplosion(gridX, gridY, 2);
    }, 2000);
  }
  
  // Create explosion effect
  function createExplosion(x: number, y: number, radius: number): void {
    const directions = [
      { dx: 0, dy: 0 },  // Center
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: 0 },  // Right
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }  // Left
    ];
    
    for (const dir of directions) {
      for (let i = 0; i <= radius; i++) {
        if (dir.dx === 0 && dir.dy === 0 && i > 0) continue;
        
        const explosionX = x + (dir.dx * i * TILE_SIZE);
        const explosionY = y + (dir.dy * i * TILE_SIZE);
        
        // Create explosion element
        const explosion = document.createElement('div');
        explosion.style.cssText = `
          position: absolute;
          left: ${explosionX}px;
          top: ${explosionY}px;
          width: ${TILE_SIZE}px;
          height: ${TILE_SIZE}px;
          background-color: rgba(255, 100, 0, 0.7);
          z-index: 40;
        `;
        
        // Add to container
        if (app) {
          app.appendChild(explosion);
        }
        
        // Remove after animation
        setTimeout(() => {
          explosion.remove();
        }, 500);
      }
    }
  }
  
  // Add CSS for bomb animation
  const bombStyle = document.createElement('style');
  bombStyle.textContent = `
    @keyframes bomb-pulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.2); background-color: #555; }
    }
  `;
  document.head.appendChild(bombStyle);
}
