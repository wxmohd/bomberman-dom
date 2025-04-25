// This file is deprecated - all lobby functionality has been moved to src/game/lobby.ts
// This empty file is kept to prevent import errors

// Redirect to the new implementation
import { renderLoginScreen } from '../game/lobby';

// Export a dummy function that redirects to the new implementation
export function renderLobby() {
  console.warn('Using deprecated lobby.ts, please update imports to use game/lobby.ts');
  const app = document.getElementById('app');
  if (app) {
    renderLoginScreen(app);
  }
}
