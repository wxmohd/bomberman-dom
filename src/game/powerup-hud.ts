// Power-up HUD to display active power-ups for players
import { PowerUpType } from './powerups';
import { eventBus } from '../../framework/events';
import { h, render } from '../../framework/dom';

// Store player power-ups
interface PlayerPowerUps {
  [playerId: string]: {
    bombs: number;
    flames: number;
    speed: number;
  };
}

// Default power-up values
const DEFAULT_POWER_UP_VALUES = {
  bombs: 1,
  flames: 1,
  speed: 1
};

// Store player power-ups
const playerPowerUps: PlayerPowerUps = {};

// HUD container element
let hudContainer: HTMLElement | null = null;

// Initialize the power-up HUD
export function initPowerUpHUD(): void {
  // Create HUD container if it doesn't exist
  if (!hudContainer) {
    hudContainer = document.createElement('div');
    hudContainer.id = 'powerup-hud';
    hudContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 100;
    `;
    document.body.appendChild(hudContainer);
  }
  
  // Add HUD styles
  addHUDStyles();
  
  // Listen for power-up collected events
  eventBus.on('powerup:collected', handlePowerUpCollected);
  
  // Listen for game reset events
  eventBus.on('game:reset', resetPowerUps);
}

// Add HUD styles
function addHUDStyles(): void {
  if (document.getElementById('powerup-hud-styles')) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'powerup-hud-styles';
  styleEl.textContent = `
    .player-powerups {
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      padding: 10px;
      color: white;
      font-family: Arial, sans-serif;
      min-width: 150px;
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
function updateHUD(): void {
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
function createPlayerHUD(playerId: string, powerups: { bombs: number; flames: number; speed: number }): HTMLElement {
  const playerDiv = document.createElement('div');
  playerDiv.className = 'player-powerups';
  playerDiv.dataset.playerId = playerId;
  
  // Player header
  const header = document.createElement('h3');
  header.textContent = `Player ${playerId}`;
  playerDiv.appendChild(header);
  
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
export function getPlayerPowerUps(playerId: string): { bombs: number; flames: number; speed: number } {
  return playerPowerUps[playerId] || { ...DEFAULT_POWER_UP_VALUES };
}
