// Powerpuff Girls theme UI components
import { eventBus } from '../../framework/events';
import { h, render } from '../../framework/dom';

// Character data
const POWERPUFF_CHARACTERS = [
  {
    id: 'Pharon',
    name: 'Pharon',
    color: '#ff9ec4',
    description: 'The leader of the Powerpuff Girls. Smart and strategic.',
    abilities: 'Extra bomb range',
    image: 'https://i.imgur.com/JZBtYYQ.png'
  },
  {
    id: 'Mummy',
    name: 'Mummy',
    color: '#a1d6e2',
    description: 'The joy and laughter of the Powerpuff Girls. Sweet and kind.',
    abilities: 'Faster movement speed',
    image: 'https://i.imgur.com/QZ9rQwX.png'
  },
  {
    id: 'Witch',
    name: 'Witch',
    color: '#bcee68',
    description: 'The toughest fighter of the Powerpuff Girls. Strong and brave.',
    abilities: 'Extra bomb capacity',
    image: 'https://i.imgur.com/8ZUMOKs.png'
  }
];

// Villain data (for destructible blocks and enemies)
const POWERPUFF_VILLAINS = [
  {
    id: 'mojo-Sla',
    name: 'Mojo Jojo',
    color: '#9966cc',
    description: 'The evil monkey genius and arch-nemesis of the Powerpuff Girls.',
    image: 'https://i.imgur.com/XYZ123.png'
  },
  {
    id: 'him',
    name: 'HIM',
    color: '#ff0000',
    description: 'A mysterious, demonic villain with supernatural powers.',
    image: 'https://i.imgur.com/ABC456.png'
  }
];

// Initialize Powerpuff Girls theme
export function initPowerpuffTheme(container: HTMLElement): void {
  // Add Powerpuff Girls background music
  addBackgroundMusic();
  
  // Add Powerpuff Girls sound effects
  addSoundEffects();
  
  // Add Powerpuff Girls character selection to the lobby
  eventBus.on('lobby:show', () => {
    setTimeout(() => {
      const lobbyContainer = document.querySelector('.lobby-container');
      if (lobbyContainer) {
        addCharacterSelection(lobbyContainer as HTMLElement);
      }
    }, 500);
  });
}

// Add Powerpuff Girls background music
function addBackgroundMusic(): void {
  // Check if music already exists
  if (document.getElementById('ppg-background-music')) return;
  
  // Create audio element for background music
  const music = document.createElement('audio');
  music.id = 'ppg-background-music';
  music.loop = true;
  music.volume = 0.3;
  
  // Use Powerpuff Girls theme song or similar upbeat music
  music.src = 'https://example.com/powerpuff-theme.mp3'; // Replace with actual URL
  
  // Add music controls
  const musicControls = document.createElement('div');
  musicControls.className = 'music-controls';
  musicControls.innerHTML = `
    <button id="toggle-music" class="ppg-button">
      <span id="music-icon">🔊</span> Music
    </button>
  `;
  
  // Add to document
  document.body.appendChild(music);
  document.body.appendChild(musicControls);
  
  // Style music controls
  const style = document.createElement('style');
  style.textContent = `
    .music-controls {
      position: fixed;
      bottom: 10px;
      right: 10px;
      z-index: 1000;
    }
    
    .ppg-button {
      background-color: #ff9ec4;
      border: 2px solid #ff6bac;
      border-radius: 20px;
      color: #333;
      padding: 5px 10px;
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .ppg-button:hover {
      transform: scale(1.05);
      box-shadow: 0 0 10px rgba(255, 107, 172, 0.6);
    }
  `;
  document.head.appendChild(style);
  
  // Add event listener for music toggle
  document.getElementById('toggle-music')?.addEventListener('click', () => {
    if (music.paused) {
      music.play();
      (document.getElementById('music-icon') as HTMLElement).textContent = '🔊';
    } else {
      music.pause();
      (document.getElementById('music-icon') as HTMLElement).textContent = '🔇';
    }
  });
}

