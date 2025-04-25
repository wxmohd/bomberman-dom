// Main game loop using requestAnimationFrame
import { eventBus } from '../../framework/events';
import { isMultiplayerConnected } from '../main';

// Last timestamp for calculating delta time
let lastTime = 0;

// Network update rate (milliseconds)
const NETWORK_UPDATE_RATE = 100; // 10 updates per second
let lastNetworkUpdate = 0;

// Game state
let isPaused = false;

/**
 * Start the main game loop
 * @param update Function to call on each frame
 */
export function startGameLoop(update: () => void) {
  function loop(timestamp: number) {
    // Calculate delta time in seconds
    const deltaTime = lastTime ? (timestamp - lastTime) / 1000 : 0;
    lastTime = timestamp;
    
    // Skip update if game is paused
    if (!isPaused) {
      // Call the main update function
      update();
      
      // Handle network updates at a fixed rate
      if (isMultiplayerConnected() && timestamp - lastNetworkUpdate > NETWORK_UPDATE_RATE) {
        // Emit network update event
        eventBus.emit('network:update');
        lastNetworkUpdate = timestamp;
      }
    }
    
    // Continue the loop
    requestAnimationFrame(loop);
  }
  
  // Start the loop
  requestAnimationFrame(loop);
  
  // Listen for pause/resume events
  eventBus.on('game:pause', () => {
    isPaused = true;
  });
  
  eventBus.on('game:resume', () => {
    isPaused = false;
    // Reset last time to avoid large delta time after resuming
    lastTime = 0;
  });
}

/**
 * Pause the game loop
 */
export function pauseGame(): void {
  eventBus.emit('game:pause');
}

/**
 * Resume the game loop
 */
export function resumeGame(): void {
  eventBus.emit('game:resume');
}
