/**
 * Egyptian Theme Application Script
 * This script applies Egyptian theme styling to the chat UI elements
 * when the DOM is loaded and when elements are dynamically added.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Wait for chat UI to be initialized
  const applyEgyptianTheme = () => {
    // Apply theme to chat toggle button if it exists
    const chatToggleButton = document.getElementById('chat-toggle-button');
    if (chatToggleButton) {
      if (chatToggleButton.textContent === 'Chat') {
        chatToggleButton.textContent = '☥ Pharaoh Chat';
      } else if (chatToggleButton.textContent === 'Hide Chat') {
        chatToggleButton.textContent = '☥ Hide Papyrus';
      }
    }

    // Apply theme to chat container
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      // Add hieroglyphic decorations to chat header
      const chatHeader = chatContainer.querySelector('.chat-header');
      if (chatHeader) {
        const headerTitle = chatHeader.querySelector('div');
        if (headerTitle && !headerTitle.textContent.includes('☥')) {
          headerTitle.textContent = '☥ EGYPTIAN CHAT ☥';
        }
      }

      // Style chat input placeholder
      const chatInput = chatContainer.querySelector('.chat-input');
      if (chatInput) {
        chatInput.placeholder = 'Write on papyrus...';
      }
    }
  };

  // Apply theme initially after a short delay
  setTimeout(applyEgyptianTheme, 1000);

  // Set up a mutation observer to watch for chat UI changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any added nodes are chat-related
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (element.id === 'chat-container' || 
                element.id === 'chat-toggle-button' ||
                element.classList?.contains('chat-message')) {
              // Apply Egyptian theme to new elements
              setTimeout(applyEgyptianTheme, 100);
            }
          }
        });
      }
    });
  });

  // Start observing the document body for changes
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for specific game events that might affect the chat UI
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'chat:toggled') {
      setTimeout(applyEgyptianTheme, 100);
    }
  });
});
