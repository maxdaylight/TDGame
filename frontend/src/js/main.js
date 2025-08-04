import { MAPS } from './maps.js';
import { Game } from './game.js';

// Show the map gallery modal on load, and only start the game after a map is selected
window.addEventListener('DOMContentLoaded', () => {
  const mapGalleryModal = document.getElementById('map-gallery-modal');
  if (mapGalleryModal) {
    mapGalleryModal.classList.remove('hidden');
  }

  // Patch UIManager to start the game only after map selection
  // (Assumes UIManager is imported by game.js, which is imported after this script)
  window.startGameWithMap = (map) => {
    // Remove any existing game instance
    if (window.game) {
      window.game = null;
    }
    window.game = new Game();
    window.game.generateMap(map);
    window.game.uiManager.hideMapGallery();
  };
});
