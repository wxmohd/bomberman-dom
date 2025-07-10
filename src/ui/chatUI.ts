// Chat UI rendering
import { h, render } from '../../framework/dom';
import { eventBus } from '../../framework/events';
import { ChatEventData } from '../multiplayer/events';
import { sendChatMessage, initChat, formatMessageTime, addSystemMessage, getChatHistory } from '../multiplayer/chat';
import { getPlayerId } from '../main';

// UI elements
let chatContainer: HTMLElement | null = null;
let messagesContainer: HTMLElement | null = null;
let chatInput: HTMLInputElement | null = null;
let chatToggleButton: HTMLElement | null = null;

// Chat UI state
let isChatVisible = false;
let isMinimized = false;
let isInitialized = false;

// Initialize chat UI
export function initChatUI(parentContainer: HTMLElement): void {
  // Prevent multiple initializations
  if (isInitialized || document.getElementById('chat-container')) {
    console.log('Chat UI already initialized, skipping');
    return;
  }
  
  // Mark as initialized
  isInitialized = true;
  // Initialize chat logic with player nickname
  // This should be called after player has set their nickname
  const playerNickname = localStorage.getItem('playerNickname') || 'Player';
  initChat(playerNickname);
  
  // Create chat container using the framework's h function
  const chatContainerVNode = h('div', {
    id: 'chat-container',
    class: 'chat-container',
    style: `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      height: 350px;
      background-color: rgba(74, 66, 51, 0.85);
      border: 2px solid #d4af37;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(212, 175, 55, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
      z-index: 1000;
      background-image: url('https://www.transparenttextures.com/patterns/papyrus.png');
      background-blend-mode: overlay;
      position: relative;
      border: 4px solid #d4af37;
      border-top: 12px solid #d4af37;
      border-bottom: 12px solid #d4af37;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(212, 175, 55, 0.2);
      background-image: url('https://www.transparenttextures.com/patterns/papyrus.png');
      overflow: hidden;
      position: relative;
    `
  }, []);
  
  // Render the chat container
  chatContainer = render(chatContainerVNode) as HTMLElement;
  
  // Create chat title using the framework's h function
  const chatTitleVNode = h('div', {
    style: `
      font-weight: bold;
      font-size: 18px;
      font-family: 'Papyrus', 'Copperplate', fantasy;
      color: #d4af37;
      text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.6);
      letter-spacing: 2px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: center;
    `
  }, ['Pharaoh Chat']);
  
  // Create minimize button using the framework's h function
  const minimizeButtonVNode = h('button', {
    style: `
      background: none;
      border: none;
      color: #d4af37;
      cursor: pointer;
      font-size: 18px;
      padding: 0 5px;
      transition: all 0.2s ease;
    `,
    onclick: toggleMinimize,
    onmouseover: (e: Event) => {
      (e.target as HTMLElement).style.color = '#e4c49b';
      (e.target as HTMLElement).style.transform = 'scale(1.1)';
    },
    onmouseout: (e: Event) => {
      (e.target as HTMLElement).style.color = '#d4af37';
      (e.target as HTMLElement).style.transform = 'scale(1)';
    }
  }, ['−']);
  
  // Create chat header using the framework's h function with the title and minimize button
  const chatHeaderVNode = h('div', {
    class: 'chat-header',
    style: `
      padding: 12px 15px;
      background-color: rgba(74, 66, 51, 0.95);
      border-top: none;
      cursor: move;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #d4af37;
      user-select: none;
      background-image: url('https://www.transparenttextures.com/patterns/papyrus-dark.png');
      background-blend-mode: overlay;
    `
  }, [chatTitleVNode, minimizeButtonVNode]);
  
  // Render the chat header
  const chatHeader = render(chatHeaderVNode) as HTMLElement;
  
  // Create messages container using the framework's h function
  const messagesContainerVNode = h('div', {
    class: 'chat-messages',
    style: `
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(212, 175, 55, 0.5) transparent;
      background-color: rgba(228, 196, 155, 0.2);
      background-image: url('https://www.transparenttextures.com/patterns/papyrus-light.png');
      background-blend-mode: overlay;
    `
  }, []);
  
  // Render the messages container
  messagesContainer = render(messagesContainerVNode) as HTMLElement;
  
  // Add custom scrollbar styles using the framework's h function
  const styleVNode = h('style', {}, [
    `
    .chat-messages::-webkit-scrollbar {
      width: 10px;
    }
    .chat-messages::-webkit-scrollbar-track {
      background: rgba(126, 112, 83, 0.2);
      border-radius: 0;
      background-image: url('https://www.transparenttextures.com/patterns/papyrus-dark.png');
      background-blend-mode: overlay;
    }
    .chat-messages::-webkit-scrollbar-thumb {
      background-color: rgba(212, 175, 55, 0.6);
      border: 1px solid rgba(74, 66, 51, 0.3);
      border-radius: 0;
      background-image: linear-gradient(to bottom, 
        transparent 0%, transparent 10%,
        rgba(74, 66, 51, 0.5) 10%, rgba(74, 66, 51, 0.5) 20%,
        transparent 20%, transparent 30%,
        rgba(74, 66, 51, 0.5) 30%, rgba(74, 66, 51, 0.5) 40%,
        transparent 40%, transparent 50%,
        rgba(74, 66, 51, 0.5) 50%, rgba(74, 66, 51, 0.5) 60%,
        transparent 60%, transparent 70%,
        rgba(74, 66, 51, 0.5) 70%, rgba(74, 66, 51, 0.5) 80%,
        transparent 80%, transparent 90%,
        rgba(74, 66, 51, 0.5) 90%, rgba(74, 66, 51, 0.5) 100%);
    }
    .chat-messages::-webkit-scrollbar-thumb:hover {
      background-color: rgba(212, 175, 55, 0.8);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes glowPulse {
      0% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.5); }
      50% { box-shadow: 0 0 15px rgba(212, 175, 55, 0.8); }
      100% { box-shadow: 0 0 5px rgba(212, 175, 55, 0.5); }
    }
    .chat-message-system {
      animation: fadeIn 0.3s ease-out, glowPulse 2s infinite;
    }
    `
  ]);
  
  // Add additional Egyptian-themed styles
  const egyptianStyleVNode = h('style', {}, [
    `
    /* Egyptian-themed decorative elements */
    .chat-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 12px;
      background-image: linear-gradient(to right, 
        #d4af37 0%, #d4af37 10%, 
        transparent 10%, transparent 20%, 
        #d4af37 20%, #d4af37 30%,
        transparent 30%, transparent 40%,
        #d4af37 40%, #d4af37 50%,
        transparent 50%, transparent 60%,
        #d4af37 60%, #d4af37 70%,
        transparent 70%, transparent 80%,
        #d4af37 80%, #d4af37 90%,
        transparent 90%, transparent 100%);
      z-index: 1;
    }
    
    .chat-container::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 12px;
      background-image: linear-gradient(to right, 
        #d4af37 0%, #d4af37 10%, 
        transparent 10%, transparent 20%, 
        #d4af37 20%, #d4af37 30%,
        transparent 30%, transparent 40%,
        #d4af37 40%, #d4af37 50%,
        transparent 50%, transparent 60%,
        #d4af37 60%, #d4af37 70%,
        transparent 70%, transparent 80%,
        #d4af37 80%, #d4af37 90%,
        transparent 90%, transparent 100%);
      z-index: 1;
    }
    
    /* Hieroglyphic-inspired decorative elements */
    .chat-header::before {
      content: '☥';
      font-size: 18px;
      color: #d4af37;
      margin-right: 8px;
      text-shadow: 0 0 5px rgba(212, 175, 55, 0.5);
    }
    
    .chat-header::after {
      content: '☥';
      font-size: 18px;
      color: #d4af37;
      margin-left: 8px;
      text-shadow: 0 0 5px rgba(212, 175, 55, 0.5);
    }
    `
  ]);
  
  // Render and append the styles
  document.head.appendChild(render(styleVNode) as HTMLElement);
  document.head.appendChild(render(egyptianStyleVNode) as HTMLElement);
  
  // Create chat input using the framework's h function
  const chatInputVNode = h('input', {
    type: 'text',
    id: 'chat-input',
    placeholder: 'Write your message on papyrus...',
    style: `
      flex: 1;
      padding: 10px 12px;
      border-radius: 0;
      border: 1px solid #d4af37;
      background-color: rgba(245, 231, 201, 0.9);
      color: #4a4233;
      font-size: 14px;
      font-family: 'Papyrus', 'Copperplate', fantasy;
      transition: all 0.3s ease;
      outline: none;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    `,
    onfocus: (e: Event) => {
      (e.target as HTMLElement).style.borderColor = '#d4af37';
      (e.target as HTMLElement).style.boxShadow = '0 0 5px rgba(212, 175, 55, 0.5), inset 0 1px 3px rgba(0, 0, 0, 0.1)';
    },
    onblur: (e: Event) => {
      (e.target as HTMLElement).style.borderColor = '#d4af37';
      (e.target as HTMLElement).style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1)';
    },
    onkeydown: handleInputKeydown
  }, []);
  
  // Create send button using the framework's h function
  const sendButtonVNode = h('button', {
    style: `
      margin-left: 8px;
      padding: 10px 15px;
      border: 2px solid #d4af37;
      border-radius: 0;
      background-color: rgba(74, 66, 51, 0.9);
      color: #d4af37;
      cursor: pointer;
      font-weight: bold;
      font-family: 'Papyrus', 'Copperplate', fantasy;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `,
    onclick: handleSendClick,
    onmouseover: (e: Event) => {
      (e.target as HTMLElement).style.backgroundColor = 'rgba(212, 175, 55, 0.9)';
      (e.target as HTMLElement).style.color = '#4a4233';
      (e.target as HTMLElement).style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    },
    onmouseout: (e: Event) => {
      (e.target as HTMLElement).style.backgroundColor = 'rgba(74, 66, 51, 0.9)';
      (e.target as HTMLElement).style.color = '#d4af37';
      (e.target as HTMLElement).style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    },
    onmousedown: (e: Event) => {
      (e.target as HTMLElement).style.transform = 'scale(0.95)';
    },
    onmouseup: (e: Event) => {
      (e.target as HTMLElement).style.transform = 'scale(1)';
    }
  }, ['Send']);
  
  // Create input container using the framework's h function
  const inputContainerVNode = h('div', {
    class: 'chat-input-container',
    style: `
      display: flex;
      padding: 12px;
      background-color: rgba(0, 0, 0, 0.6);
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    `
  }, [chatInputVNode, sendButtonVNode]);
  
  // Render the input container
  const inputContainer = render(inputContainerVNode) as HTMLElement;
  
  // Store reference to the rendered chat input
  chatInput = inputContainer.querySelector('input') as HTMLInputElement;
  
  // Create chat toggle button (always visible)
  // First, remove any existing chat buttons to prevent duplicates
  const existingButton = document.querySelector('.chat-toggle');
  if (existingButton) {
    existingButton.remove();
  }
  
  // Create chat toggle button using the framework's h function
  const chatToggleButtonVNode = h('button', {
    class: 'chat-toggle',
    id: 'chat-toggle-button', // Add an ID for easier selection
    style: `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      padding: 8px 15px !important;
      background-color: rgba(74, 66, 51, 0.9) !important;
      color: #d4af37 !important;
      border: 2px solid #d4af37 !important;
      border-radius: 0 !important;
      cursor: pointer !important;
      font-weight: bold !important;
      font-family: 'Papyrus', 'Copperplate', fantasy !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      z-index: 9999 !important;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3) !important;
      transition: all 0.3s ease !important;
      display: none !important; /* Hidden by default, will be shown after joining lobby */
      font-size: 14px !important;
    `,
    onmouseover: (e: Event) => {
      (e.target as HTMLElement).style.backgroundColor = 'rgba(212, 175, 55, 0.9)';
      (e.target as HTMLElement).style.color = '#4a4233';
      (e.target as HTMLElement).style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.7)';
    },
    onmouseout: (e: Event) => {
      (e.target as HTMLElement).style.backgroundColor = 'rgba(74, 66, 51, 0.9)';
      (e.target as HTMLElement).style.color = '#d4af37';
      (e.target as HTMLElement).style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
    },
    onmousedown: (e: Event) => {
      (e.target as HTMLElement).style.transform = 'scale(0.95)';
    },
    onmouseup: (e: Event) => {
      (e.target as HTMLElement).style.transform = 'scale(1)';
    },
    onclick: toggleChat
  }, ['Chat']);
  
  // Render the chat toggle button
  chatToggleButton = render(chatToggleButtonVNode) as HTMLElement;
  
  // Assemble the chat components if container exists
  if (chatContainer) {
    // Render the chat header if not already done
    const chatHeader = document.querySelector('.chat-header') as HTMLElement;
    if (chatHeader && messagesContainer && inputContainer) {
      // Assemble the chat components
      chatContainer.appendChild(chatHeader);
      chatContainer.appendChild(messagesContainer);
      chatContainer.appendChild(inputContainer);
      
      // Add chat container and toggle button to parent container
      document.body.appendChild(chatContainer);
      document.body.appendChild(chatToggleButton);
    }
  }
  
  // Listen for chat messages
  eventBus.on('chat:updated', (data: { history: ChatEventData[] }) => {
    if (data.history.length > 0) {
      // Only add the most recent message
      addMessageToUI(data.history[0]);
    }
  });
  
  // Make chat draggable
  makeDraggable(chatContainer, chatHeader);
  
  // Load chat history
  loadChatHistory();
  
  // Add a welcome message
  addSystemMessage('Welcome to Bomberman Chat! 💬');
}

