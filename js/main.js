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

// Import components from index file
import {
  ControlManager,
  DesktopMobileControls,
  ArrowControls,
  NavigateOnClick,
  TogglePhysics,
  PhysicsSleepManager,
  PhysicsOptimizer,
  LoadingScreenManager,
  MakeTransparent,
  SimpleNavmeshConstraint
} from './components/index.js';
import PerformanceOptimizer from './utils/PerformanceOptimizer.js';

// Register components safely
function registerComponents() {
  console.log('Registering components...');

  // Import and register all components from index.js
  // This is handled by the index.js file itself

  // For debugging purposes, we'll still log each component registration
  safeRegisterComponent('control-manager', ControlManager);
  safeRegisterComponent('desktop-mobile-controls', DesktopMobileControls);
  safeRegisterComponent('arrow-controls', ArrowControls);
  safeRegisterComponent('navigate-on-click', NavigateOnClick);
  safeRegisterComponent('toggle-physics', TogglePhysics);
  safeRegisterComponent('physics-sleep-manager', PhysicsSleepManager);
  safeRegisterComponent('physics-optimizer', PhysicsOptimizer);
  safeRegisterComponent('loading-screen-manager', LoadingScreenManager);
  safeRegisterComponent('make-transparent', MakeTransparent);
  safeRegisterComponent('simple-navmesh-constraint', SimpleNavmeshConstraint);

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
        // The loading-screen-manager component will handle hiding the loading screen

        // Initialize performance optimizations
        PerformanceOptimizer.init();
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
  PhysicsSleepManager,
  PhysicsOptimizer,
  LoadingScreenManager,
  MultiplayerManager,
  // New modular components
  MakeTransparent,
  SimpleNavmeshConstraint
};
