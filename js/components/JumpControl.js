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
    height: { type: 'number', default: 1.5 },
    duration: { type: 'number', default: 700 },
    cooldown: { type: 'number', default: 500 },
    upDuration: { type: 'number', default: 400 },
    downDuration: { type: 'number', default: 300 }
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

    console.log('Jump initiated');

    // Set state
    this.isJumping = true;
    this.canJump = false;

    // Get current position
    const currentPos = this.el.object3D.position;
    this.startY = currentPos.y;
    this.maxY = this.startY + this.data.height;

    // Store momentum if movement-controls is present
    const movementControls = this.el.components['movement-controls'];
    if (movementControls && movementControls.velocity) {
      this.jumpMomentum = {
        x: movementControls.velocity.x,
        z: movementControls.velocity.z
      };
    }

    // Disable navmesh constraint during jump
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', false);
    }

    // Remove any existing animations first
    this.el.removeAttribute('animation__up');
    this.el.removeAttribute('animation__down');

    // Start up animation
    this.el.setAttribute('animation__up', {
      property: 'object3D.position.y',
      from: this.startY,
      to: this.maxY,
      dur: this.data.upDuration,
      easing: 'easeOutQuad',
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

      // Start down animation
      this.el.setAttribute('animation__down', {
        property: 'object3D.position.y',
        from: currentPos.y,
        to: this.startY,
        dur: this.data.downDuration,
        easing: 'easeInQuad',
        autoplay: true
      });
    } else if (phase === 'down') {
      console.log('Down animation complete, jump finished');
      this.resetJump();
    }
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

    // Apply momentum during jump if we have movement controls
    if (this.isJumping) {
      const movementControls = this.el.components['movement-controls'];
      if (movementControls && movementControls.velocity) {
        // Apply stored momentum during jump
        movementControls.velocity.x = this.jumpMomentum.x;
        movementControls.velocity.z = this.jumpMomentum.z;
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
  }
};

export default JumpControl;
