// Lobby system for player login and waiting room
import { eventBus } from '../../framework/events';
import { h, render } from '../../framework/dom';
import { Store } from '../../framework/state';
import { sendToServer } from '../multiplayer/socket';
import { EVENTS, LobbyData, PlayerData } from '../multiplayer/events';
import { getPlayerId } from '../main';
import { initChatUI } from '../ui/chatUI';

// Player state store
export const playerStore = new Store({
  players: [] as PlayerData[],
  currentPlayer: null as PlayerData | null,
  gameState: 'login' as 'login' | 'waiting' | 'countdown' | 'playing',
  lobbyData: null as LobbyData | null,
  maxPlayers: 4
});

// Available player colors
const PLAYER_COLORS = [
  '#f44336', // Red
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FFC107'  // Yellow
];

// Timer variables
let lobbyTimerInterval: number | null = null;
let countdownTimerInterval: number | null = null;

// Initialize the lobby
export function initLobby(container: HTMLElement): void {
  // Render the login screen
  renderLoginScreen(container);
  
  // Listen for lobby updates from server
  eventBus.on('lobby_update', (data: { lobby: LobbyData }) => {
    console.log('Received lobby update:', data);
    
    // Get previous player count
    const previousPlayerCount = playerStore.getState().players.length;
    
    // Update lobby state
    playerStore.setState({
      players: data.lobby.players,
      lobbyData: data.lobby
    });
    
    // Update waiting room if we're in it
    if (playerStore.getState().gameState === 'waiting') {
      renderWaitingRoom(container);
    }
  });
  
  // Listen for game start event
  eventBus.on('game:started', (data) => {
    console.log('Game started:', data);
    
    // Clear any countdown timer
    if (countdownTimerInterval) {
      clearInterval(countdownTimerInterval);
      countdownTimerInterval = null;
    }
    
    // Update game state
    playerStore.setState({
      gameState: 'playing'
    });
    
    // Emit game start event
    eventBus.emit('game:start', data);
  });
  
  // Listen for error messages
  eventBus.on('error', (data: { message: string }) => {
    // Show error message
    showErrorMessage(data.message);
  });
}

// Render the login screen
function renderLoginScreen(container: HTMLElement): void {
  // Clear container
  container.innerHTML = '';
  
  // Ensure body has full-page styles
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.width = '100vw';
  document.body.style.height = '100vh';
  document.body.style.backgroundColor = '#1a1a1a';
  
  // Make container full-page
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  
  // Create login container
  const loginContainer = document.createElement('div');
  loginContainer.className = 'login-container';
  loginContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: #1a1a1a;
    color: white;
    font-family: Arial, sans-serif;
  `;
  
  // Create title
  const title = document.createElement('h1');
  title.textContent = 'Bomberman';
  title.style.cssText = `
    font-size: 3rem;
    margin-bottom: 2rem;
    color: #f44336;
    text-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
  `;
  
  // Create nickname input
  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 2rem;
    width: 100%;
    max-width: 400px;
  `;
  
  const inputLabel = document.createElement('label');
  inputLabel.textContent = 'Enter your nickname:';
  inputLabel.style.cssText = `
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
    align-self: flex-start;
  `;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Nickname';
  input.style.cssText = `
    width: 100%;
    padding: 1rem;
    font-size: 1.2rem;
    border: none;
    border-radius: 4px;
    background-color: #333;
    color: white;
    margin-bottom: 1rem;
  `;
  
  // Create join button
  const joinButton = document.createElement('button');
  joinButton.textContent = 'Join Game';
  joinButton.style.cssText = `
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
  `;
  
  joinButton.addEventListener('click', () => {
    const nickname = input.value.trim();
    if (nickname) {
      joinGame(nickname, container);
    } else {
      alert('Please enter a nickname');
    }
  });
  
  // Add enter key support
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const nickname = input.value.trim();
      if (nickname) {
        joinGame(nickname, container);
      } else {
        alert('Please enter a nickname');
      }
    }
  });
  
  // Add elements to the DOM
  inputContainer.appendChild(inputLabel);
  inputContainer.appendChild(input);
  inputContainer.appendChild(joinButton);
  
  loginContainer.appendChild(title);
  loginContainer.appendChild(inputContainer);
  
  container.appendChild(loginContainer);
  
  // Focus the input
  input.focus();
}

