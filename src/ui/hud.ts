// Game HUD UI (lives, timer, power-ups)
import { PowerUpType } from '../game/powerups';
import { eventBus } from '../../framework/events';

// Store player power-ups and lives
interface PlayerPowerUps {
  [playerId: string]: {
    bombs: number;
    flames: number;
    speed: number;
    lives: number;
  };
}

// Default power-up values
const DEFAULT_POWER_UP_VALUES = {
  bombs: 1,
  flames: 1,
  speed: 1,
  lives: 3
};

// Store player power-ups
const playerPowerUps: PlayerPowerUps = {};

// HUD container element
let hudContainer: HTMLElement | null = null;

// Game state variables
let isGamePaused = false;
let pauseOverlay: HTMLElement | null = null;

// Initialize the HUD
export function initHUD(): void {
  // Create HUD container if it doesn't exist
  if (!hudContainer) {
    // Create the HUD container immediately at default position
    hudContainer = document.createElement('div');
    hudContainer.id = 'game-hud';
    hudContainer.style.cssText = `
      position: fixed;
      top: 80px;
      left: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 100;
    `;
    document.body.appendChild(hudContainer);
    
    // Add HUD styles
    addHUDStyles();
    
    // Update the HUD initially
    updateHUD();
    
    // Set up keyboard controls for pause/resume
    setupPauseControls();
    
    // Adjust position once player-info div is available
    setTimeout(() => {
      const playerInfoDiv = document.getElementById('player-info');
      if (playerInfoDiv && hudContainer) {
        const playerInfoRect = playerInfoDiv.getBoundingClientRect();
        hudContainer.style.top = `${playerInfoRect.bottom + 10}px`;
        hudContainer.style.left = `${playerInfoRect.left}px`;
      }
    }, 500);
  } else {
    // If the container already exists, just update it
    updateHUD();
  }
}



// Initialize event listeners
function initEventListeners(): void {
  // Listen for power-up collected events
  eventBus.on('powerup:collected', handlePowerUpCollected);
  
  // Listen for player damaged events
  eventBus.on('player:damaged', handlePlayerDamaged);
  
  // Listen for game reset events
  eventBus.on('game:reset', resetPowerUps);
  
  // Listen for player join events to add them to the HUD
  eventBus.on('player:join', (data: { id: string }) => {
    if (!playerPowerUps[data.id]) {
      playerPowerUps[data.id] = { ...DEFAULT_POWER_UP_VALUES };
      updateHUD();
    }
  });
}

// Initialize the HUD and event listeners
export function init(): void {
  initHUD();
  initEventListeners();
  
  // Initialize HUD with default values for the local player
  const playerId = localStorage.getItem('playerId');
  if (playerId) {
    // Add the player to the HUD with default values
    if (!playerPowerUps[playerId]) {
      playerPowerUps[playerId] = { ...DEFAULT_POWER_UP_VALUES };
      // Force an update of the HUD
      updateHUD();
    }
  }
}

// Add HUD styles
function addHUDStyles(): void {
  if (document.getElementById('game-hud-styles')) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'game-hud-styles';
  styleEl.textContent = `
    .player-powerups {
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      padding: 10px;
      color: white;
      font-family: Arial, sans-serif;
      min-width: 150px;
      margin-bottom: 5px;
    }
    
    .player-powerups h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
      padding-bottom: 4px;
    }
    
    .powerup-stat {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    
    .powerup-icon {
      margin-right: 8px;
      font-size: 16px;
    }
    
    .powerup-value {
      font-weight: bold;
      margin-left: auto;
    }
    
    .controls-indicator {
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 14px;
    }
    
    .controls-indicator strong,
    .control-key {
      display: inline-block;
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      margin-right: 5px;
      font-weight: bold;
      font-family: monospace;
    }
    
    @keyframes powerup-highlight {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); color: yellow; }
      100% { transform: scale(1); }
    }
    
    .highlight {
      animation: powerup-highlight 0.5s ease-in-out;
    }
  `;
  
  document.head.appendChild(styleEl);
}

// Handle power-up collected event
function handlePowerUpCollected(data: { playerId: string; type: PowerUpType }): void {
  const { playerId, type } = data;
  
  // Get the local player ID
  const localPlayerId = localStorage.getItem('playerId');
  
  // Only update the HUD if this is the local player's powerup
  if (playerId === localPlayerId) {
    console.log(`Updating HUD for local player ${playerId}`);
    
    // Initialize player power-ups if not exists
    if (!playerPowerUps[playerId]) {
      playerPowerUps[playerId] = { ...DEFAULT_POWER_UP_VALUES };
      console.log(`Initializing HUD for player ${playerId} with default values`);
    }
    
    // Update power-up count
    switch (type) {
      case PowerUpType.BOMB:
        playerPowerUps[playerId].bombs++;
        break;
      case PowerUpType.FLAME:
        playerPowerUps[playerId].flames++;
        break;
      case PowerUpType.SPEED:
        playerPowerUps[playerId].speed++;
        break;
    }
    
    // Update HUD
    updateHUD();
  } else {
    console.log(`Not updating HUD for remote player ${playerId}`);
  }
}

