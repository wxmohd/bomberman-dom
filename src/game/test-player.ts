// Test player implementation for direct testing
import { TILE_SIZE } from './constants';
import { PLAYER_STARTING_POSITIONS } from './map';
import { eventBus } from '../../framework/events';

// Add a test player directly to the map
export function addTestPlayer(container: HTMLElement): void {
  // Create player element
  const playerEl = document.createElement('div');
  playerEl.id = 'test-player';
  
  // Get starting position
  const startPos = PLAYER_STARTING_POSITIONS[0];
  
  // Style the player - make it very prominent
  playerEl.style.position = 'absolute';
  playerEl.style.left = `${startPos.x * TILE_SIZE}px`;
  playerEl.style.top = `${startPos.y * TILE_SIZE}px`;
  playerEl.style.width = `${TILE_SIZE}px`;
  playerEl.style.height = `${TILE_SIZE}px`;
  playerEl.style.backgroundColor = '#FF0000'; // Bright red
  playerEl.style.borderRadius = '50%';
  playerEl.style.zIndex = '1000'; // Very high z-index
  playerEl.style.boxShadow = '0 0 15px 5px rgba(255,0,0,0.7)';
  playerEl.style.border = '2px solid white';
  playerEl.style.boxSizing = 'border-box';
  
  // Add inner element for better visibility
  const innerElement = document.createElement('div');
  innerElement.style.position = 'absolute';
  innerElement.style.width = '60%';
  innerElement.style.height = '60%';
  innerElement.style.top = '20%';
  innerElement.style.left = '20%';
  innerElement.style.backgroundColor = 'white';
  innerElement.style.borderRadius = '50%';
  playerEl.appendChild(innerElement);
  
  // Add name tag
  const nameTag = document.createElement('div');
  nameTag.textContent = 'Player';
  nameTag.style.position = 'absolute';
  nameTag.style.bottom = '100%';
  nameTag.style.left = '50%';
  nameTag.style.transform = 'translateX(-50%)';
  nameTag.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  nameTag.style.color = 'white';
  nameTag.style.padding = '2px 5px';
  nameTag.style.borderRadius = '3px';
  nameTag.style.fontSize = '12px';
  nameTag.style.whiteSpace = 'nowrap';
  
  playerEl.appendChild(nameTag);
  
  // Add to container
  container.appendChild(playerEl);
  
  console.log('Added test player at position:', startPos);
  console.log('Player element:', playerEl);
  
  // Force a reflow to ensure the player is visible
  void playerEl.offsetWidth;
  
  // Double-check that the player is in the DOM
  setTimeout(() => {
    if (document.getElementById('test-player')) {
      console.log('Player is in the DOM');
    } else {
      console.error('Player is not in the DOM!');
      // Try adding it again
      container.appendChild(playerEl);
    }
  }, 500);
  
  // Set up keyboard controls
  let x = startPos.x;
  let y = startPos.y;
  const speed = 1; // Full tile movement for better grid alignment
  
  // Helper function to update player position visually
  function updatePlayerPosition(playerX: number, playerY: number): void {
    // Update the player element position
    playerEl.style.left = `${playerX * TILE_SIZE}px`;
    playerEl.style.top = `${playerY * TILE_SIZE}px`;
  }
  
  // Update player position initially
  updatePlayerPosition(x, y);
  
  // Handle keyboard input
  function setupKeyboardListeners() {
    console.log('Setting up keyboard listeners');
    
    window.addEventListener('keydown', (event) => {
      console.log(`Key pressed: ${event.key}`);
      let newX = x;
      let newY = y;
      
      // Calculate new position based on key press
      switch (event.key) {
        case 'ArrowUp':
          newY -= speed;
          console.log('Moving up');
          break;
        case 'ArrowRight':
          newX += speed;
          console.log('Moving right');
          break;
        case 'ArrowDown':
          newY += speed;
          console.log('Moving down');
          break;
        case 'ArrowLeft':
          newX -= speed;
          console.log('Moving left');
          break;
        case ' ': // Space bar for bomb
          // Use the current player position for bomb placement
          const gridX = Math.floor(x);
          const gridY = Math.floor(y);
          console.log(`Placing bomb at player position: ${gridX},${gridY}`);
          placeBomb(gridX, gridY);
          return; // Exit early for bomb placement
      }
      
      // Simple collision check - just check the target position
      if (isValidPosition(newX, newY)) {
        console.log(`Moving to new position: ${newX}, ${newY}`);
        x = newX;
        y = newY;
        updatePlayerPosition(x, y);
      } else {
        console.log('Movement blocked by obstacle');
      }
    });
  }
  
  // Call the setup function
  setupKeyboardListeners();
  
  // Simplified collision detection
  function isValidPosition(x: number, y: number): boolean {
    // Prevent going out of bounds
    if (x < 1 || y < 1 || x >= 14 || y >= 14) {
      return false;
    }
    
    // Get grid coordinates
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    // Check for fixed walls (grid pattern)
    if (gridX % 2 === 0 && gridY % 2 === 0) {
      console.log(`Wall at ${gridX},${gridY}`);
      return false; // Wall at even coordinates
    }
    
    // Check for border walls
    if (gridX === 0 || gridY === 0 || gridX === 14 || gridY === 14) {
      console.log(`Border wall at ${gridX},${gridY}`);
      return false;
    }
    
    // Check for green spaces - always allow movement
    const greenSpaces = Array.from(document.querySelectorAll('.green-space')).filter(el => {
      const style = window.getComputedStyle(el);
      const left = parseInt(style.left) / TILE_SIZE;
      const top = parseInt(style.top) / TILE_SIZE;
      return Math.floor(left) === gridX && Math.floor(top) === gridY;
    });
    
    if (greenSpaces.length > 0) {
      console.log(`Green space at ${gridX},${gridY} - allowing movement`);
      return true; // Can walk through green spaces
    }
    
    // Check for red blocks (destructible blocks) - more comprehensive check
    // First check for elements with class 'block' which are typically red
    const blockElements = document.querySelectorAll('.block');
    for (let i = 0; i < blockElements.length; i++) {
      const block = blockElements[i] as HTMLElement;
      const blockX = Math.floor(parseInt(block.style.left) / TILE_SIZE);
      const blockY = Math.floor(parseInt(block.style.top) / TILE_SIZE);
      
      if (blockX === gridX && blockY === gridY) {
        console.log(`Block at ${gridX},${gridY} - blocking movement`);
        return false; // Can't walk through blocks
      }
    }
    
    // Then check for any red-colored elements
    const redElements = Array.from(document.querySelectorAll('div')).filter(el => {
      try {
        const style = window.getComputedStyle(el);
        if (!style.backgroundColor || !style.left || !style.top) return false;
        
        const backgroundColor = style.backgroundColor;
        const left = parseInt(style.left) / TILE_SIZE;
        const top = parseInt(style.top) / TILE_SIZE;
        
        // Check if it's a red element and at the target position
        return (
          (backgroundColor.includes('255, 0, 0') || // Pure red
          backgroundColor.includes('255, 99, 71') || // Tomato
          backgroundColor.includes('255, 69, 0') || // Red-orange
          backgroundColor.includes('255, 165, 0') || // Orange-red
          backgroundColor.includes('178, 34, 34') || // Firebrick
          backgroundColor.includes('255, 87, 87')) && // Light red
          Math.floor(left) === gridX && Math.floor(top) === gridY
        );
      } catch (e) {
        return false;
      }
    });
    
    // Also check for elements with red background-color inline style
    const redStyleElements = Array.from(document.querySelectorAll('div[style*="background-color: red"], div[style*="background-color:#ff"]')).filter(el => {
      try {
        const style = window.getComputedStyle(el);
        if (!style.left || !style.top) return false;
        
        const left = parseInt(style.left) / TILE_SIZE;
        const top = parseInt(style.top) / TILE_SIZE;
        
        return Math.floor(left) === gridX && Math.floor(top) === gridY;
      } catch (e) {
        return false;
      }
    });
    
    if (redElements.length > 0 || redStyleElements.length > 0) {
      console.log(`Red block at ${gridX},${gridY}`);
      return false; // Can't walk through red blocks
    }
    
    // Also check for any element at this position that isn't green or empty
    const anyBlockingElement = Array.from(document.querySelectorAll('div:not(.green-space):not(#test-player):not(.explosion)')).filter(el => {
      try {
        const style = window.getComputedStyle(el);
        if (!style.left || !style.top || !style.backgroundColor) return false;
        if (style.backgroundColor === 'transparent' || style.backgroundColor.includes('0, 0, 0, 0')) return false;
        
        const left = parseInt(style.left) / TILE_SIZE;
        const top = parseInt(style.top) / TILE_SIZE;
        
        // Skip elements that are clearly not blocks (UI elements, etc.)
        if (style.position !== 'absolute' || !style.width || !style.height) return false;
        
        // Check if element is at the target position and has a size similar to a tile
        const width = parseInt(style.width);
        const height = parseInt(style.height);
        if (width < TILE_SIZE * 0.5 || height < TILE_SIZE * 0.5) return false;
        
        return Math.floor(left) === gridX && Math.floor(top) === gridY;
      } catch (e) {
        return false;
      }
    });
    
    // Filter out elements that are clearly not blocks
    const blockingElements = anyBlockingElement.filter(el => {
      // Skip elements with these classes which we know are not blocks
      return !el.classList.contains('player') && 
             !el.classList.contains('bomb') && 
             !el.classList.contains('explosion') &&
             !el.id.includes('player');
    });
    
    if (blockingElements.length > 0) {
      console.log(`Blocking element at ${gridX},${gridY}`);
      return false; // Can't walk through any blocking element
    }
    
    // Check for black/dark blocks
    const darkElements = Array.from(document.querySelectorAll('div')).filter(el => {
      if (!el.style || !el.style.backgroundColor) return false;
      
      const style = window.getComputedStyle(el);
      if (!style.left || !style.top) return false;
      
      try {
        const backgroundColor = style.backgroundColor;
        const left = parseInt(style.left) / TILE_SIZE;
        const top = parseInt(style.top) / TILE_SIZE;
        
        // Check if it's a dark element and at the target position
        return (
          (backgroundColor.includes('0, 0, 0') || // Black
          backgroundColor.includes('47, 79, 79') || // Dark slate
          backgroundColor.includes('25, 25, 112') || // Midnight blue
          backgroundColor.includes('0, 0, 128') || // Navy
          backgroundColor.includes('33, 37, 41')) && // Dark gray
          Math.floor(left) === gridX && Math.floor(top) === gridY
        );
      } catch (e) {
        return false;
      }
    });
    
    if (darkElements.length > 0) {
      console.log(`Dark block at ${gridX},${gridY}`);
      return false; // Can't walk through dark blocks
    }
    
    console.log(`Position ${gridX},${gridY} is valid for movement`);
    return true; // No obstacles found
  }
  
  // Place a bomb
  function placeBomb(x: number, y: number): void {
    // Get the exact player position from the DOM element
    const playerLeft = parseInt(playerEl.style.left) || x * TILE_SIZE;
    const playerTop = parseInt(playerEl.style.top) || y * TILE_SIZE;
    
    // Convert to grid coordinates
    const gridX = Math.floor(playerLeft / TILE_SIZE);
    const gridY = Math.floor(playerTop / TILE_SIZE);
    
    console.log(`Placing bomb at player position: ${gridX},${gridY}`);
    console.log(`Placed bomb at grid position: ${gridX},${gridY}`);
    
    // Check if there's already a bomb at this position
    const existingBombs = document.querySelectorAll('.bomb');
    for (let i = 0; i < existingBombs.length; i++) {
      const bomb = existingBombs[i] as HTMLElement;
      const bombX = Math.floor(parseInt(bomb.style.left) / TILE_SIZE);
      const bombY = Math.floor(parseInt(bomb.style.top) / TILE_SIZE);
      
      if (bombX === gridX && bombY === gridY) {
        console.log('Bomb already exists at this position');
        return; // Don't place another bomb here
      }
    }
    
    // Create bomb element with more visible styling
    const bomb = document.createElement('div');
    bomb.className = 'bomb';
    bomb.style.cssText = `
      position: absolute;
      left: ${gridX * TILE_SIZE}px;
      top: ${gridY * TILE_SIZE}px;
      width: ${TILE_SIZE}px;
      height: ${TILE_SIZE}px;
      background-color: black;
      border-radius: 50%;
      z-index: 800;
      animation: bomb-pulse 0.5s infinite alternate;
      border: 2px solid white;
      box-sizing: border-box;
    `;
    
    // Add a fuse to make the bomb more visible
    const fuse = document.createElement('div');
    fuse.style.cssText = `
      position: absolute;
      top: -5px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 10px;
      background-color: #FF4500;
      z-index: 801;
    `;
    bomb.appendChild(fuse);
    
    // Add bomb to the container
    container.appendChild(bomb);
    
    // Store the bomb position for explosion
    const bombPosition = {
      x: gridX,
      y: gridY
    };
    
    // Explode after 2 seconds
    setTimeout(() => {
      // Remove the bomb element
      bomb.remove();
      
      // Create explosion at the bomb's position
      console.log(`Exploding bomb at position: ${bombPosition.x},${bombPosition.y}`);
      createExplosion(bombPosition.x, bombPosition.y, 1); // Radius 1 for exactly one block in each direction
    }, 2000);
  }
  
  // Create explosion effect
  function createExplosion(x: number, y: number, radius: number): void {
    console.log(`Creating explosion at center: ${x},${y} with radius ${radius}`);
    
    // Track which blocks have been destroyed to avoid duplicates
    const destroyedBlocks: Set<string> = new Set();
    
    // Create center explosion
    const centerExplosion = document.createElement('div');
    centerExplosion.className = 'explosion center';
    centerExplosion.style.cssText = `
      position: absolute;
      left: ${x * TILE_SIZE}px;
      top: ${y * TILE_SIZE}px;
      width: ${TILE_SIZE}px;
      height: ${TILE_SIZE}px;
      background-color: yellow;
      border-radius: 50%;
      z-index: 900;
      animation: explosion 0.5s forwards;
    `;
    container.appendChild(centerExplosion);
    console.log(`Center explosion at: ${x},${y}`);
    
    // Remove explosion after animation
    setTimeout(() => {
      centerExplosion.remove();
    }, 500);
    
    // Destroy block at center if there is one
    destroyBlockAt(x, y, destroyedBlocks);
    
    // Create explosion in exactly four directions, one block in each direction
    const directions = [
      { dx: 0, dy: -1, name: 'up' },     // Up
      { dx: 1, dy: 0, name: 'right' },   // Right
      { dx: 0, dy: 1, name: 'down' },    // Down
      { dx: -1, dy: 0, name: 'left' }    // Left
    ];
    
    // For each direction, create exactly one explosion block
    directions.forEach(dir => {
      const explosionX = x + dir.dx;
      const explosionY = y + dir.dy;
      
      console.log(`Calculating explosion coordinates from center: ${explosionX},${explosionY}`);
      
      // Check if this position is valid for explosion
      if (isValidExplosionPosition(explosionX, explosionY)) {
        // Create explosion element
        const explosion = document.createElement('div');
        explosion.className = `explosion ${dir.name}`;
        explosion.style.cssText = `
          position: absolute;
          left: ${explosionX * TILE_SIZE}px;
          top: ${explosionY * TILE_SIZE}px;
          width: ${TILE_SIZE}px;
          height: ${TILE_SIZE}px;
          background-color: orange;
          z-index: 40;
          animation: explosion 0.5s forwards;
        `;
        
        console.log(`Center explosion at: ${explosionX},${explosionY}`);
        container.appendChild(explosion);
        
        // Check if there's a block at this position and destroy it
        destroyBlockAt(explosionX, explosionY, destroyedBlocks);
        
        // Remove explosion after animation
        setTimeout(() => {
          explosion.remove();
        }, 500);
      }
    });
  }
  
  // Destroy a block at the specified coordinates
  function destroyBlockAt(x: number, y: number, destroyedBlocks: Set<string>): void {
    // Create a key for this position
    const posKey = `${x},${y}`;
    
    // Skip if already destroyed
    if (destroyedBlocks.has(posKey)) {
      return;
    }
    
    // Check for black blocks (walls) - these cannot be destroyed
    const wallElements = Array.from(document.querySelectorAll('div')).filter(el => {
      const style = window.getComputedStyle(el);
      const backgroundColor = style.backgroundColor;
      const left = parseInt(style.left) / TILE_SIZE;
      const top = parseInt(style.top) / TILE_SIZE;
      
      // Check if it's a dark/black element at the target position
      return (
        (backgroundColor.includes('0, 0, 0') || // Black
        backgroundColor.includes('47, 79, 79') || // Dark slate
        backgroundColor.includes('25, 25, 112') || // Midnight blue
        backgroundColor.includes('0, 0, 128') || // Navy
        backgroundColor.includes('33, 37, 41')) && // Dark gray
        Math.floor(left) === x && Math.floor(top) === y
      );
    });
    
    // If it's a wall, don't destroy it
    if (wallElements.length > 0) {
      return;
    }
    
    // Find red blocks at this position
    const redBlocks = Array.from(document.querySelectorAll('div')).filter(el => {
      const style = window.getComputedStyle(el);
      const backgroundColor = style.backgroundColor;
      const left = parseInt(style.left) / TILE_SIZE;
      const top = parseInt(style.top) / TILE_SIZE;
      
      // Check if it's a red element at the target position
      return (
        (backgroundColor.includes('255, 0, 0') || // Pure red
        backgroundColor.includes('255, 99, 71') || // Tomato
        backgroundColor.includes('255, 69, 0') || // Red-orange
        backgroundColor.includes('255, 165, 0') || // Orange-red
        backgroundColor.includes('178, 34, 34') || // Firebrick
        backgroundColor.includes('255, 87, 87')) && // Light red
        Math.floor(left) === x && Math.floor(top) === y
      );
    });
    
    if (redBlocks.length > 0) {
      // Mark as destroyed
      destroyedBlocks.add(posKey);
      
      // Process each red block
      redBlocks.forEach(block => {
        const blockEl = block as HTMLElement;
        
        // Animate block destruction
        blockEl.style.animation = 'block-destroy 0.5s forwards';
        
        // Create a green space where the block was
        const greenSpace = document.createElement('div');
        greenSpace.className = 'green-space';
        greenSpace.style.position = 'absolute';
        greenSpace.style.left = blockEl.style.left;
        greenSpace.style.top = blockEl.style.top;
        greenSpace.style.width = `${TILE_SIZE}px`;
        greenSpace.style.height = `${TILE_SIZE}px`;
        greenSpace.style.backgroundColor = '#7ABD7E'; // Green color
        greenSpace.style.zIndex = '5'; // Below player but above background
        
        // Add green space to the game container
        if (container) {
          container.appendChild(greenSpace);
        }
        
        // Remove block after animation
        setTimeout(() => {
          blockEl.remove();
        }, 500);
        
        console.log(`Destroyed red block at ${x},${y}`);
      });
    }
  }
  
  // Check if an explosion can reach this position
  function isValidExplosionPosition(x: number, y: number): boolean {
    // Can't explode through walls
    if (x % 2 === 0 && y % 2 === 0) {
      return false; // Wall at even coordinates
    }
    
    // Can't explode through border walls
    if (x === 0 || y === 0 || x === 14 || y === 14) {
      return false;
    }
    
    // Check for black blocks (walls) - these cannot be exploded through
    const wallElements = Array.from(document.querySelectorAll('div')).filter(el => {
      const style = window.getComputedStyle(el);
      const backgroundColor = style.backgroundColor;
      const left = parseInt(style.left) / TILE_SIZE;
      const top = parseInt(style.top) / TILE_SIZE;
      
      // Check if it's a dark/black element at the target position
      return (
        (backgroundColor.includes('0, 0, 0') || // Black
        backgroundColor.includes('47, 79, 79') || // Dark slate
        backgroundColor.includes('25, 25, 112') || // Midnight blue
        backgroundColor.includes('0, 0, 128') || // Navy
        backgroundColor.includes('33, 37, 41')) && // Dark gray
        Math.floor(left) === x && Math.floor(top) === y
      );
    });
    
    if (wallElements.length > 0) {
      return false; // Can't explode through walls
    }
    
    return true;
  }
  
  // Get explosion coordinates with proper wall checking
  function getExplosionCoordinates(centerX: number, centerY: number, radius: number): {x: number, y: number}[] {
    console.log(`Calculating explosion coordinates from center: ${centerX},${centerY}`);
    
    const coordinates: {x: number, y: number}[] = [
      { x: centerX, y: centerY } // Center
    ];
    
    // Log the center coordinate
    console.log(`Center explosion at: ${centerX},${centerY}`);
    
    // Define the four directions
    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: 0 },  // Right
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }  // Left
    ];
    
    // For each direction, add coordinates until hitting a wall or reaching radius
    directions.forEach(dir => {
      let blocked = false;
      
      for (let i = 1; i <= radius && !blocked; i++) {
        const newX = centerX + (dir.dx * i);
        const newY = centerY + (dir.dy * i);
        
        // Check if this position is a fixed wall (can't be destroyed)
        if (newX % 2 === 0 && newY % 2 === 0) {
          blocked = true; // Hit a fixed wall, stop in this direction
        } else {
          // Add this position to explosion coordinates
          coordinates.push({ x: newX, y: newY });
          
          // Check if there's a block here (should stop explosion after this)
          const blockElements = document.querySelectorAll('.block');
          for (let j = 0; j < blockElements.length; j++) {
            const block = blockElements[j] as HTMLElement;
            const blockX = Math.floor(parseInt(block.style.left) / TILE_SIZE);
            const blockY = Math.floor(parseInt(block.style.top) / TILE_SIZE);
            
            if (blockX === newX && blockY === newY) {
              blocked = true; // Hit a block, stop after this position
              break;
            }
          }
        }
      }
    });
    
    return coordinates;
  }
  
  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bomb-pulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.2); background-color: #555; }
    }
    
    @keyframes player-pulse {
      0% { transform: scale(1); box-shadow: 0 0 15px 5px rgba(255,0,0,0.7); }
      100% { transform: scale(1.1); box-shadow: 0 0 20px 8px rgba(255,0,0,0.9); }
    }
    
    @keyframes block-destroy {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
      100% { transform: scale(0); opacity: 0; }
    }
    
    @keyframes green-space-appear {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    .green-space {
      animation: green-space-appear 0.3s forwards;
    }
    
    #test-player {
      animation: player-pulse 0.8s infinite alternate;
    }
  `;
  // Add CSS for bomb and explosion styles
  const bombStyle = document.createElement('style');
  bombStyle.textContent = `
    .bomb {
      box-shadow: 0 0 10px 2px rgba(255, 165, 0, 0.5);
    }
    
    .explosion.center {
      background-color: yellow !important;
      z-index: 45 !important;
    }
    
    .explosion.up {
      background-color: orange !important;
    }
    
    .explosion.right {
      background-color: orange !important;
    }
    
    .explosion.down {
      background-color: orange !important;
    }
    
    .explosion.left {
      background-color: orange !important;
    }
  `;
  document.head.appendChild(style);
  document.head.appendChild(bombStyle);
}
