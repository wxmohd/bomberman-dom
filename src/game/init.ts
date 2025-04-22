// Game initialization logic
import { initBombTest } from '../test/bombTest';
import { initPlayerTest } from '../test/playerTest';
import { initGameTest } from '../test/gameTest';

export function initGame() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h1 style="color: #333;">Bomberman DOM</h1>
        <p style="color: #666; margin-bottom: 30px;">Select a test environment to begin</p>
      </div>
    `;
    
    // Container for test buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.flexWrap = 'wrap';
    buttonContainer.style.gap = '20px';
    buttonContainer.style.margin = '20px';
    
    // Style for buttons
    const buttonStyle = {
      padding: '15px 25px',
      fontSize: '16px',
      fontWeight: 'bold',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease'
    };
    
    // Create integrated game test button (main button)
    const gameTestButton = document.createElement('button');
    gameTestButton.textContent = '🎮 Play Full Game Test';
    Object.assign(gameTestButton.style, buttonStyle);
    gameTestButton.style.backgroundColor = '#4CAF50';
    gameTestButton.style.color = 'white';
    gameTestButton.style.fontSize = '18px';
    gameTestButton.style.padding = '20px 30px';
    gameTestButton.addEventListener('click', () => {
      initGameTest();
    });
    gameTestButton.addEventListener('mouseover', () => {
      gameTestButton.style.backgroundColor = '#45a049';
      gameTestButton.style.transform = 'translateY(-2px)';
    });
    gameTestButton.addEventListener('mouseout', () => {
      gameTestButton.style.backgroundColor = '#4CAF50';
      gameTestButton.style.transform = 'translateY(0)';
    });
    
    // Create bomb test button
    const bombTestButton = document.createElement('button');
    bombTestButton.textContent = '💣 Test Bomb Mechanics';
    Object.assign(bombTestButton.style, buttonStyle);
    bombTestButton.style.backgroundColor = '#f39c12';
    bombTestButton.style.color = 'white';
    bombTestButton.addEventListener('click', () => {
      initBombTest();
    });
    bombTestButton.addEventListener('mouseover', () => {
      bombTestButton.style.backgroundColor = '#e67e22';
      bombTestButton.style.transform = 'translateY(-2px)';
    });
    bombTestButton.addEventListener('mouseout', () => {
      bombTestButton.style.backgroundColor = '#f39c12';
      bombTestButton.style.transform = 'translateY(0)';
    });
    
    // Create player test button
    const playerTestButton = document.createElement('button');
    playerTestButton.textContent = '👤 Test Player System';
    Object.assign(playerTestButton.style, buttonStyle);
    playerTestButton.style.backgroundColor = '#3498db';
    playerTestButton.style.color = 'white';
    playerTestButton.addEventListener('click', () => {
      initPlayerTest();
    });
    playerTestButton.addEventListener('mouseover', () => {
      playerTestButton.style.backgroundColor = '#2980b9';
      playerTestButton.style.transform = 'translateY(-2px)';
    });
    playerTestButton.addEventListener('mouseout', () => {
      playerTestButton.style.backgroundColor = '#3498db';
      playerTestButton.style.transform = 'translateY(0)';
    });
    
    // Add buttons to container
    buttonContainer.appendChild(gameTestButton);
    
    // Add separator
    const separator = document.createElement('div');
    separator.style.width = '100%';
    separator.style.textAlign = 'center';
    separator.style.margin = '10px 0';
    separator.style.color = '#999';
    separator.textContent = 'Individual Component Tests';
    buttonContainer.appendChild(separator);
    
    // Add component test buttons
    const componentContainer = document.createElement('div');
    componentContainer.style.display = 'flex';
    componentContainer.style.justifyContent = 'center';
    componentContainer.style.gap = '20px';
    componentContainer.style.width = '100%';
    componentContainer.appendChild(bombTestButton);
    componentContainer.appendChild(playerTestButton);
    buttonContainer.appendChild(componentContainer);
    
    // Add container to app
    app.appendChild(buttonContainer);
  }
}
