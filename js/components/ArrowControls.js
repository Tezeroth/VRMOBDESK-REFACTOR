/**
 * ArrowControls - Provides on-screen controls for mobile devices
 *
 * This component creates and manages on-screen controls for:
 * - Movement (arrow buttons)
 * - Object interaction (pickup, examine, throw)
 */

import DeviceManager from '../managers/DeviceManager.js';
import PhysicsUtils from '../utils/PhysicsUtils.js';
import InteractionUtils from '../utils/InteractionUtils.js';

const ArrowControls = {
  schema: {
    moveSpeed: { type: 'number', default: 2.0 }
  },

  init: function() {
    // Skip if not mobile or in VR
    if (DeviceManager && DeviceManager.isVR) {
      return;
    }

    // Initialize state
    this.moveState = {
      up: false, down: false, left: false, right: false
    };
    this.actionButtonDown = { pickup: false, examine: false };
    this.pickupButtonStartTime = 0;

    // Layout state
    this.controlsPosition = 'left'; // 'left' or 'right'

    // Create UI
    this.createControlsUI();

    // Bind methods
    this._tickFunction = this.tick.bind(this);
    this.el.sceneEl.addEventListener('tick', this._tickFunction);
  },

  remove: function() {
    // Remove event listeners
    if (this._tickFunction) {
      this.el.sceneEl.removeEventListener('tick', this._tickFunction);
    }

    // Remove UI elements
    const controlsEl = document.querySelector('.arrow-controls');
    if (controlsEl) {
      controlsEl.remove();
    }

    // Remove jump button
    const jumpBtn = document.getElementById('jumpBtn');
    if (jumpBtn) {
      jumpBtn.remove();
    }

    // Remove toggle button
    const toggleBtn = document.getElementById('toggleControlsBtn');
    if (toggleBtn) {
      toggleBtn.remove();
    }
  },

  /**
   * Create the on-screen controls UI
   */
  createControlsUI: function() {
    // Create arrow controls container (bottom left by default)
    const arrowControls = document.createElement('div');
    arrowControls.className = 'arrow-controls';
    arrowControls.id = 'arrowControls';

    // Position the controls based on current state
    this.updateControlsPosition(arrowControls);

    // Create movement buttons
    const buttons = { up: '↑', left: '←', right: '→', down: '↓' };
    Object.entries(buttons).forEach(([direction, symbol]) => {
      const btn = this.createArrowButton(direction, symbol);
      arrowControls.appendChild(btn);
    });

    // Create action buttons
    const actionButtons = { pickup: 'GRAB/THROW', examine: 'EXAMINE/CANCEL' };
    Object.entries(actionButtons).forEach(([action, label]) => {
      const btn = this.createActionButton(action, label);
      arrowControls.appendChild(btn);
    });

    // Add to document
    document.body.appendChild(arrowControls);

    // Create jump button (bottom right)
    this.createJumpButton();

    // Create toggle button (center bottom)
    this.createToggleButton();
  },

  /**
   * Update the position of controls based on current state
   * @param {HTMLElement} controlsEl - The controls element to position
   */
  updateControlsPosition: function(controlsEl) {
    if (!controlsEl) {
      controlsEl = document.getElementById('arrowControls');
      if (!controlsEl) return;
    }

    // Update arrow controls position
    if (this.controlsPosition === 'left') {
      controlsEl.style.left = '20px';
      controlsEl.style.right = 'auto';
      controlsEl.style.transform = 'none';
    } else {
      controlsEl.style.right = '20px';
      controlsEl.style.left = 'auto';
      controlsEl.style.transform = 'none';
    }

    // Update jump button position
    const jumpBtn = document.getElementById('jumpBtn');
    if (jumpBtn) {
      if (this.controlsPosition === 'left') {
        jumpBtn.style.right = '20px';
        jumpBtn.style.left = 'auto';
      } else {
        jumpBtn.style.left = '20px';
        jumpBtn.style.right = 'auto';
      }
    }

    console.log(`Controls position updated to: ${this.controlsPosition}`);
  },

  /**
   * Create the jump button
   */
  createJumpButton: function() {
    // Create jump button
    const jumpBtn = document.createElement('button');
    jumpBtn.id = 'jumpBtn';
    jumpBtn.className = 'jump-btn';
    jumpBtn.innerHTML = '↑ JUMP ↑';

    // Position based on current state
    if (this.controlsPosition === 'left') {
      jumpBtn.style.right = '20px';
      jumpBtn.style.left = 'auto';
    } else {
      jumpBtn.style.left = '20px';
      jumpBtn.style.right = 'auto';
    }

    // Style the button
    jumpBtn.style.position = 'fixed';
    jumpBtn.style.bottom = '20px'; // Align with the bottom of the arrow controls
    jumpBtn.style.width = '80px';
    jumpBtn.style.height = '80px';
    jumpBtn.style.borderRadius = '50%';
    jumpBtn.style.backgroundColor = 'rgba(0, 200, 100, 0.7)';
    jumpBtn.style.color = 'white';
    jumpBtn.style.fontSize = '16px';
    jumpBtn.style.fontWeight = 'bold';
    jumpBtn.style.border = '3px solid white';
    jumpBtn.style.zIndex = '999';
    jumpBtn.style.display = 'flex';
    jumpBtn.style.alignItems = 'center';
    jumpBtn.style.justifyContent = 'center';
    jumpBtn.style.textAlign = 'center';
    jumpBtn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    jumpBtn.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.5)';

    // Add active/hover states
    jumpBtn.style.transition = 'transform 0.1s, background-color 0.1s';

    // Add event listeners for jumping
    ['mousedown', 'touchstart'].forEach(eventType => {
      jumpBtn.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Visual feedback
        jumpBtn.style.backgroundColor = 'rgba(0, 240, 140, 1)';
        jumpBtn.style.transform = 'scale(0.95)';

        // Find jump-control component and trigger jump
        const cameraRig = document.querySelector('#cameraRig');
        if (cameraRig && cameraRig.components['jump-control']) {
          cameraRig.components['jump-control'].jump();
        }

        // Reset visual state after a short delay
        setTimeout(() => {
          jumpBtn.style.backgroundColor = 'rgba(0, 200, 100, 0.7)';
          jumpBtn.style.transform = 'scale(1)';
        }, 200);
      }, { passive: false, capture: true });
    });

    // Add to document
    document.body.appendChild(jumpBtn);
  },

  /**
   * Create the toggle button to switch control positions
   */
  createToggleButton: function() {
    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggleControlsBtn';
    toggleBtn.className = 'toggle-controls-btn';
    toggleBtn.innerHTML = '⇄';

    // Style the button
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.bottom = '20px';
    toggleBtn.style.left = '50%';
    toggleBtn.style.transform = 'translateX(-50%)';
    toggleBtn.style.width = '50px';
    toggleBtn.style.height = '50px';
    toggleBtn.style.borderRadius = '50%';
    toggleBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
    toggleBtn.style.color = 'white';
    toggleBtn.style.fontSize = '24px';
    toggleBtn.style.fontWeight = 'bold';
    toggleBtn.style.border = '2px solid white';
    toggleBtn.style.zIndex = '999';
    toggleBtn.style.display = 'flex';
    toggleBtn.style.alignItems = 'center';
    toggleBtn.style.justifyContent = 'center';
    toggleBtn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    toggleBtn.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.5)';
    toggleBtn.style.transition = 'transform 0.2s, background-color 0.2s';

    // Add event listeners
    ['mousedown', 'touchstart'].forEach(eventType => {
      toggleBtn.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Visual feedback
        toggleBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        toggleBtn.style.transform = 'translateX(-50%) scale(0.95)';

        // Toggle position
        this.controlsPosition = this.controlsPosition === 'left' ? 'right' : 'left';
        this.updateControlsPosition();

        // Reset visual state after a short delay
        setTimeout(() => {
          toggleBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
          toggleBtn.style.transform = 'translateX(-50%) scale(1)';
        }, 200);
      }, { passive: false, capture: true });
    });

    // Add to document
    document.body.appendChild(toggleBtn);
  },

  /**
   * Create an arrow button for movement
   * @param {string} direction - The movement direction
   * @param {string} symbol - The button symbol
   * @returns {HTMLElement} The created button
   */
  createArrowButton: function(direction, symbol) {
    const btn = document.createElement('button');
    btn.className = 'arrow-btn';
    btn.id = `${direction}Btn`;
    btn.innerHTML = symbol;

    // Add event listeners
    ['mousedown', 'touchstart'].forEach(eventType => {
      btn.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.moveState[direction] = true;
      }, { passive: false, capture: true });
    });

    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(eventType => {
      btn.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.moveState[direction] = false;
      }, { capture: true });
    });

    btn.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false, capture: true });

    return btn;
  },

  /**
   * Create an action button for object interaction
   * @param {string} action - The action type
   * @param {string} label - The button label
   * @returns {HTMLElement} The created button
   */
  createActionButton: function(action, label) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.id = `${action}Btn`;
    btn.innerHTML = label;

    // Handle button press
    ['mousedown', 'touchstart'].forEach(eventType => {
      btn.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();

        const controls = this.getMainControls();
        if (!controls) {
          console.error(`Action button (${action}, ${eventType}) pressed, but controls component not found!`);
          return;
        }

        this.actionButtonDown[action] = true;

        if (action === 'pickup') {
          this.handlePickupButtonDown(controls);
        } else if (action === 'examine') {
          this.handleExamineButtonDown(controls);
        }
      }, { passive: false, capture: true });
    });

    // Handle button release
    ['mouseup', 'touchend'].forEach(eventType => {
      btn.addEventListener(eventType, (e) => {
        e.preventDefault();
        e.stopPropagation();

        const controls = this.getMainControls();
        if (!controls) {
          return;
        }

        if (!this.actionButtonDown[action]) return;
        this.actionButtonDown[action] = false;

        if (action === 'pickup') {
          this.handlePickupButtonUp(controls);
        }
      }, { capture: true });
    });

    // Handle leaving button area
    btn.addEventListener('mouseleave', (e) => {
      // Cancel charge if leaving pickup button while charging
      if (action === 'pickup' && this.actionButtonDown[action]) {
        const controls = this.getMainControls();
        if (controls && controls.stateMachine.is('charging')) {
          controls.stateMachine.transition('onCancel');
        }
      }

      this.actionButtonDown[action] = false;
    });

    return btn;
  },

  /**
   * Handle pickup button press
   * @param {Object} controls - The desktop-mobile-controls component
   */
  handlePickupButtonDown: function(controls) {
    if (controls.stateMachine.is('idle')) {
      // Attempt pickup
      const cursor = document.querySelector('#cursor');
      const intersection = InteractionUtils.getIntersectedElement(cursor, '.pickupable');

      if (intersection) {
        console.log(`Action Button: Attempting pickup of ${intersection.id}`);
        controls.stateMachine.transition('onPickup', intersection);
      } else {
        console.log("Action Button: Pickup attempted, but no pickupable object found at cursor.");
      }
    } else if (controls.stateMachine.is('holding')) {
      // Start charging throw
      console.log("Mobile: Start charging throw...");
      controls.stateMachine.transition('onCharge');
    }
  },

  /**
   * Handle pickup button release
   * @param {Object} controls - The desktop-mobile-controls component
   */
  handlePickupButtonUp: function(controls) {
    if (controls.stateMachine.is('charging')) {
      // Finish throw
      console.log("Mobile: Throwing object");
      controls.stateMachine.transition('onThrow');
    }
  },

  /**
   * Handle examine button press
   * @param {Object} controls - The desktop-mobile-controls component
   */
  handleExamineButtonDown: function(controls) {
    if (controls.stateMachine.is('holding')) {
      console.log("Action Button: Toggling inspection mode (entering)");
      controls.stateMachine.transition('onInspect');
    } else if (controls.stateMachine.is('charging')) {
      console.log("Action Button: Cancelling throw charge");
      controls.stateMachine.transition('onCancel');
    } else if (controls.stateMachine.is('inspecting')) {
      console.log("Action Button: Toggling inspection mode (exiting)");
      controls.stateMachine.transition('onExitInspect');
    }
  },

  /**
   * Get the desktop-mobile-controls component
   * @returns {Object|null} The controls component or null if not found
   */
  getMainControls: function() {
    const controls = document.querySelector('a-scene')?.components['desktop-mobile-controls'];
    if (!controls) {
      console.warn("getMainControls: Could not find desktop-mobile-controls component.");
    }
    return controls;
  },

  /**
   * Update movement based on button state
   */
  tick: function(time, delta) {
    // Skip if not mobile or in VR
    if (DeviceManager && DeviceManager.isVR) {
      return;
    }

    // Handle movement
    const moveSpeed = this.data.moveSpeed * (delta / 1000);
    const cameraRig = document.querySelector('#cameraRig');

    if (!cameraRig) {
      return;
    }

    // Ensure cameraRig has movement-controls
    if (!cameraRig.hasAttribute('movement-controls')) {
      console.log('ArrowControls: Adding movement-controls to cameraRig');
      cameraRig.setAttribute('movement-controls', 'enabled: true; controls: keyboard; speed: 1.0; fly: false;');
      return; // Skip this frame to let the component initialize
    }

    // Skip if movement controls are disabled
    const movementControls = cameraRig.getAttribute('movement-controls');
    if (movementControls && movementControls.enabled === false) {
      return;
    }

    // Get camera direction
    const camera = document.querySelector('#camera');
    if (!camera) return;

    // Get the look-controls component to access yaw rotation directly
    const lookControls = camera.components['look-controls'];
    if (!lookControls) return;

    // Use only the yaw (horizontal rotation) for movement direction
    // This prevents pitch (looking up/down) from affecting movement direction
    const yawRotation = lookControls.yawObject.rotation.y;

    // Create forward direction vector using only yaw rotation
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRotation);
    direction.y = 0;
    direction.normalize();

    // Create side direction vector (perpendicular to forward direction)
    const sideDirection = new THREE.Vector3(-1, 0, 0);
    sideDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRotation);
    sideDirection.y = 0;
    sideDirection.normalize();

    // Create a combined movement vector instead of applying movements separately
    // This prevents issues with diagonal movement when looking down
    const moveVector = new THREE.Vector3(0, 0, 0);

    // Add forward/backward movement
    if (this.moveState.up) {
      moveVector.add(direction.clone().multiplyScalar(-1)); // Forward
    }
    if (this.moveState.down) {
      moveVector.add(direction.clone()); // Backward
    }

    // Add left/right movement
    if (this.moveState.left) {
      moveVector.add(sideDirection.clone().multiplyScalar(-1)); // Left
    }
    if (this.moveState.right) {
      moveVector.add(sideDirection.clone()); // Right
    }

    // If we're not moving, exit early
    if (moveVector.lengthSq() === 0) {
      return;
    }

    // Normalize the vector if we're moving diagonally to prevent faster diagonal movement
    if (moveVector.lengthSq() > 1) {
      moveVector.normalize();
    }

    // Scale by move speed
    moveVector.multiplyScalar(moveSpeed);

    // Check if we're jumping
    const jumpControl = cameraRig.components['jump-control'];
    const isJumping = jumpControl && jumpControl.isJumping;

    // Store the current movement vector on the cameraRig for use by other components
    // This allows the jump component to maintain diagonal movement during jumps
    if (!cameraRig.userData) cameraRig.userData = {};
    cameraRig.userData.currentMoveVector = moveVector.clone();

    // Apply the final movement
    cameraRig.object3D.position.add(moveVector);
  }
};

export default ArrowControls;
