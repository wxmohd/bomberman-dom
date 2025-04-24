// Lobby system for player login and waiting room
import { eventBus } from '../../framework/events';
import { h, render } from '../../framework/dom';
import { Store } from '../../framework/state';

// Player state store
export const playerStore = new Store({
  players: [] as Player[],
  currentPlayer: null as Player | null,
  gameState: 'login' as 'login' | 'waiting' | 'countdown' | 'playing',
  lobbyStartTime: 0,
  countdownStartTime: 0,
  countdownSeconds: 10
});

// Player interface
export interface Player {
  id: string;
  nickname: string;
  color: string;
  ready: boolean;
}

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
  
  // Listen for player join events
  eventBus.on('player:join', (player: Player) => {
    const { players } = playerStore.getState();
    
    // Add player if not already in the list
    if (!players.find(p => p.id === player.id)) {
      playerStore.setState({
        players: [...players, player]
      });
      
      // Update waiting room if we're in it
      if (playerStore.getState().gameState === 'waiting') {
        renderWaitingRoom(container);
      }
    }
  });
  
  // Listen for waiting room updates from the server
  eventBus.on('waitingRoom:update', (data) => {
    console.log('Received waiting room update:', data);
    
    // Update players list from server data
    if (data.players) {
      // Map server players to our player format
      const serverPlayers = data.players.map((p: any) => {
        // Get color for this player (either existing or new)
        const existingPlayer = playerStore.getState().players.find(existing => existing.id === p.id);
        const color = existingPlayer ? existingPlayer.color : 
          PLAYER_COLORS[playerStore.getState().players.length % PLAYER_COLORS.length];
        
        return {
          id: p.id,
          nickname: p.nickname,
          color: color,
          ready: true
        };
      });
      
      // Keep our current player in the state
      const { currentPlayer } = playerStore.getState();
      
      // Update the store with server players
      playerStore.setState({
        players: serverPlayers,
        gameState: 'waiting'
      });
      
      // Update waiting room UI
      renderWaitingRoom(container);
    }
  });
  
  // Listen for game start events
  eventBus.on('game:start', () => {
    playerStore.setState({
      gameState: 'playing'
    });
    
    // Clear any timers
    if (lobbyTimerInterval) {
      clearInterval(lobbyTimerInterval);
      lobbyTimerInterval = null;
    }
    
    if (countdownTimerInterval) {
      clearInterval(countdownTimerInterval);
      countdownTimerInterval = null;
    }
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
  // Update game state to waiting
  playerStore.setState({
    gameState: 'waiting'
  });
  
  // Connect to the WebSocket server
  import('../multiplayer/socket').then(({ connectToServer }) => {
    connectToServer(nickname)
      .then(() => {
        console.log(`Connected to server with nickname: ${nickname}`);
        
        // Listen for player joined event from the server
        eventBus.on('player:joined', (data) => {
          console.log('Player joined event received:', data);
          
          // Create player object with server-assigned ID
          const player = {
            id: data.id,
            nickname: data.nickname,
            color: PLAYER_COLORS[playerStore.getState().players.length % PLAYER_COLORS.length],
            ready: true
          };
          
          // Update current player in store
          playerStore.setState({
            currentPlayer: player
          });
          
          console.log(`Player ${nickname} joined with server ID ${data.id}`);
        });
        
        // Render waiting room (will be updated when server sends waitingRoom:update)
        renderWaitingRoom(container);
      })
      .catch(error => {
        console.error('Failed to connect to server:', error);
        alert('Failed to connect to the game server. Please try again.');
        
        // Reset game state to login
        playerStore.setState({
          gameState: 'login'
        });
        
        // Show login screen again
        renderLoginScreen(container);
      });
  });
}

// Start the lobby timer to check if we should start countdown
function startLobbyTimer(container: HTMLElement): void {
  // Clear any existing timer
  if (lobbyTimerInterval) {
    clearInterval(lobbyTimerInterval);
    lobbyTimerInterval = null;
  }
  
  // Calculate the exact time when we should start the countdown
  const { lobbyStartTime } = playerStore.getState();
  const exactCountdownStartTime = lobbyStartTime + 20000; // Exactly 20 seconds after lobby start
  
  // Set a timeout for exactly when the 20 seconds will be up
  const timeUntilCountdown = exactCountdownStartTime - Date.now();
  
  // Set a timeout to start the countdown at exactly 20 seconds
  lobbyTimerInterval = window.setTimeout(() => {
    const { players, gameState } = playerStore.getState();
    
    // If already in countdown or playing, or not enough players, don't start countdown
    if (gameState === 'countdown' || gameState === 'playing' || players.length < 2) {
      return;
    }
    
    // If we have at least 2 players but less than 4, start the countdown
    if (players.length >= 2 && players.length < 4) {
      // Start the countdown
      startCountdown(container);
    }
  }, timeUntilCountdown);
  
  // Also set an interval to update the timer display every second
  const updateInterval = window.setInterval(() => {
    const { players, gameState } = playerStore.getState();
    
    // If already in countdown or playing, clear the interval
    if (gameState === 'countdown' || gameState === 'playing') {
      clearInterval(updateInterval);
      return;
    }
    
    // If we have 4 players, start the countdown instead of starting the game immediately
    if (players.length >= 4) {
      // Start the countdown instead of the game
      startCountdown(container);
      clearInterval(updateInterval);
      
      // Also clear the main timeout if it exists
      if (lobbyTimerInterval) {
        clearTimeout(lobbyTimerInterval);
        lobbyTimerInterval = null;
      }
      return;
    }
    
    // Update the waiting room to show time remaining
    renderWaitingRoom(container);
  }, 1000);
}

// Start the countdown timer
function startCountdown(container: HTMLElement): void {
  // Calculate the exact time when the game should start
  const exactGameStartTime = Date.now() + 10000; // Exactly 10 seconds from now
  
  // Set countdown state
  playerStore.setState({
    gameState: 'countdown',
    countdownStartTime: Date.now(),
    countdownSeconds: 10
  });
  
  // Clear any existing timer
  if (countdownTimerInterval) {
    clearInterval(countdownTimerInterval);
    countdownTimerInterval = null;
  }
  
  // Set a timeout to start the game at exactly 10 seconds
  window.setTimeout(() => {
    startGame();
    
    // Clear the update interval if it exists
    if (countdownTimerInterval) {
      clearInterval(countdownTimerInterval);
      countdownTimerInterval = null;
    }
  }, 10000);
  
  // Start a separate interval just to update the display
  countdownTimerInterval = window.setInterval(() => {
    const { gameState } = playerStore.getState();
    
    // If already playing, clear the interval
    if (gameState === 'playing') {
      // clearInterval(countdownTimerInterval);
      countdownTimerInterval = null;
      return;
    }
    
    // Calculate remaining time precisely
    const secondsRemaining = Math.ceil((exactGameStartTime - Date.now()) / 1000);
    
    // Update countdown in store
    playerStore.setState({
      countdownSeconds: Math.max(0, secondsRemaining)
    });
    
    // Update the waiting room to show countdown
    renderWaitingRoom(container);
  }, 100); // Update more frequently for smoother countdown
}

// Render the waiting room
function renderWaitingRoom(container: HTMLElement): void {
  // Get current state
  const { players, currentPlayer, gameState, lobbyStartTime, countdownSeconds } = playerStore.getState();
  
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
  
  // Create waiting room
  const waitingRoom = document.createElement('div');
  waitingRoom.className = 'waiting-room';
  waitingRoom.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    background-color: #1a1a1a;
    color: white;
    font-family: Arial, sans-serif;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    overflow-y: auto;
  `;
  
  // Create title
  const title = document.createElement('h1');
  title.textContent = 'Waiting for Players';
  title.style.cssText = `
    font-size: 2.5rem;
    margin-bottom: 2rem;
    color: #f44336;
  `;
  
  // Create player counter
  const counterContainer = document.createElement('div');
  counterContainer.className = 'player-counter';
  counterContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
    font-size: 2rem;
  `;
  
  const playerCount = document.createElement('span');
  playerCount.className = 'player-count';
  playerCount.textContent = `${players.length} / 4`;
  playerCount.style.cssText = `
    color: #FFC107;
    font-weight: bold;
    font-size: 3rem;
  `;
  
  counterContainer.appendChild(document.createTextNode('Players: '));
  counterContainer.appendChild(playerCount);
  
  // Show timer information
  if (gameState === 'waiting' && players.length >= 2 && players.length < 4) {
    const timeElapsed = Date.now() - lobbyStartTime;
    const secondsRemaining = Math.max(0, 20 - Math.floor(timeElapsed / 1000));
    
    const timerInfo = document.createElement('div');
    timerInfo.textContent = `Game starts in ${secondsRemaining} seconds if no more players join`;
    timerInfo.style.cssText = `
      font-size: 1.2rem;
      margin-top: 0.5rem;
      color: #FFC107;
    `;
    
    counterContainer.appendChild(timerInfo);
  }
  
  // Show countdown if active
  if (gameState === 'countdown') {
    const countdownElement = document.createElement('div');
    countdownElement.textContent = `Game starting in ${countdownSeconds} seconds!`;
    countdownElement.style.cssText = `
      font-size: 1.5rem;
      margin-top: 0.5rem;
      color: #FF5722;
      font-weight: bold;
    `;
    
    counterContainer.appendChild(countdownElement);
  }
  
  // Create player list
  const playerList = document.createElement('div');
  playerList.style.cssText = `
    width: 100%;
    max-width: 500px;
    margin-bottom: 2rem;
  `;
  
  const playerListTitle = document.createElement('h2');
  playerListTitle.textContent = 'Players in Lobby';
  playerListTitle.style.cssText = `
    font-size: 1.5rem;
    margin-bottom: 1rem;
    text-align: center;
  `;
  
  // Add players to list
  players.forEach((player, index) => {
    const playerItem = document.createElement('div');
    playerItem.style.cssText = `
      display: flex;
      align-items: center;
      padding: 1rem;
      margin-bottom: 0.5rem;
      background-color: #333;
      border-radius: 4px;
      border-left: 5px solid ${player.color};
    `;
    
    const playerNumber = document.createElement('div');
    playerNumber.textContent = `Player ${index + 1}`;
    playerNumber.style.cssText = `
      font-weight: bold;
      margin-right: 1rem;
      color: ${player.color};
    `;
    
    const playerName = document.createElement('div');
    playerName.textContent = player.nickname;
    playerName.style.cssText = `
      flex-grow: 1;
    `;
    
    const playerStatus = document.createElement('div');
    playerStatus.textContent = player.ready ? 'Ready' : 'Not Ready';
    playerStatus.style.cssText = `
      font-style: italic;
      margin-left: 1rem;
      color: ${player.ready ? '#4CAF50' : '#f44336'};
    `;
    
    playerItem.appendChild(playerNumber);
    playerItem.appendChild(playerName);
    playerItem.appendChild(playerStatus);
    
    playerList.appendChild(playerItem);
  });
  
  // Create start button (only visible when enough players)
  const startButton = document.createElement('button');
  startButton.textContent = 'Start Game Now';
  startButton.disabled = players.length < 2;
  startButton.style.cssText = `
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background-color: ${players.length < 2 ? '#666' : '#4CAF50'};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: ${players.length < 2 ? 'not-allowed' : 'pointer'};
  `;
  
  startButton.addEventListener('click', () => {
    if (players.length >= 2) {
      startGame();
    }
  });
  
  // Add elements to the DOM
  counterContainer.appendChild(document.createTextNode('Players: '));
  counterContainer.appendChild(playerCount);
  
  playerList.appendChild(playerListTitle);
  
  waitingRoom.appendChild(title);
  waitingRoom.appendChild(counterContainer);
  waitingRoom.appendChild(playerList);
  waitingRoom.appendChild(startButton);
  
  // Add test buttons for development
  if (players.length < 4) {
    const addPlayerButton = document.createElement('button');
    addPlayerButton.textContent = 'Simulate Player Join (Testing)';
    addPlayerButton.style.cssText = `
      margin-top: 2rem;
      padding: 0.5rem 1rem;
      background-color: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    
    addPlayerButton.addEventListener('click', () => {
      const randomName = `Player${Math.floor(Math.random() * 1000)}`;
      joinGame(randomName, container);
    });
    
    waitingRoom.appendChild(addPlayerButton);
  }
  
  container.appendChild(waitingRoom);
}

// Start the game
function startGame(): void {
  // Emit game start event
  eventBus.emit('game:start', {});
  
  console.log('Game started!');
}

// Export for use in other modules
export { renderLoginScreen, renderWaitingRoom, startGame };
