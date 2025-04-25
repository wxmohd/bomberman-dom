// In-game chat logic
import { eventBus } from '../../framework/events';
import { EVENTS, ChatEventData } from './events';
import { getPlayerId, isMultiplayerConnected } from '../main';
import { sendToServer } from './socket';

// Maximum number of chat messages to keep in history
const MAX_CHAT_HISTORY = 50;

// Chat message history
let chatHistory: ChatEventData[] = [];

// Player's nickname (set when initialized)
let playerNickname: string = '';

/**
 * Initialize chat system with player's nickname
 * @param nickname Player's nickname
 */
export function initChat(nickname: string): void {
  playerNickname = nickname;
  
  // Listen for incoming chat messages
  eventBus.on('chat:message:received', (data: ChatEventData) => {
    // Add to chat history
    addMessageToHistory(data);
    
    // Trigger UI update
    eventBus.emit('chat:updated', { history: getChatHistory() });
  });
}

/**
 * Send a chat message
 * @param message Message content
 * @returns True if message was sent, false otherwise
 */
export function sendChatMessage(message: string): boolean {
  if (!message.trim() || !isMultiplayerConnected()) {
    return false;
  }
  
  const playerId = getPlayerId();
  if (!playerId) {
    console.error('Cannot send chat message: No player ID');
    return false;
  }
  
  // Create message data
  const chatData: ChatEventData = {
    playerId,
    nickname: playerNickname,
    message: message.trim(),
    timestamp: Date.now()
  };
  
  // Send to server
  sendToServer(EVENTS.CHAT, chatData);
  
  // Also add to local history (server will broadcast to all players including sender)
  addMessageToHistory(chatData);
  
  // Trigger UI update
  eventBus.emit('chat:updated', { history: getChatHistory() });
  
  return true;
}

/**
 * Add a message to chat history
 * @param message Chat message data
 */
function addMessageToHistory(message: ChatEventData): void {
  // Add to beginning for newer messages at the top
  chatHistory.unshift(message);
  
  // Trim history if it exceeds maximum
  if (chatHistory.length > MAX_CHAT_HISTORY) {
    chatHistory = chatHistory.slice(0, MAX_CHAT_HISTORY);
  }
}

/**
 * Get chat history
 * @returns Array of chat messages
 */
export function getChatHistory(): ChatEventData[] {
  return [...chatHistory];
}

/**
 * Clear chat history
 */
export function clearChatHistory(): void {
  chatHistory = [];
  eventBus.emit('chat:updated', { history: [] });
}

/**
 * Format timestamp for display
 * @param timestamp Timestamp in milliseconds
 * @returns Formatted time string (HH:MM)
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Create a system message (for game events, etc.)
 * @param message System message content
 */
export function addSystemMessage(message: string): void {
  const systemMessage: ChatEventData = {
    playerId: 'system',
    nickname: 'System',
    message,
    timestamp: Date.now()
  };
  
  addMessageToHistory(systemMessage);
  eventBus.emit('chat:updated', { history: getChatHistory() });
}
