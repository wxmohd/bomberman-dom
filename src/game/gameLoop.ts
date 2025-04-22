// Main game loop using requestAnimationFrame
export function startGameLoop(update: () => void) {
  function loop() {
    update();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
