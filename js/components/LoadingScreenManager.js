/**
 * LoadingScreenManager - Manages the loading screen overlay
 *
 * This component:
 * - Handles showing and hiding the loading screen
 * - Waits for the PhysX system to be ready before hiding the loading screen
 * - Includes fallback mechanisms in case events aren't fired
 */

// Component implementation
const LoadingScreenManager = {
  schema: {
    timeout: { type: 'number', default: 30000 }, // Fallback timeout
    debug: { type: 'boolean', default: true }
  },

  init: function() {
    // Get loading overlay element
    this.loadingOverlay = document.getElementById('loading-overlay');
    if (!this.loadingOverlay) {
      console.warn('LoadingScreenManager: Loading overlay element not found');
      return;
    }

    // Bind methods
    this.hideLoadingScreen = this.hideLoadingScreen.bind(this);
    this.onPhysXStarted = this.onPhysXStarted.bind(this);
    this.checkConsoleForPhysX = this.checkConsoleForPhysX.bind(this);

    // Track loading state
    this.isHidden = false;

    // Set up console.info interceptor to catch "Starting PhysX scene" message
    this.originalConsoleInfo = console.info;
    console.info = (...args) => {
      this.originalConsoleInfo.apply(console, args);
      if (args[0] === "Starting PhysX scene") {
        this.checkConsoleForPhysX("Starting PhysX scene");
      }
    };

    // Listen for physx-started event
    this.el.addEventListener('physx-started', this.onPhysXStarted);

    // Fallback timeout
    if (this.data.timeout > 0) {
      this.timeoutId = setTimeout(() => {
        if (!this.isHidden) {
          console.warn('LoadingScreenManager: Loading screen timeout - forcing hide');
          this.hideLoadingScreen();
        }
      }, this.data.timeout);
    }

    if (this.data.debug) {
      console.log('LoadingScreenManager: Initialized, waiting for PhysX');
    }
  },

  remove: function() {
    // Clean up event listeners
    this.el.removeEventListener('physx-started', this.onPhysXStarted);

    // Restore original console.info
    if (this.originalConsoleInfo) {
      console.info = this.originalConsoleInfo;
    }

    // Clear timeout if it exists
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  },

  /**
   * Handle physx-started event
   */
  onPhysXStarted: function() {
    if (this.data.debug) {
      console.log('LoadingScreenManager: PhysX started event received');
    }
    this.hideLoadingScreen();
  },

  /**
   * Check console for PhysX message
   */
  checkConsoleForPhysX: function(message) {
    if (message === "Starting PhysX scene") {
      if (this.data.debug) {
        console.log('LoadingScreenManager: "Starting PhysX scene" message detected');
      }
      this.hideLoadingScreen();
      return true;
    }
    return false;
  },

  /**
   * Hide the loading screen
   */
  hideLoadingScreen: function() {
    if (!this.loadingOverlay || this.isHidden) return;

    // Mark as hidden to prevent multiple calls
    this.isHidden = true;

    if (this.data.debug) {
      console.log('LoadingScreenManager: Hiding loading screen');
    }

    // Fade out loading screen
    this.loadingOverlay.style.opacity = '0';

    // After fade animation, hide completely
    setTimeout(() => {
      this.loadingOverlay.style.display = 'none';
    }, 500);
  }
};

export default LoadingScreenManager;
