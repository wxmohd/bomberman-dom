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
    hudContainer.style.position = 'fixed';
    hudContainer.style.top = '80px';
    hudContainer.style.left = '10px';
    hudContainer.style.display = 'flex';
    hudContainer.style.flexDirection = 'column';
    hudContainer.style.gap = '10px';
    hudContainer.style.zIndex = '100';
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
  pauseOverlay.style.position = 'fixed';
  pauseOverlay.style.top = '0';
  pauseOverlay.style.left = '0';
  pauseOverlay.style.width = '100%';
  pauseOverlay.style.height = '100%';
  pauseOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  pauseOverlay.style.display = 'flex';
  pauseOverlay.style.flexDirection = 'column';
  pauseOverlay.style.justifyContent = 'center';
  
  // Create message box
  const messageBox = document.createElement('div');
  messageBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  messageBox.style.padding = '20px';
  messageBox.style.borderRadius = '10px';
  messageBox.style.border = '3px solid #d4af37';
  messageBox.style.textAlign = 'center';
  messageBox.style.maxWidth = '500px';
  messageBox.style.display = 'flex';
  messageBox.style.flexDirection = 'column';
  messageBox.style.justifyContent = 'center';
  
  // Create title
  const title = document.createElement('h2');
  title.style.color = '#f5e7c1';
  title.style.fontSize = '24px';
  title.style.marginTop = '5px';
  title.style.marginBottom = '10px';
  title.style.fontFamily = "'Papyrus', 'Copperplate', fantasy";
  title.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
  title.textContent = 'Game Paused';
  
  // Create instructions
  const instructions = document.createElement('p');
  instructions.style.color = '#d4af37';
  instructions.style.fontSize = '16px';
  instructions.style.marginTop = '10px';
  instructions.style.fontFamily = "'Papyrus', 'Copperplate', fantasy";
  instructions.textContent = 'Press R to resume';
  
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
  
  // Apply Egyptian theme styling
  playerDiv.style.backgroundColor = 'rgba(126, 112, 83, 0.85)';
  playerDiv.style.border = '2px solid #d4af37';
  playerDiv.style.borderRadius = '5px';
  playerDiv.style.padding = '12px';
  playerDiv.style.color = '#f5e7c1';
  playerDiv.style.fontFamily = "'Papyrus', 'Copperplate', fantasy";
  playerDiv.style.minWidth = '160px';
  playerDiv.style.marginBottom = '10px';
  playerDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
  
  // Get player nickname from localStorage or use default
  let playerNickname = 'Player';
  let characterColor = '#ff9ec4'; // Default Blossom color
  
  if (playerId === localStorage.getItem('playerId')) {
    playerNickname = localStorage.getItem('playerNickname') || 'You';
    // Assign an Egyptian character based on player ID
    const playerIdNum = parseInt(playerId.replace(/\D/g, '')) || 0;
    const characters = [
      { name: 'Pharaoh', color: '#d4af37' },
      { name: 'Mummy', color: '#e4c49b' },
      { name: 'Anubis', color: '#7e7053' }
    ];
    const character = characters[playerIdNum % 3];
    characterColor = character.color;
    playerNickname = `${playerNickname} (${character.name})`;
  }
  
  // Character color is used for accents in the Egyptian theme
  // We're using gold borders consistently instead of character colors
  
  // Create player header with Egyptian styling
  const header = document.createElement('h3');
  header.textContent = playerNickname;
  header.style.margin = '0 0 10px 0';
  header.style.fontSize = '16px';
  header.style.fontWeight = 'bold';
  header.style.color = '#f5e7c1';
  header.style.borderBottom = '2px dotted #d4af37';
  header.style.paddingBottom = '6px';
  header.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.5)';
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
  bombLabel.style.color = '#f5e7c1';
  bombStat.appendChild(bombLabel);
  
  const bombValue = document.createElement('span');
  bombValue.className = 'powerup-value';
  bombValue.textContent = powerups.bombs.toString();
  bombValue.id = `${playerId}-bombs`;
  bombValue.style.fontWeight = 'bold';
  bombValue.style.marginLeft = 'auto';
  bombValue.style.backgroundColor = 'rgba(212, 175, 55, 0.3)';
  bombValue.style.border = '1px solid #d4af37';
  bombValue.style.borderRadius = '50%';
  bombValue.style.padding = '2px 8px';
  bombValue.style.minWidth = '20px';
  bombValue.style.textAlign = 'center';
  bombValue.style.color = '#ffffff';
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
  flameLabel.style.color = '#f5e7c1';
  flameStat.appendChild(flameLabel);
  
  const flameValue = document.createElement('span');
  flameValue.className = 'powerup-value';
  flameValue.textContent = powerups.flames.toString();
  flameValue.id = `${playerId}-flames`;
  flameValue.style.fontWeight = 'bold';
  flameValue.style.marginLeft = 'auto';
  flameValue.style.backgroundColor = 'rgba(212, 175, 55, 0.3)';
  flameValue.style.border = '1px solid #d4af37';
  flameValue.style.borderRadius = '50%';
  flameValue.style.padding = '2px 8px';
  flameValue.style.minWidth = '20px';
  flameValue.style.textAlign = 'center';
  flameValue.style.color = '#ffffff';
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
  speedLabel.style.color = '#f5e7c1';
  speedStat.appendChild(speedLabel);
  
  const speedValue = document.createElement('span');
  speedValue.className = 'powerup-value';
  speedValue.textContent = powerups.speed.toString();
  speedValue.id = `${playerId}-speed`;
  speedValue.style.fontWeight = 'bold';
  speedValue.style.marginLeft = 'auto';
  speedValue.style.backgroundColor = 'rgba(212, 175, 55, 0.3)';
  speedValue.style.border = '1px solid #d4af37';
  speedValue.style.borderRadius = '50%';
  speedValue.style.padding = '2px 8px';
  speedValue.style.minWidth = '20px';
  speedValue.style.textAlign = 'center';
  speedValue.style.color = '#ffffff';
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
  livesLabel.style.color = '#f5e7c1';
  livesStat.appendChild(livesLabel);
  
  const livesValue = document.createElement('span');
  livesValue.className = 'powerup-value';
  livesValue.textContent = powerups.lives.toString();
  livesValue.id = `${playerId}-lives`;
  livesValue.style.fontWeight = 'bold';
  livesValue.style.marginLeft = 'auto';
  livesValue.style.backgroundColor = 'rgba(212, 175, 55, 0.3)';
  livesValue.style.border = '1px solid #d4af37';
  livesValue.style.borderRadius = '50%';
  livesValue.style.padding = '2px 8px';
  livesValue.style.minWidth = '20px';
  livesValue.style.textAlign = 'center';
  livesValue.style.color = '#ffffff';
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
  // Get player nickname
  let playerNickname = 'Player';
  
  // If this is the local player, use their nickname
  if (playerId === localStorage.getItem('playerId')) {
    playerNickname = localStorage.getItem('playerNickname') || 'You';
  }
  
  // Create overlay with Egyptian theme
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '1000';
  
  // Create message box with Egyptian theme
  const messageBox = document.createElement('div');
  messageBox.style.backgroundColor = 'rgba(126, 112, 83, 0.95)';
  messageBox.style.border = '4px solid #d4af37';
  messageBox.style.borderRadius = '10px';
  messageBox.style.padding = '30px 40px';
  messageBox.style.maxWidth = '500px';
  messageBox.style.textAlign = 'center';
  messageBox.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.5)';
  messageBox.style.position = 'relative';
  
  // Add Egyptian decorative elements to the box
  const topDecoration = document.createElement('div');
  topDecoration.style.position = 'absolute';
  topDecoration.style.top = '-15px';
  topDecoration.style.left = '0';
  topDecoration.style.width = '100%';
  topDecoration.style.textAlign = 'center';
  topDecoration.style.fontSize = '24px';
  topDecoration.innerHTML = '&#160; &#160; &#160;';
  topDecoration.style.color = '#d4af37';
  messageBox.appendChild(topDecoration);
  
  const bottomDecoration = document.createElement('div');
  bottomDecoration.style.position = 'absolute';
  bottomDecoration.style.bottom = '-15px';
  bottomDecoration.style.left = '0';
  bottomDecoration.style.width = '100%';
  bottomDecoration.style.textAlign = 'center';
  bottomDecoration.style.fontSize = '24px';
  bottomDecoration.innerHTML = '&#160; &#160; &#160;';
  bottomDecoration.style.color = '#d4af37';
  messageBox.appendChild(bottomDecoration);
  
  // Create game over message
  const message = document.createElement('h1');
  message.textContent = `Game Over`;
  message.style.color = '#d4af37';
  message.style.fontSize = '42px';
  message.style.margin = '0 0 20px 0';
  message.style.textShadow = '0 0 10px rgba(245, 231, 193, 0.5)';
  message.style.fontFamily = "'Papyrus', 'Copperplate', fantasy";
  message.style.textTransform = 'uppercase';
  message.style.letterSpacing = '2px';
  message.style.animation = 'pulse 1.5s infinite alternate';
  messageBox.appendChild(message);
  
  // Create player eliminated message
  const playerMessage = document.createElement('h2');
  playerMessage.textContent = `${playerNickname} Eliminated!`;
  playerMessage.style.color = '#f5e7c1';
  playerMessage.style.fontSize = '28px';
  playerMessage.style.margin = '0 0 30px 0';
  playerMessage.style.fontFamily = "'Papyrus', 'Copperplate', fantasy";
  messageBox.appendChild(playerMessage);
  
  // Create lives message
  const livesMessage = document.createElement('div');
  livesMessage.textContent = 'No lives remaining';
  livesMessage.style.color = '#f5e7c1';
  livesMessage.style.fontSize = '20px';
  livesMessage.style.marginBottom = '30px';
  livesMessage.style.fontFamily = "'Papyrus', 'Copperplate', fantasy";
  messageBox.appendChild(livesMessage);
  
  // Create hieroglyphic decoration
  const hieroglyphics = document.createElement('div');
  hieroglyphics.style.fontSize = '24px';
  hieroglyphics.style.color = '#d4af37';
  hieroglyphics.style.margin = '15px 0';
  hieroglyphics.innerHTML = '&#160; &#160; &#160; &#160; &#160; &#160;';
  messageBox.appendChild(hieroglyphics);
  
  // Create play again button with Egyptian theme
  const playAgainButton = document.createElement('button');
  playAgainButton.textContent = 'Play Again';
  playAgainButton.style.backgroundColor = '#d4af37';
  playAgainButton.style.color = '#000';
  playAgainButton.style.border = 'none';
  playAgainButton.style.padding = '12px 30px';
  playAgainButton.style.fontSize = '18px';
  playAgainButton.style.cursor = 'pointer';
  playAgainButton.style.borderRadius = '5px';
  playAgainButton.style.margin = '10px 0';
  playAgainButton.style.transition = 'all 0.3s';
  playAgainButton.style.fontFamily = "'Papyrus', 'Copperplate', fantasy";
  playAgainButton.style.fontWeight = 'bold';
  playAgainButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
  messageBox.appendChild(playAgainButton);
  
  // Button hover effects with Egyptian theme
  playAgainButton.onmouseover = () => {
    playAgainButton.style.backgroundColor = '#f5e7c1';
    playAgainButton.style.transform = 'scale(1.05)';
  };
  playAgainButton.onmouseout = () => {
    playAgainButton.style.backgroundColor = '#d4af37';
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
        0% { transform: scale(1); text-shadow: 0 0 10px rgba(245, 231, 193, 0.5); }
        100% { transform: scale(1.03); text-shadow: 0 0 20px rgba(212, 175, 55, 0.8), 0 0 30px rgba(245, 231, 193, 0.5); }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  // Add message box to overlay
  overlay.appendChild(messageBox);
  
  // Add overlay to body with fade-in animation
  overlay.style.animation = 'fade-in 0.5s ease-in';
  document.body.appendChild(overlay);
}
