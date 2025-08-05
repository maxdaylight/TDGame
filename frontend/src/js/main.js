import { MAPS } from './maps.js';
import { Game } from './game.js';

// Global cleanup function to ensure only one game instance exists
let tempGame = null;

function cleanupAllGameInstances() {
  // Destroy temp game if it exists
  if (tempGame && typeof tempGame.destroy === 'function') {
    tempGame.destroy();
  }
  tempGame = null;
  
  // Destroy main game if it exists
  if (window.game && typeof window.game.destroy === 'function') {
    window.game.destroy();
  }
  window.game = null;
  
  console.log('All game instances cleaned up');
}

// Make cleanup function globally accessible
window.cleanupAllGameInstances = cleanupAllGameInstances;

// Show the map gallery modal on load, and only start the game after a map is selected
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up map selection...');
  
  // Cleanup any existing instances first
  cleanupAllGameInstances();
  
  // Show the map selection button on the loading screen
  const loadingTitle = document.getElementById('loading-title');
  const selectMapBtn = document.getElementById('select-map-btn');
  
  console.log('Loading title element:', loadingTitle);
  console.log('Select map button element:', selectMapBtn);
  
  if (loadingTitle) {
    loadingTitle.textContent = 'Welcome to TDGAME!';
  }
  
  if (selectMapBtn) {
    selectMapBtn.style.display = 'block';
    selectMapBtn.addEventListener('click', () => {
      console.log('Map selection button clicked!');
      showMapGallery();
    });
  }

  // Function to show map gallery
  function showMapGallery() {
    console.log('showMapGallery called');
    const mapGalleryModal = document.getElementById('map-gallery-modal');
    console.log('Map gallery modal element:', mapGalleryModal);
    
    if (mapGalleryModal) {
      renderMapGallery();
      mapGalleryModal.classList.remove('hidden');
      mapGalleryModal.style.display = 'flex';
      
      // Debug modal visibility
      const computedStyle = window.getComputedStyle(mapGalleryModal);
      console.log('Modal classes:', mapGalleryModal.className);
      console.log('Modal display style:', mapGalleryModal.style.display);
      console.log('Modal computed display:', computedStyle.display);
      console.log('Modal computed z-index:', computedStyle.zIndex);
      console.log('Modal computed visibility:', computedStyle.visibility);
      console.log('Modal computed opacity:', computedStyle.opacity);
      console.log('Modal position:', computedStyle.position);
      console.log('Map gallery should now be visible');
    } else {
      console.error('Map gallery modal not found!');
    }
  }

  // Function to render map gallery (simplified version)
  function renderMapGallery() {
    console.log('renderMapGallery called');
    const mapGalleryList = document.getElementById('map-gallery-list');
    console.log('Map gallery list element:', mapGalleryList);
    
    if (!mapGalleryList) {
      console.error('Map gallery list not found!');
      return;
    }
    
    // Import MAPS - we need to access it from the modules
    import('./maps.js').then(({ MAPS }) => {
      console.log('MAPS loaded:', MAPS);
      mapGalleryList.innerHTML = '';
      
      MAPS.forEach((map, idx) => {
        console.log('Creating map card for:', map.name);
        
        const card = document.createElement('div');
        card.className = 'map-card';
        card.style.cssText = `
          background: #333;
          border-radius: 12px;
          padding: 20px;
          width: 220px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.2s;
          cursor: pointer;
          margin: 10px;
        `;
        card.onmouseover = () => card.style.transform = 'scale(1.04)';
        card.onmouseout = () => card.style.transform = 'scale(1)';

        // Map name
        const name = document.createElement('div');
        name.innerText = map.name;
        name.style.cssText = 'font-weight: bold; font-size: 1.2em; color: #fff; margin-bottom: 10px;';
        card.appendChild(name);

        // Approach zone info
        const approach = document.createElement('div');
        approach.innerText = `Approach Zone: ${map.approachZoneWidth}`;
        approach.style.cssText = 'color: #bbb; font-size: 0.95em; margin-bottom: 12px;';
        card.appendChild(approach);

        // Map preview canvas
        const preview = document.createElement('div');
        preview.style.margin = '12px 0';
        
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 120;
        canvas.style.cssText = 'border: 2px solid #4caf50; border-radius: 6px; background: #1a1a1a;';
        
        // Render map preview
        const ctx = canvas.getContext('2d');
        renderMapPreview(ctx, map, canvas.width, canvas.height);
        
        preview.appendChild(canvas);
        card.appendChild(preview);

        // Select button
        const selectBtn = document.createElement('button');
        selectBtn.innerText = 'Select';
        selectBtn.style.cssText = `
          margin-top: 10px;
          padding: 8px 18px;
          border-radius: 6px;
          border: none;
          background: #4caf50;
          color: #fff;
          font-weight: bold;
          cursor: pointer;
        `;
        selectBtn.onclick = () => {
          console.log('Map selected:', map.name);
          startGameWithMap(map);
        };
        card.appendChild(selectBtn);

        mapGalleryList.appendChild(card);
      });
      
      console.log('Map gallery rendered with', MAPS.length, 'maps');
    }).catch(error => {
      console.error('Failed to import maps:', error);
    });
  }

  // Function to render map preview on canvas
  function renderMapPreview(ctx, map, width, height) {
    console.log('Rendering map preview for:', map.name, 'Path:', map.path);
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Scale the path coordinates - maps use grid coordinates (0-19 x, 0-12 y roughly)
    const gridWidth = 20;  // Max x coordinate is around 19
    const gridHeight = 12; // Max y coordinate is around 11
    const scaleX = width / gridWidth;
    const scaleY = height / gridHeight;
    
    console.log('Scale factors:', { scaleX, scaleY, gridWidth, gridHeight });
    
    if (map.path && map.path.length > 0) {
      console.log('Drawing path with', map.path.length, 'points');
      
      // Draw path
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      map.path.forEach((point, index) => {
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        
        console.log(`Point ${index}: (${point.x}, ${point.y}) -> (${x}, ${y})`);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Draw start point (green circle)
      if (map.path.length > 0) {
        const start = map.path[0];
        const startX = start.x * scaleX;
        const startY = start.y * scaleY;
        console.log('Drawing start point at:', startX, startY);
        
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(startX, startY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw end point (red circle)
      if (map.path.length > 1) {
        const end = map.path[map.path.length - 1];
        const endX = end.x * scaleX;
        const endY = end.y * scaleY;
        console.log('Drawing end point at:', endX, endY);
        
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      console.log('No path data found for map:', map.name);
      // Fallback: draw map name if no path
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(map.name, width / 2, height / 2);
    }
  }

  // Function to start the game only after map selection
  window.startGameWithMap = (map) => {
    console.log('Starting game with map:', map.name);
    
    // Hide map gallery
    const mapGalleryModal = document.getElementById('map-gallery-modal');
    if (mapGalleryModal) {
      mapGalleryModal.classList.add('hidden');
    }
    
    // Update loading screen
    if (loadingTitle) {
      loadingTitle.textContent = 'Loading Game...';
    }
    if (selectMapBtn) {
      selectMapBtn.style.display = 'none';
    }
    
    // Cleanup all existing instances
    cleanupAllGameInstances();
    
    // Create new game instance with full initialization
    window.game = new Game({ autoInitialize: true });
    window.game.generateMap(map);
  };
});

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
  cleanupAllGameInstances();
});