// Join the game with a nickname
function joinGame(nickname: string, container: HTMLElement): void {
  // Validate nickname
  if (!nickname || nickname.trim().length < 2) {
    showErrorMessage('Please enter a valid nickname (at least 2 characters)');
    return;
  }
  
  // Update player store with waiting state
  playerStore.setState({
    gameState: 'waiting'
  });
  
  // Emit player login event (this will trigger multiplayer initialization)
  eventBus.emit('player:login', { nickname: nickname.trim() });
  
  // Join the lobby via WebSocket
  sendToServer(EVENTS.JOIN_LOBBY, {});
  
  // Render waiting room
  renderWaitingRoom(container);
}
    
// Check if we need to start a countdown timer


// Render the waiting room
function renderWaitingRoom(container: HTMLElement): void {
  // Get current players
  const { players, lobbyData } = playerStore.getState();
  const currentPlayerId = getPlayerId();
  
  // Clear container
  container.innerHTML = '';
  
  // Create waiting room container
  const waitingRoomContainer = document.createElement('div');
  waitingRoomContainer.className = 'waiting-room';
  waitingRoomContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: #1a1a1a;
    color: white;
    font-family: Arial, sans-serif;
  `;
  
  // Create title
  const title = document.createElement('h1');
  title.textContent = 'Waiting for Players';
  title.style.cssText = `
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #f44336;
    text-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
  `;
  
  // Create player count
  const playerCount = document.createElement('h2');
  playerCount.textContent = `Players: ${players.length} / ${playerStore.getState().maxPlayers}`;
  playerCount.style.cssText = `
    font-size: 1.5rem;
    margin-bottom: 2rem;
    color: #FFC107;
  `;
  
  // Create countdown timer if enough players
  const timerElement = document.createElement('h2');
  timerElement.style.cssText = `
    font-size: 1.5rem;
    margin-bottom: 2rem;
    color: #FF5252;
  `;
  
  // Create player list container
  const playerListContainer = document.createElement('div');
  playerListContainer.style.cssText = `
    width: 80%;
    max-width: 500px;
    margin-bottom: 2rem;
  `;
  
  // Create player list title
  const playerListTitle = document.createElement('h3');
  playerListTitle.textContent = 'Players In Lobby';
  playerListTitle.style.cssText = `
    font-size: 1.5rem;
    margin-bottom: 1rem;
    text-align: center;
    color: white;
  `;
  
  // Create player list
  const playerList = document.createElement('div');
  playerList.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  `;
  
  // Add players to list
  players.forEach(player => {
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    playerItem.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background-color: #333;
      border-radius: 4px;
    `;
    
    // Player name and color
    const playerInfo = document.createElement('div');
    playerInfo.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `;
    
    // Player color indicator
    const colorIndicator = document.createElement('span');
    colorIndicator.style.cssText = `
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: ${player.color};
    `;
    
    // Player name
    const playerName = document.createElement('span');
    playerName.textContent = player.id === currentPlayerId ? `${player.nickname} (You)` : player.nickname;
    
    playerInfo.appendChild(colorIndicator);
    playerInfo.appendChild(playerName);
    
    playerItem.appendChild(playerInfo);
    playerList.appendChild(playerItem);
  });
  
  // Add player list to container
  playerListContainer.appendChild(playerListTitle);
  playerListContainer.appendChild(playerList);
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 1rem;
  `;
  
  // Create chat toggle button
  const chatButton = document.createElement('button');
  chatButton.textContent = 'Open Chat';
  chatButton.style.cssText = `
    padding: 12px 24px;
    font-size: 18px;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  // Toggle chat visibility on click
  chatButton.addEventListener('click', () => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      const isVisible = chatContainer.style.display !== 'none';
      chatContainer.style.display = isVisible ? 'none' : 'block';
      chatButton.textContent = isVisible ? 'Open Chat' : 'Close Chat';
    } else {
      console.log('Chat container not found, initializing chat UI');
      // If chat container doesn't exist, initialize it
      const gameContainer = document.getElementById('app');
      if (gameContainer) {
        // Initialize chat UI directly
        initChatUI(gameContainer);
        chatButton.textContent = 'Close Chat';
      }
    }
  });
  
  buttonContainer.appendChild(chatButton);
  
  // Add elements to container
  waitingRoomContainer.appendChild(title);
  waitingRoomContainer.appendChild(playerCount);
  waitingRoomContainer.appendChild(timerElement);
  waitingRoomContainer.appendChild(playerListContainer);
  waitingRoomContainer.appendChild(buttonContainer);
  
  // Add waiting room to container
  container.appendChild(waitingRoomContainer);
  
  // Check if we should start a timer
  if (players.length >= 2 && players.length < 4) {
    // Start a 20 second timer
    startLobbyTimer(20, timerElement);
  } else if (players.length === 4) {
    // Start a 10 second timer if we have max players
    startLobbyTimer(10, timerElement);
  } else {
    // Clear any existing timer
    if (lobbyTimerInterval) {
      clearInterval(lobbyTimerInterval);
      lobbyTimerInterval = null;
    }
    timerElement.textContent = 'Waiting for more players...';
  }
}

