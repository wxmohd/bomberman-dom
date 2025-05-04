// Egyptian Pyramid theme UI components
import { eventBus } from '../../framework/events';
import { h, render } from '../../framework/dom';

// Character data using the provided player images
const EGYPTIAN_CHARACTERS = [
  {
    id: 'ik',
    name: 'IK',
    color: '#d4af37',
    description: 'A powerful warrior with exceptional bomb skills.',
    abilities: 'Extra bomb range',
    image: '/img/IK.png'
  },
  {
    id: 'mmd',
    name: 'MMD',
    color: '#e4c49b',
    description: 'A swift explorer with unmatched speed.',
    abilities: 'Faster movement speed',
    image: '/img/MMD.png'
  },
  {
    id: 'wa',
    name: 'WA',
    color: '#4a4233',
    description: 'A tactical genius with explosive expertise.',
    abilities: 'Extra bomb capacity',
    image: '/img/WA.png'
  },
  {
    id: 'mg',
    name: 'MG',
    color: '#7e7053',
    description: 'A master of defense and strategic planning.',
    abilities: 'Extra life point',
    image: '/img/MG.png'
  }
];

// Initialize Egyptian theme
export function initEgyptTheme(container: HTMLElement): void {
  // Add Egyptian background music
  addBackgroundMusic();
  
  // Add Egyptian sound effects
  addSoundEffects();
  
  // Add Egyptian character selection to the lobby
  eventBus.on('lobby:show', () => {
    setTimeout(() => {
      const lobbyContainer = document.querySelector('.lobby-container');
      if (lobbyContainer) {
        addCharacterSelection(lobbyContainer as HTMLElement);
      }
    }, 500);
  });
}

// Global reference to the music element
let backgroundMusic: HTMLAudioElement | null = null;

// Add Egyptian background music
function addBackgroundMusic(): void {
  // Check if music already exists
  if (document.getElementById('egypt-background-music')) {
    backgroundMusic = document.getElementById('egypt-background-music') as HTMLAudioElement;
    return;
  }
  
  // Create audio element for background music
  backgroundMusic = document.createElement('audio');
  backgroundMusic.id = 'egypt-background-music';
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.3;
  
  // Use Egyptian themed music from local file with absolute path
  backgroundMusic.src = '/MP3/wayah.mp3';
  
  // Add to document
  document.body.appendChild(backgroundMusic);
  
  // Add volume control
  const volumeControl = document.createElement('div');
  volumeControl.className = 'volume-control';
  volumeControl.innerHTML = `
    <div class="volume-slider-container">
      <span class="volume-icon">🔊</span>
      <input type="range" id="volume-slider" min="0" max="100" value="30" class="slider">
    </div>
  `;
  
  // Style volume control
  volumeControl.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 1000;
    padding: 10px;
    background-color: rgba(126, 112, 83, 0.8);
    border: 2px solid #d4af37;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  `;
  
  // Add to document
  setTimeout(() => {
    document.body.appendChild(volumeControl);
    
    // Add event listener for volume slider
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    if (volumeSlider && backgroundMusic) {
      volumeSlider.addEventListener('input', () => {
        const volume = parseInt(volumeSlider.value) / 100;
        backgroundMusic!.volume = volume;
      });
    }
  }, 1000);
  
  // Add styles for volume control
  const style = document.createElement('style');
  style.textContent = `
    .volume-slider-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .volume-icon {
      color: #d4af37;
      font-size: 18px;
    }
    
    .slider {
      -webkit-appearance: none;
      width: 100px;
      height: 8px;
      background: #4a4233;
      outline: none;
      border-radius: 4px;
    }
    
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: #d4af37;
      cursor: pointer;
      border-radius: 50%;
    }
    
    .slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: #d4af37;
      cursor: pointer;
      border-radius: 50%;
      border: none;
    }
  `;
  document.head.appendChild(style);
  
  // Set up event listeners for game start and end
  setupMusicEventListeners();
  
  console.log('Egyptian music initialized and ready to play when game starts');
}

