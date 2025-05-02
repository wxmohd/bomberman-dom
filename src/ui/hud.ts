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
  
  // Apply enhanced Egyptian theme styling
  playerDiv.style.cssText = `
    background-color: rgba(210, 180, 140, 0.9);
    border: 3px solid #d4af37;
    border-radius: 10px;
    padding: 15px;
    color: #5D4037;
    font-family: 'Papyrus', 'Copperplate', fantasy;
    min-width: 180px;
    margin-bottom: 15px;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
    background-image: linear-gradient(rgba(210, 180, 140, 0.9), rgba(245, 222, 179, 0.9));
  `;
  
  // Get player nickname from localStorage or use default
  let playerNickname = 'Player';
  let characterTitle = 'Mummy';
  let characterColor = '#d4af37';
  
  if (playerId === localStorage.getItem('playerId')) {
    playerNickname = localStorage.getItem('playerNickname') || 'You';
    // Assign an Egyptian character based on player ID
    const playerIdNum = parseInt(playerId.replace(/\D/g, '')) || 0;
    const characters = [
      { name: 'Pharaoh', color: '#d4af37' },
      { name: 'Mummy', color: '#d4af37' },
      { name: 'Anubis', color: '#d4af37' },
      { name: 'Sphinx', color: '#d4af37' }
    ];
    const character = characters[playerIdNum % 4];
    characterTitle = character.name;
    characterColor = character.color;
    playerNickname = `${playerNickname} (${characterTitle})`;
  }
  
  // Create player header with enhanced Egyptian styling
  const header = document.createElement('h3');
  header.textContent = playerNickname;
  header.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 18px;
    font-weight: bold;
    color: #5D4037;
    border-bottom: 2px solid #d4af37;
    padding-bottom: 8px;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3);
    text-align: center;
  `;
  playerDiv.appendChild(header);
  
  // Create stat container with Egyptian styling
  const statsContainer = document.createElement('div');
  statsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;
  
  // Create power-up stats with Egyptian styling
  // Bombs
  const bombStat = createStatRow('Bombs', powerups.bombs, `${playerId}-bombs`);
  statsContainer.appendChild(bombStat);
  
  // Flames
  const flameStat = createStatRow('Flames', powerups.flames, `${playerId}-flames`);
  // Add heart icon for flames
  const heartIcon = document.createElement('span');
  heartIcon.innerHTML = '❤️';
  heartIcon.style.marginLeft = '5px';
  heartIcon.style.fontSize = '14px';
  flameStat.querySelector('.stat-label')?.appendChild(heartIcon);
  statsContainer.appendChild(flameStat);
  
  // Speed
  const speedStat = createStatRow('Speed', powerups.speed, `${playerId}-speed`);
  statsContainer.appendChild(speedStat);
  
  // Lives
  const livesStat = createStatRow('Lives', powerups.lives, `${playerId}-lives`);
  statsContainer.appendChild(livesStat);
  
  playerDiv.appendChild(statsContainer);
  
  return playerDiv;
}

// Helper function to create stat rows with Egyptian styling
function createStatRow(label: string, value: number, id: string): HTMLElement {
  const statRow = document.createElement('div');
  statRow.className = 'powerup-stat';
  statRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 10px;
    background-color: rgba(245, 222, 179, 0.5);
    border-radius: 6px;
    border-left: 4px solid #d4af37;
  `;
  
  const statLabel = document.createElement('span');
  statLabel.className = 'stat-label';
  statLabel.textContent = label;
  statLabel.style.cssText = `
    color: #5D4037;
    font-weight: bold;
    font-size: 16px;
    text-shadow: 0.5px 0.5px 1px rgba(0, 0, 0, 0.2);
  `;
  statRow.appendChild(statLabel);
  
  const statValue = document.createElement('span');
  statValue.className = 'powerup-value';
  statValue.textContent = value.toString();
  statValue.id = id;
  statValue.style.cssText = `
    font-weight: bold;
    background-color: #d4af37;
    color: #5D4037;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    font-size: 16px;
  `;
  statRow.appendChild(statValue);
  
  return statRow;
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

// Show player elimination message (temporary notification, not full game over)
function showGameOverMessage(playerId: string): void {
  // Only show for local player
  const isLocalPlayer = localStorage.getItem('playerId') === playerId;
  if (!isLocalPlayer) return;
  
  // Get player nickname
  let playerNickname = localStorage.getItem('playerNickname') || 'You';
  
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
  overlay.style.animation = 'fade-in 0.5s ease-in';
  
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
  messageBox.style.animation = 'message-box-animation 0.5s ease-out';
  
  // Add Egyptian decorative elements to the box
  const topDecoration = document.createElement('div');
  topDecoration.style.position = 'absolute';
  topDecoration.style.top = '-15px';
  topDecoration.style.left = '0';
  topDecoration.style.width = '100%';
  topDecoration.style.textAlign = 'center';
  topDecoration.style.fontSize = '24px';
  topDecoration.innerHTML = '&#9779; &#8753; &#8752; &#9779;';
  topDecoration.style.color = '#d4af37';
  messageBox.appendChild(topDecoration);
  
  const bottomDecoration = document.createElement('div');
  bottomDecoration.style.position = 'absolute';
  bottomDecoration.style.bottom = '-15px';
  bottomDecoration.style.left = '0';
  bottomDecoration.style.width = '100%';
  bottomDecoration.style.textAlign = 'center';
  bottomDecoration.style.fontSize = '24px';
  bottomDecoration.innerHTML = '&#9779; &#8753; &#8752; &#9779;';
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
  hieroglyphics.innerHTML = '&#x1330C; &#x13171; &#x131CB; &#x133BC; &#x1337F; &#x1344F;';
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
      
      @keyframes message-box-animation {
        0% { opacity: 0; transform: scale(0.8); }
        70% { opacity: 1; transform: scale(1.05); }
        100% { transform: scale(1); }
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
  
  // Add overlay to body
  document.body.appendChild(overlay);
  
  // Auto-remove after a delay if user doesn't click Play Again
  // This is optional - you can remove this if you want the user to explicitly click Play Again
  /*
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, 10000); // 10 seconds
  */
}