// Start a countdown timer for lobby
function startLobbyTimer(seconds: number, element: HTMLElement): void {
  // Clear any existing intervals
  if (lobbyTimerInterval) {
    clearInterval(lobbyTimerInterval);
    lobbyTimerInterval = null;
  }
  
  if (countdownTimerInterval) {
    clearInterval(countdownTimerInterval);
    countdownTimerInterval = null;
  }
  
  let timeLeft = seconds;
  
  // Update the timer text
  element.textContent = `Game starts in ${timeLeft} seconds if no more players join`;
  
  // Create an interval to update the timer
  lobbyTimerInterval = window.setInterval(() => {
    timeLeft--;
    
    // Update the timer text
    element.textContent = `Game starts in ${timeLeft} seconds if no more players join`;
    
    // Check if the timer has reached zero
    if (timeLeft <= 0) {
      // Clear the interval
      if (lobbyTimerInterval) {
        clearInterval(lobbyTimerInterval);
        lobbyTimerInterval = null;
      }
      
      // Start the game countdown
      startGameCountdown(10, element);
    }
    
    // Check if the player count has changed (more players joined)
    const currentPlayers = playerStore.getState().players;
    if (currentPlayers.length >= 4 || currentPlayers.length < 2) {
      // Clear the interval and reset the timer
      if (lobbyTimerInterval) {
        clearInterval(lobbyTimerInterval);
        lobbyTimerInterval = null;
      }
      element.textContent = '';
    }
  }, 1000);
}

// Start a countdown timer for game start
function startGameCountdown(seconds: number, element: HTMLElement): void {
  // Clear any existing intervals
  if (countdownTimerInterval) {
    clearInterval(countdownTimerInterval);
    countdownTimerInterval = null;
  }
  
  if (lobbyTimerInterval) {
    clearInterval(lobbyTimerInterval);
    lobbyTimerInterval = null;
  }
  
  let timeLeft = seconds;
  
  // Update the timer text
  element.textContent = `Game starting in ${timeLeft} seconds!`;
  element.style.color = '#FF5252';
  
  // Set game state to countdown
  playerStore.setState({
    gameState: 'countdown'
  });
  
  // Create an interval to update the timer
  countdownTimerInterval = window.setInterval(() => {
    timeLeft--;
    
    // Update the timer text
    element.textContent = `Game starting in ${timeLeft} seconds!`;
    
    // Check if the timer has reached zero
    if (timeLeft <= 0) {
      // Clear the interval
      if (countdownTimerInterval) {
        clearInterval(countdownTimerInterval);
        countdownTimerInterval = null;
      }
      
      element.textContent = 'Starting game...';
      
      // Force start the game immediately
      console.log('Final countdown complete, forcing game start');
      sendToServer('start_game', {});
    }
    
    // Check if the player count has changed (more players joined or left)
    const currentPlayers = playerStore.getState().players;
    if (currentPlayers.length >= 4 || currentPlayers.length < 2) {
      // Clear the interval and reset the timer
      if (countdownTimerInterval) {
        clearInterval(countdownTimerInterval);
        countdownTimerInterval = null;
      }
      element.textContent = '';
      
      // Re-render the waiting room
      const appContainer = document.getElementById('app');
      if (appContainer) {
        renderWaitingRoom(appContainer);
      }
    }
  }, 1000);
}

// Update the waiting room UI without recreating it
function updateWaitingRoom(): void {
  // If we're in the waiting state, re-render the waiting room
  if (playerStore.getState().gameState === 'waiting') {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      renderWaitingRoom(appContainer);
    }
  }
}

// Show error message
function showErrorMessage(message: string): void {
  const errorMessage = document.createElement('div');
  errorMessage.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(255, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    z-index: 9999;
  `;
  errorMessage.textContent = message;
  document.body.appendChild(errorMessage);
  
  // Remove error message after 5 seconds
  setTimeout(() => {
    if (errorMessage.parentNode) {
      errorMessage.parentNode.removeChild(errorMessage);
    }
  }, 5000);
}

// Export for use in other modules
export { renderLoginScreen, renderWaitingRoom };
