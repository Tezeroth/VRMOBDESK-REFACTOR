/**
 * DesktopMobileControls - Handles desktop and mobile interactions
 *
 * This component manages object interactions for desktop and mobile devices:
 * - Object pickup and manipulation
 * - Object throwing with charge mechanics
 * - Object inspection mode
 * - Touch and mouse input handling
 */

import DeviceManager from '../managers/DeviceManager.js';
import PhysicsUtils from '../utils/PhysicsUtils.js';
import InteractionUtils from '../utils/InteractionUtils.js';
import StateMachine from '../utils/StateMachine.js';

// Reusable vectors and quaternions
const tempCameraWorldPos = new THREE.Vector3();
const tempDirection = new THREE.Vector3();
const targetPosition = new THREE.Vector3();
const prevCameraWorldQuat = new THREE.Quaternion();
const currentCameraWorldQuat = new THREE.Quaternion();
const deltaQuat = new THREE.Quaternion();

const DesktopMobileControls = {
  schema: {
    minThrowForce: { type: 'number', default: 5 },
    maxThrowForce: { type: 'number', default: 10 },
    maxChargeTime: { type: 'number', default: 1500 },
    chargeThreshold: { type: 'number', default: 200 },
    holdDistance: { type: 'number', default: 2 }
  },

  init: function () {
    // Initialize references
    this.camera = document.querySelector('#camera');
    this.cursor = document.querySelector('#cursor');
    this._tickFunction = null;
    this._originalPhysicsState = null;

    // Interaction timing variables
    this.lastTapTime = 0;
    this.chargeStartTime = 0;
    this.secondClickStartTime = 0;

    // Touch/swipe variables
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.isSwiping = false;

    // Camera rotation storage for inspection mode
    this.cameraPitchOnEnterInspect = 0;
    this.rigYawOnEnterInspect = 0;

    // Store schema defaults in component instance
    this.minThrowForce = this.data?.minThrowForce || 5;
    this.maxThrowForce = this.data?.maxThrowForce || 10;
    this.maxChargeTime = this.data?.maxChargeTime || 1500;
    this.chargeThreshold = this.data?.chargeThreshold || 200;
    this.holdDistance = this.data?.holdDistance || 2;

    // Bind methods to this instance
    this._setupTickFunction = this._setupTickFunction.bind(this);
    this._removeTickFunction = this._removeTickFunction.bind(this);
    this.tick = this.tick.bind(this);

    // Create state machine for interaction states
    const component = this; // Store reference to component

    this.stateMachine = new StateMachine({
      initialState: 'idle',
      states: {
        idle: {
          onPickup: function(el) {
            console.log('State machine: onPickup called with element:', el ? (el.id || el.tagName) : 'null');

            if (!el) {
              console.error('Cannot pickup null element');
              return 'idle';
            }

            // Store element and original physics state
            this.setData('heldObject', el);
            const originalState = PhysicsUtils.convertToKinematic(el);
            console.log('Original physics state:', originalState);
            this.setData('originalPhysicsState', originalState);

            // Initialize camera rotation tracking
            const camera = document.querySelector('#camera');
            if (camera) {
              camera.object3D.getWorldQuaternion(prevCameraWorldQuat);
              console.log('Camera rotation tracking initialized');
            } else {
              console.warn('No camera found for rotation tracking');
            }

            // Set up tick function for object movement
            component._setupTickFunction();
            console.log('Tick function set up for object movement');

            return 'holding';
          },
          onExit: function() {
            // Update cursor visual
            const cursor = document.querySelector('#camera > #cursor');
            if (cursor) {
              InteractionUtils.updateCursorVisual(cursor, 'holding');
            }
          }
        },
        holding: {
          /**
           * Called when transitioning from holding to charging state
           * - Stores the charge start time for calculating throw force
           * - Movement and looking remain enabled during charging
           *
           * @returns {string} The new state ('charging')
           */
          onCharge: function() {
            this.setData('chargeStartTime', Date.now());
            return 'charging';
          },
          onDrop: function() {
            const heldObject = this.getData('heldObject');
            const originalState = this.getData('originalPhysicsState');

            console.log('Dropping object:', heldObject ? (heldObject.id || heldObject.tagName) : 'null');
            console.log('Original state:', originalState);

            // Restore original physics state
            PhysicsUtils.restoreOriginalState(heldObject, originalState);

            // Clean up
            component._removeTickFunction();
            this.setData('heldObject', null);
            this.setData('originalPhysicsState', null);

            return 'idle';
          },
          /**
           * Called when transitioning from holding to inspecting state
           * - Stores camera orientation to restore later
           * - Disables both look and movement controls for inspection mode
           * - Prepares the object for inspection
           *
           * @returns {string} The new state ('inspecting')
           */
          onInspect: function() {
            const heldObject = this.getData('heldObject');

            // Store camera orientation to restore when exiting inspection
            const camera = document.querySelector('#camera');
            const lookControls = camera?.components['look-controls'];
            if (lookControls && lookControls.pitchObject && lookControls.yawObject) {
              component.cameraPitchOnEnterInspect = lookControls.pitchObject.rotation.x;
              component.rigYawOnEnterInspect = lookControls.yawObject.rotation.y;
            }

            // Disable look controls for inspection mode
            // This prevents camera movement while inspecting objects
            if (lookControls) {
              lookControls.data.enabled = false;
            }

            // Disable movement controls for inspection mode
            // This prevents player movement while inspecting objects
            const cameraRig = document.querySelector('#cameraRig');
            if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
              cameraRig.setAttribute('movement-controls', 'enabled', false);
            }

            // Store object for inspection
            this.setData('inspectedObject', heldObject);
            this.setData('heldObject', null);

            // Remove physics body for inspection
            heldObject.removeAttribute('physx-body');

            // Clean up tick function
            component._removeTickFunction();

            return 'inspecting';
          },
          /**
           * Called when exiting the holding state
           * - Updates cursor color based on the new state:
           *   - 'inspecting': red in desktop/mobile mode, blue in VR mode
           *   - 'charging': yellow to red gradient
           *   - other states: lime green in desktop/mobile mode, blue in VR mode
           * - Disables movement controls ONLY when transitioning to inspecting state
           * - Keeps movement controls enabled when transitioning to charging state
           *
           * @param {string} newState - The state being transitioned to
           */
          onExit: function(newState) {
            // Update cursor visual for all state transitions
            const cursor = document.querySelector('#camera > #cursor');
            if (cursor) {
              // For charging state, we need to pass the chargeRatio parameter
              if (newState === 'charging') {
                InteractionUtils.updateCursorVisual(cursor, 'charging', 0);
              } else {
                // For all other states (including 'inspecting'), update cursor visual
                InteractionUtils.updateCursorVisual(cursor, newState);
              }
            }

            // Handle movement controls
            const cameraRig = document.querySelector('#cameraRig');
            if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
              // Disable movement ONLY during inspecting (not during charging)
              if (newState === 'inspecting') {
                cameraRig.setAttribute('movement-controls', 'enabled', false);
              }
            }
          }
        },
        charging: {
          /**
           * Called when throwing an object after charging
           * - Calculates throw force based on charge time
           * - Applies velocity to the object
           * - Movement and looking remain enabled during and after throwing
           *
           * @returns {string} The new state ('idle')
           */
          onThrow: function() {
            const heldObject = this.getData('heldObject');
            const originalState = this.getData('originalPhysicsState');
            const chargeStartTime = this.getData('chargeStartTime');

            // Calculate throw force based on charge time
            const component = document.querySelector('a-scene').components['desktop-mobile-controls'];
            const maxChargeTime = component.maxChargeTime;
            const minThrowForce = component.minThrowForce;
            const maxThrowForce = component.maxThrowForce;

            const chargeDuration = Math.min(Date.now() - chargeStartTime, maxChargeTime);
            const chargeRatio = chargeDuration / maxChargeTime;
            const throwForce = minThrowForce + (maxThrowForce - minThrowForce) * chargeRatio;

            // Calculate throw velocity based on camera direction
            const camera = document.querySelector('#camera');
            const throwVelocity = PhysicsUtils.calculateThrowVelocity(camera, throwForce);

            // Restore original physics state with velocity
            PhysicsUtils.restoreOriginalState(heldObject, originalState, throwVelocity);

            // Clean up
            component._removeTickFunction();
            this.setData('heldObject', null);
            this.setData('originalPhysicsState', null);
            this.setData('chargeStartTime', 0);

            return 'idle';
          },
          /**
           * Called when canceling a charge (e.g., by pressing space)
           * - Resets the charge start time
           * - Movement and looking remain enabled
           *
           * @returns {string} The new state ('holding')
           */
          onCancel: function() {
            this.setData('chargeStartTime', 0);
            return 'holding';
          },
          /**
           * Called when exiting the charging state
           * - Re-enables movement controls if not transitioning to inspecting state
           * - Updates cursor color based on the new state
           *
           * @param {string} newState - The state being transitioned to
           */
          onExit: function(newState) {
            // Re-enable movement controls if not going to inspecting
            // This ensures movement is re-enabled when throwing or canceling a charge
            if (newState !== 'inspecting') {
              const cameraRig = document.querySelector('#cameraRig');
              if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
                cameraRig.setAttribute('movement-controls', 'enabled', true);
              }
            }

            // Update cursor visual based on the new state
            const cursor = document.querySelector('#camera > #cursor');
            if (cursor) {
              InteractionUtils.updateCursorVisual(cursor, newState);
            }
          }
        },
        inspecting: {
          /**
           * Called when entering the inspecting state
           * - Updates cursor color to red in desktop/mobile mode
           * - Preserves blue cursor color in VR mode
           *
           * @param {string} prevState - The previous state
           */
          onEnter: function(prevState) {
            // Update cursor visual when entering inspection mode
            // This will set cursor to red in desktop/mobile mode
            // In VR mode, the blue color will be preserved by InteractionUtils.updateCursorVisual
            const cursor = document.querySelector('#camera > #cursor');
            if (cursor) {
              InteractionUtils.updateCursorVisual(cursor, 'inspecting');
            }
            console.log('Entered inspection mode, cursor color updated to red');
          },
          /**
           * Called when exiting the inspection mode
           * - Restores camera orientation to pre-inspection state
           * - Re-enables both look and movement controls
           * - Prepares the object to be held again
           *
           * @returns {string} The new state ('holding')
           */
          onExitInspect: function() {
            const inspectedObject = this.getData('inspectedObject');

            // Restore camera orientation to what it was before inspection
            const camera = document.querySelector('#camera');
            const lookControls = camera?.components['look-controls'];
            if (lookControls && lookControls.pitchObject && lookControls.yawObject) {
              lookControls.pitchObject.rotation.x = component.cameraPitchOnEnterInspect;
              lookControls.yawObject.rotation.y = component.rigYawOnEnterInspect;
            }

            // Re-enable look controls when exiting inspection mode
            // This allows camera movement again
            if (lookControls) {
              lookControls.data.enabled = true;
            }

            // Re-enable movement controls when exiting inspection mode
            // This allows player movement again
            const cameraRig = document.querySelector('#cameraRig');
            if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
              cameraRig.setAttribute('movement-controls', 'enabled', true);
            }

            // Store final inspection rotation
            const inspectQuaternion = inspectedObject.object3D.quaternion.clone();
            const inspectPosition = inspectedObject.object3D.position.clone();

            // Create dynamic body temporarily
            inspectedObject.removeAttribute('physx-body');
            inspectedObject.setAttribute('physx-body', 'type: dynamic');

            // Schedule switch to kinematic
            setTimeout(() => {
              try {
                // Switch back to kinematic
                inspectedObject.removeAttribute('physx-body');
                inspectedObject.setAttribute('physx-body', 'type: kinematic');

                // Apply final rotation
                inspectedObject.object3D.quaternion.copy(inspectQuaternion);

                // Store camera rotation for next tick
                const camera = document.querySelector('#camera');
                if (camera) {
                  camera.object3D.getWorldQuaternion(prevCameraWorldQuat);
                }

                // Restore holding state
                this.setData('heldObject', inspectedObject);
                this.setData('inspectedObject', null);

                // Set up tick function for object movement
                component._setupTickFunction();

              } catch (e) {
                console.error("Error restoring from inspection:", e);
                // Clean up on error
                this.setData('heldObject', null);
                this.setData('inspectedObject', null);
                this.stateMachine.reset('idle');

                const cursor = document.querySelector('#camera > #cursor');
                if (cursor) {
                  InteractionUtils.updateCursorVisual(cursor, 'idle');
                }
              }
            }, 100);

            return 'holding';
          },
          /**
           * Called when exiting the inspecting state
           * - Requests pointer lock if not on mobile
           * - Updates cursor color to lime green (holding state) in desktop/mobile mode
           * - Preserves blue cursor color in VR mode
           */
          onExit: function() {
            // Request pointer lock if not mobile
            if (!DeviceManager.isMobile) {
              setTimeout(() => {
                if (document.body && document.body.requestPointerLock) {
                  document.body.requestPointerLock();
                }
              }, 50);
            }

            // Update cursor visual to 'holding' state (lime green in desktop/mobile mode)
            // In VR mode, the blue color will be preserved by InteractionUtils.updateCursorVisual
            const cursor = document.querySelector('#camera > #cursor');
            if (cursor) {
              InteractionUtils.updateCursorVisual(cursor, 'holding');
            }
          }
        }
      },
      onTransition: (fromState, toState, action) => {
        console.log(`Interaction state transition: ${fromState} -> ${toState} (${action})`);

        // Emit state change event for debugging
        const event = new CustomEvent('statechange', {
          detail: {
            from: fromState,
            to: toState,
            action: action
          }
        });
        document.dispatchEvent(event);
      }
    });

    // Bind methods to preserve 'this' context
    this.onClick = this.onClick.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    // Bind context menu prevention
    this.onContextMenu = this.onContextMenu.bind(this);

    // Add event listeners
    window.addEventListener('click', this.onClick);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyPress);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove);
    window.addEventListener('touchstart', this.onTouchStart);
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('contextmenu', this.onContextMenu);

    // Initialize cursor visual
    const cursor = document.querySelector('#camera > #cursor');
    if (cursor) {
      InteractionUtils.updateCursorVisual(cursor, 'idle');
    }
  },

  remove: function () {
    // Clean up event listeners
    window.removeEventListener('click', this.onClick);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyPress);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('contextmenu', this.onContextMenu);

    // Remove tick function
    this._removeTickFunction();

    // Clean up held object if any
    if (this.stateMachine.is('holding') || this.stateMachine.is('charging')) {
      const heldObject = this.stateMachine.getData('heldObject');
      const originalState = this.stateMachine.getData('originalPhysicsState');

      if (heldObject && originalState) {
        PhysicsUtils.restoreOriginalState(heldObject, originalState);
      }
    }
  },

  // Event Handlers

  onClick: function (evt) {
    if (DeviceManager.isMobile) return;
    if (!this.stateMachine.is('idle')) return;
    if (evt.target.classList.contains('arrow-btn') ||
        evt.target.classList.contains('action-btn') ||
        evt.target.closest('.arrow-controls')) return;

    const headCursor = document.querySelector('#camera > #cursor');
    if (!headCursor || !headCursor.components.raycaster) return;

    const clickedEl = InteractionUtils.getIntersectedElement(headCursor, '.clickable');
    if (clickedEl) {
      console.log("Desktop click on .clickable:", clickedEl.id);
      clickedEl.emit('click', null, false);
    }
  },

  onMouseDown: function (evt) {
    console.log('Mouse down event, button:', evt.button);
    if (DeviceManager.isMobile) {
      console.log('Ignoring mouse down on mobile');
      return;
    }

    // Handle right mouse button (button 2) for inspection mode
    if (evt.button === 2) {
      console.log('Right mouse button detected');
      if (this.stateMachine.is('holding')) {
        console.log('State: holding - Entering inspection mode with right mouse button');
        this.stateMachine.transition('onInspect');
        evt.preventDefault(); // Prevent context menu
        return;
      } else if (this.stateMachine.is('inspecting')) {
        console.log('State: inspecting - Exiting inspection mode with right mouse button');
        this.stateMachine.transition('onExitInspect');
        evt.preventDefault(); // Prevent context menu
        return;
      }
      return;
    }

    // Handle left mouse button (button 0) for normal interactions
    if (evt.button !== 0) {
      console.log('Ignoring mouse button that is not left or right');
      return;
    }

    if (evt.target.classList.contains('arrow-btn') ||
        evt.target.classList.contains('action-btn') ||
        evt.target.closest('.arrow-controls')) {
      console.log('Ignoring click on UI element');
      return;
    }

    if (this.stateMachine.is('idle')) {
      console.log('State: idle - Looking for pickupable object');
      const headCursor = document.querySelector('#camera > #cursor');
      if (!headCursor) {
        console.warn('No cursor found');
        return;
      }
      if (!headCursor.components.raycaster) {
        console.warn('No raycaster component on cursor');
        return;
      }

      console.log('Raycaster found, checking for intersections');
      const clickedEl = InteractionUtils.getIntersectedElement(headCursor, '.pickupable');
      if (clickedEl) {
        console.log('Found pickupable object:', clickedEl.id || clickedEl.tagName);
        this.stateMachine.transition('onPickup', clickedEl);
      } else {
        console.log('No pickupable object found');
      }
    } else if (this.stateMachine.is('holding')) {
      console.log('State: holding - Starting second click timer');
      this.secondClickStartTime = Date.now();
    }
  },

  onMouseUp: function (evt) {
    if (DeviceManager.isMobile) return;
    if (evt.button !== 0) return;

    if (this.stateMachine.is('charging')) {
      this.stateMachine.transition('onThrow');
    } else if (this.stateMachine.is('holding') && this.secondClickStartTime > 0) {
      // Quick second click = drop
      this.stateMachine.transition('onDrop');
      this.secondClickStartTime = 0;
    }
  },

  onKeyPress: function (evt) {
    // Only handle non-spacebar keys here
    // Spacebar is now exclusively for jumping via the JumpControl component

    // We still need to handle canceling charge with other keys
    if (evt.code === 'Escape' && this.stateMachine.is('charging')) {
      this.stateMachine.transition('onCancel');
    }
  },

  onTouchStart: function (evt) {
    // Handle two-finger tap for inspection
    if (evt.touches.length === 2 && this.stateMachine.is('holding')) {
      this.stateMachine.transition('onInspect');
      return;
    }

    // Ignore taps on UI buttons
    if (evt.target.classList.contains('arrow-btn') ||
        evt.target.classList.contains('action-btn')) {
      return;
    }

    // Store touch start info for swipe detection
    this.touchStartX = evt.touches[0].clientX;
    this.touchStartY = evt.touches[0].clientY;
    this.touchStartTime = Date.now();
    this.isSwiping = false;
    this.prevMouseX = evt.touches[0].clientX;
    this.prevMouseY = evt.touches[0].clientY;
  },

  onTouchMove: function (evt) {
    // Handle inspection rotation
    if (this.stateMachine.is('inspecting')) {
      const inspectedObject = this.stateMachine.getData('inspectedObject');
      if (evt.touches.length !== 1 || !inspectedObject) return;

      const touch = evt.touches[0];
      const sensitivity = 0.005;
      const moveDeltaX = (touch.clientX - this.prevMouseX) * sensitivity;
      const moveDeltaY = (touch.clientY - this.prevMouseY) * sensitivity;

      const threshold = 0.001;
      const absX = Math.abs(moveDeltaX);
      const absY = Math.abs(moveDeltaY);

      const objectToRotate = inspectedObject.object3D;
      const camera = document.querySelector('#camera');
      const cameraQuaternion = new THREE.Quaternion();
      camera.object3D.getWorldQuaternion(cameraQuaternion);

      if (absX > threshold && absX > absY * 2) {
        const yAxis = new THREE.Vector3(0, 1, 0);
        const rotation = new THREE.Quaternion().setFromAxisAngle(yAxis, -moveDeltaX);
        objectToRotate.quaternion.multiply(rotation);
      } else if (absY > threshold && absY > absX * 2) {
        const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
        const rotation = new THREE.Quaternion().setFromAxisAngle(xAxis, moveDeltaY);
        objectToRotate.quaternion.multiply(rotation);
      }

      objectToRotate.updateMatrix();

      this.prevMouseX = touch.clientX;
      this.prevMouseY = touch.clientY;
      this.isSwiping = true;
      return;
    }

    // Standard swipe look controls
    if (evt.touches.length !== 1) return;
    const touch = evt.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.isSwiping = true;
    }

    if (this.isSwiping) {
      const sensitivity = 0.005;
      const moveDeltaX = (touch.clientX - this.prevMouseX) * sensitivity;
      const moveDeltaY = (touch.clientY - this.prevMouseY) * sensitivity;
      const camera = document.querySelector('#camera');
      if (!camera) return;
      const lookControls = camera.components['look-controls'];

      if (lookControls) {
        lookControls.yawObject.rotation.y += moveDeltaX;
        const newPitch = lookControls.pitchObject.rotation.x + moveDeltaY;
        lookControls.pitchObject.rotation.x = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, newPitch));
      }
    }

    this.prevMouseX = touch.clientX;
    this.prevMouseY = touch.clientY;
  },

  onTouchEnd: function (evt) {
    // Handle UI button taps separately
    if (evt.target.classList.contains('arrow-btn') ||
        evt.target.classList.contains('action-btn')) {
      return;
    }

    // If it was a swipe, or if inspecting, don't process as a tap
    if (this.isSwiping || this.stateMachine.is('inspecting')) {
      this.isSwiping = false;
      return;
    }

    // Single tap to attempt pickup (if idle)
    if (this.stateMachine.is('idle')) {
      const headCursor = document.querySelector('#camera > #cursor');
      if (!headCursor || !headCursor.components.raycaster) return;

      const tappedEl = InteractionUtils.getIntersectedElement(headCursor, '.clickable, .pickupable');
      if (tappedEl) {
        if (tappedEl.classList.contains('clickable')) {
          tappedEl.emit('click', null, false);
        } else if (tappedEl.classList.contains('pickupable')) {
          this.stateMachine.transition('onPickup', tappedEl);
        }
      }
    } else if (this.stateMachine.is('holding')) {
      // Double tap to drop
      const currentTime = Date.now();
      const tapLength = currentTime - this.lastTapTime;
      if (tapLength < 500 && tapLength > 0) {
        console.log("Mobile double-tap: Dropping object");
        this.stateMachine.transition('onDrop');
      }
      this.lastTapTime = currentTime;
    }

    this.isSwiping = false;
  },

  onMouseMove: function (evt) {
    // Handle object rotation in inspection mode
    if (this.stateMachine.is('inspecting')) {
      const inspectedObject = this.stateMachine.getData('inspectedObject');
      if (!inspectedObject) return;

      const deltaX = evt.movementX * 0.005;
      const deltaY = evt.movementY * 0.005;

      inspectedObject.object3D.rotateY(-deltaX);
      inspectedObject.object3D.rotateX(deltaY);
    }
  },

  onContextMenu: function (evt) {
    // Prevent context menu from appearing when right-clicking
    // This is important for using right mouse button as a control
    if (this.stateMachine.is('holding') || this.stateMachine.is('inspecting')) {
      evt.preventDefault();
      return false;
    }
  },

  // Tick function for object movement
  tick: function () {
    // Check if we need to transition from holding to charging
    if (this.stateMachine.is('holding') && this.secondClickStartTime > 0) {
      if (Date.now() - this.secondClickStartTime > this.chargeThreshold) {
        this.stateMachine.transition('onCharge');
        this.secondClickStartTime = 0;
      }
    }

    // Update held object position and rotation
    if (this.stateMachine.is('holding') || this.stateMachine.is('charging')) {
      const heldObject = this.stateMachine.getData('heldObject');
      if (!heldObject) return;

      const camera = document.querySelector('#camera');
      if (!camera) return;

      const object3D = heldObject.object3D;

      // Calculate position
      camera.object3D.getWorldPosition(tempCameraWorldPos);
      camera.object3D.getWorldQuaternion(currentCameraWorldQuat);

      tempDirection.set(0, 0, -1);
      tempDirection.applyQuaternion(currentCameraWorldQuat);
      const component = document.querySelector('a-scene').components['desktop-mobile-controls'];
      const holdDistance = component ? component.holdDistance : 2;
      targetPosition.copy(tempCameraWorldPos).add(tempDirection.multiplyScalar(holdDistance));

      object3D.position.copy(targetPosition);

      // Calculate rotation delta
      InteractionUtils.calculateRelativeRotation(
        prevCameraWorldQuat,
        currentCameraWorldQuat,
        deltaQuat
      );

      // Apply delta rotation
      object3D.quaternion.premultiply(deltaQuat);

      // Store current camera rotation for next frame
      prevCameraWorldQuat.copy(currentCameraWorldQuat);
    }

    // Update charge visual feedback
    if (this.stateMachine.is('charging')) {
      const chargeStartTime = this.stateMachine.getData('chargeStartTime');
      const chargeDuration = Math.min(Date.now() - chargeStartTime, this.maxChargeTime);
      const chargeRatio = chargeDuration / this.maxChargeTime;

      const cursor = document.querySelector('#camera > #cursor');
      if (cursor) {
        InteractionUtils.updateCursorVisual(cursor, 'charging', chargeRatio);
      }
    }
  },

  // Helper methods

  _setupTickFunction: function () {
    console.log('Setting up tick function');
    if (this._tickFunction) {
      console.log('Removing existing tick function');
      document.querySelector('a-scene').removeEventListener('tick', this._tickFunction);
    }
    this._tickFunction = this.tick.bind(this);
    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) {
      console.error('No scene element found for tick function');
      return;
    }
    console.log('Adding tick function to scene');
    sceneEl.addEventListener('tick', this._tickFunction);
  },

  _removeTickFunction: function () {
    if (this._tickFunction) {
      const sceneEl = document.querySelector('a-scene');
      if (sceneEl) {
        sceneEl.removeEventListener('tick', this._tickFunction);
      }
      this._tickFunction = null;
    }
  }
};

export default DesktopMobileControls;
