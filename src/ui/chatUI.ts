// Chat UI rendering
import { h, render } from '../../framework/dom';
import { eventBus } from '../../framework/events';
import { ChatMessage, sendChatMessage, getChatHistory, initChat } from '../multiplayer/chat';

// UI elements
let chatContainer: HTMLElement | null = null;
let messagesContainer: HTMLElement | null = null;
let chatInput: HTMLInputElement | null = null;
let chatToggleButton: HTMLElement | null = null;

// Chat UI state
let isChatVisible = false;
let isMinimized = false;

// Initialize chat UI
export function initChatUI(parentContainer: HTMLElement): void {
  // Initialize chat logic
  initChat();
  
  // Create chat container
  chatContainer = document.createElement('div');
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
  
  // Create chat toggle button
  chatToggleButton = document.createElement('button');
  chatToggleButton.className = 'chat-toggle';
  chatToggleButton.textContent = 'Chat';
  chatToggleButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 8px 16px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    z-index: 999;
    font-weight: bold;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    transition: background-color 0.3s, transform 0.2s;
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
  eventBus.on('chat:messageReceived', addMessageToUI);
  
  // Make chat draggable
  makeDraggable(chatContainer, chatHeader);
  
  // Load chat history
  loadChatHistory();
}

// Handle input keydown event (submit on Enter)
function handleInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && chatInput && chatInput.value.trim() !== '') {
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    // Send to server only - don't add local message
    // The server will broadcast back to all clients including this one
    sendChatMessage(message);
  }
}

// Handle send button click
function handleSendClick(): void {
  if (chatInput && chatInput.value.trim() !== '') {
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    // Send to server only - don't add local message
    // The server will broadcast back to all clients including this one
    sendChatMessage(message);
  }
}

// Toggle chat visibility
function toggleChat(): void {
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
function addMessageToUI(message: ChatMessage): void {
  if (!messagesContainer) return;
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';
  
  // Check if this is a local user message by comparing with the current player ID
  // We need to get the player ID from socket to properly identify local messages
  import('../multiplayer/socket').then(({ getPlayerId }) => {
    const currentPlayerId = getPlayerId();
    const isLocalUser = message.id === currentPlayerId || message.id === 'local';
    
    messageElement.style.cssText = `
      background-color: ${isLocalUser ? 'rgba(76, 175, 80, 0.2)' : 'rgba(100, 181, 246, 0.2)'};
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
    
    // Add fade-in animation
    if (!document.getElementById('chat-animations')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'chat-animations';
      styleElement.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    // Format timestamp
    const timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create message content with text alignment based on sender
    messageElement.innerHTML = `
      <div style="font-weight: bold; color: ${isLocalUser ? '#4CAF50' : '#64B5F6'}; margin-bottom: 3px; text-align: ${isLocalUser ? 'right' : 'left'};">
        ${message.nickname}
        <span style="color: #aaa; font-size: 0.8em; margin-left: 5px; font-weight: normal;">${timestamp}</span>
      </div>
      <div style="color: #fff; text-align: ${isLocalUser ? 'right' : 'left'};">${message.message}</div>
    `;
    
    // Add message to container
    messagesContainer?.appendChild(messageElement);
    
    // Scroll to bottom
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }).catch(error => {
    console.error('Error loading socket module:', error);
    
    // Fallback to basic message display if socket module fails to load
    messageElement.style.cssText = `
      background-color: rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      border-radius: 6px;
      word-break: break-word;
      max-width: 85%;
      align-self: flex-start;
      position: relative;
      animation: fadeIn 0.3s ease;
    `;
    
    // Format timestamp
    const timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create message content
    messageElement.innerHTML = `
      <div style="font-weight: bold; color: #64B5F6; margin-bottom: 3px;">
        ${message.nickname}
        <span style="color: #aaa; font-size: 0.8em; margin-left: 5px; font-weight: normal;">${timestamp}</span>
      </div>
      <div style="color: #fff;">${message.message}</div>
    `;
    
    // Add message to container
    messagesContainer?.appendChild(messageElement);
    
    // Scroll to bottom
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
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
