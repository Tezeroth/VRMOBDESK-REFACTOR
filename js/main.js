/**
 * Main entry point for the VRMOBDESK application
 *
 * This file imports all components and initializes the application.
 * It also provides a loading screen and handles application startup.
 */

// Import managers
import DeviceManager from './managers/DeviceManager.js';
import LookModeManager from './managers/LookModeManager.js';

// Check if components are already registered to avoid conflicts
const registeredComponents = {};

// Helper function to safely register components
function safeRegisterComponent(name, implementation) {
  if (!AFRAME.components[name]) {
    AFRAME.registerComponent(name, implementation);
    registeredComponents[name] = true;
    console.log(`Registered component: ${name}`);
    return true;
  } else {
    console.log(`Component ${name} already registered, skipping.`);
    return false;
  }
}

// Import utilities
import PhysicsUtils from './utils/PhysicsUtils.js';
import InteractionUtils from './utils/InteractionUtils.js';
import StateMachine from './utils/StateMachine.js';

// Import components conditionally
import ControlManager from './components/ControlManager.js';
import DesktopMobileControls from './components/DesktopMobileControls.js';
import ArrowControls from './components/ArrowControls.js';
import NavigateOnClick from './components/NavigateOnClick.js';
import TogglePhysics from './components/TogglePhysics.js';

// Loading screen manager component
const LoadingScreenManager = {

  init: function() {
    // Get loading overlay element
    this.loadingOverlay = document.getElementById('loading-overlay');
    if (!this.loadingOverlay) {
      console.warn('Loading overlay element not found');
      return;
    }

    // Listen for asset loading events
    const assetItems = document.querySelectorAll('a-asset-item');
    let loadedCount = 0;
    const totalCount = assetItems.length;

    // Function to update loading progress
    const updateProgress = () => {
      loadedCount++;
      const progress = Math.floor((loadedCount / totalCount) * 100);
      console.log(`Loading progress: ${progress}%`);

      // Update loading screen if needed
      // (could add a progress bar here)
    };

    // Add load event listeners to all assets
    assetItems.forEach(item => {
      item.addEventListener('loaded', updateProgress);
    });

    // Listen for scene loaded event
    this.el.addEventListener('loaded', () => {
      console.log('Scene loaded');
      this.hideLoadingScreen();
    });

    // Fallback timeout to hide loading screen
    setTimeout(() => {
      if (this.loadingOverlay.style.display !== 'none') {
        console.warn('Loading screen timeout - forcing hide');
        this.hideLoadingScreen();
      }
    }, 30000); // 30 second timeout
  },

  /**
   * Hide the loading screen
   */
  hideLoadingScreen: function() {
    if (this.loadingOverlay) {
      // Fade out loading screen
      this.loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        this.loadingOverlay.style.display = 'none';
      }, 500); // Wait for fade animation

      console.log('Loading screen hidden');
    }
  }
};

// Register components safely
function registerComponents() {
  console.log('Registering components...');

  // Register core components
  safeRegisterComponent('control-manager', ControlManager);
  safeRegisterComponent('desktop-mobile-controls', DesktopMobileControls);
  safeRegisterComponent('arrow-controls', ArrowControls);
  safeRegisterComponent('navigate-on-click', NavigateOnClick);
  safeRegisterComponent('toggle-physics', TogglePhysics);
  safeRegisterComponent('loading-screen-manager', LoadingScreenManager);

  console.log('Component registration complete');
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('VRMOBDESK Application Initializing');

  // Register components
  registerComponents();

  // Initialize device detection
  DeviceManager.init().then(() => {
    console.log(`Device detection complete: VR=${DeviceManager.isVR}, Mobile=${DeviceManager.isMobile}, Gyro=${DeviceManager.hasGyro}`);

    // Ensure desktop-mobile-controls is added to the scene
    const scene = document.querySelector('a-scene');
    if (scene) {
      if (!scene.hasAttribute('desktop-mobile-controls')) {
        console.log('Adding desktop-mobile-controls to scene');
        scene.setAttribute('desktop-mobile-controls', '');
      }

      // Add scene loaded handler
      scene.addEventListener('loaded', () => {
        console.log('Scene loaded');

        // Hide loading screen
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
          console.log('Loading screen hidden');
          loadingOverlay.style.display = 'none';
        }
      });
    }

    // Initialize multiplayer capabilities if needed
    // This is a placeholder for future multiplayer implementation
    if (window.location.search.includes('multiplayer=true')) {
      initializeMultiplayer();
    }
  });
});

