/**
 * JumpControl - Provides jumping functionality for the player
 *
 * This component implements a reliable jumping system using A-Frame's animation system
 * rather than physics. This approach provides predictable jumping behavior while
 * maintaining compatibility with existing movement and navmesh systems.
 */

import DeviceManager from '../managers/DeviceManager.js';

// Include JumpDebug utility (without using import to avoid breaking code)
// The utility is attached to the window object in JumpDebug.js
// Make sure to include the script in your HTML before this component

const JumpControl = {
  schema: {
    enabled: { type: 'boolean', default: true },
    height: { type: 'number', default: 2.2 },  // Reduced jump height by approximately 1 foot (0.3 units)
    cooldown: { type: 'number', default: 500 },
    upDuration: { type: 'number', default: 500 }, // Duration of rising phase
    downDuration: { type: 'number', default: 500 }, // Duration of falling phase
    respectNavmesh: { type: 'boolean', default: true }
  },

  init: function () {
    // Initialize JumpDebug if it exists
    if (window.JumpDebug) {
      // Disable debug output by default
      window.JumpDebug.enabled = false;

      // Add a message to the console about how to enable debugging
      console.info('Jump system loaded. To enable debug mode, run: window.JumpDebug.enabled = true');

      // You can customize which debug levels are enabled
      // window.JumpDebug.disableLevels(['position']); // Example: disable position logs
    }

    // Initialize state variables

    // Jump state tracking
    this.isJumping = false;      // Whether the player is currently in a jump
    this.isFalling = false;      // Whether the player is in the falling phase of a jump
    this.justLanded = false;     // Flag set briefly after landing to trigger post-landing checks
    this.canJump = true;         // Whether the player is allowed to jump (cooldown control)
    this.jumpStartTime = null;   // Timestamp when the current jump started

    // Jump physics
    this.yVelocity = 0;          // Current vertical velocity during fall
    this.startY = 0;             // Starting Y position of the jump (ground level)
    this.maxY = 0;               // Maximum Y position the jump will reach
    this.jumpMomentum = { x: 0, z: 0 }; // Horizontal momentum carried through the jump

    // Timers and safety mechanisms
    this.jumpTimeout = null;     // Timer for jump cooldown
    this.safetyTimeout = null;   // Safety timer to ensure jump always completes

    // Position tracking for safety and recovery
    this.lastValidPosition = new THREE.Vector3();       // Last known safe position
    this.navmeshLastValidPosition = new THREE.Vector3(); // Last valid position from navmesh
    this.initialXZ = { x: 0, z: 0 };                    // Starting XZ position for collision handling

    // Camera tracking (for momentum calculations)
    this.lastCameraRotation = new THREE.Euler();        // Previous camera rotation
    this.cameraAngularVelocity = new THREE.Vector3();   // Camera rotation speed

    // Set up a safety check that runs every 2 seconds to ensure we can always jump
    this.safetyInterval = setInterval(() => {
      if (!this.canJump && !this.isJumping) {
        if (window.JumpDebug) {
          window.JumpDebug.safety('JumpControl', 'Found canJump=false but not jumping, resetting state');
        } else {
          console.warn('Jump safety check: Found canJump=false but not jumping, resetting state');
        }
        this.canJump = true;
      }
    }, 2000);

    // Bind methods
    this.jump = this.jump.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onAnimationComplete = this.onAnimationComplete.bind(this);
    this.resetJump = this.resetJump.bind(this);
    this.tick = this.tick.bind(this);

    // Add event listeners
    window.addEventListener('keydown', this.onKeyDown);

    // Bind animation complete handlers
    this.onUpAnimationComplete = this.onAnimationComplete.bind(this, 'up');
    this.onDownAnimationComplete = this.onAnimationComplete.bind(this, 'down');

    // Add animation complete listeners
    this.el.addEventListener('animationcomplete__up', this.onUpAnimationComplete);
    this.el.addEventListener('animationcomplete__down', this.onDownAnimationComplete);

    // Set up tick function
    this._tickFunction = this.tick.bind(this);
    this.el.sceneEl.addEventListener('tick', this._tickFunction);

    // Create jump button for mobile
    if (DeviceManager.isMobile) {
      this.createJumpButton();
    }

    // Ground detection system
    this.fallRaycaster = new THREE.Raycaster();     // Raycaster for detecting ground below player
    this.downVector = new THREE.Vector3(0, -1, 0);  // Direction vector pointing down
    this.navmeshObjects = [];                       // Collection of navmesh objects to raycast against

    // Get navmesh objects for raycasting
    this.findNavmeshObjects();
    this.el.sceneEl.addEventListener('child-attached', this.findNavmeshObjects.bind(this));
    this.el.sceneEl.addEventListener('child-detached', this.findNavmeshObjects.bind(this));
  },

  remove: function () {
    // Remove event listeners
    window.removeEventListener('keydown', this.onKeyDown);

    // Remove animation complete listeners
    this.el.removeEventListener('animationcomplete__up', this.onUpAnimationComplete);
    this.el.removeEventListener('animationcomplete__down', this.onDownAnimationComplete);

    // Remove tick function
    if (this._tickFunction) {
      this.el.sceneEl.removeEventListener('tick', this._tickFunction);
      this._tickFunction = null;
    }

    // Clear any pending timeouts
    if (this.jumpTimeout) {
      clearTimeout(this.jumpTimeout);
      this.jumpTimeout = null;
    }

    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }

    // Clear safety interval
    if (this.safetyInterval) {
      clearInterval(this.safetyInterval);
      this.safetyInterval = null;
    }

    // Remove jump button if it exists
    const jumpButton = document.getElementById('jumpBtn');
    if (jumpButton) {
      jumpButton.remove();
    }

    // Remove scene listeners
    this.el.sceneEl.removeEventListener('child-attached', this.findNavmeshObjects.bind(this));
    this.el.sceneEl.removeEventListener('child-detached', this.findNavmeshObjects.bind(this));
  },

  /**
   * Create a jump button for mobile devices
   */
  createJumpButton: function () {
    // Check if button already exists
    if (document.getElementById('jumpBtn')) {
      return;
    }

    // Create jump button
    const jumpButton = document.createElement('button');
    jumpButton.id = 'jumpBtn';
    jumpButton.className = 'jump-btn';
    jumpButton.innerHTML = '↑↑';

    // Style the button
    jumpButton.style.position = 'fixed';
    jumpButton.style.bottom = '120px';
    jumpButton.style.right = '20px';
    jumpButton.style.width = '60px';
    jumpButton.style.height = '60px';
    jumpButton.style.borderRadius = '50%';
    jumpButton.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    jumpButton.style.color = '#000';
    jumpButton.style.fontSize = '24px';
    jumpButton.style.border = 'none';
    jumpButton.style.zIndex = '999';
    jumpButton.style.display = 'flex';
    jumpButton.style.alignItems = 'center';
    jumpButton.style.justifyContent = 'center';

    // Add event listeners
    ['mousedown', 'touchstart'].forEach(eventType => {
      jumpButton.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.jump();
      }, { passive: false, capture: true });
    });

    // Add to document
    document.body.appendChild(jumpButton);
  },

  /**
   * Handle keydown events for jumping
   * @param {Event} event - The keydown event
   */
  onKeyDown: function (event) {
    // Space key always triggers jump
    if (event.code === 'Space' && !event.repeat) {
      // Prevent event propagation to stop other components from handling it
      event.stopPropagation();
      this.jump();
    }

    // Add a secret key combo to force reset jump state if needed
    // Ctrl+Alt+J will force reset the jump state
    if (event.code === 'KeyJ' && event.ctrlKey && event.altKey) {
      if (window.JumpDebug) {
        window.JumpDebug.info('JumpControl', 'Force reset key combo detected');
      } else {
        console.log('Force reset key combo detected');
      }
      this.forceResetJump();
    }
  },

  /**
   * Execute the jump
   */
  jump: function () {
    // Validate if jump can be performed
    if (!this.canPerformJump()) {
      return;
    }

    if (window.JumpDebug) {
      window.JumpDebug.state('JumpControl', 'Jump initiated');
    } else {
      console.log('Jump initiated');
    }

    // Initialize jump state
    this.initializeJumpState();

    // Store positions for safety and recovery
    this.storePositionsForJump();

    // Check for nearby walls and determine jump type
    const nearWall = this.checkForNearbyWalls();

    // Calculate and store momentum for the jump
    this.calculateJumpMomentum(nearWall);

    // Prepare environment for jump
    this.prepareForJump();

    // Start jump animation
    this.startJumpAnimation();

    // Set safety timeout
    this.setupSafetyTimeout();
  },

  /**
   * Validate if a jump can be performed
   * @returns {boolean} Whether the jump can be performed
   */
  canPerformJump: function() {
    // Don't jump if disabled
    if (!this.data.enabled) {
      return false;
    }

    // Force reset if we're stuck in a jumping state for too long
    if (this.isJumping) {
      const currentTime = Date.now();
      if (!this.jumpStartTime || (currentTime - this.jumpStartTime > 3000)) {
        if (window.JumpDebug) {
          window.JumpDebug.warn('JumpControl', 'Jump appears to be stuck, forcing reset');
        } else {
          console.warn('Jump appears to be stuck, forcing reset');
        }
        this.forceResetJump();
      }
      return false; // Still in a valid jump
    }

    // Check cooldown
    if (!this.canJump) {
      if (window.JumpDebug) {
        window.JumpDebug.info('JumpControl', 'Cannot jump - in cooldown');
      } else {
        console.log('Cannot jump - in cooldown');
      }
      return false;
    }

    // Check if we're in inspection mode - don't jump if examining an object
    const desktopMobileControls = document.querySelector('[desktop-mobile-controls]')?.components['desktop-mobile-controls'];
    const isInspecting = desktopMobileControls &&
                         desktopMobileControls.stateMachine &&
                         desktopMobileControls.stateMachine.is('inspecting');

    if (isInspecting) {
      if (window.JumpDebug) {
        window.JumpDebug.info('JumpControl', 'Cannot jump while in inspection mode');
      } else {
        console.log('Cannot jump while in inspection mode');
      }
      return false;
    }

    return true;
  },

  /**
   * Initialize jump state variables
   */
  initializeJumpState: function() {
    // Set state
    this.isJumping = true;
    this.canJump = false;
    this.jumpStartTime = Date.now();

    // Get current position
    const currentPos = this.el.object3D.position;
    this.startY = currentPos.y;
    this.maxY = this.startY + this.data.height;
  },

  /**
   * Store positions for safety and recovery during jump
   */
  storePositionsForJump: function() {
    const currentPos = this.el.object3D.position;

    // Store the current position as the last valid position
    this.lastValidPosition.copy(currentPos);

    // Also store the last valid position from the navmesh constraint
    // This is important for returning to a valid position if we hit a wall
    const navmeshConstraint = this.el.components['simple-navmesh-constraint'];
    if (navmeshConstraint) {
      if (navmeshConstraint.lastPosition) {
        if (window.JumpDebug) {
          window.JumpDebug.position('JumpControl', 'Storing last valid navmesh position before jump');
        } else {
          console.log('Storing last valid navmesh position before jump');
        }
        // Make a deep copy of the last valid position
        this.navmeshLastValidPosition = new THREE.Vector3().copy(navmeshConstraint.lastPosition);
      } else {
        // If the navmesh constraint doesn't have a last position yet,
        // store the current position as the last valid position
        this.navmeshLastValidPosition = new THREE.Vector3().copy(currentPos);
      }
    }

    // Store the initial XZ position for collision handling
    this.initialXZ = {
      x: currentPos.x,
      z: currentPos.z
    };
  },

  /**
   * Check for nearby walls before jumping
   * @returns {boolean} Whether a wall is nearby
   */
  checkForNearbyWalls: function() {
    let nearWall = false;
    const jumpCollider = this.el.components['jump-collider'];

    if (jumpCollider) {
      // Temporarily show the collider to check for walls
      jumpCollider.showCollider();
      const collisionResult = jumpCollider.checkCollisions();

      if (collisionResult.collision) {
        if (window.JumpDebug) {
          window.JumpDebug.collision('JumpControl', 'Wall detected nearby - performing vertical-only jump');
        } else {
          console.log('Wall detected nearby - performing vertical-only jump');
        }
        nearWall = true;
      }

      // Hide the collider again if we're not jumping yet
      if (!nearWall) {
        jumpCollider.hideCollider();
      }
    }

    return nearWall;
  },

  /**
   * Calculate and store momentum for the jump
   * @param {boolean} nearWall - Whether a wall is nearby
   */
  calculateJumpMomentum: function(nearWall) {
    // Store momentum if movement-controls is present
    const movementControls = this.el.components['movement-controls'];
    if (movementControls && movementControls.velocity) {
      if (nearWall) {
        // If near a wall, zero out horizontal momentum
        this.jumpMomentum = {
          x: 0,
          z: 0
        };
      } else {
        // Otherwise, store current momentum with a slight boost
        const boostFactor = 1.2; // Boost momentum by 20%
        this.jumpMomentum = {
          x: movementControls.velocity.x * boostFactor,
          z: movementControls.velocity.z * boostFactor
        };
      }
    }
  },

  /**
   * Prepare environment for jump
   */
  prepareForJump: function() {
    // Temporarily disable navmesh constraint during jump
    // This allows for proper vertical movement
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', false);
    }

    // Remove any existing animations first
    this.el.removeAttribute('animation__up');
    this.el.removeAttribute('animation__down');
  },

  /**
   * Start the jump animation
   */
  startJumpAnimation: function() {
    // Start up animation with improved easing for more natural movement
    this.el.setAttribute('animation__up', {
      property: 'object3D.position.y',
      from: this.startY,
      to: this.maxY,
      dur: this.data.upDuration,
      easing: 'easeOutCubic', // More pronounced initial acceleration
      autoplay: true
    });

    // Listen for the up animation to complete
    const onUpComplete = () => {
      this.el.removeEventListener('animationcomplete__up', onUpComplete);
      this.onAnimationComplete('up');
    };

    this.el.addEventListener('animationcomplete__up', onUpComplete);
  },

  /**
   * Set up safety timeout to ensure jump always completes
   */
  setupSafetyTimeout: function() {
    // Set safety timeout to ensure jump always completes
    this.safetyTimeout = setTimeout(() => {
      if (this.isJumping) {
        if (window.JumpDebug) {
          window.JumpDebug.safety('JumpControl', 'Safety timeout triggered - forcing jump end');
        } else {
          console.log('Safety timeout triggered - forcing jump end');
        }
        this.resetJump();
      }
    }, 3000);
  },

  /**
   * Handle animation completion
   * @param {string} phase - The animation phase that completed ('up' or 'down')
   */
  onAnimationComplete: function (phase) {
    if (phase === 'up') {
      if (window.JumpDebug) {
        window.JumpDebug.state('JumpControl', 'Jump up animation complete, starting down animation');
      } else {
        console.log('Jump up animation complete, starting down animation');
      }
      // Remove the up animation attribute
      this.el.removeAttribute('animation__up');

      // Start the fall
      this.isFalling = true;
      this.yVelocity = 0;
    } else if (phase === 'down') {
      if (window.JumpDebug) {
        window.JumpDebug.state('JumpControl', 'Jump down animation completed (Fallback/Timeout)');
      } else {
        console.log('Jump down animation completed (Fallback/Timeout)');
      }

      // Only reset if we are still marked as jumping/falling
      // This acts as a fallback if raycast landing fails
      if (this.isJumping || this.isFalling) {
        if (window.JumpDebug) {
          window.JumpDebug.warn('JumpControl', 'Down animation finished before ground detected, forcing reset.');
        } else {
          console.warn('Down animation finished before ground detected, forcing reset.');
        }
        this.resetJump();
      }
    }
  },

  /**
   * Check if the player is about to phase through a wall after landing
   * This is called right after landing from a jump
   */
  checkPostLandingCollision: function() {
    if (window.JumpDebug) {
      window.JumpDebug.collision('JumpControl', 'Checking for wall collisions after landing');
    } else {
      console.warn('POST-LANDING: Checking for wall collisions after landing');
    }

    // Log current position
    const currentPos = {
      x: this.el.object3D.position.x.toFixed(3),
      y: this.el.object3D.position.y.toFixed(3),
      z: this.el.object3D.position.z.toFixed(3)
    };

    if (window.JumpDebug) {
      window.JumpDebug.position('JumpControl', 'Current position', currentPos);
    } else {
      console.warn('POST-LANDING: Current position:', currentPos);
    }

    // Check if we're inside a wall using the jump collider
    const jumpCollider = this.el.components['jump-collider'];
    if (jumpCollider) {
      // Show the collider temporarily
      jumpCollider.showCollider();

      // Check for collisions
      const collisionResult = jumpCollider.checkCollisions();
      if (collisionResult.collision) {
        if (window.JumpDebug) {
          window.JumpDebug.error('JumpControl', 'Wall collision detected after landing!');
        } else {
          console.error('POST-LANDING: Wall collision detected after landing!');
        }

        // COMPLETELY DIFFERENT APPROACH: Push AWAY from the wall by a fixed amount
        if (collisionResult.normal) {
          // Push AWAY from the wall by 0.2 units
          const pushDistance = 0.2;

          // Store position before push
          const beforePush = {
            x: this.el.object3D.position.x.toFixed(3),
            y: this.el.object3D.position.y.toFixed(3),
            z: this.el.object3D.position.z.toFixed(3)
          };

          // Apply the push AWAY from the wall
          this.el.object3D.position.x += collisionResult.normal.x * pushDistance;
          this.el.object3D.position.z += collisionResult.normal.z * pushDistance;

          // Log position after push
          const afterPush = {
            x: this.el.object3D.position.x.toFixed(3),
            y: this.el.object3D.position.y.toFixed(3),
            z: this.el.object3D.position.z.toFixed(3)
          };

          const normalVector = {
            x: collisionResult.normal.x.toFixed(3),
            y: collisionResult.normal.y.toFixed(3),
            z: collisionResult.normal.z.toFixed(3)
          };

          if (window.JumpDebug) {
            window.JumpDebug.collision('JumpControl', `Pushing player AWAY from wall by ${pushDistance} units`);
            window.JumpDebug.collision('JumpControl', 'Normal vector', normalVector);
            window.JumpDebug.position('JumpControl', 'Position before push', beforePush);
            window.JumpDebug.position('JumpControl', 'Position after push', afterPush);
          } else {
            console.error('POST-LANDING: Pushing player AWAY from wall by 0.2 units');
            console.error('POST-LANDING: Normal vector:', normalVector);
            console.error('POST-LANDING: Position before push:', beforePush);
            console.error('POST-LANDING: Position after push:', afterPush);
          }

          // Double-check that we're now clear of the wall
          const secondCheck = jumpCollider.checkCollisions();
          if (secondCheck.collision) {
            if (window.JumpDebug) {
              window.JumpDebug.error('JumpControl', 'Still colliding after push, trying again with larger distance');
            } else {
              console.error('POST-LANDING: Still colliding after push, trying again with larger distance');
            }

            // Push even further away
            this.el.object3D.position.x += collisionResult.normal.x * pushDistance;
            this.el.object3D.position.z += collisionResult.normal.z * pushDistance;
          }
        }
        // If we don't have a normal but have a safe position, use it
        else if (collisionResult.safePosition) {
          if (window.JumpDebug) {
            window.JumpDebug.collision('JumpControl', 'Using safe position from collision result');
          } else {
            console.error('POST-LANDING: Using safe position from collision result');
          }
          this.el.object3D.position.x = collisionResult.safePosition.x;
          this.el.object3D.position.z = collisionResult.safePosition.z;
        }
      } else {
        if (window.JumpDebug) {
          window.JumpDebug.collision('JumpControl', 'No wall collision detected after landing');
        } else {
          console.warn('POST-LANDING: No wall collision detected after landing');
        }
      }
    }

    // Force the navmesh constraint to update its last position
    const navmeshConstraint = this.el.components['simple-navmesh-constraint'];
    if (navmeshConstraint) {
      if (window.JumpDebug) {
        window.JumpDebug.info('JumpControl', 'Forcing navmesh constraint to update');
      } else {
        console.warn('POST-LANDING: Forcing navmesh constraint to update');
      }
      navmeshConstraint.lastPosition = null;
    }
  },

  /**
   * End the jump early (e.g., when hitting a wall)
   */
  endJumpEarly: function() {
    if (window.JumpDebug) {
      window.JumpDebug.collision('JumpControl', 'Ending jump early due to wall collision');
    } else {
      console.log('Ending jump early due to wall collision');
    }

    // Store current Y position before resetting
    const currentY = this.el.object3D.position.y;

    // Only add a safety boost if we're very close to the floor
    // This helps prevent falling through while still allowing normal jumps
    if (currentY - this.startY < 0.1) {
      if (window.JumpDebug) {
        window.JumpDebug.safety('JumpControl', 'Too close to floor during wall collision, adding safety boost');
      } else {
        console.warn('Too close to floor during wall collision, adding safety boost');
      }
      this.el.object3D.position.y = this.startY + 0.1;
    }

    // Re-enable the navmesh constraint
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      if (window.JumpDebug) {
        window.JumpDebug.info('JumpControl', 'Re-enabling navmesh constraint');
      } else {
        console.log('Re-enabling navmesh constraint');
      }
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
    }

    // Reset jumping state
    this.isJumping = false;
    this.isFalling = false;

    // Zero out vertical velocity
    this.yVelocity = 0;

    // Start a drop animation
    this.el.setAttribute('animation__drop', {
      property: 'object3D.position.y',
      from: this.el.object3D.position.y,
      to: this.startY,
      dur: 300,
      easing: 'easeInOutQuad',
      autoplay: true
    });

    // Listen for the drop animation to complete
    const onDropComplete = () => {
      this.el.removeEventListener('animationcomplete__drop', onDropComplete);
      this.resetJump();
    };

    this.el.addEventListener('animationcomplete__drop', onDropComplete);
  },

  /**
   * Handle wall collision during jump (called by PlayerCollider)
   */
  handleWallCollision: function() {
    if (!this.isJumping) return;

    if (window.JumpDebug) {
      window.JumpDebug.collision('JumpControl', 'Wall collision detected by PlayerCollider');
    } else {
      console.log('Wall collision detected by PlayerCollider');
    }

    // Apply safety measures to prevent falling through floor
    this.applyWallCollisionSafetyMeasures();

    // End the jump and start landing animation
    this.startWallCollisionLandingAnimation();

    // Reset state and velocities
    this.resetStateAfterWallCollision();

    // Re-enable navmesh constraint
    this.enableNavmeshAfterWallCollision();
  },

  /**
   * Apply safety measures to prevent falling through floor during wall collision
   */
  applyWallCollisionSafetyMeasures: function() {
    // CRITICAL: Lift the player slightly to prevent falling through floor
    // This small Y boost helps ensure the player stays above the floor
    this.el.object3D.position.y += 0.1;
  },

  /**
   * Start landing animation after wall collision
   */
  startWallCollisionLandingAnimation: function() {
    // End the jump immediately
    this.endJumpEarly();

    // Remove any existing animations
    this.el.removeAttribute('animation__up');
    this.el.removeAttribute('animation__down');

    // Start a drop animation with a slightly longer duration for a smoother feel
    this.el.setAttribute('animation__drop', {
      property: 'object3D.position.y',
      from: this.el.object3D.position.y,
      to: this.startY,
      dur: 300, // Slightly longer drop for smoother feel
      easing: 'easeInOutQuad', // Smoother easing function
      autoplay: true
    });

    // Listen for the drop animation to complete
    const onDropComplete = () => {
      this.el.removeEventListener('animationcomplete__drop', onDropComplete);

      // Perform a ground check after landing to ensure we're on solid ground
      this.performGroundCheck();

      // Complete the jump reset
      this.resetJump();
    };

    this.el.addEventListener('animationcomplete__drop', onDropComplete);
  },

  /**
   * Reset state and velocities after wall collision
   */
  resetStateAfterWallCollision: function() {
    // Hide the jump collider
    const jumpCollider = this.el.components['jump-collider'];
    if (jumpCollider) {
      jumpCollider.hideCollider();
    }

    // Reset jumping state immediately
    this.isJumping = false;
    this.isFalling = false;

    // Zero out any velocity
    this.yVelocity = 0;

    // If we have movement controls, zero out horizontal velocity
    const movementControls = this.el.components['movement-controls'];
    if (movementControls && movementControls.velocity) {
      movementControls.velocity.x = 0;
      movementControls.velocity.z = 0;
    }
  },

  /**
   * Re-enable navmesh constraint after wall collision
   */
  enableNavmeshAfterWallCollision: function() {
    // IMMEDIATELY re-enable the navmesh constraint
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      if (window.JumpDebug) {
        window.JumpDebug.info('JumpControl', 'Re-enabling navmesh constraint immediately');
      } else {
        console.log('Re-enabling navmesh constraint immediately');
      }
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
    }
  },

  /**
   * Calculate and apply sliding vector when colliding with a wall
   * @param {Object} movementControls - The movement-controls component
   * @param {THREE.Vector3} normal - The normal vector of the wall
   */
  calculateAndApplySlidingVector: function(movementControls, normal) {
    // Create a velocity vector
    const velocity = new THREE.Vector3(
      movementControls.velocity.x,
      0, // Ignore Y component for sliding
      movementControls.velocity.z
    );

    // Project the velocity onto the wall plane (sliding)
    const normalClone = normal.clone(); // Clone to avoid modifying the original
    const dot = velocity.dot(normalClone);

    // Calculate the sliding vector (velocity - (velocity·normal) * normal)
    const slide = new THREE.Vector3()
      .copy(velocity)
      .sub(normalClone.multiplyScalar(dot));

    // Reduce the sliding velocity for better control
    slide.multiplyScalar(0.8);

    // Apply the sliding velocity
    movementControls.velocity.x = slide.x;
    movementControls.velocity.z = slide.z;

    if (window.JumpDebug) {
      window.JumpDebug.collision('JumpControl', 'Applied sliding vector', {
        x: slide.x.toFixed(3),
        z: slide.z.toFixed(3)
      });
    }
  },

  /**
   * Force reset the jump state - used when jump gets stuck
   */
  forceResetJump: function() {
    if (window.JumpDebug) {
      window.JumpDebug.warn('JumpControl', 'Force resetting jump state');
    } else {
      console.warn('Force resetting jump state');
    }

    // Clear all timeouts
    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }

    if (this.jumpTimeout) {
      clearTimeout(this.jumpTimeout);
      this.jumpTimeout = null;
    }

    // Reset all state variables
    this.isJumping = false;
    this.canJump = true; // Allow immediate jumping
    this.jumpStartTime = null;
    this.yVelocity = 0;

    // Re-enable navmesh constraint
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
    }

    // Hide and recreate the jump collider
    const jumpCollider = this.el.components['jump-collider'];
    if (jumpCollider) {
      jumpCollider.hideCollider();
      jumpCollider.recreateCollider();
    }

    // Remove any animations
    this.el.removeAttribute('animation__up');
    this.el.removeAttribute('animation__down');
    this.el.removeAttribute('animation__drop');

    if (window.JumpDebug) {
      window.JumpDebug.state('JumpControl', 'Jump state has been forcibly reset');
    } else {
      console.log('Jump state has been forcibly reset');
    }
  },

  /**
   * Reset jump state and re-enable navmesh constraint
   */
  resetJump: function () {
    if (window.JumpDebug) {
      window.JumpDebug.state('JumpControl', 'Resetting jump state');
    } else {
      console.log('Resetting jump state');
    }

    // Clear safety timeout
    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }

    // Reset state
    this.isJumping = false;
    this.jumpStartTime = null;
    this.yVelocity = 0;

    // Log before enabling constraint
    if (window.JumpDebug) {
      window.JumpDebug.info('JumpControl', 'Attempting to re-enable simple-navmesh-constraint...');
    } else {
      console.log('JumpControl: Attempting to re-enable simple-navmesh-constraint...');
    }

    // Re-enable navmesh constraint
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
    }

    // Hide the jump collider
    const jumpCollider = this.el.components['jump-collider'];
    if (jumpCollider) {
      if (jumpCollider.collider) {
        jumpCollider.hideCollider();
      } else {
        if (window.JumpDebug) {
          window.JumpDebug.warn('JumpControl', 'Cannot hide jump collider - it does not exist');
        } else {
          console.warn('Cannot hide jump collider - it does not exist');
        }
        jumpCollider.recreateCollider();
      }
    }

    // Clear any existing jump timeout
    if (this.jumpTimeout) {
      clearTimeout(this.jumpTimeout);
      this.jumpTimeout = null;
    }

    // Set cooldown
    if (window.JumpDebug) {
      window.JumpDebug.info('JumpControl', `Setting jump cooldown for ${this.data.cooldown}ms`);
    } else {
      console.log('Setting jump cooldown for ' + this.data.cooldown + 'ms');
    }

    this.jumpTimeout = setTimeout(() => {
      this.canJump = true;
      this.jumpTimeout = null;

      if (window.JumpDebug) {
        window.JumpDebug.info('JumpControl', 'Jump cooldown complete, can jump again');
      } else {
        console.log('Jump cooldown complete, can jump again');
      }
    }, this.data.cooldown);
  },

  /**
   * Track camera rotation for angular velocity calculation
   * @param {number} time - Current time
   * @param {number} delta - Time since last tick
   */
  tick: function (time, delta) {
    // Skip if disabled
    if (!this.data.enabled) {
      return;
    }

    // During jump, apply forward momentum for more convincing jumps
    if (this.isJumping) {
      const movementControls = this.el.components['movement-controls'];

      // Check if we have a current movement vector from ArrowControls
      // This allows us to maintain diagonal movement during jumps
      if (this.el.userData && this.el.userData.currentMoveVector) {
        const currentMoveVector = this.el.userData.currentMoveVector;

        // Apply the current movement vector directly to the position
        // This ensures diagonal movement continues during jumps
        this.el.object3D.position.x += currentMoveVector.x;
        this.el.object3D.position.z += currentMoveVector.z;

        if (window.JumpDebug && window.JumpDebug.enabled) {
          window.JumpDebug.info('JumpControl', 'Applied current movement vector during jump', {
            x: currentMoveVector.x.toFixed(5),
            z: currentMoveVector.z.toFixed(5)
          });
        }
      }
      // Fall back to the old momentum-based system if no current movement vector
      else if (movementControls && movementControls.velocity) {
        // Check if this is a vertical-only jump (near wall)
        const isVerticalJump = this.jumpMomentum.x === 0 && this.jumpMomentum.z === 0;

        if (isVerticalJump) {
          // For vertical-only jumps, zero out horizontal velocity
          movementControls.velocity.x = 0;
          movementControls.velocity.z = 0;
        } else {
          // For normal jumps, apply the stored momentum
          // This will maintain the player's direction of movement
          movementControls.velocity.x = this.jumpMomentum.x;
          movementControls.velocity.z = this.jumpMomentum.z;
        }
      }

      // Use the jump-collider component to detect wall collisions
      const jumpCollider = this.el.components['jump-collider'];
      if (jumpCollider) {
        // Ensure the collider is properly attached
        if (!jumpCollider.collider || !jumpCollider.collider.parentNode) {
          if (window.JumpDebug) {
            window.JumpDebug.warn('JumpControl', 'Jump collider not properly attached, recreating');
          } else {
            console.warn('Jump collider not properly attached, recreating');
          }
          // Use the recreateCollider method instead of removing/re-adding the component
          jumpCollider.recreateCollider();
        }

        // Show the collider during jumps
        jumpCollider.showCollider();

        // Check for collisions
        const collisionResult = jumpCollider.checkCollisions();
        if (collisionResult.collision) {
          console.log('Wall collision detected during jump!');

          // Always move the player to a safe position first to prevent clipping
          if (collisionResult.safePosition) {
            this.el.object3D.position.x = collisionResult.safePosition.x;
            this.el.object3D.position.z = collisionResult.safePosition.z;
          }

          // If we have a normal vector, use it to implement wall sliding
          if (collisionResult.normal) {
            // Get the current movement velocity
            const movementControls = this.el.components['movement-controls'];
            if (movementControls && movementControls.velocity) {
              // Calculate and apply sliding vector
              this.calculateAndApplySlidingVector(movementControls, collisionResult.normal);

              // ROBUST APPROACH: Push away from the wall based on collision point
              console.log('Wall collision - using robust push');

              // Get the collision point and player position
              const playerPos = this.el.object3D.position.clone();
              const collisionPoint = collisionResult.collisionPoint;

              if (collisionPoint) {
                // Calculate direction from collision point to player (this is the direction to push)
                const pushDir = new THREE.Vector3()
                  .subVectors(playerPos, collisionPoint)
                  .normalize();

                // Only use the horizontal components (X and Z)
                pushDir.y = 0;

                // If the direction is too small, use a default direction
                if (pushDir.length() < 0.1) {
                  console.warn('Push direction too small, using default');
                  pushDir.set(1, 0, 0); // Default to +X direction
                }

                pushDir.normalize();

                // SMOOTH APPROACH: Use a gentler push for wall sliding
                // This returns to the smoother sliding behavior
                const pushDistance = 0.1; // Small push for smooth sliding
                this.el.object3D.position.x += pushDir.x * pushDistance;
                this.el.object3D.position.z += pushDir.z * pushDistance;

                // CRITICAL FIX: Ensure Y position is at least startY
                // This prevents falling through the floor
                console.warn('WALL COLLISION Y CHECK - Current Y:', this.el.object3D.position.y.toFixed(3),
                           'startY:', this.startY.toFixed(3));

                // Always set Y to at least startY + a small buffer
                this.el.object3D.position.y = Math.max(this.el.object3D.position.y, this.startY + 0.1);

                console.warn('WALL COLLISION Y CHECK - After adjustment Y:', this.el.object3D.position.y.toFixed(3));

                console.log('Pushed away from wall in direction:', {
                  x: pushDir.x.toFixed(2),
                  z: pushDir.z.toFixed(2)
                });

                // Immediately re-enable navmesh constraint to prevent falling
                if (this.el.hasAttribute('simple-navmesh-constraint')) {
                  this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
                }
              } else {
                // Fallback if no collision point: push in multiple directions
                console.log('No collision point - using multi-directional push');

                // Use a gentler push in the fallback case too
                const pushAmount = 0.1;
                this.el.object3D.position.x += pushAmount; // +X
                // CRITICAL FIX: Ensure Y position is at least startY in fallback case
                console.warn('FALLBACK Y CHECK - Current Y:', this.el.object3D.position.y.toFixed(3),
                           'startY:', this.startY.toFixed(3));

                this.el.object3D.position.y = Math.max(this.el.object3D.position.y, this.startY + 0.1);

                console.warn('FALLBACK Y CHECK - After adjustment Y:', this.el.object3D.position.y.toFixed(3));

                // Immediately re-enable navmesh constraint
                if (this.el.hasAttribute('simple-navmesh-constraint')) {
                  this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
                }
              }

              // Check if navmesh constraint is enabled
              const navmeshConstraint = this.el.components['simple-navmesh-constraint'];
              if (navmeshConstraint) {
                console.warn('Navmesh constraint enabled:', navmeshConstraint.data.enabled);
              }
            }
          } else {
            // If we don't have a normal vector, just re-enable the navmesh constraint
            // and end the jump early
            if (this.el.hasAttribute('simple-navmesh-constraint')) {
              console.log('Re-enabling navmesh constraint due to wall collision');
              this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
            }

            // Just log the collision but don't end the jump
            console.log('Wall collision without normal vector');
          }
        }
      }
    }

    // Track camera rotation for angular velocity calculation
    // This is useful for throwing objects while jumping
    const camera = document.querySelector('#camera');
    if (camera) {
      const currentRotation = camera.object3D.rotation.clone();
      const dt = delta / 1000; // Convert to seconds

      if (dt > 0) {
        this.cameraAngularVelocity.set(
          (currentRotation.x - this.lastCameraRotation.x) / dt,
          (currentRotation.y - this.lastCameraRotation.y) / dt,
          (currentRotation.z - this.lastCameraRotation.z) / dt
        );
      }

      this.lastCameraRotation.copy(currentRotation);
    }

    // Ground detection and manual gravity during fall
    if (this.isFalling) {
      const gravity = -9.8; // Define gravity strength
      const dt = delta / 1000; // Delta time in seconds

      // Apply gravity to velocity
      this.yVelocity += gravity * dt;

      // Update position based on velocity
      this.el.object3D.position.y += this.yVelocity * dt;

      // Ground Detection Raycast
      if (this.navmeshObjects.length > 0) {
        const currentPos = this.el.object3D.position;
        // Start ray slightly higher to avoid starting inside ground
        const rayOrigin = new THREE.Vector3(currentPos.x, currentPos.y + 0.2, currentPos.z);

        this.fallRaycaster.set(rayOrigin, this.downVector);
        // Adjust ray length based on current velocity - check slightly ahead
        this.fallRaycaster.far = Math.max(0.3, -this.yVelocity * dt * 1.5); // Min check distance 0.3

        const intersects = this.fallRaycaster.intersectObjects(this.navmeshObjects, true);

        if (intersects.length > 0) {
          // Ground detected!
          this.forceLand(intersects[0].point);
          return; // Landed, exit tick early
        }
      }
    }

    // Reset justLanded flag at the end of tick
    this.justLanded = false;

    // ADDED: Safety check to detect falling through the floor
    // This runs periodically to catch any cases where the player falls through
    if (!this.isJumping && !this.isFalling) {
      // Only run this check every 10 frames to avoid performance impact
      if (time % 10 === 0) {
        this.checkForFallingThroughFloor();
      }
    }
  },

  /**
   * Check if the player has fallen through the floor and recover if needed
   */
  checkForFallingThroughFloor: function() {
    // Skip if we're intentionally jumping or falling
    if (this.isJumping || this.isFalling) return;

    // SIMPLE APPROACH: Just make sure the player is at or above the floor level
    const currentPos = this.el.object3D.position;

    // If player is below the expected floor level, move them back up
    if (currentPos.y < this.startY) {
      if (window.JumpDebug) {
        window.JumpDebug.safety('JumpControl', 'Player below floor level - repositioning');
        window.JumpDebug.position('JumpControl', `Current Y: ${currentPos.y.toFixed(3)}, Expected floor Y: ${this.startY.toFixed(3)}`);
      } else {
        console.warn('SAFETY: Player below floor level - repositioning');
        console.warn('Current Y:', currentPos.y.toFixed(3), 'Expected floor Y:', this.startY.toFixed(3));
      }

      // Move player back to floor level
      this.el.object3D.position.y = this.startY;

      // Re-enable the navmesh constraint
      if (this.el.hasAttribute('simple-navmesh-constraint')) {
        this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
      }

      if (window.JumpDebug) {
        window.JumpDebug.safety('JumpControl', 'Repositioned player to floor level');
      } else {
        console.warn('SAFETY: Repositioned player to floor level');
      }
    }

    // Store current position as valid if we're on the floor
    if (currentPos.y >= this.startY) {
      this.lastValidPosition.copy(this.el.object3D.position);
    }
  },

  // Function to find navmesh objects
  findNavmeshObjects: function() {
    const navmeshEls = document.querySelectorAll('.navmesh'); // Assuming navmesh has class 'navmesh'
    this.navmeshObjects = Array.from(navmeshEls).map(el => el.object3D).filter(obj => obj);
    if (this.navmeshObjects.length === 0) {
      if (window.JumpDebug) {
        window.JumpDebug.warn('JumpControl', 'No navmesh objects found for ground detection.');
      } else {
        console.warn('JumpControl: No navmesh objects found for ground detection.');
      }
    }
  },

  /**
   * Handle landing when ground is detected
   * @param {THREE.Vector3} hitPoint - The point where the ground was detected
   */
  forceLand: function(hitPoint) {
    if (window.JumpDebug) {
      window.JumpDebug.state('JumpControl', 'Force landing at', hitPoint);
    } else {
      console.log('Force landing at', hitPoint);
    }

    // Reset falling state
    this.resetFallingState();

    // Position player on the ground
    this.positionPlayerOnGround(hitPoint);

    // Re-enable navmesh constraint
    this.enableNavmeshOnLanding();

    // Perform safety checks
    this.checkLandingSafety();

    // Reset the jump state
    this.resetJump();
  },

  /**
   * Reset falling state variables
   */
  resetFallingState: function() {
    this.isFalling = false;
    this.yVelocity = 0;
    this.justLanded = true;

    // Stop the down animation if it's running
    this.el.removeAttribute('animation__down');
  },

  /**
   * Position player correctly on the ground
   * @param {THREE.Vector3} hitPoint - The point where the ground was detected
   */
  positionPlayerOnGround: function(hitPoint) {
    // Position player correctly on the ground
    // Set the RIG's Y position directly to the hit point Y.
    // The camera's internal offset handles eye height.
    if (window.JumpDebug) {
      window.JumpDebug.position('JumpControl',
        `LANDING Y CHECK - Current Y: ${this.el.object3D.position.y.toFixed(3)}, ` +
        `hitPoint Y: ${hitPoint.y.toFixed(3)}, startY: ${this.startY.toFixed(3)}`);
    } else {
      console.warn('LANDING Y CHECK - Current Y:', this.el.object3D.position.y.toFixed(3),
                 'hitPoint Y:', hitPoint.y.toFixed(3), 'startY:', this.startY.toFixed(3));
    }

    // CRITICAL: Update startY to match the new ground level
    // This ensures all future checks use the correct floor height
    this.startY = hitPoint.y;

    this.el.object3D.position.y = hitPoint.y;

    if (window.JumpDebug) {
      window.JumpDebug.position('JumpControl', `LANDING Y CHECK - After adjustment Y: ${this.el.object3D.position.y.toFixed(3)}`);
    } else {
      console.warn('LANDING Y CHECK - After adjustment Y:', this.el.object3D.position.y.toFixed(3));
    }
  },

  /**
   * Re-enable navmesh constraint on landing
   */
  enableNavmeshOnLanding: function() {
    // CRITICAL FIX: Immediately re-enable navmesh constraint before anything else
    // This ensures the player stays on valid ground
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      if (window.JumpDebug) {
        window.JumpDebug.info('JumpControl', 'LANDING: Immediately re-enabling navmesh constraint');
      } else {
        console.log('LANDING: Immediately re-enabling navmesh constraint');
      }
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
    }
  },

  /**
   * Safety check to ensure we don't fall through the floor when landing near a wall
   */
  checkLandingSafety: function() {
    if (window.JumpDebug) {
      window.JumpDebug.safety('JumpControl', 'Performing landing safety check');
    } else {
      console.log('Performing landing safety check');
    }

    // Use the jump collider to check for wall collisions
    const jumpCollider = this.el.components['jump-collider'];
    if (!jumpCollider) return;

    // Show the collider temporarily
    jumpCollider.showCollider();

    // Check for collisions
    const collisionResult = jumpCollider.checkCollisions();
    if (collisionResult.collision) {
      if (window.JumpDebug) {
        window.JumpDebug.safety('JumpControl', 'Wall collision detected at landing point!');
      } else {
        console.warn('LANDING SAFETY: Wall collision detected at landing point!');
      }

      // If we have a normal vector, move slightly away from the wall
      if (collisionResult.normal) {
        const safetyPushDistance = 0.05; // Reduced push distance to minimize jolt

        // Apply the push
        this.el.object3D.position.x += collisionResult.normal.x * safetyPushDistance;
        this.el.object3D.position.z += collisionResult.normal.z * safetyPushDistance;

        if (window.JumpDebug) {
          window.JumpDebug.safety('JumpControl', `Pushed player away from wall by ${safetyPushDistance}`);
        } else {
          console.warn('LANDING SAFETY: Pushed player away from wall by', safetyPushDistance);
        }
      }
      // If we have a safe position, use it
      else if (collisionResult.safePosition) {
        this.el.object3D.position.x = collisionResult.safePosition.x;
        this.el.object3D.position.z = collisionResult.safePosition.z;

        if (window.JumpDebug) {
          window.JumpDebug.safety('JumpControl', 'Using safe position from collision result');
        } else {
          console.warn('LANDING SAFETY: Using safe position from collision result');
        }
      }

      // Double-check ground position after adjustment
      this.performGroundCheck();
    }

    // Hide the collider
    jumpCollider.hideCollider();
  },

  /**
   * Perform a ground check and adjust Y position if needed
   */
  performGroundCheck: function() {
    if (this.navmeshObjects.length === 0) return;

    const currentPos = this.el.object3D.position;

    // IMPORTANT: Increase the ray start height during jumps
    const rayStartHeight = (this.isJumping || this.isFalling) ? 1.0 : 0.5;
    const rayOrigin = new THREE.Vector3(currentPos.x, currentPos.y + rayStartHeight, currentPos.z);

    this.fallRaycaster.set(rayOrigin, this.downVector);
    // Increase ray length during jumps to ensure we don't miss the ground
    this.fallRaycaster.far = (this.isJumping || this.isFalling) ? 3.0 : 2.0;

    const intersects = this.fallRaycaster.intersectObjects(this.navmeshObjects, true);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;

      // During jumps, only adjust Y if we're actually falling through floor
      if (this.isJumping || this.isFalling) {
        if (currentPos.y < hitPoint.y) {
          if (window.JumpDebug) {
            window.JumpDebug.safety('JumpControl', 'Preventing fall-through, adjusting Y position');
          } else {
            console.warn('Jump Safety: Preventing fall-through, adjusting Y position');
          }
          this.el.object3D.position.y = hitPoint.y;
        }
      } else {
        // Normal ground adjustment for non-jump situations
        if (Math.abs(currentPos.y - hitPoint.y) > 0.01) {
          this.el.object3D.position.y = hitPoint.y;
        }
      }

      // Update last valid position
      this.lastValidPosition.copy(this.el.object3D.position);
    }
  },

  /**
   * Perform a wider ground search when direct ground check fails
   * This helps recover from falling through floors
   */
  performWideGroundSearch: function() {
    if (this.navmeshObjects.length === 0) return;

    if (window.JumpDebug) {
      window.JumpDebug.safety('JumpControl', 'Looking for ground in wider area');
    } else {
      console.warn('WIDE GROUND SEARCH: Looking for ground in wider area');
    }

    const currentPos = this.el.object3D.position;
    const searchRadius = 0.5; // Search in a 0.5 unit radius
    const searchDirections = [
      new THREE.Vector3(1, 0, 0),   // +X
      new THREE.Vector3(-1, 0, 0),  // -X
      new THREE.Vector3(0, 0, 1),   // +Z
      new THREE.Vector3(0, 0, -1),  // -Z
      new THREE.Vector3(1, 0, 1).normalize(),    // +X+Z
      new THREE.Vector3(-1, 0, 1).normalize(),   // -X+Z
      new THREE.Vector3(1, 0, -1).normalize(),   // +X-Z
      new THREE.Vector3(-1, 0, -1).normalize()   // -X-Z
    ];

    // Try each search direction
    for (const dir of searchDirections) {
      // Offset position in search direction
      const searchPos = new THREE.Vector3()
        .copy(currentPos)
        .add(dir.clone().multiplyScalar(searchRadius));

      // Start ray from above the search position
      const rayOrigin = new THREE.Vector3(searchPos.x, currentPos.y + 0.5, searchPos.z);

      this.fallRaycaster.set(rayOrigin, this.downVector);
      this.fallRaycaster.far = 2.0;

      const intersects = this.fallRaycaster.intersectObjects(this.navmeshObjects, true);

      if (intersects.length > 0) {
        // Ground found in this direction
        const hitPoint = intersects[0].point;

        if (window.JumpDebug) {
          window.JumpDebug.safety('JumpControl',
            `Found ground at ${hitPoint.x.toFixed(2)}, ${hitPoint.y.toFixed(2)}, ${hitPoint.z.toFixed(2)}`);
        } else {
          console.warn('WIDE GROUND SEARCH: Found ground at',
                      hitPoint.x.toFixed(2), hitPoint.y.toFixed(2), hitPoint.z.toFixed(2));
        }

        // Move player to this position
        this.el.object3D.position.copy(hitPoint);

        // Store this as a valid position
        this.lastValidPosition.copy(hitPoint);

        // Re-enable navmesh constraint
        if (this.el.hasAttribute('simple-navmesh-constraint')) {
          this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
        }

        if (window.JumpDebug) {
          window.JumpDebug.safety('JumpControl', 'Recovered player position');
        } else {
          console.warn('WIDE GROUND SEARCH: Recovered player position');
        }
        return true;
      }
    }

    if (window.JumpDebug) {
      window.JumpDebug.error('JumpControl', 'Failed to find ground in wider area');
    } else {
      console.warn('WIDE GROUND SEARCH: Failed to find ground in wider area');
    }

    // Last resort - use last valid position if available
    if (this.lastValidPosition && this.lastValidPosition.y > 0) {
      if (window.JumpDebug) {
        window.JumpDebug.safety('JumpControl', 'Using last valid position as fallback');
      } else {
        console.warn('RECOVERY: Using last valid position as fallback');
      }
      this.el.object3D.position.copy(this.lastValidPosition);
      return true;
    }

    return false;
  },
};

export default JumpControl;










