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
  
  // Create chat container
  chatContainer = document.createElement('div');
  chatContainer.id = 'chat-container';
  chatContainer.className = 'chat-container';
  chatContainer.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 320px;
    height: 350px;
    background-color: rgba(0, 0, 0, 0.85);
    border-radius: 8px;
    color: white;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    transition: all 0.3s ease;
    display: none;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: 'Arial', sans-serif;
  `;
  
  // Create chat header
  const chatHeader = document.createElement('div');
  chatHeader.className = 'chat-header';
  chatHeader.style.cssText = `
    padding: 10px 15px;
    background-color: rgba(0, 0, 0, 0.7);
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    cursor: move;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    user-select: none;
  `;
  
  // Create chat title
  const chatTitle = document.createElement('span');
  chatTitle.textContent = 'Game Chat';
  chatTitle.style.cssText = `
    font-weight: bold;
    font-size: 16px;
    color: #4CAF50;
  `;
  
  // Create minimize button
  const minimizeButton = document.createElement('button');
  minimizeButton.textContent = '−';
  minimizeButton.style.cssText = `
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 18px;
    padding: 0 5px;
    transition: color 0.2s;
  `;
  minimizeButton.addEventListener('mouseover', () => {
    minimizeButton.style.color = '#4CAF50';
  });
  minimizeButton.addEventListener('mouseout', () => {
    minimizeButton.style.color = 'white';
  });
  minimizeButton.addEventListener('click', toggleMinimize);
  
  // Add title and minimize button to header
  chatHeader.appendChild(chatTitle);
  chatHeader.appendChild(minimizeButton);
  
  // Create messages container
  messagesContainer = document.createElement('div');
  messagesContainer.className = 'chat-messages';
  messagesContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  `;
  
  // Add custom scrollbar styles
  const style = document.createElement('style');
  style.textContent = `
    .chat-messages::-webkit-scrollbar {
      width: 6px;
    }
    .chat-messages::-webkit-scrollbar-track {
      background: transparent;
    }
    .chat-messages::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  
  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'chat-input-container';
  inputContainer.style.cssText = `
    display: flex;
    padding: 12px;
    background-color: rgba(0, 0, 0, 0.6);
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  `;
  
  // Create chat input
  chatInput = document.createElement('input');
  chatInput.type = 'text';
  chatInput.placeholder = 'Type a message...';
  chatInput.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    transition: border-color 0.3s;
    outline: none;
  `;
  chatInput.addEventListener('focus', () => {
    if (chatInput) {
      chatInput.style.borderColor = '#4CAF50';
    }
  });
  chatInput.addEventListener('blur', () => {
    if (chatInput) {
      chatInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
  });
  chatInput.addEventListener('keydown', handleInputKeydown);
  
  // Create send button
  const sendButton = document.createElement('button');
  sendButton.textContent = 'Send';
  sendButton.style.cssText = `
    margin-left: 8px;
    padding: 8px 15px;
    border: none;
    border-radius: 4px;
    background-color: #4CAF50;
    color: white;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.3s, transform 0.2s;
  `;
  sendButton.addEventListener('mouseover', () => {
    sendButton.style.backgroundColor = '#3e8e41';
  });
  sendButton.addEventListener('mouseout', () => {
    sendButton.style.backgroundColor = '#4CAF50';
  });
  sendButton.addEventListener('mousedown', () => {
    sendButton.style.transform = 'scale(0.95)';
  });
  sendButton.addEventListener('mouseup', () => {
    sendButton.style.transform = 'scale(1)';
  });
  sendButton.addEventListener('click', handleSendClick);
  
  // Add input and button to input container
  inputContainer.appendChild(chatInput);
  inputContainer.appendChild(sendButton);
  
  // Create chat toggle button (always visible)
  // First, remove any existing chat buttons to prevent duplicates
  const existingButton = document.querySelector('.chat-toggle');
  if (existingButton) {
    existingButton.remove();
  }
  
  chatToggleButton = document.createElement('button');
  chatToggleButton.className = 'chat-toggle';
  chatToggleButton.id = 'chat-toggle-button'; // Add an ID for easier selection
  chatToggleButton.textContent = 'Chat';
  chatToggleButton.style.cssText = `
    position: fixed !important;
    top: 10px !important;
    right: 10px !important;
    padding: 8px 15px !important;
    background-color: #4CAF50 !important;
    color: white !important;
    border: none !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    font-weight: bold !important;
    z-index: 9999 !important;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3) !important;
    transition: background-color 0.3s !important;
    display: none !important; /* Hidden by default, will be shown after joining lobby */
    font-family: Arial, sans-serif !important;
    font-size: 14px !important;
  `;
  
  // Add event listeners with null checks
  if (chatToggleButton) {
    chatToggleButton.addEventListener('mouseover', () => {
      if (chatToggleButton) {
        chatToggleButton.style.backgroundColor = '#3e8e41';
      }
    });
    
    chatToggleButton.addEventListener('mouseout', () => {
      if (chatToggleButton) {
        chatToggleButton.style.backgroundColor = '#4CAF50';
      }
    });
    
    chatToggleButton.addEventListener('mousedown', () => {
      if (chatToggleButton) {
        chatToggleButton.style.transform = 'scale(0.95)';
      }
    });
    
    chatToggleButton.addEventListener('mouseup', () => {
      if (chatToggleButton) {
        chatToggleButton.style.transform = 'scale(1)';
      }
    });
    
    chatToggleButton.addEventListener('click', toggleChat);
  }
  
  // Assemble chat container
  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(messagesContainer);
  chatContainer.appendChild(inputContainer);
  
  // Add chat elements to parent container
  parentContainer.appendChild(chatContainer);
  parentContainer.appendChild(chatToggleButton);
  
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
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';
  
  // Get current player ID
  const currentPlayerId = getPlayerId();
  const isLocalUser = message.playerId === currentPlayerId || message.playerId === 'system';
  const isSystem = message.playerId === 'system';
  
  messageElement.style.cssText = `
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
  `;
  
  // Format timestamp
  const timestamp = formatMessageTime(message.timestamp);
  
  // Create message content with text alignment based on sender
  messageElement.innerHTML = `
    <div style="font-weight: bold; color: ${isSystem ? '#ffcc00' : isLocalUser ? '#4CAF50' : '#64B5F6'}; margin-bottom: 3px; text-align: ${isLocalUser ? 'right' : 'left'};">
      ${message.nickname}
      <span style="color: #aaa; font-size: 0.8em; margin-left: 5px; font-weight: normal;">${timestamp}</span>
    </div>
    <div style="color: #fff; text-align: ${isLocalUser ? 'right' : 'left'};">${message.message}</div>
  `;
  
  // Add message to container
  if (messagesContainer) {
    messagesContainer.appendChild(messageElement);
  }
  
  // Scroll to bottom
  if (messagesContainer) {
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