/**
 * Initialize multiplayer capabilities
 * This will be expanded in future implementation
 */
function initializeMultiplayer() {
  console.log('Multiplayer mode requested - Setting up multiplayer environment');

  // Initialize the multiplayer manager
  MultiplayerManager.init();

  // Create UI for multiplayer controls
  createMultiplayerUI();

  // Connect to multiplayer server
  setTimeout(() => {
    // Auto-connect after a short delay
    MultiplayerManager.connect();
  }, 2000);

  return MultiplayerManager;
}

/**
 * Create UI elements for multiplayer controls
 */
function createMultiplayerUI() {
  // Create a simple UI for multiplayer controls
  const uiContainer = document.createElement('div');
  uiContainer.id = 'multiplayer-ui';
  uiContainer.style.position = 'fixed';
  uiContainer.style.bottom = '20px';
  uiContainer.style.right = '20px';
  uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  uiContainer.style.padding = '10px';
  uiContainer.style.borderRadius = '5px';
  uiContainer.style.color = 'white';
  uiContainer.style.fontFamily = 'Arial, sans-serif';
  uiContainer.style.zIndex = '1000';

  // Status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'multiplayer-status';
  statusIndicator.textContent = 'Multiplayer: Initializing...';
  uiContainer.appendChild(statusIndicator);

  // Connect button
  const connectButton = document.createElement('button');
  connectButton.textContent = 'Connect';
  connectButton.style.marginTop = '10px';
  connectButton.style.marginRight = '5px';
  connectButton.style.padding = '5px 10px';
  connectButton.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('connect-multiplayer'));
  });
  uiContainer.appendChild(connectButton);

  // Disconnect button
  const disconnectButton = document.createElement('button');
  disconnectButton.textContent = 'Disconnect';
  disconnectButton.style.padding = '5px 10px';
  disconnectButton.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('disconnect-multiplayer'));
  });
  uiContainer.appendChild(disconnectButton);

  // Add event listeners to update UI
  document.addEventListener('multiplayer-initialized', (e) => {
    statusIndicator.textContent = `Multiplayer: Ready (ID: ${e.detail.localId})`;
  });

  document.addEventListener('multiplayer-connected', () => {
    statusIndicator.textContent = 'Multiplayer: Connected';
    statusIndicator.style.color = '#00ff00';
  });

  document.addEventListener('multiplayer-disconnected', () => {
    statusIndicator.textContent = 'Multiplayer: Disconnected';
    statusIndicator.style.color = '#ff0000';
  });

  // Add to document
  document.body.appendChild(uiContainer);
}

// Create a proper MultiplayerManager module
const MultiplayerManager = {
  isConnected: false,
  peers: [],
  localId: null,

  /**
   * Initialize the multiplayer system
   */
  init: function() {
    console.log('Initializing multiplayer manager');
    // This will be implemented with WebRTC or WebSocket
    this.localId = 'user_' + Math.floor(Math.random() * 10000);
    console.log(`Generated local user ID: ${this.localId}`);

    // Setup event listeners for multiplayer events
    document.addEventListener('connect-multiplayer', this.connect.bind(this));
    document.addEventListener('disconnect-multiplayer', this.disconnect.bind(this));

    return this;
  },

  /**
   * Connect to multiplayer server
   */
  connect: function() {
    console.log('Connecting to multiplayer server...');
    // This will be implemented with actual connection logic
    setTimeout(() => {
      this.isConnected = true;
      console.log('Connected to multiplayer server (simulated)');

      // Emit connected event
      const event = new CustomEvent('multiplayer-connected');
      document.dispatchEvent(event);
    }, 1000);
  },

  /**
   * Disconnect from multiplayer server
   */
  disconnect: function() {
    console.log('Disconnecting from multiplayer server...');
    // This will be implemented with actual disconnection logic
    this.isConnected = false;
    this.peers = [];

    // Emit disconnected event
    const event = new CustomEvent('multiplayer-disconnected');
    document.dispatchEvent(event);
  }
};

// Export for module system
export {
  DeviceManager,
  LookModeManager,
  PhysicsUtils,
  InteractionUtils,
  StateMachine,
  ControlManager,
  DesktopMobileControls,
  ArrowControls,
  NavigateOnClick,
  TogglePhysics,
  LoadingScreenManager,
  MultiplayerManager
};
