/**
 * PhysicsSleepManager - Manages sleep states for physics objects
 *
 * This component:
 * - Tracks physics objects in the scene
 * - Puts objects to sleep based on distance, visibility, and activity
 * - Wakes objects when they need to be active
 * - Optimizes performance by reducing unnecessary physics calculations
 */

// Component implementation
const PhysicsSleepManager = {
  schema: {
    enabled: { type: 'boolean', default: true },
    distanceThreshold: { type: 'number', default: 10 }, // Objects beyond this distance will sleep
    sleepVelocityThreshold: { type: 'number', default: 0.05 }, // Velocity below which objects can sleep
    inactivityTimeout: { type: 'number', default: 3000 }, // Time in ms before inactive objects sleep
    checkInterval: { type: 'number', default: 500 }, // How often to check sleep states (ms)
    debug: { type: 'boolean', default: false } // Enable debug logging
  },

  init: function() {
    // Bind methods
    this.tick = this.tick.bind(this);
    this.checkSleepStates = this.checkSleepStates.bind(this);
    this.onObjectGrabbed = this.onObjectGrabbed.bind(this);
    this.onObjectReleased = this.onObjectReleased.bind(this);
    this.onSceneLoaded = this.onSceneLoaded.bind(this);

    // Initialize state
    this.physicsObjects = [];
    this.lastCheckTime = 0;
    this.cameraPosition = new THREE.Vector3();
    this.objectPosition = new THREE.Vector3();
    this.tempVelocity = new THREE.Vector3();
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
    this.grabbedObjects = new Set();
    this.isInitialized = false;
    this.camera = null;

    // Set up event listeners for object interactions
    this.el.addEventListener('grab-start', this.onObjectGrabbed);
    this.el.addEventListener('grab-end', this.onObjectReleased);

    // Wait for scene to be fully loaded before initializing
    if (this.el.sceneEl.hasLoaded) {
      this.onSceneLoaded();
    } else {
      this.el.sceneEl.addEventListener('loaded', this.onSceneLoaded);
    }

    // Log initialization start
    if (this.data.debug) {
      console.log('PhysicsSleepManager initialization started with settings:', this.data);
    }
  },

  /**
   * Handle scene loaded event
   */
  onSceneLoaded: function() {
    try {
      // Find camera
      const cameraEl = document.querySelector('[camera]');
      if (!cameraEl) {
        console.warn('PhysicsSleepManager: No camera element found');
        return;
      }

      this.camera = cameraEl.object3D;
      if (!this.camera) {
        console.warn('PhysicsSleepManager: Camera element has no object3D');
        return;
      }

      // Wait a bit for the camera to be fully initialized
      setTimeout(() => {
        // Initial collection of physics objects
        this.collectPhysicsObjects();

        // Mark as initialized
        this.isInitialized = true;

        // Log initialization complete
        if (this.data.debug) {
          console.log('PhysicsSleepManager fully initialized');
          console.log('Found physics objects:', this.physicsObjects.length);
        }
      }, 1000); // Wait 1 second for everything to be ready
    } catch (e) {
      console.error('Error initializing PhysicsSleepManager:', e);
    }
  },

  remove: function() {
    // Clean up event listeners
    this.el.removeEventListener('grab-start', this.onObjectGrabbed);
    this.el.removeEventListener('grab-end', this.onObjectReleased);
    this.el.sceneEl.removeEventListener('loaded', this.onSceneLoaded);

    // Clear references
    this.camera = null;
    this.physicsObjects = [];
    this.grabbedObjects.clear();
  },

  /**
   * Collect all physics objects in the scene
   */
  collectPhysicsObjects: function() {
    try {
      // Find all elements with physx-body component
      const physicsElements = document.querySelectorAll('[physx-body]');

      this.physicsObjects = [];

      // Filter for dynamic bodies only (static and kinematic don't need sleep management)
      physicsElements.forEach(el => {
        try {
          const bodyComponent = el.components['physx-body'];
          if (bodyComponent && bodyComponent.data && bodyComponent.data.type === 'dynamic') {
            // Initialize last activity time
            el.lastActivityTime = Date.now();
            el.isInView = true;
            el.isNearCamera = true;

            // Add to tracked objects
            this.physicsObjects.push(el);
          }
        } catch (elementError) {
          console.error('Error processing physics element:', elementError);
        }
      });

      if (this.data.debug) {
        console.log(`Collected ${this.physicsObjects.length} dynamic physics objects`);
      }
    } catch (e) {
      console.error('Error collecting physics objects:', e);
      this.physicsObjects = [];
    }
  },

  /**
   * Handle object grabbed event
   */
  onObjectGrabbed: function(evt) {
    const el = evt.detail.target || evt.detail.el;
    if (el) {
      // Add to grabbed objects set
      this.grabbedObjects.add(el);

      // Update activity time
      el.lastActivityTime = Date.now();

      // Ensure object is awake
      this.wakeObject(el);

      if (this.data.debug) {
        console.log('Object grabbed:', el.id || el);
      }
    }
  },

  /**
   * Handle object released event
   */
  onObjectReleased: function(evt) {
    const el = evt.detail.target || evt.detail.el;
    if (el) {
      // Remove from grabbed objects set
      this.grabbedObjects.delete(el);

      // Update activity time
      el.lastActivityTime = Date.now();

      // Ensure object is awake (it will go to sleep naturally if inactive)
      this.wakeObject(el);

      if (this.data.debug) {
        console.log('Object released:', el.id || el);
      }
    }
  },

  /**
   * Wake up a physics object
   */
  wakeObject: function(el) {
    const bodyComponent = el.components['physx-body'];
    if (bodyComponent && bodyComponent.rigidBody) {
      try {
        // Check if wakeUp method exists
        if (typeof bodyComponent.rigidBody.wakeUp === 'function') {
          bodyComponent.rigidBody.wakeUp();
          if (this.data.debug) {
            console.log('Woke up object:', el.id || el);
          }
        } else if (this.data.debug) {
          console.log('Object does not support wakeUp:', el.id || el);
        }

        // Always update activity time
        el.lastActivityTime = Date.now();
      } catch (e) {
        console.error('Error waking object:', e);
      }
    }
  },

  /**
   * Check if an object is in camera view
   */
  isInView: function(object3D) {
    try {
      // Safety checks
      if (!this.camera || !object3D) return true; // Assume in view if we can't check
      if (!this.camera.projectionMatrix || !this.camera.matrixWorldInverse) return true;

      // Update the frustum
      this.projScreenMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

      // Check if object is in frustum
      return this.frustum.intersectsObject(object3D);
    } catch (e) {
      console.error('Error checking if object is in view:', e);
      return true; // Assume in view if there's an error
    }
  },

  /**
   * Check if an object is moving
   */
  isMoving: function(rigidBody) {
    if (!rigidBody) return false;

    try {
      // Get current velocity
      const velocity = rigidBody.getLinearVelocity();
      const speed = Math.sqrt(
        velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z
      );

      // Check if speed is above threshold
      return speed > this.data.sleepVelocityThreshold;
    } catch (e) {
      console.error('Error checking if object is moving:', e);
      return false;
    }
  },

  /**
   * Check sleep states for all physics objects
   */
  checkSleepStates: function() {
    // Skip if not initialized or disabled
    if (!this.isInitialized || !this.data.enabled) return;

    // Safety check for camera
    if (!this.camera) {
      if (this.data.debug) {
        console.warn('PhysicsSleepManager: Camera not available for sleep state check');
      }
      return;
    }

    try {
      // Get current camera position
      this.camera.getWorldPosition(this.cameraPosition);

      // Check each physics object
      this.physicsObjects.forEach(el => {
        try {
          // Skip if object is being grabbed
          if (this.grabbedObjects.has(el)) return;

          // Skip if object doesn't exist or has been removed
          if (!el.isConnected || !el.object3D) return;

          const bodyComponent = el.components['physx-body'];
          if (!bodyComponent || !bodyComponent.rigidBody) return;

          // Skip if not dynamic (static and kinematic don't need sleep management)
          if (bodyComponent.data.type !== 'dynamic') return;

          // Get object position
          el.object3D.getWorldPosition(this.objectPosition);

          // Check distance from camera
          const distance = this.cameraPosition.distanceTo(this.objectPosition);
          const isNearCamera = distance <= this.data.distanceThreshold;

          // Check if in view
          const isInView = this.isInView(el.object3D);

          // Check if moving
          const isMoving = this.isMoving(bodyComponent.rigidBody);

          // Check if recently active
          const timeSinceActivity = Date.now() - (el.lastActivityTime || 0);
          const isRecentlyActive = timeSinceActivity < this.data.inactivityTimeout;

          // Determine if object should be awake
          const shouldBeAwake = isNearCamera && (isInView || isMoving || isRecentlyActive);

          // Check if the rigid body supports sleep states
          const supportsWakeUp = typeof bodyComponent.rigidBody.wakeUp === 'function';
          const supportsIsAwake = typeof bodyComponent.rigidBody.isAwake === 'function';

          // Only manage sleep states if the rigid body supports it
          if (supportsWakeUp) {
            // If we can check awake state, do so
            let isAwake = true; // Default to true if we can't check
            if (supportsIsAwake) {
              isAwake = bodyComponent.rigidBody.isAwake();
            } else {
              // If we can't check awake state, use velocity as a proxy
              isAwake = isMoving;
            }

            // Update state if needed
            if (shouldBeAwake && (!isAwake || !supportsIsAwake)) {
              try {
                bodyComponent.rigidBody.wakeUp();
                if (this.data.debug) {
                  console.log(`Waking object ${el.id || 'unnamed'}: near=${isNearCamera}, inView=${isInView}, moving=${isMoving}, recentlyActive=${isRecentlyActive}`);
                }
              } catch (e) {
                console.warn(`Failed to wake object ${el.id || 'unnamed'}:`, e);
              }
            } else if (!shouldBeAwake && isAwake && this.data.debug) {
              // Let PhysX handle putting it to sleep naturally
              // We don't force sleep because that could cause physics issues
              console.log(`Object ${el.id || 'unnamed'} should sleep: near=${isNearCamera}, inView=${isInView}, moving=${isMoving}, recentlyActive=${isRecentlyActive}`);
            }
          }

          // Update tracking state
          el.isInView = isInView;
          el.isNearCamera = isNearCamera;

          // If object is moving, update activity time
          if (isMoving) {
            el.lastActivityTime = Date.now();
          }
        } catch (elementError) {
          console.error('Error processing physics object:', elementError);
        }
      });
    } catch (e) {
      console.error('Error in checkSleepStates:', e);
    }
  },

  /**
   * Tick function called by A-Frame on every frame
   */
  tick: function(time, deltaTime) {
    // Skip if not initialized
    if (!this.isInitialized) return;

    // Only check sleep states at the specified interval
    if (time - this.lastCheckTime > this.data.checkInterval) {
      try {
        this.checkSleepStates();
        this.lastCheckTime = time;
      } catch (e) {
        console.error('Error in physics sleep manager tick:', e);
      }
    }
  }
};

export default PhysicsSleepManager;
