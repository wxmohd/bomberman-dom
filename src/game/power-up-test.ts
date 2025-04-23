// Test functionality for power-ups
import { eventBus } from '../../framework/events';
import { maybeSpawnPowerup, checkAndCollectPowerUp, PowerUpType, getActivePowerUps } from './powerups';
import { getCurrentMapData } from './init';
import { destroyBlock, CellType } from './map';
import { renderMap } from './renderer';

// Create a test button for power-ups
export function createPowerUpTestButton() {
  const testContainer = document.createElement('div');
  testContainer.style.position = 'fixed';
  testContainer.style.bottom = '20px';
  testContainer.style.left = '20px';
  testContainer.style.zIndex = '1000';
  document.body.appendChild(testContainer);

  // Create spawn power-up button
  const spawnButton = document.createElement('button');
  spawnButton.textContent = 'Test Spawn Power-up';
  spawnButton.style.margin = '5px';
  spawnButton.style.padding = '8px 16px';
  spawnButton.style.backgroundColor = '#ff9800';
  spawnButton.style.color = 'white';
  spawnButton.style.border = 'none';
  spawnButton.style.borderRadius = '4px';
  spawnButton.style.cursor = 'pointer';
  spawnButton.addEventListener('click', testSpawnPowerUp);
  testContainer.appendChild(spawnButton);

  // Create collect power-up button
  const collectButton = document.createElement('button');
  collectButton.textContent = 'Test Collect Power-up';
  collectButton.style.margin = '5px';
  collectButton.style.padding = '8px 16px';
  collectButton.style.backgroundColor = '#2196F3';
  collectButton.style.color = 'white';
  collectButton.style.border = 'none';
  collectButton.style.borderRadius = '4px';
  collectButton.style.cursor = 'pointer';
  collectButton.addEventListener('click', testCollectPowerUp);
  testContainer.appendChild(collectButton);

  // Create destroy random block button
  const destroyBlockButton = document.createElement('button');
  destroyBlockButton.textContent = 'Destroy Random Block';
  destroyBlockButton.style.margin = '5px';
  destroyBlockButton.style.padding = '8px 16px';
  destroyBlockButton.style.backgroundColor = '#f44336';
  destroyBlockButton.style.color = 'white';
  destroyBlockButton.style.border = 'none';
  destroyBlockButton.style.borderRadius = '4px';
  destroyBlockButton.style.cursor = 'pointer';
  destroyBlockButton.addEventListener('click', testDestroyRandomBlock);
  testContainer.appendChild(destroyBlockButton);
}

// Test function to spawn a power-up at a random empty position
function testSpawnPowerUp() {
  const mapData = getCurrentMapData();
  if (!mapData) {
    alert('Generate a map first!');
    return;
  }

  // Find a random empty cell
  const { grid } = mapData;
  const emptyCells: {x: number, y: number}[] = [];
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === CellType.EMPTY) {
        emptyCells.push({x, y});
      }
    }
  }
  
  if (emptyCells.length === 0) {
    alert('No empty cells available for power-up spawning!');
    return;
  }
  
  // Select a random empty cell
  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  
  // Force spawn a power-up (100% chance)
  const types = [PowerUpType.BOMB, PowerUpType.FLAME, PowerUpType.SPEED];
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  // Manually create and spawn the power-up
  const powerup = maybeSpawnPowerup(randomCell.x, randomCell.y);
  
  // Re-render the map
  renderMap(mapData);
  
  console.log(`Test power-up spawned at (${randomCell.x}, ${randomCell.y}): ${powerup ? 'Success' : 'Failed'}`);
}

// Test function to collect a random power-up
function testCollectPowerUp() {
  // Simulate player ID
  const testPlayerId = 'test-player-1';
  
  // Get current map data
  const mapData = getCurrentMapData();
  if (!mapData) {
    alert('Generate a map first!');
    return;
  }
  
  // Get all active power-ups directly
  const powerups = getActivePowerUps();
  
  if (!powerups || powerups.length === 0) {
    alert('No power-ups available to collect! Spawn some first.');
    return;
  }
  
  // Select a random power-up
  const randomIndex = Math.floor(Math.random() * powerups.length);
  const powerup = powerups[randomIndex];
  
  // Collect the power-up
  const collected = checkAndCollectPowerUp(powerup.x, powerup.y, testPlayerId);
  
  console.log(`Test power-up collection at (${powerup.x}, ${powerup.y}): ${collected ? 'Success' : 'Failed'}`);
  
  // Re-render the map
  renderMap(mapData);
}

// Test function to destroy a random block
function testDestroyRandomBlock() {
  const mapData = getCurrentMapData();
  if (!mapData) {
    alert('Generate a map first!');
    return;
  }

  const { blocks } = mapData;
  
  if (blocks.length === 0) {
    alert('No blocks available to destroy!');
    return;
  }
  
  // Select a random block
  const randomIndex = Math.floor(Math.random() * blocks.length);
  const block = blocks[randomIndex];
  
  // Destroy the block
  const destroyed = destroyBlock(mapData, block.x, block.y, true);
  
  console.log(`Test block destruction at (${block.x}, ${block.y}): ${destroyed ? 'Success' : 'Failed'}`);
  
  // Re-render the map
  renderMap(mapData);
}
