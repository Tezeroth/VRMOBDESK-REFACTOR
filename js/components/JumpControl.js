/**
 * JumpControl - Provides jumping functionality for the player
 *
 * This component implements a reliable jumping system using A-Frame's animation system
 * rather than physics. This approach provides predictable jumping behavior while
 * maintaining compatibility with existing movement and navmesh systems.
 */

import DeviceManager from '../managers/DeviceManager.js';

const JumpControl = {
  schema: {
    enabled: { type: 'boolean', default: true },
    height: { type: 'number', default: 2.5 },  // Increased jump height for more dramatic effect
    duration: { type: 'number', default: 1000 }, // Longer overall duration
    cooldown: { type: 'number', default: 500 },
    upDuration: { type: 'number', default: 500 }, // Longer up phase
    downDuration: { type: 'number', default: 500 }, // Longer down phase
    respectNavmesh: { type: 'boolean', default: true }
  },

  init: function () {
    // Initialize state
    this.isJumping = false;
    this.canJump = true;
    this.jumpTimeout = null;
    this.safetyTimeout = null;
    this.startY = 0;
    this.maxY = 0;
    this.jumpMomentum = { x: 0, z: 0 };
    this.lastCameraRotation = new THREE.Euler();
    this.cameraAngularVelocity = new THREE.Vector3();

    // Store last valid position on navmesh
    this.lastValidPosition = new THREE.Vector3();
    this.navmeshLastValidPosition = new THREE.Vector3();

    // Store initial XZ position for collision handling
    this.initialXZ = { x: 0, z: 0 };

    // Set up a safety check that runs every 2 seconds to ensure we can always jump
    this.safetyInterval = setInterval(() => {
      if (!this.canJump && !this.isJumping) {
        console.warn('Jump safety check: Found canJump=false but not jumping, resetting state');
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
   * @param {Event} evt - The keydown event
   */
  onKeyDown: function (evt) {
    // Space key always triggers jump
    if (evt.code === 'Space' && !evt.repeat) {
      // Prevent event propagation to stop other components from handling it
      evt.stopPropagation();
      this.jump();
    }

    // Add a secret key combo to force reset jump state if needed
    // Ctrl+Alt+J will force reset the jump state
    if (evt.code === 'KeyJ' && evt.ctrlKey && evt.altKey) {
      console.log('Force reset key combo detected');
      this.forceResetJump();
    }
  },

  /**
   * Execute the jump
   */
  jump: function () {
    // Don't jump if disabled
    if (!this.data.enabled) {
      return;
    }

    // Force reset if we're stuck in a jumping state for too long
    if (this.isJumping) {
      const currentTime = Date.now();
      if (!this.jumpStartTime || (currentTime - this.jumpStartTime > 3000)) {
        console.warn('Jump appears to be stuck, forcing reset');
        this.forceResetJump();
      } else {
        return; // Still in a valid jump
      }
    }

    // Check cooldown
    if (!this.canJump) {
      console.log('Cannot jump - in cooldown');
      return;
    }

    // Check if we're in inspection mode - don't jump if examining an object
    const desktopMobileControls = document.querySelector('[desktop-mobile-controls]')?.components['desktop-mobile-controls'];
    const isInspecting = desktopMobileControls &&
                         desktopMobileControls.stateMachine &&
                         desktopMobileControls.stateMachine.is('inspecting');

    if (isInspecting) {
      console.log('Cannot jump while in inspection mode');
      return;
    }

    console.log('Jump initiated');

    // Set state
    this.isJumping = true;
    this.canJump = false;
    this.jumpStartTime = Date.now();

    // Get current position
    const currentPos = this.el.object3D.position;
    this.startY = currentPos.y;
    this.maxY = this.startY + this.data.height;

    // Store the current position as the last valid position
    this.lastValidPosition.copy(currentPos);

    // Also store the last valid position from the navmesh constraint
    // This is important for returning to a valid position if we hit a wall
    const navmeshConstraint = this.el.components['simple-navmesh-constraint'];
    if (navmeshConstraint) {
      if (navmeshConstraint.lastPosition) {
        console.log('Storing last valid navmesh position before jump');
        // Make a deep copy of the last valid position
        this.navmeshLastValidPosition = new THREE.Vector3().copy(navmeshConstraint.lastPosition);
      } else {
        // If the navmesh constraint doesn't have a last position yet,
        // store the current position as the last valid position
        this.navmeshLastValidPosition = new THREE.Vector3().copy(currentPos);
      }
    }

    // Check if we're near a wall before jumping
    const jumpCollider = this.el.components['jump-collider'];
    let nearWall = false;

    if (jumpCollider) {
      // Temporarily show the collider to check for walls
      jumpCollider.showCollider();
      const collisionResult = jumpCollider.checkCollisions();

      if (collisionResult.collision) {
        console.log('Wall detected nearby - performing vertical-only jump');
        nearWall = true;
      }

      // Hide the collider again if we're not jumping yet
      if (!nearWall) {
        jumpCollider.hideCollider();
      }
    }

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

    // Temporarily disable navmesh constraint during jump
    // This allows for proper vertical movement
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', false);
    }

    // Store the initial XZ position for collision handling
    this.initialXZ = {
      x: this.el.object3D.position.x,
      z: this.el.object3D.position.z
    };

    // Remove any existing animations first
    this.el.removeAttribute('animation__up');
    this.el.removeAttribute('animation__down');

    // Start up animation with improved easing for more natural movement
    this.el.setAttribute('animation__up', {
      property: 'object3D.position.y',
      from: this.startY,
      to: this.maxY,
      dur: this.data.upDuration,
      easing: 'easeOutCubic', // More pronounced initial acceleration
      autoplay: true
    });

    // Set safety timeout to ensure jump always completes
    this.safetyTimeout = setTimeout(() => {
      if (this.isJumping) {
        console.log('Safety timeout triggered - forcing jump end');
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
      console.log('Up animation complete, starting down animation');

      // Get current position (might be different from maxY due to collisions)
      const currentPos = this.el.object3D.position;

      // Remove any existing down animation first
      this.el.removeAttribute('animation__down');

      // Start down animation with improved easing for more natural falling
      this.el.setAttribute('animation__down', {
        property: 'object3D.position.y',
        from: currentPos.y,
        to: this.startY,
        dur: this.data.downDuration,
        easing: 'easeInCubic', // More pronounced acceleration for realistic gravity
        autoplay: true
      });

      // DON'T re-enable the navmesh constraint before landing
      // Instead, wait until we've fully landed and then handle it in the down animation complete handler
    } else if (phase === 'down') {
      console.log('Down animation complete, jump finished');

      // CRITICAL: First check for wall collisions and adjust position if needed
      // Do this BEFORE re-enabling the navmesh constraint
      this.checkPostLandingCollision();

      // NOW re-enable the navmesh constraint after we've adjusted the position
      if (this.el.hasAttribute('simple-navmesh-constraint')) {
        console.log('Re-enabling navmesh constraint after position adjustment');
        this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
      }

      // Reset jump state
      this.resetJump();
    }
  },

  /**
   * Check if the player is about to phase through a wall after landing
   * This is called right after landing from a jump
   */
  checkPostLandingCollision: function() {
    console.warn('POST-LANDING: Checking for wall collisions after landing');

    // Log current position
    const currentPos = {
      x: this.el.object3D.position.x.toFixed(3),
      y: this.el.object3D.position.y.toFixed(3),
      z: this.el.object3D.position.z.toFixed(3)
    };
    console.warn('POST-LANDING: Current position:', currentPos);

    // Check if we're inside a wall using the jump collider
    const jumpCollider = this.el.components['jump-collider'];
    if (jumpCollider) {
      // Show the collider temporarily
      jumpCollider.showCollider();

      // Check for collisions
      const collisionResult = jumpCollider.checkCollisions();
      if (collisionResult.collision) {
        console.error('POST-LANDING: Wall collision detected after landing!');

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

          console.error('POST-LANDING: Pushing player AWAY from wall by 0.2 units');
          console.error('POST-LANDING: Normal vector:', {
            x: collisionResult.normal.x.toFixed(3),
            y: collisionResult.normal.y.toFixed(3),
            z: collisionResult.normal.z.toFixed(3)
          });
          console.error('POST-LANDING: Position before push:', beforePush);
          console.error('POST-LANDING: Position after push:', afterPush);

          // Double-check that we're now clear of the wall
          const secondCheck = jumpCollider.checkCollisions();
          if (secondCheck.collision) {
            console.error('POST-LANDING: Still colliding after push, trying again with larger distance');

            // Push even further away
            this.el.object3D.position.x += collisionResult.normal.x * pushDistance;
            this.el.object3D.position.z += collisionResult.normal.z * pushDistance;
          }
        }
        // If we don't have a normal but have a safe position, use it
        else if (collisionResult.safePosition) {
          console.error('POST-LANDING: Using safe position from collision result');
          this.el.object3D.position.x = collisionResult.safePosition.x;
          this.el.object3D.position.z = collisionResult.safePosition.z;
        }
      } else {
        console.warn('POST-LANDING: No wall collision detected after landing');
      }
    }

    // Force the navmesh constraint to update its last position
    const navmeshConstraint = this.el.components['simple-navmesh-constraint'];
    if (navmeshConstraint) {
      console.warn('POST-LANDING: Forcing navmesh constraint to update');
      navmeshConstraint.lastPosition = null;
    }
  },



  /**
   * End the jump early (e.g., when hitting a wall)
   */
  endJumpEarly: function() {
    console.log('Ending jump early due to wall collision');

    // Store current Y position before resetting
    const currentY = this.el.object3D.position.y;

    // IMMEDIATELY re-enable the navmesh constraint
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      console.log('Re-enabling navmesh constraint immediately');
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
    }

    // Keep the current Y position for the drop animation
    this.el.object3D.position.y = currentY;
  },

  /**
   * Handle wall collision during jump (called by PlayerCollider)
   */
  handleWallCollision: function() {
    if (!this.isJumping) return;

    console.log('Wall collision detected by PlayerCollider');

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
      this.resetJump();
    };

    this.el.addEventListener('animationcomplete__drop', onDropComplete);

    // Hide the jump collider
    const jumpCollider = this.el.components['jump-collider'];
    if (jumpCollider) {
      jumpCollider.hideCollider();
    }

    // Reset jumping state immediately
    this.isJumping = false;
  },

  /**
   * Force reset the jump state - used when jump gets stuck
   */
  forceResetJump: function() {
    console.warn('Force resetting jump state');

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

    console.log('Jump state has been forcibly reset');
  },

  /**
   * Reset jump state and re-enable navmesh constraint
   */
  resetJump: function () {
    console.log('Resetting jump state');

    // Clear safety timeout
    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }

    // Reset state
    this.isJumping = false;
    this.jumpStartTime = null;

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
        console.warn('Cannot hide jump collider - it does not exist');
        jumpCollider.recreateCollider();
      }
    }

    // Clear any existing jump timeout
    if (this.jumpTimeout) {
      clearTimeout(this.jumpTimeout);
      this.jumpTimeout = null;
    }

    // Set cooldown
    console.log('Setting jump cooldown for ' + this.data.cooldown + 'ms');
    this.jumpTimeout = setTimeout(() => {
      this.canJump = true;
      this.jumpTimeout = null;
      console.log('Jump cooldown complete, can jump again');
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
      if (movementControls && movementControls.velocity) {
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
          console.warn('Jump collider not properly attached, recreating');
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
              // Create a velocity vector
              const velocity = new THREE.Vector3(
                movementControls.velocity.x,
                0, // Ignore Y component for sliding
                movementControls.velocity.z
              );

              // Project the velocity onto the wall plane (sliding)
              const normal = collisionResult.normal.clone(); // Clone to avoid modifying the original
              const dot = velocity.dot(normal);

              // Calculate the sliding vector (velocity - (velocity·normal) * normal)
              const slide = new THREE.Vector3()
                .copy(velocity)
                .sub(normal.multiplyScalar(dot));

              // Reduce the sliding velocity for better control
              slide.multiplyScalar(0.8);

              // Apply the sliding velocity
              movementControls.velocity.x = slide.x;
              movementControls.velocity.z = slide.z;

              // CRITICAL: Push the player TOWARDS the wall slightly to ensure they stay inside the navmesh
              // This is the key to preventing phasing through walls after landing
              const pushDistance = -0.05; // Negative value to push towards the wall, not away from it

              // Log position before push
              const posBeforePush = {
                x: this.el.object3D.position.x.toFixed(3),
                y: this.el.object3D.position.y.toFixed(3),
                z: this.el.object3D.position.z.toFixed(3)
              };

              // Apply the push
              this.el.object3D.position.x += normal.x * pushDistance;
              this.el.object3D.position.z += normal.z * pushDistance;

              // Log position after push
              const posAfterPush = {
                x: this.el.object3D.position.x.toFixed(3),
                y: this.el.object3D.position.y.toFixed(3),
                z: this.el.object3D.position.z.toFixed(3)
              };

              console.warn('WALL SLIDE: Pushing player towards wall by 0.05 units');
              console.warn('Normal vector:', {
                x: normal.x.toFixed(3),
                y: normal.y.toFixed(3),
                z: normal.z.toFixed(3)
              });
              console.warn('Position before push:', posBeforePush);
              console.warn('Position after push:', posAfterPush);

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

            // End the jump and drop to the ground
            this.endJumpEarly();
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
  },


};

export default JumpControl;
