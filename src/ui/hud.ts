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
      background-color: rgba(255, 158, 196, 0.8);
      border: 3px solid #ff6bac;
      border-radius: 15px;
      padding: 12px;
      color: #333333;
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      min-width: 160px;
      margin-bottom: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .player-powerups h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: bold;
      border-bottom: 2px dotted #ff6bac;
      padding-bottom: 6px;
      color: #333333;
    }
    
    .powerup-stat {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .powerup-icon {
      margin-right: 10px;
      font-size: 18px;
      color: #ff6bac;
    }
    
    .powerup-value {
      font-weight: bold;
      margin-left: auto;
      background-color: rgba(255, 255, 255, 0.6);
      border-radius: 12px;
      padding: 2px 8px;
      min-width: 20px;
      text-align: center;
    }
    
    .controls-indicator {
      background-color: rgba(255, 158, 196, 0.8);
      border: 3px solid #ff6bac;
      color: #333333;
      padding: 12px;
      border-radius: 15px;
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .controls-indicator strong,
    .control-key {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      text-align: center;
      background-color: #a1d6e2;
      color: #333333;
      border-radius: 6px;
      margin-right: 5px;
      font-weight: bold;
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    @keyframes powerup-highlight {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); color: #ff6bac; background-color: #fff; }
      100% { transform: scale(1); }
    }
    
    .highlight {
      animation: powerup-highlight 0.5s ease-in-out;
    }
    
    /* Powerpuff Girls themed icons */
    .icon-bomb:before { content: '💣'; }
    .icon-flame:before { content: '🔥'; }
    .icon-speed:before { content: '⚡'; }
    .icon-heart:before { content: '❤️'; }
  `;
  
  document.head.appendChild(styleEl);
}

// Handle power-up collected event
function handlePowerUpCollected(data: { playerId: string; type: PowerUpType }): void {
  const { playerId, type } = data;
  
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
}

// Update the HUD display
export function updateHUD(): void {
  if (!hudContainer) return;
  
  // Clear existing HUD
  hudContainer.innerHTML = '';
  
  // Create player power-up displays
  Object.entries(playerPowerUps).forEach(([playerId, powerups]) => {
    const playerHUD = createPlayerHUD(playerId, powerups);
    hudContainer!.appendChild(playerHUD);
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
  const messageBox = document.createElement('div');
  messageBox.className = 'game-over';
  messageBox.style.cssText = `
    background-color: rgba(255, 158, 196, 0.9);
    color: #333333;
    padding: 30px;
    border: 5px solid #ff6bac;
    border-radius: 20px;
    text-align: center;
    max-width: 500px;
    box-shadow: 0 0 20px rgba(255, 107, 172, 0.6);
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
  `;
  
  // Create title
  const title = document.createElement('h2');
  title.style.cssText = `
    margin-top: 0;
    font-size: 32px;
    color: #333333;
    margin-bottom: 20px;
    text-shadow: 2px 2px 0px #ffffff;
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
  `;
  title.textContent = 'Game Paused';
  
  // Create instructions
  const instructions = document.createElement('div');
  instructions.textContent = 'Press R to resume';
  instructions.style.cssText = `
    color: white;
    font-size: 24px;
    margin-bottom: 40px;
    font-family: 'Arial', sans-serif;
  `;
  
  // Add elements to message box
  messageBox.appendChild(title);
  messageBox.appendChild(instructions);
  
  // Add message box to overlay
  pauseOverlay.appendChild(messageBox);
  
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
  playerDiv.id = `player-powerups-${playerId}`;
  
  // Get player nickname from localStorage or use default
  let playerNickname = 'Player';
  let characterColor = '#ff9ec4'; // Default Blossom color
  
  if (playerId === localStorage.getItem('playerId')) {
    playerNickname = localStorage.getItem('playerNickname') || 'You';
    // Assign a Powerpuff Girl character based on player ID
    const playerIdNum = parseInt(playerId.replace(/\D/g, '')) || 0;
    const characters = [
      { name: 'Pharon', color: '#ff9ec4' },
      { name: 'Mummy', color: '#a1d6e2' },
      { name: 'Witch', color: '#bcee68' }
    ];
    const character = characters[playerIdNum % 3];
    characterColor = character.color;
    playerNickname = `${playerNickname} (${character.name})`;
  }
  
  // Apply character color to the player HUD
  playerDiv.style.borderColor = characterColor;
  
  // Create player header with Powerpuff Girls styling
  const header = document.createElement('h3');
  header.textContent = playerNickname;
  header.style.color = '#333333';
  header.style.borderBottomColor = characterColor;
  playerDiv.appendChild(header);
  
  // Create power-up stats with Powerpuff Girls styling
  // Bombs
  const bombStat = document.createElement('div');
  bombStat.className = 'powerup-stat';
  
  const bombIcon = document.createElement('span');
  bombIcon.className = 'powerup-icon icon-bomb';
  bombStat.appendChild(bombIcon);
  
  const bombLabel = document.createElement('span');
  bombLabel.textContent = 'Bombs';
  bombStat.appendChild(bombLabel);
  
  const bombValue = document.createElement('span');
  bombValue.className = 'powerup-value';
  bombValue.textContent = powerups.bombs.toString();
  bombValue.id = `${playerId}-bombs`;
  bombValue.style.borderColor = characterColor;
  bombStat.appendChild(bombValue);
  
  playerDiv.appendChild(bombStat);
  
  // Flames
  const flameStat = document.createElement('div');
  flameStat.className = 'powerup-stat';
  
  const flameIcon = document.createElement('span');
  flameIcon.className = 'powerup-icon icon-flame';
  flameStat.appendChild(flameIcon);
  
  const flameLabel = document.createElement('span');
  flameLabel.textContent = 'Flames';
  flameStat.appendChild(flameLabel);
  
  const flameValue = document.createElement('span');
  flameValue.className = 'powerup-value';
  flameValue.textContent = powerups.flames.toString();
  flameValue.id = `${playerId}-flames`;
  flameValue.style.borderColor = characterColor;
  flameStat.appendChild(flameValue);
  
  playerDiv.appendChild(flameStat);
  
  // Speed
  const speedStat = document.createElement('div');
  speedStat.className = 'powerup-stat';
  
  const speedIcon = document.createElement('span');
  speedIcon.className = 'powerup-icon icon-speed';
  speedStat.appendChild(speedIcon);
  
  const speedLabel = document.createElement('span');
  speedLabel.textContent = 'Speed';
  speedStat.appendChild(speedLabel);
  
  const speedValue = document.createElement('span');
  speedValue.className = 'powerup-value';
  speedValue.textContent = powerups.speed.toString();
  speedValue.id = `${playerId}-speed`;
  speedValue.style.borderColor = characterColor;
  speedStat.appendChild(speedValue);
  
  playerDiv.appendChild(speedStat);
  
  // Lives
  const livesStat = document.createElement('div');
  livesStat.className = 'powerup-stat';
  
  const livesIcon = document.createElement('span');
  livesIcon.className = 'powerup-icon icon-heart';
  livesStat.appendChild(livesIcon);
  
  const livesLabel = document.createElement('span');
  livesLabel.textContent = 'Lives';
  livesStat.appendChild(livesLabel);
  
  const livesValue = document.createElement('span');
  livesValue.className = 'powerup-value';
  livesValue.textContent = powerups.lives.toString();
  livesValue.id = `${playerId}-lives`;
  livesValue.style.borderColor = characterColor;
  livesStat.appendChild(livesValue);
  
  playerDiv.appendChild(livesStat);
  
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
}

// Show game over message
function showGameOverMessage(playerId: string): void {
  // Get player nickname from localStorage or use default
  let playerNickname = 'Player';
  
  if (playerId === localStorage.getItem('playerId')) {
    playerNickname = localStorage.getItem('playerNickname') || 'You';
  }
  
  // Create overlay with Powerpuff Girls theme
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 158, 196, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  // Create game over message
  const message = document.createElement('h1');
  message.textContent = `Game Over - ${playerNickname} Eliminated!`;
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
  livesMessage.textContent = 'No lives remaining';
  livesMessage.style.cssText = `
    color: white;
    font-size: 24px;
    margin-bottom: 40px;
    font-family: 'Arial', sans-serif;
  `;
  
  // Create play again button with Powerpuff Girls theme
  const playAgainButton = document.createElement('button');
  playAgainButton.textContent = 'Play Again';
  playAgainButton.style.cssText = `
    background-color: #ff6bac;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 18px;
    cursor: pointer;
    border-radius: 25px;
    margin-right: 15px;
    transition: all 0.3s;
    font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
    font-weight: bold;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  `;
  
  // Button hover effects with Powerpuff Girls theme
  playAgainButton.onmouseover = () => {
    playAgainButton.style.backgroundColor = '#ff4b8d';
    playAgainButton.style.transform = 'scale(1.05)';
  };
  playAgainButton.onmouseout = () => {
    playAgainButton.style.backgroundColor = '#ff6bac';
    playAgainButton.style.transform = 'scale(1)';
  };
  
  // Add click event to restart button
  playAgainButton.addEventListener('click', () => {
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
  overlay.appendChild(playAgainButton);
  
  // Add overlay to body
  document.body.appendChild(overlay);
}