// Add Powerpuff Girls sound effects
function addSoundEffects(): void {
  // Create sound effect elements
  const sounds = {
    explosion: 'https://example.com/ppg-explosion.mp3', // Replace with actual URL
    powerup: 'https://example.com/ppg-powerup.mp3',     // Replace with actual URL
    victory: 'https://example.com/ppg-victory.mp3'      // Replace with actual URL
  };
  
  // Create audio elements for each sound
  Object.entries(sounds).forEach(([name, src]) => {
    const sound = document.createElement('audio');
    sound.id = `ppg-sound-${name}`;
    sound.src = src;
    sound.preload = 'auto';
    document.body.appendChild(sound);
  });
  
  // Hook into game events to play sounds
  eventBus.on('block:destroyed', () => {
    const sound = document.getElementById('ppg-sound-explosion') as HTMLAudioElement;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.error('Error playing sound:', e));
    }
  });
  
  eventBus.on('powerup:collected', () => {
    const sound = document.getElementById('ppg-sound-powerup') as HTMLAudioElement;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.error('Error playing sound:', e));
    }
  });
  
  eventBus.on('game:over', () => {
    const sound = document.getElementById('ppg-sound-victory') as HTMLAudioElement;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.error('Error playing sound:', e));
    }
  });
}

// Add character selection to the lobby
function addCharacterSelection(container: HTMLElement): void {
  // Check if character selection already exists
  if (document.getElementById('ppg-character-selection')) return;
  
  // Create character selection container
  const selectionContainer = document.createElement('div');
  selectionContainer.id = 'ppg-character-selection';
  selectionContainer.className = 'ppg-character-selection';
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'Choose Your Powerpuff Girl';
  title.className = 'ppg-selection-title';
  selectionContainer.appendChild(title);
  
  // Add character cards
  const charactersContainer = document.createElement('div');
  charactersContainer.className = 'ppg-characters-container';
  
  // Create character cards
  POWERPUFF_CHARACTERS.forEach(character => {
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
    class: 'ppg-character-card',
    'data-character-id': character.id,
    style: `border-color: ${character.color};`,
    onclick: () => {
      // Remove selected class from all cards
      document.querySelectorAll('.ppg-character-card').forEach(el => {
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
      class: 'ppg-character-image'
    }, []),
    
    // Character name
    h('h3', {
      class: 'ppg-character-name',
      style: `color: ${character.color};`
    }, [character.name]),
    
    // Character description
    h('p', {
      class: 'ppg-character-description'
    }, [character.description]),
    
    // Character abilities
    h('p', {
      class: 'ppg-character-abilities'
    }, [`Special: ${character.abilities}`]),
    
    // Select button
    h('button', {
      class: 'ppg-select-button',
      style: `background-color: ${character.color};`
    }, ['Select'])
  ]);
  
  // Render the character card
  return render(cardVNode) as HTMLElement;
}

// Add character selection styles
function addCharacterSelectionStyles(): void {
  // Check if styles already exist
  if (document.getElementById('ppg-character-selection-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'ppg-character-selection-styles';
  style.textContent = `
    .ppg-character-selection {
      margin-top: 20px;
      text-align: center;
    }
    
    .ppg-selection-title {
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      color: #333;
      font-size: 24px;
      margin-bottom: 20px;
      text-shadow: 1px 1px 0 #fff;
    }
    
    .ppg-characters-container {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .ppg-character-card {
      width: 200px;
      background-color: rgba(255, 255, 255, 0.9);
      border: 4px solid #ff9ec4;
      border-radius: 15px;
      padding: 15px;
      text-align: center;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      transition: all 0.3s;
      cursor: pointer;
    }
    
    .ppg-character-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }
    
    .ppg-character-card.selected {
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(255, 107, 172, 0.8);
    }
    
    .ppg-character-image {
      width: 120px;
      height: 120px;
      object-fit: contain;
      margin-bottom: 10px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.7);
      padding: 5px;
    }
    
    .ppg-character-name {
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      font-size: 20px;
      margin: 0 0 10px 0;
    }
    
    .ppg-character-description {
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      font-size: 14px;
      color: #555;
      margin-bottom: 10px;
    }
    
    .ppg-character-abilities {
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      font-size: 14px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
    }
    
    .ppg-select-button {
      background-color: #ff9ec4;
      color: white;
      border: none;
      border-radius: 20px;
      padding: 8px 15px;
      font-family: 'Comic Sans MS', 'Chalkboard SE', sans-serif;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .ppg-select-button:hover {
      transform: scale(1.1);
      box-shadow: 0 0 10px rgba(255, 107, 172, 0.6);
    }
  `;
  
  document.head.appendChild(style);
}
