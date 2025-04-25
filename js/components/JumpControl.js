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
  },

  /**
   * Execute the jump
   */
  jump: function () {
    // Don't jump if disabled, already jumping, or in cooldown
    if (!this.data.enabled || this.isJumping || !this.canJump) {
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

    // Get current position
    const currentPos = this.el.object3D.position;
    this.startY = currentPos.y;
    this.maxY = this.startY + this.data.height;

    // Store the current position as the last valid position
    this.lastValidPosition.copy(currentPos);

    // Also store the last valid position from the navmesh constraint
    // This is important for returning to a valid position if we hit a wall
    const navmeshConstraint = this.el.components['simple-navmesh-constraint'];
    if (navmeshConstraint && navmeshConstraint.lastValidPosition) {
      console.log('Storing last valid navmesh position before jump');
      this.navmeshLastValidPosition = navmeshConstraint.lastValidPosition.clone();
    }

    // No ceiling collision check needed - the navmesh constraint
    // will handle preventing movement through obstacles

    // Store momentum if movement-controls is present
    const movementControls = this.el.components['movement-controls'];
    if (movementControls && movementControls.velocity) {
      // Store current velocity and boost it slightly for a more satisfying jump
      const boostFactor = 1.2; // Boost momentum by 20%
      this.jumpMomentum = {
        x: movementControls.velocity.x * boostFactor,
        z: movementControls.velocity.z * boostFactor
      };
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
    } else if (phase === 'down') {
      console.log('Down animation complete, jump finished');

      // Hide the jump collider
      const jumpCollider = this.el.components['jump-collider'];
      if (jumpCollider) {
        jumpCollider.hideCollider();
      }

      this.resetJump();
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

    // Force position back to initial XZ position (where the jump started)
    console.log('Forcing position to initial jump position');
    this.el.object3D.position.x = this.initialXZ.x;
    this.el.object3D.position.z = this.initialXZ.z;

    // Keep the current Y position for the drop animation
    this.el.object3D.position.y = currentY;

    // Remove any existing animations
    this.el.removeAttribute('animation__up');
    this.el.removeAttribute('animation__down');

    // Start a quick drop animation
    this.el.setAttribute('animation__drop', {
      property: 'object3D.position.y',
      from: this.el.object3D.position.y,
      to: this.startY,
      dur: 200, // Very quick drop
      easing: 'easeInQuad',
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

    // Re-enable navmesh constraint
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
    }

    // Hide the jump collider
    const jumpCollider = this.el.components['jump-collider'];
    if (jumpCollider) {
      jumpCollider.hideCollider();
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
        // Apply the stored momentum during the jump
        // This will maintain the player's direction of movement
        movementControls.velocity.x = this.jumpMomentum.x;
        movementControls.velocity.z = this.jumpMomentum.z;
      }

      // Use the jump-collider component to detect wall collisions
      const jumpCollider = this.el.components['jump-collider'];
      if (jumpCollider) {
        // Show the collider during jumps
        jumpCollider.showCollider();

        // Check for collisions
        const collisionResult = jumpCollider.checkCollisions();
        if (collisionResult.collision) {
          console.log('Wall collision detected during jump!');

          // Stop horizontal movement immediately
          movementControls.velocity.x = 0;
          movementControls.velocity.z = 0;

          // End the jump immediately and drop to the ground
          this.endJumpEarly();
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