// Update the HUD display
export function updateHUD(): void {
  if (!hudContainer) return;
  
  // Clear existing HUD
  hudContainer.innerHTML = '';
  
  // Get the local player ID
  const localPlayerId = localStorage.getItem('playerId');
  
  // Create player power-up displays - only for the local player
  Object.entries(playerPowerUps).forEach(([playerId, powerups]) => {
    // Only show HUD for the local player
    if (playerId === localPlayerId) {
      const playerHUD = createPlayerHUD(playerId, powerups);
      hudContainer!.appendChild(playerHUD);
    }
  });
}

// Set up keyboard controls for pause/resume
function setupPauseControls(): void {
  document.addEventListener('keydown', (event) => {
    // Use 'p' key to pause the game
    if (event.key === 'p' || event.key === 'P') {
      if (!isGamePaused) {
        pauseGame();
      }
    }
    
    // Use 'r' key to resume the game
    if (event.key === 'r' || event.key === 'R') {
      if (isGamePaused) {
        resumeGame();
      }
    }
  });
}

// Pause the game
function pauseGame(): void {
  isGamePaused = true;
  showPauseOverlay();
  eventBus.emit('game:pause');
}

// Resume the game
function resumeGame(): void {
  isGamePaused = false;
  hidePauseOverlay();
  eventBus.emit('game:resume');
}

// Show pause overlay
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
  
  // Add to body
  document.body.appendChild(pauseOverlay);
}

// Hide pause overlay
function hidePauseOverlay(): void {
  if (pauseOverlay && pauseOverlay.parentNode) {
    pauseOverlay.parentNode.removeChild(pauseOverlay);
    pauseOverlay = null;
  }
}

// Create HUD for a single player
function createPlayerHUD(playerId: string, powerups: { bombs: number; flames: number; speed: number; lives: number }): HTMLElement {
  const playerDiv = document.createElement('div');
  playerDiv.className = 'player-powerups';
  playerDiv.dataset.playerId = playerId;
  
  // Don't show player header for local player since it's already shown in player-info div
  const isLocalPlayer = playerId === localStorage.getItem('playerId');
  if (!isLocalPlayer) {
    // Player header for remote players
    const header = document.createElement('h3');
    header.textContent = `Player ${playerId}`;
    playerDiv.appendChild(header);
  }
  
  // Lives stat
  const livesStat = document.createElement('div');
  livesStat.className = 'powerup-stat';
  livesStat.innerHTML = `
    <span class="powerup-icon">❤️</span>
    <span>Lives</span>
    <span class="powerup-value">${powerups.lives}</span>
  `;
  playerDiv.appendChild(livesStat);
  
  // Bomb stat
  const bombStat = document.createElement('div');
  bombStat.className = 'powerup-stat';
  bombStat.innerHTML = `
    <span class="powerup-icon">💣</span>
    <span>Bombs</span>
    <span class="powerup-value">${powerups.bombs}</span>
  `;
  playerDiv.appendChild(bombStat);
  
  // Flame stat
  const flameStat = document.createElement('div');
  flameStat.className = 'powerup-stat';
  flameStat.innerHTML = `
    <span class="powerup-icon">🔥</span>
    <span>Power</span>
    <span class="powerup-value">${powerups.flames}</span>
  `;
  playerDiv.appendChild(flameStat);
  
  // Speed stat
  const speedStat = document.createElement('div');
  speedStat.className = 'powerup-stat';
  speedStat.innerHTML = `
    <span class="powerup-icon">⚡</span>
    <span>Speed</span>
    <span class="powerup-value">${powerups.speed}</span>
  `;
  playerDiv.appendChild(speedStat);
  
  // Only add pause controls for the local player
  if (playerId === localStorage.getItem('playerId')) {
    // Add separator
    const separator = document.createElement('div');
    separator.style.cssText = `
      height: 1px;
      background-color: rgba(255, 255, 255, 0.3);
      margin: 8px 0;
    `;
    playerDiv.appendChild(separator);
    
    // Add pause control
    const pauseControl = document.createElement('div');
    pauseControl.className = 'powerup-stat';
    pauseControl.innerHTML = `
      <span class="powerup-icon control-key">P</span>
      <span>Pause Game</span>
    `;
    playerDiv.appendChild(pauseControl);
    
    // Add resume control
    const resumeControl = document.createElement('div');
    resumeControl.className = 'powerup-stat';
    resumeControl.innerHTML = `
      <span class="powerup-icon control-key">R</span>
      <span>Resume Game</span>
    `;
    playerDiv.appendChild(resumeControl);
  }
  
  return playerDiv;
}

