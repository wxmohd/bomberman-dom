// In-game chat logic
import { eventBus } from '../../framework/events';
import { sendChatMessage as socketSendChatMessage, getPlayerId } from './socket';

// Message structure
export interface ChatMessage {
  id: string;        // Player ID
  nickname: string;  // Player nickname
  message: string;   // Message content
  timestamp: number; // Message timestamp
}

// Chat history
const MAX_MESSAGES = 50;
let chatHistory: ChatMessage[] = [];

// Initialize chat
export function initChat(): void {
  // Listen for chat messages from the server
  eventBus.on('chat:message', handleChatMessage);
}

// Handle incoming chat message
function handleChatMessage(data: ChatMessage): void {
  // Add message to history
  addMessageToHistory(data);
  
  // Emit message received event for UI updates
  eventBus.emit('chat:messageReceived', data);
}

// Add message to chat history
function addMessageToHistory(message: ChatMessage): void {
  // Add message to history
  chatHistory.push(message);
  
  // Trim history if it exceeds maximum length
  if (chatHistory.length > MAX_MESSAGES) {
    chatHistory = chatHistory.slice(chatHistory.length - MAX_MESSAGES);
  }
}

// Send a chat message
export function sendChatMessage(message: string): void {
  if (!message || message.trim() === '') {
    return;
  }
  
  // Send message via WebSocket
  socketSendChatMessage(message);
}

// Get chat history
export function getChatHistory(): ChatMessage[] {
  return [...chatHistory];
}

// Clear chat history
export function clearChatHistory(): void {
  chatHistory = [];
  eventBus.emit('chat:cleared');
}
