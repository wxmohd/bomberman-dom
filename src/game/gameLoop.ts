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
let isGameOver = false;
let pauseOverlay: HTMLElement | null = null;

// Game state enum
export enum GameState {
  PLAYING,
  PAUSED,
  GAME_OVER
}

/**
 * Start the main game loop
 * @param update Function to call on each frame
 */
export function startGameLoop(update: () => void) {
  // Set up keyboard controls for pause
  setupKeyboardControls();
  
  function loop(timestamp: number) {
    // Calculate delta time in seconds
    const deltaTime = lastTime ? (timestamp - lastTime) / 1000 : 0;
    lastTime = timestamp;
    
    // Skip update if game is paused or game over
    if (!isPaused && !isGameOver) {
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
    if (!isGameOver) {
      isPaused = true;
      showPauseOverlay();
      eventBus.emit('game:state-changed', { state: GameState.PAUSED });
    }
  });
  
  eventBus.on('game:resume', () => {
    isPaused = false;
    hidePauseOverlay();
    // Reset last time to avoid large delta time after resuming
    lastTime = 0;
    eventBus.emit('game:state-changed', { state: GameState.PLAYING });
  });
  
  eventBus.on('game:over', () => {
    isGameOver = true;
    eventBus.emit('game:state-changed', { state: GameState.GAME_OVER });
  });
  
  eventBus.on('game:reset', () => {
    isGameOver = false;
    isPaused = false;
    hidePauseOverlay();
    eventBus.emit('game:state-changed', { state: GameState.PLAYING });
  });
}

/**
 * Pause the game loop
 */
export function pauseGame(): void {
  if (!isPaused && !isGameOver) {
    eventBus.emit('game:pause');
  }
}

/**
 * Resume the game loop
 */
export function resumeGame(): void {
  if (isPaused && !isGameOver) {
    eventBus.emit('game:resume');
  }
}

/**
 * Toggle game pause state
 */
export function togglePause(): void {
  if (isGameOver) return; // Don't toggle if game is over
  
  if (isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

/**
 * Check if game is currently paused
 */
export function isGamePaused(): boolean {
  return isPaused;
}

/**
 * Check if game is over
 */
export function isGameEnded(): boolean {
  return isGameOver;
}

/**
 * Set up keyboard controls for pause
 */
function setupKeyboardControls(): void {
  document.addEventListener('keydown', (event) => {
    // Use 'p' key to pause the game
    if (event.key === 'p' || event.key === 'P') {
      if (!isPaused && !isGameOver) {
        pauseGame();
      }
    }
    
    // Use 'r' key to resume the game
    if (event.key === 'r' || event.key === 'R') {
      if (isPaused && !isGameOver) {
        resumeGame();
      }
    }
  });
}

/**
 * Show pause overlay
 */
function showPauseOverlay(): void {
  // Remove existing overlay if it exists
  hidePauseOverlay();
  
  // Create pause overlay
  pauseOverlay = document.createElement('div');
  pauseOverlay.className = 'pause-overlay';
  pauseOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    animation: fade-in 0.3s ease;
  `;
  
  // Create pause message
  const pauseMessage = document.createElement('h1');
  pauseMessage.textContent = 'GAME PAUSED';
  pauseMessage.style.cssText = `
    color: white;
    font-size: 48px;
    margin-bottom: 30px;
    font-family: 'Arial', sans-serif;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  `;
  
  // Create instructions
  const instructions = document.createElement('div');
  instructions.textContent = 'Press R to resume';
  instructions.style.cssText = `
    color: white;
    font-size: 24px;
    margin-bottom: 20px;
    font-family: 'Arial', sans-serif;
  `;
  
  // Add elements to overlay
  pauseOverlay.appendChild(pauseMessage);
  pauseOverlay.appendChild(instructions);
  
  // Add animations if not already added
  if (!document.getElementById('pause-animations')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'pause-animations';
    styleEl.textContent = `
      @keyframes fade-in {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      
      @keyframes button-hover {
        0% { transform: scale(1); box-shadow: 0 0 10px rgba(255, 255, 255, 0.5); }
        100% { transform: scale(1.05); box-shadow: 0 0 20px rgba(255, 255, 255, 0.8); }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  // Add overlay to body
  document.body.appendChild(pauseOverlay);
}

/**
 * Hide pause overlay
 */
function hidePauseOverlay(): void {
  if (pauseOverlay && pauseOverlay.parentNode) {
    pauseOverlay.parentNode.removeChild(pauseOverlay);
    pauseOverlay = null;
  }
}

/**
 * Create a button for the pause menu
 */
function createPauseMenuButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.cssText = `
    padding: 12px 24px;
    font-size: 18px;
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid white;
    border-radius: 5px;
    cursor: pointer;
    font-family: 'Arial', sans-serif;
    min-width: 200px;
    transition: all 0.2s ease;
  `;
  
  // Add hover effects
  button.onmouseover = () => {
    button.style.animation = 'button-hover 0.5s infinite alternate';
  };
  
  button.onmouseout = () => {
    button.style.animation = 'none';
  };
  
  // Add click event
  button.addEventListener('click', onClick);
  
  return button;
}