// Reset all power-ups
export function resetPowerUps(): void {
  // Clear player power-ups
  Object.keys(playerPowerUps).forEach(playerId => {
    playerPowerUps[playerId] = { ...DEFAULT_POWER_UP_VALUES };
  });
  
  // Update HUD
  updateHUD();
}

// Get power-up values for a player
export function getPlayerPowerUps(playerId: string): { bombs: number; flames: number; speed: number; lives: number } {
  return playerPowerUps[playerId] || { ...DEFAULT_POWER_UP_VALUES };
}

// Handle player damaged event
function handlePlayerDamaged(data: { id: string; livesRemaining: number }): void {
  const { id, livesRemaining } = data;
  
  // Get the local player ID
  const localPlayerId = localStorage.getItem('playerId');
  
  // Only update the HUD if this is the local player
  if (id === localPlayerId) {
    console.log(`Updating HUD for local player ${id} with lives: ${livesRemaining}`);
    
    // Initialize player power-ups if not exists
    if (!playerPowerUps[id]) {
      playerPowerUps[id] = { ...DEFAULT_POWER_UP_VALUES };
    }
    
    // Update lives count
    playerPowerUps[id].lives = livesRemaining;
    
    // Update HUD
    updateHUD();
    
    // Check if player is eliminated
    if (livesRemaining <= 0) {
      // Show game over message for the eliminated player
      showGameOverMessage(id);
    }
  } else {
    console.log(`Not updating HUD for remote player ${id}`);
  }
}

// Show game over message
function showGameOverMessage(playerId: string): void {
  // Get player nickname if available
  let playerNickname = playerId;
  const playerElement = document.getElementById(`player-${playerId}`);
  if (playerElement) {
    const nameTagElement = playerElement.querySelector('div');
    if (nameTagElement && nameTagElement.textContent) {
      playerNickname = nameTagElement.textContent.replace(' (You)', '');
    }
  }
  
  // Check if this is the local player
  const isLocalPlayer = localStorage.getItem('playerId') === playerId;
  
  // Create game over overlay
  const overlay = document.createElement('div');
  overlay.className = 'game-over-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fade-in 0.5s ease-in-out;
  `;
  
  // Create game over message
  const message = document.createElement('h1');
  message.textContent = isLocalPlayer ? 
    `GAME OVER - YOU LOST!` : 
    `GAME OVER - ${playerNickname} ELIMINATED!`;
  message.style.cssText = `
    color: #ff3333;
    font-size: 48px;
    margin-bottom: 30px;
    text-shadow: 0 0 15px red;
    font-family: 'Arial', sans-serif;
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: pulse 1.5s infinite alternate;
  `;
  
  // Create lives message
  const livesMessage = document.createElement('div');
  livesMessage.textContent = `No lives remaining`;
  livesMessage.style.cssText = `
    color: white;
    font-size: 24px;
    margin-bottom: 40px;
    font-family: 'Arial', sans-serif;
  `;
  
  // Create restart button
  const restartButton = document.createElement('button');
  restartButton.textContent = 'Play Again';
  restartButton.style.cssText = `
    padding: 15px 30px;
    font-size: 20px;
    background-color: #ff3333;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: 'Arial', sans-serif;
    font-weight: bold;
    transition: all 0.2s ease;
    box-shadow: 0 0 10px rgba(255, 51, 51, 0.5);
    margin-bottom: 20px;
  `;
  
  // Button hover effect
  restartButton.onmouseover = () => {
    restartButton.style.transform = 'scale(1.1)';
    restartButton.style.boxShadow = '0 0 20px rgba(255, 51, 51, 0.8)';
  };
  
  restartButton.onmouseout = () => {
    restartButton.style.transform = 'scale(1)';
    restartButton.style.boxShadow = '0 0 10px rgba(255, 51, 51, 0.5)';
  };
  
  // Add click event to restart button
  restartButton.addEventListener('click', () => {
    // Remove overlay
    document.body.removeChild(overlay);
    
    // Emit game reset event
    eventBus.emit('game:reset', {});
  });
  
  // Add animations if not already added
  if (!document.getElementById('game-over-animations')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'game-over-animations';
    styleEl.textContent = `
      @keyframes fade-in {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); text-shadow: 0 0 15px red; }
        100% { transform: scale(1.05); text-shadow: 0 0 25px red, 0 0 35px red; }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  // Add elements to overlay
  overlay.appendChild(message);
  overlay.appendChild(livesMessage);
  overlay.appendChild(restartButton);
  
  // Add overlay to body
  document.body.appendChild(overlay);
}
