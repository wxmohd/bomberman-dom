// Game HUD UI (lives, timer, power-ups)
import { PowerUpType } from '../game/powerups';
import { eventBus } from '../../framework/events';
import { h, render } from '../../framework/dom';
import { isConnectedToServer, getSocket } from '../multiplayer/socket';

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
    // Create the HUD container using the framework's h function
    const hudContainerVNode = h('div', {
      id: 'game-hud',
      style: `
        position: fixed;
        top: 80px;
        left: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 100;
      `
    }, []);
    
    // Render the HUD container
    hudContainer = render(hudContainerVNode) as HTMLElement;
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
  
  // Create style element using the framework's h function
  const styleVNode = h('style', {
    id: 'game-hud-styles'
  }, [
    `
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
    .icon-life:before { content: '❤️'; }
    `
  ]);
  
  // Render the style element
  const renderedStyle = render(styleVNode) as HTMLElement;
  
  // Add to document head
  document.head.appendChild(renderedStyle);
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
  
  // Create title using h function
  const titleVNode = h('h2', {
    style: `
      color: #f5e7c1;
      font-size: 24px;
      margin-top: 5px;
      margin-bottom: 10px;
      font-family: 'Papyrus', 'Copperplate', fantasy;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    `
  }, ['Game Paused']);
  
  // Create instructions using h function
  const instructionsVNode = h('p', {
    style: `
      color: #d4af37;
      font-size: 16px;
      margin-top: 10px;
      font-family: 'Papyrus', 'Copperplate', fantasy;
    `
  }, ['Press R to resume']);
  
  // Create message box using h function
  const messageBoxVNode = h('div', {
    style: `
      background-color: rgba(0, 0, 0, 0.8);
      padding: 20px;
      border-radius: 10px;
      border: 3px solid #d4af37;
      text-align: center;
      max-width: 500px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin: 0 auto;
    `
  }, [titleVNode, instructionsVNode]);
  
  // Create pause overlay using h function
  const pauseOverlayVNode = h('div', {
    class: 'pause-overlay',
    style: `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      justify-content: center;
      z-index: 10000;
    `
  }, [messageBoxVNode]);
  
  // Render the pause overlay
  pauseOverlay = render(pauseOverlayVNode) as HTMLElement;
  
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
  
  // Create header using h function
  const headerVNode = h('h3', {
    style: `
      margin: 0 0 15px 0;
      font-size: 18px;
      font-weight: bold;
      color: #5D4037;
      border-bottom: 2px solid #d4af37;
      padding-bottom: 8px;
      text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.3);
      text-align: center;
    `
  }, [playerNickname]);
  
  // Create bombs stat
  const bombStat = createStatRow('Bombs', powerups.bombs, `${playerId}-bombs`);
  
  // Create flames stat with heart icon
  const flamesLabelVNode = h('span', {
    class: 'stat-label',
    style: `
      color: #5D4037;
      font-weight: bold;
      font-size: 16px;
      text-shadow: 0.5px 0.5px 1px rgba(0, 0, 0, 0.2);
    `
  }, ['Flames ', h('span', { style: 'margin-left: 5px; font-size: 14px;' }, ['❤️'])]);
  
  const flamesValueVNode = h('span', {
    class: 'powerup-value',
    id: `${playerId}-flames`,
    style: `
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
    `
  }, [powerups.flames.toString()]);
  
  const flameStatVNode = h('div', {
    class: 'powerup-stat',
    style: `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 10px;
      background-color: rgba(245, 222, 179, 0.5);
      border-radius: 6px;
      border-left: 4px solid #d4af37;
    `
  }, [flamesLabelVNode, flamesValueVNode]);
  
  const flameStat = render(flameStatVNode) as HTMLElement;
  
  // Create speed stat
  const speedStat = createStatRow('Speed', powerups.speed, `${playerId}-speed`);
  
  // Create lives stat
  const livesStat = createStatRow('Lives', powerups.lives, `${playerId}-lives`);
  
  // Create the stats directly as virtual nodes instead of rendering them first
  // Create bombs stat
  const bombStatVNode = createStatRowVNode('Bombs', powerups.bombs, `${playerId}-bombs`);
  
  // Speed stat
  const speedStatVNode = createStatRowVNode('Speed', powerups.speed, `${playerId}-speed`);
  
  // Lives stat
  const livesStatVNode = createStatRowVNode('Lives', powerups.lives, `${playerId}-lives`);
  
  // Create stats container using h function
  const statsContainerVNode = h('div', {
    style: `
      display: flex;
      flex-direction: column;
      gap: 12px;
    `
  }, [bombStatVNode, flameStatVNode, speedStatVNode, livesStatVNode]);
  
  // Create player div using h function
  const playerDivVNode = h('div', {
    class: 'player-powerups',
    id: `player-powerups-${playerId}`,
    style: `
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
    `
  }, [headerVNode, statsContainerVNode]);
  
  // Render the player div
  return render(playerDivVNode) as HTMLElement;
}