// Set up event listeners for game start and end
function setupMusicEventListeners(): void {
  // Listen for game start event
  eventBus.on('game:started', () => {
    console.log('Game started, playing music');
    playMusic();
  });
  
  // Also listen for game:start event (different event name used in some places)
  eventBus.on('game:start', () => {
    console.log('Game start event received, playing music');
    playMusic();
  });
  
  // Listen for game end event
  eventBus.on('game:over', () => {
    console.log('Game over, stopping music');
    stopMusic();
  });
  
  // Listen for game reset event
  eventBus.on('game:reset', () => {
    console.log('Game reset, restarting music');
    playMusic();
  });
  
  // Listen for player joining lobby (to stop music)
  eventBus.on('lobby:show', () => {
    console.log('Returned to lobby, stopping music');
    stopMusic();
  });
  
  // Add a manual trigger for the first interaction
  document.addEventListener('click', handleFirstInteraction, { once: true });
}

// Handle the first user interaction to enable audio
function handleFirstInteraction(): void {
  console.log('First user interaction detected, enabling audio');
  // Create a silent audio context to unlock audio on mobile
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const silentBuffer = audioContext.createBuffer(1, 1, 22050);
  const source = audioContext.createBufferSource();
  source.buffer = silentBuffer;
  source.connect(audioContext.destination);
  source.start();
  
  // If the game is already in progress, start the music
  if (document.querySelector('.game-container')) {
    playMusic();
  }
}