// Handle input keydown event (submit on Enter)
function handleInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && chatInput && chatInput.value.trim() !== '') {
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    // Send message
    sendChatMessage(message);
  }
}

// Handle send button click
function handleSendClick(): void {
  if (chatInput && chatInput.value.trim() !== '') {
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    // Send message
    sendChatMessage(message);
  }
}

// Toggle chat visibility
export function toggleChat(): void {
  if (!chatContainer || !chatToggleButton) return;
  
  isChatVisible = !isChatVisible;
  
  if (isChatVisible) {
    chatContainer.style.display = 'flex';
    chatToggleButton.textContent = 'Hide Chat';
    
    // Scroll to bottom of messages
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Focus input
    if (chatInput) {
      chatInput.focus();
    }
  } else {
    chatContainer.style.display = 'none';
    chatToggleButton.textContent = 'Chat';
  }
}

// Toggle chat minimize state
function toggleMinimize(): void {
  if (!chatContainer) return;
  
  isMinimized = !isMinimized;
  
  if (isMinimized) {
    chatContainer.style.height = '40px';
    if (messagesContainer) messagesContainer.style.display = 'none';
    const inputContainer = chatContainer.querySelector('.chat-input-container');
    if (inputContainer) (inputContainer as HTMLElement).style.display = 'none';
  } else {
    chatContainer.style.height = '350px';
    if (messagesContainer) messagesContainer.style.display = 'flex';
    const inputContainer = chatContainer.querySelector('.chat-input-container');
    if (inputContainer) (inputContainer as HTMLElement).style.display = 'flex';
  }
}

