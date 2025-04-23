// Lobby system for player login and waiting room
import { eventBus } from '../../framework/events';
import { h, render } from '../../framework/dom';
import { Store } from '../../framework/state';

// Player state store
export const playerStore = new Store({
  players: [] as Player[],
  currentPlayer: null as Player | null,
  gameState: 'login' as 'login' | 'waiting' | 'playing'
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
  
  // Listen for game start events
  eventBus.on('game:start', () => {
    playerStore.setState({ gameState: 'playing' });
  });
}

// Render the login screen
function renderLoginScreen(container: HTMLElement): void {
  // Clear container
  container.innerHTML = '';
  
  // Add full-page styles to body
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
  
  // Create login form
  const loginForm = document.createElement('div');
  loginForm.className = 'login-form';
  loginForm.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: #1a1a1a;
    color: white;
    font-family: Arial, sans-serif;
    position: absolute;
    top: 0;
    left: 0;
  `;
  
  // Create title
  const title = document.createElement('h1');
  title.textContent = 'Bomberman DOM';
  title.style.cssText = `
    font-size: 3rem;
    margin-bottom: 2rem;
    color: #f44336;
    text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
  `;
  
  // Create nickname input
  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    margin-bottom: 1.5rem;
    width: 300px;
  `;
  
  const label = document.createElement('label');
  label.textContent = 'Enter your nickname:';
  label.style.cssText = `
    display: block;
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
  `;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Your nickname';
  input.maxLength = 15;
  input.style.cssText = `
    width: 100%;
    padding: 0.8rem;
    font-size: 1.1rem;
    border: none;
    border-radius: 4px;
    background-color: #333;
    color: white;
    outline: none;
  `;
  
  // Create join button
  const joinButton = document.createElement('button');
  joinButton.textContent = 'Join Game';
  joinButton.style.cssText = `
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  `;
  joinButton.addEventListener('mouseover', () => {
    joinButton.style.backgroundColor = '#d32f2f';
  });
  joinButton.addEventListener('mouseout', () => {
    joinButton.style.backgroundColor = '#f44336';
  });
  
  // Handle join button click
  joinButton.addEventListener('click', () => {
    const nickname = input.value.trim();
    if (nickname) {
      joinGame(nickname, container);
    } else {
      alert('Please enter a nickname');
    }
  });
  
  // Handle enter key press
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
  
  // Assemble the form
  inputContainer.appendChild(label);
  inputContainer.appendChild(input);
  loginForm.appendChild(title);
  loginForm.appendChild(inputContainer);
  loginForm.appendChild(joinButton);
  
  // Add form to container
  container.appendChild(loginForm);
  
  // Focus the input
  input.focus();
}

// Join the game with a nickname
function joinGame(nickname: string, container: HTMLElement): void {
  // Generate a unique player ID
  const playerId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Get available color
  const { players } = playerStore.getState();
  const availableColors = PLAYER_COLORS.filter(color => 
    !players.find(p => p.color === color)
  );
  
  const playerColor = availableColors.length > 0 
    ? availableColors[0] 
    : PLAYER_COLORS[players.length % PLAYER_COLORS.length];
  
  // Create player object
  const player: Player = {
    id: playerId,
    nickname,
    color: playerColor,
    ready: true
  };
  
  // Update player store
  playerStore.setState({
    currentPlayer: player,
    players: [...players, player],
    gameState: 'waiting'
  });
  
  // Emit player join event
  eventBus.emit('player:join', player);
  
  // Render waiting room
  renderWaitingRoom(container);
  
  console.log(`Player ${nickname} joined with ID ${playerId}`);
}

// Render the waiting room
function renderWaitingRoom(container: HTMLElement): void {
  // Get current state
  const { players, currentPlayer } = playerStore.getState();
  
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
  counterContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 3rem;
  `;
  
  const counterLabel = document.createElement('div');
  counterLabel.textContent = 'Players:';
  counterLabel.style.cssText = `
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  `;
  
  const counter = document.createElement('div');
  counter.textContent = `${players.length} / 4`;
  counter.style.cssText = `
    font-size: 3rem;
    font-weight: bold;
    color: ${players.length === 4 ? '#4CAF50' : '#FFC107'};
  `;
  
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
    
    // Add "You" indicator if this is the current player
    if (currentPlayer && player.id === currentPlayer.id) {
      const youIndicator = document.createElement('div');
      youIndicator.textContent = '(You)';
      youIndicator.style.cssText = `
        margin-left: 0.5rem;
        font-style: italic;
        color: #aaa;
      `;
      playerName.appendChild(youIndicator);
    }
    
    const readyStatus = document.createElement('div');
    readyStatus.textContent = player.ready ? 'Ready' : 'Not Ready';
    readyStatus.style.cssText = `
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      font-size: 0.8rem;
      background-color: ${player.ready ? '#4CAF50' : '#f44336'};
    `;
    
    playerItem.appendChild(playerNumber);
    playerItem.appendChild(playerName);
    playerItem.appendChild(readyStatus);
    playerList.appendChild(playerItem);
  });
  
  // Create start button (only enabled when 4 players are ready)
  const startButton = document.createElement('button');
  startButton.textContent = players.length === 4 ? 'Start Game' : 'Waiting for more players...';
  startButton.disabled = players.length < 4;
  startButton.style.cssText = `
    padding: 1rem 2rem;
    font-size: 1.2rem;
    background-color: ${players.length === 4 ? '#4CAF50' : '#555'};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: ${players.length === 4 ? 'pointer' : 'not-allowed'};
    transition: background-color 0.3s;
  `;
  
  if (players.length === 4) {
    startButton.addEventListener('mouseover', () => {
      startButton.style.backgroundColor = '#388E3C';
    });
    startButton.addEventListener('mouseout', () => {
      startButton.style.backgroundColor = '#4CAF50';
    });
    
    // Handle start button click
    startButton.addEventListener('click', () => {
      // Emit game start event
      eventBus.emit('game:start', { players });
      
      // This will be handled by the game initialization code
      console.log('Starting game with players:', players);
    });
  }
  
  // Assemble the waiting room
  counterContainer.appendChild(counterLabel);
  counterContainer.appendChild(counter);
  playerList.insertBefore(playerListTitle, playerList.firstChild);
  waitingRoom.appendChild(title);
  waitingRoom.appendChild(counterContainer);
  waitingRoom.appendChild(playerList);
  waitingRoom.appendChild(startButton);
  
  // Add waiting room to container
  container.appendChild(waitingRoom);
  
  // For testing: Add a button to simulate another player joining
  if (players.length < 4) {
    const addPlayerButton = document.createElement('button');
    addPlayerButton.textContent = 'Simulate Player Join (Testing)';
    addPlayerButton.style.cssText = `
      margin-top: 2rem;
      padding: 0.5rem 1rem;
      background-color: #555;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    
    addPlayerButton.addEventListener('click', () => {
      const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      // Create a new player
      const newPlayerId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const availableColors = PLAYER_COLORS.filter(color => 
        !players.find(p => p.color === color)
      );
      
      const newPlayerColor = availableColors.length > 0 
        ? availableColors[0] 
        : PLAYER_COLORS[players.length % PLAYER_COLORS.length];
      
      const newPlayer: Player = {
        id: newPlayerId,
        nickname: `${randomName}${Math.floor(Math.random() * 100)}`,
        color: newPlayerColor,
        ready: true
      };
      
      // Emit player join event
      eventBus.emit('player:join', newPlayer);
    });
    
    waitingRoom.appendChild(addPlayerButton);
  }
}
