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
  // Create game over overlay
  const overlay = document.createElement('div');
  overlay.className = 'game-over-overlay';
  overlay.style.cssText = `
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
    z-index: 1000;
  `;
  
  // Create game over message
  const message = document.createElement('h1');
  message.textContent = `Game Over - Player ${playerId} Eliminated!`;
  message.style.cssText = `
    color: white;
    font-size: 36px;
    margin-bottom: 20px;
    text-shadow: 0 0 10px red;
  `;
  
  // Create restart button
  const restartButton = document.createElement('button');
  restartButton.textContent = 'Restart Game';
  restartButton.style.cssText = `
    padding: 10px 20px;
    font-size: 18px;
    background-color: #ff3333;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  `;
  
  // Add click event to restart button
  restartButton.addEventListener('click', () => {
    // Remove overlay
    document.body.removeChild(overlay);
    
    // Emit game reset event
    eventBus.emit('game:reset', {});
  });
  
  // Add elements to overlay
  overlay.appendChild(message);
  overlay.appendChild(restartButton);
  
  // Add overlay to body
  document.body.appendChild(overlay);
}