// Add a message to the UI
function addMessageToUI(message: ChatEventData): void {
  if (!messagesContainer) return;
  
  // Get current player ID
  const currentPlayerId = getPlayerId();
  const isLocalUser = message.playerId === currentPlayerId || message.playerId === 'system';
  const isSystem = message.playerId === 'system';
  
  // Get player number if available
  let playerNumber = '';
  if (!isSystem) {
    if (isLocalUser) {
      playerNumber = localStorage.getItem('playerNumber') || '';
    } else if (message.playerNumber) {
      playerNumber = message.playerNumber.toString();
    }
  }
  
  // Format player label
  const playerLabel = isSystem ? 'System' : 
    isLocalUser ? `You (P${playerNumber})` : 
    playerNumber ? `${message.nickname} (P${playerNumber})` : message.nickname;
  
  // Format timestamp
  const timestamp = formatMessageTime(message.timestamp);
  
  // Create header with player name and timestamp using h function
  const headerVNode = h('div', {
    style: `
      font-weight: bold;
      color: ${isSystem ? '#ffcc00' : isLocalUser ? '#4CAF50' : '#64B5F6'};
      margin-bottom: 3px;
      text-align: ${isLocalUser ? 'right' : 'left'};
    `
  }, [
    playerLabel,
    h('span', {
      style: 'color: #aaa; font-size: 0.8em; margin-left: 5px; font-weight: normal;'
    }, [timestamp])
  ]);
  
  // Create message content using h function
  const contentVNode = h('div', {
    style: `
      color: #fff;
      text-align: ${isLocalUser ? 'right' : 'left'};
    `
  }, [message.message]);
  
  // Create message element using h function
  const messageVNode = h('div', {
    class: 'chat-message',
    style: `
      background-color: ${isSystem ? 'rgba(255, 204, 0, 0.2)' : isLocalUser ? 'rgba(76, 175, 80, 0.2)' : 'rgba(100, 181, 246, 0.2)'};
      padding: 8px 12px;
      border-radius: 6px;
      word-break: break-word;
      max-width: 85%;
      align-self: ${isLocalUser ? 'flex-end' : 'flex-start'};
      margin-left: ${isLocalUser ? 'auto' : '0'};
      margin-right: ${isLocalUser ? '0' : 'auto'};
      position: relative;
      animation: fadeIn 0.3s ease;
    `
  }, [headerVNode, contentVNode]);
  
  // Render and add message to container
  if (messagesContainer) {
    const messageElement = render(messageVNode) as HTMLElement;
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Load chat history
function loadChatHistory(): void {
  const history = getChatHistory();
  
  // Add each message to UI
  history.forEach(message => {
    addMessageToUI(message);
  });
}

// Make an element draggable with smooth movement
function makeDraggable(element: HTMLElement, handle: HTMLElement): void {
  let isDragging = false;
  let initialX: number, initialY: number;
  let offsetX = 0, offsetY = 0;
  
  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDrag, { passive: false });
  
  function startDrag(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    isDragging = true;
    
    if (e instanceof MouseEvent) {
      initialX = e.clientX;
      initialY = e.clientY;
    } else {
      initialX = e.touches[0].clientX;
      initialY = e.touches[0].clientY;
    }
    
    offsetX = element.offsetLeft;
    offsetY = element.offsetTop;
    
    // Add smooth transition during drag
    element.style.transition = 'none';
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    
    // Add a class to indicate dragging
    element.classList.add('dragging');
  }
  
  function drag(e: MouseEvent | TouchEvent): void {
    if (!isDragging) return;
    e.preventDefault();
    
    let currentX: number, currentY: number;
    
    if (e instanceof MouseEvent) {
      currentX = e.clientX;
      currentY = e.clientY;
    } else {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    }
    
    const deltaX = currentX - initialX;
    const deltaY = currentY - initialY;
    
    // Update position with transform for smoother movement
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  }
  
  function stopDrag(): void {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Get computed transform values
    const style = window.getComputedStyle(element);
    const transform = style.getPropertyValue('transform');
    const matrix = new DOMMatrix(transform);
    
    // Update position and reset transform
    const newLeft = offsetX + matrix.m41;
    const newTop = offsetY + matrix.m42;
    
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
    element.style.transform = 'none';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    
    // Restore transition
    element.style.transition = 'height 0.3s ease';
    
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
    
    // Remove dragging class
    element.classList.remove('dragging');
  }
}