// Play background music
function playMusic(): void {
  if (!backgroundMusic) return;
  
  // Only play if it's not already playing
  if (backgroundMusic.paused) {
    backgroundMusic.play().then(() => {
      console.log('Music started playing successfully');
    }).catch(error => {
      console.error('Error playing music:', error);
      // Try again with user interaction
      const playButton = document.createElement('button');
      playButton.textContent = 'Enable Music';
      playButton.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        padding: 20px;
        background-color: #d4af37;
        color: #4a4233;
        font-family: 'Papyrus', 'Copperplate', fantasy;
        font-size: 20px;
        border: none;
        cursor: pointer;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      `;
      playButton.onclick = () => {
        backgroundMusic?.play();
        playButton.remove();
      };
      document.body.appendChild(playButton);
    });
  }
}

// Stop background music
function stopMusic(): void {
  if (backgroundMusic && !backgroundMusic.paused) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    console.log('Music stopped');
  }
}

// Add Egyptian sound effects
function addSoundEffects(): void {
  // Create sound effect elements using the same MP3 for all effects since we only have one
  const sounds = {
    explosion: '/MP3/-',
    powerup: '/MP3/-',
    victory: '/MP3/-'
  };
  
  // Create audio elements for each sound
  Object.entries(sounds).forEach(([name, src]) => {
    const sound = document.createElement('audio');
    sound.id = `egypt-sound-${name}`;
    sound.src = src;
    sound.preload = 'auto';
    document.body.appendChild(sound);
  });
  
  // Hook into game events to play sounds
  eventBus.on('block:destroyed', () => {
    const sound = document.getElementById('egypt-sound-explosion') as HTMLAudioElement;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.error('Error playing sound:', e));
    }
  });
  
  eventBus.on('powerup:collected', () => {
    const sound = document.getElementById('egypt-sound-powerup') as HTMLAudioElement;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.error('Error playing sound:', e));
    }
  });
  
  eventBus.on('game:over', () => {
    const sound = document.getElementById('egypt-sound-victory') as HTMLAudioElement;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.error('Error playing sound:', e));
    }
  });
}

// Add character selection to the lobby
function addCharacterSelection(container: HTMLElement): void {
  // Check if character selection already exists
  if (document.getElementById('egypt-character-selection')) return;
  
  // Create character selection container
  const selectionContainer = document.createElement('div');
  selectionContainer.id = 'egypt-character-selection';
  selectionContainer.className = 'egypt-character-selection';
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'Choose Your Egyptian Character';
  title.className = 'egypt-selection-title';
  selectionContainer.appendChild(title);
  
  // Add character cards
  const charactersContainer = document.createElement('div');
  charactersContainer.className = 'egypt-characters-container';
  
  // Create character cards
  EGYPTIAN_CHARACTERS.forEach(character => {
    const card = createCharacterCard(character);
    charactersContainer.appendChild(card);
  });
  
  selectionContainer.appendChild(charactersContainer);
  
  // Add selection container to the lobby
  container.appendChild(selectionContainer);
  
  // Add character selection styles
  addCharacterSelectionStyles();
}

// Create a character card
function createCharacterCard(character: any): HTMLElement {
  // Create character card using the framework's h function
  const cardVNode = h('div', {
    class: 'egypt-character-card',
    'data-character-id': character.id,
    style: `border-color: ${character.color};`,
    onclick: () => {
      // Remove selected class from all cards
      document.querySelectorAll('.egypt-character-card').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Add selected class to this card
      const cardElement = document.querySelector(`[data-character-id="${character.id}"]`);
      if (cardElement) {
        cardElement.classList.add('selected');
      }
      
      // Store selected character in localStorage
      localStorage.setItem('selectedCharacter', character.id);
      
      // Emit character selected event
      eventBus.emit('character:selected', { character });
    }
  }, [
    // Character image
    h('img', {
      src: character.image,
      alt: character.name,
      class: 'egypt-character-image'
    }, []),
    
    // Character name
    h('h3', {
      class: 'egypt-character-name',
      style: `color: ${character.color};`
    }, [character.name]),
    
    // Character description
    h('p', {
      class: 'egypt-character-description'
    }, [character.description]),
    
    // Character abilities
    h('p', {
      class: 'egypt-character-abilities'
    }, [`Special: ${character.abilities}`]),
    
    // Select button
    h('button', {
      class: 'egypt-select-button',
      style: `background-color: ${character.color};`
    }, ['Select'])
  ]);
  
  // Render the character card
  return render(cardVNode) as HTMLElement;
}

function addCharacterSelectionStyles(): void {
  // Check if styles already exist
  if (document.getElementById('egypt-character-selection-styles')) return;
  
  // Create style element using the framework's h function
  const styleVNode = h('style', {
    id: 'egypt-character-selection-styles'
  }, [
    `
    .egypt-character-selection {
      margin-top: 20px;
      text-align: center;
    }
    
    .egypt-selection-title {
      font-family: 'Papyrus', 'Copperplate', fantasy;
      color: #d4af37;
      font-size: 24px;
      margin-bottom: 20px;
      text-shadow: 1px 1px 0 #000;
    }
    
    .egypt-characters-container {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }
    
    .egypt-character-card {
      background-color: rgba(0, 0, 0, 0.8);
      border: 3px solid #d4af37;
      border-radius: 10px;
      padding: 15px;
      width: 200px;
      text-align: center;
      color: #f5e7c1;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .egypt-character-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    }
    
    .egypt-character-card.selected {
      transform: scale(1.05);
      box-shadow: 0 0 20px #d4af37;
    }
    
    .egypt-character-image {
      width: 100px;
      height: 100px;
      object-fit: contain;
      margin-bottom: 10px;
      border-radius: 50%;
      background-color: rgba(212, 175, 55, 0.2);
      padding: 10px;
    }
    
    .egypt-character-name {
      font-family: 'Papyrus', 'Copperplate', fantasy;
      margin: 0 0 10px 0;
      font-size: 18px;
      color: #d4af37;
    }
    
    .egypt-character-description {
      font-size: 12px;
      margin-bottom: 10px;
      color: #f5e7c1;
    }
    
    .egypt-character-abilities {
      font-size: 12px;
      font-weight: bold;
      color: #d4af37;
      margin-bottom: 15px;
    }
    
    .egypt-select-button {
      background-color: #d4af37;
      color: #000;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-family: 'Papyrus', 'Copperplate', fantasy;
      font-weight: bold;
      transition: background-color 0.2s;
    }
    
    .egypt-select-button:hover {
      background-color: #f5e7c1;
    }
    `
  ]);
  
  // Render the style element
  const renderedStyle = render(styleVNode) as HTMLElement;
  
  // Add to document head
  document.head.appendChild(renderedStyle);
}
