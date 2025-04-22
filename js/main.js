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
  // Register core components
  safeRegisterComponent('control-manager', ControlManager);
  safeRegisterComponent('desktop-mobile-controls', DesktopMobileControls);
  safeRegisterComponent('arrow-controls', ArrowControls);
  safeRegisterComponent('navigate-on-click', NavigateOnClick);
  safeRegisterComponent('toggle-physics', TogglePhysics);
  safeRegisterComponent('loading-screen-manager', LoadingScreenManager);
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('VRMOBDESK Application Initializing');

  // Register components
  registerComponents();

  // Initialize device detection
  DeviceManager.init().then(() => {
    console.log(`Device detection complete: VR=${DeviceManager.isVR}, Mobile=${DeviceManager.isMobile}, Gyro=${DeviceManager.hasGyro}`);

    // Initialize multiplayer capabilities if needed
    // This is a placeholder for future multiplayer implementation
    if (window.location.search.includes('multiplayer=true')) {
      initializeMultiplayer();
    }
  });
});

/**
 * Initialize multiplayer capabilities
 * This is a placeholder for future implementation
 */
function initializeMultiplayer() {
  console.log('Multiplayer mode requested - This feature is not yet implemented');

  // Future implementation will include:
  // 1. WebRTC or WebSocket connection setup
  // 2. Player synchronization
  // 3. Positional audio
  // 4. Shared physics state
}

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
  LoadingScreenManager
};
