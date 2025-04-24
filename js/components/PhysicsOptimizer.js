/**
 * PhysicsOptimizer - Optimizes physics settings for better performance
 *
 * This component:
 * - Reduces physics update rate on mobile devices
 * - Limits physics substeps
 * - Optimizes physics settings for better performance
 */

// Component implementation
const PhysicsOptimizer = {
  schema: {
    enabled: { type: 'boolean', default: true },
    mobileFixedTimeStep: { type: 'number', default: 1/30 }, // 30Hz for mobile
    desktopFixedTimeStep: { type: 'number', default: 1/60 }, // 60Hz for desktop
    mobileMaxSubSteps: { type: 'number', default: 1 }, // Fewer substeps for mobile
    desktopMaxSubSteps: { type: 'number', default: 2 }, // More substeps for desktop
    debug: { type: 'boolean', default: false } // Enable debug logging
  },

  init: function() {
    // Bind methods
    this.optimizePhysics = this.optimizePhysics.bind(this);
    this.onSceneLoaded = this.onSceneLoaded.bind(this);
    this.onPhysxReady = this.onPhysxReady.bind(this);

    // Wait for scene to be loaded
    if (this.el.sceneEl.hasLoaded) {
      this.onSceneLoaded();
    } else {
      this.el.sceneEl.addEventListener('loaded', this.onSceneLoaded);
    }

    // Log initialization
    if (this.data.debug) {
      console.log('PhysicsOptimizer initialized with settings:', this.data);
    }
  },

  remove: function() {
    // Clean up event listeners
    this.el.sceneEl.removeEventListener('loaded', this.onSceneLoaded);
    this.el.sceneEl.removeEventListener('physx-ready', this.onPhysxReady);
  },

  /**
   * Handle scene loaded event
   */
  onSceneLoaded: function() {
    // Listen for the physx-ready event
    this.el.sceneEl.addEventListener('physx-ready', this.onPhysxReady);

    // If PhysX is already ready, call the handler directly
    if (this.el.sceneEl.systems.physics && this.el.sceneEl.systems.physics.driver) {
      this.onPhysxReady();
    } else if (this.data.debug) {
      console.log('PhysicsOptimizer: Waiting for physx-ready event');
    }
  },

  /**
   * Handle PhysX ready event
   */
  onPhysxReady: function() {
    if (this.data.debug) {
      console.log('PhysicsOptimizer: PhysX system is ready');
    }

    // Wait a bit to ensure physics system is fully initialized
    setTimeout(() => {
      this.optimizePhysics();
    }, 500);
  },

  /**
   * Optimize physics settings
   */
  optimizePhysics: function() {
    if (!this.data.enabled) return;

    try {
      // Get physics system
      const physics = this.el.sceneEl.systems.physics;
      if (!physics) {
        console.warn('PhysicsOptimizer: Physics system not found');
        return;
      }

      // Detect if we're on mobile
      const isMobile = AFRAME.utils.device.isMobile() ||
                      (window.DeviceManager && window.DeviceManager.isMobile);

      // Set physics parameters based on device type
      const timeStep = isMobile ? this.data.mobileFixedTimeStep : this.data.desktopFixedTimeStep;
      const maxSubSteps = isMobile ? this.data.mobileMaxSubSteps : this.data.desktopMaxSubSteps;

      // Apply settings
      if (physics.setFixedTimeStep) {
        physics.setFixedTimeStep(timeStep);
        if (this.data.debug) {
          console.log(`PhysicsOptimizer: Set fixed time step to ${timeStep}s (${1/timeStep}Hz)`);
        }
      } else if (this.data.debug) {
        console.warn('PhysicsOptimizer: setFixedTimeStep method not available');
      }

      if (physics.setMaxSubSteps) {
        physics.setMaxSubSteps(maxSubSteps);
        if (this.data.debug) {
          console.log(`PhysicsOptimizer: Set max substeps to ${maxSubSteps}`);
        }
      } else if (this.data.debug) {
        console.warn('PhysicsOptimizer: setMaxSubSteps method not available');
      }

      // Update scene attributes if methods aren't available
      if (!physics.setFixedTimeStep || !physics.setMaxSubSteps) {
        this.el.sceneEl.setAttribute('physics', {
          fixedTimeStep: timeStep,
          maxSubSteps: maxSubSteps
        });

        if (this.data.debug) {
          console.log(`PhysicsOptimizer: Updated physics attributes - fixedTimeStep: ${timeStep}, maxSubSteps: ${maxSubSteps}`);
        }
      }

      if (this.data.debug) {
        console.log(`PhysicsOptimizer: Physics optimized for ${isMobile ? 'mobile' : 'desktop'}`);
      }
    } catch (e) {
      console.error('Error optimizing physics:', e);
    }
  }
};

export default PhysicsOptimizer;