// Helper function to create stat row VNode (not rendered yet)
function createStatRowVNode(label: string, value: number, id: string) {
  // Create the stat value element using h function
  const statValueVNode = h('span', {
    class: 'powerup-value',
    id: id,
    style: `
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
    `
  }, [value.toString()]);
  
  // Create the stat label element using h function
  const statLabelVNode = h('span', {
    class: 'stat-label',
    style: `
      color: #5D4037;
      font-weight: bold;
      font-size: 16px;
      text-shadow: 0.5px 0.5px 1px rgba(0, 0, 0, 0.2);
    `
  }, [label]);
  
  // Create the stat row element using h function
  return h('div', {
    class: 'powerup-stat',
    style: `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 10px;
      background-color: rgba(245, 222, 179, 0.5);
      border-radius: 6px;
      border-left: 4px solid #d4af37;
    `
  }, [statLabelVNode, statValueVNode]);
}

// Helper function to create stat rows with Egyptian styling (rendered version)
function createStatRow(label: string, value: number, id: string): HTMLElement {
  // Render the stat row element
  return render(createStatRowVNode(label, value, id)) as HTMLElement;
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
  
  // Create back to menu button with Egyptian theme
  const backToMenuButton = document.createElement('button');
  backToMenuButton.textContent = 'Back to Menu';
  backToMenuButton.style.backgroundColor = '#d4af37';
  backToMenuButton.style.color = '#000';
  backToMenuButton.style.border = 'none';
  backToMenuButton.style.padding = '12px 30px';
  backToMenuButton.style.fontSize = '18px';
  backToMenuButton.style.cursor = 'pointer';
  backToMenuButton.style.borderRadius = '5px';
  backToMenuButton.style.margin = '10px 0';
  backToMenuButton.style.transition = 'all 0.3s';
  backToMenuButton.style.fontFamily = "'Papyrus', 'Copperplate', fantasy";
  backToMenuButton.style.fontWeight = 'bold';
  backToMenuButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
  messageBox.appendChild(backToMenuButton);
  
  // Button hover effects with Egyptian theme
  backToMenuButton.onmouseover = () => {
    backToMenuButton.style.backgroundColor = '#f5e7c1';
    backToMenuButton.style.transform = 'scale(1.05)';
  };
  backToMenuButton.onmouseout = () => {
    backToMenuButton.style.backgroundColor = '#d4af37';
    backToMenuButton.style.transform = 'scale(1)';
  };
  
  // Add click event to back to menu button
  backToMenuButton.addEventListener('click', () => {
    // Remove overlay
    document.body.removeChild(overlay);
    
    // Clear any stored player ID to ensure a fresh start
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerNickname');
    
    // Disconnect from the server if connected
    if (typeof isConnectedToServer === 'function' && isConnectedToServer()) {
      const socket = typeof getSocket === 'function' ? getSocket() : null;
      if (socket) {
        socket.disconnect();
      }
    }
    
    // Redirect to the start page (nickname entry)
    window.location.href = '/';
    window.location.reload(); // Force a full page reload to clear any lingering state
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
