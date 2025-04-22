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

    // Create state machine for interaction states
    this.stateMachine = new StateMachine({
      initialState: 'idle',
      states: {
        idle: {
          onPickup: function(el) {
            // Store element and original physics state
            this.setData('heldObject', el);
            this.setData('originalPhysicsState', PhysicsUtils.convertToKinematic(el));

            // Initialize camera rotation tracking
            if (this.camera) {
              this.camera.object3D.getWorldQuaternion(prevCameraWorldQuat);
            }

            // Set up tick function for object movement
            this._setupTickFunction();

            return 'holding';
          },
          onExit: function() {
            // Update cursor visual
            InteractionUtils.updateCursorVisual(this.cursor, 'holding');
          }
        },
        holding: {
          onCharge: function() {
            this.setData('chargeStartTime', Date.now());
            return 'charging';
          },
          onDrop: function() {
            const heldObject = this.getData('heldObject');
            const originalState = this.getData('originalPhysicsState');

            // Restore original physics state
            PhysicsUtils.restoreOriginalState(heldObject, originalState);

            // Clean up
            this._removeTickFunction();
            this.setData('heldObject', null);
            this.setData('originalPhysicsState', null);

            return 'idle';
          },
          onInspect: function() {
            const heldObject = this.getData('heldObject');

            // Store camera orientation
            const lookControls = this.camera?.components['look-controls'];
            if (lookControls && lookControls.pitchObject && lookControls.yawObject) {
              this.cameraPitchOnEnterInspect = lookControls.pitchObject.rotation.x;
              this.rigYawOnEnterInspect = lookControls.yawObject.rotation.y;
            }

            // Disable controls
            if (lookControls) {
              lookControls.data.enabled = false;
            }

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
            this._removeTickFunction();

            return 'inspecting';
          },
          onExit: function(newState) {
            if (newState === 'charging') {
              InteractionUtils.updateCursorVisual(this.cursor, 'charging', 0);

              // Disable movement during charging
              const cameraRig = document.querySelector('#cameraRig');
              if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
                cameraRig.setAttribute('movement-controls', 'enabled', false);
              }
            }
          }
        },
        charging: {
          onThrow: function() {
            const heldObject = this.getData('heldObject');
            const originalState = this.getData('originalPhysicsState');
            const chargeStartTime = this.getData('chargeStartTime');

            // Calculate throw force based on charge time
            const chargeDuration = Math.min(Date.now() - chargeStartTime, this.data.maxChargeTime);
            const chargeRatio = chargeDuration / this.data.maxChargeTime;
            const throwForce = this.data.minThrowForce +
                              (this.data.maxThrowForce - this.data.minThrowForce) * chargeRatio;

            // Calculate throw velocity
            const throwVelocity = PhysicsUtils.calculateThrowVelocity(this.camera, throwForce);

            // Restore original physics state with velocity
            PhysicsUtils.restoreOriginalState(heldObject, originalState, throwVelocity);

            // Clean up
            this._removeTickFunction();
            this.setData('heldObject', null);
            this.setData('originalPhysicsState', null);
            this.setData('chargeStartTime', 0);

            return 'idle';
          },
          onCancel: function() {
            this.setData('chargeStartTime', 0);
            return 'holding';
          },
          onExit: function(newState) {
            // Re-enable movement controls if not going to inspecting
            if (newState !== 'inspecting') {
              const cameraRig = document.querySelector('#cameraRig');
              if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
                cameraRig.setAttribute('movement-controls', 'enabled', true);
              }
            }

            // Update cursor visual
            InteractionUtils.updateCursorVisual(this.cursor, newState);
          }
        },
        inspecting: {
          onExitInspect: function() {
            const inspectedObject = this.getData('inspectedObject');

            // Restore camera orientation
            const lookControls = this.camera?.components['look-controls'];
            if (lookControls && lookControls.pitchObject && lookControls.yawObject) {
              lookControls.pitchObject.rotation.x = this.cameraPitchOnEnterInspect;
              lookControls.yawObject.rotation.y = this.rigYawOnEnterInspect;
            }

            // Re-enable controls
            if (lookControls) {
              lookControls.data.enabled = true;
            }

            const cameraRig = document.querySelector('#cameraRig');
            if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
              cameraRig.setAttribute('movement-controls', 'enabled', true);
            }

            // Store final inspection rotation
            const inspectQuaternion = inspectedObject.object3D.quaternion.clone();
            const inspectPosition = inspectedObject.object3D.position.clone();

            // Create dynamic body temporarily
            inspectedObject.setAttribute('physx-body', 'type', 'dynamic');

            // Schedule switch to kinematic
            setTimeout(() => {
              try {
                // Switch back to kinematic
                inspectedObject.setAttribute('physx-body', 'type', 'kinematic');

                // Apply final rotation
                inspectedObject.object3D.quaternion.copy(inspectQuaternion);

                // Store camera rotation for next tick
                if (this.camera) {
                  this.camera.object3D.getWorldQuaternion(prevCameraWorldQuat);
                }

                // Restore holding state
                this.setData('heldObject', inspectedObject);
                this.setData('inspectedObject', null);

                // Set up tick function for object movement
                this._setupTickFunction();

              } catch (e) {
                console.error("Error restoring from inspection:", e);
                // Clean up on error
                this.setData('heldObject', null);
                this.setData('inspectedObject', null);
                this.stateMachine.reset('idle');
                InteractionUtils.updateCursorVisual(this.cursor, 'idle');
              }
            }, 100);

            return 'holding';
          },
          onExit: function() {
            // Request pointer lock if not mobile
            if (!DeviceManager.isMobile) {
              setTimeout(() => {
                if (document.body && document.body.requestPointerLock) {
                  document.body.requestPointerLock();
                }
              }, 50);
            }

            // Update cursor visual
            InteractionUtils.updateCursorVisual(this.cursor, 'holding');
          }
        }
      },
      onTransition: (fromState, toState, action) => {
        console.log(`Interaction state transition: ${fromState} -> ${toState} (${action})`);
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

    // Add event listeners
    window.addEventListener('click', this.onClick);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyPress);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove);
    window.addEventListener('touchstart', this.onTouchStart);
    window.addEventListener('touchend', this.onTouchEnd);

    // Initialize cursor visual
    InteractionUtils.updateCursorVisual(this.cursor, 'idle');
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
    if (DeviceManager.isMobile) return;
    if (evt.button !== 0) return; // Only react to left mouse button
    if (evt.target.classList.contains('arrow-btn') ||
        evt.target.classList.contains('action-btn') ||
        evt.target.closest('.arrow-controls')) return;

    if (this.stateMachine.is('idle')) {
      const headCursor = document.querySelector('#camera > #cursor');
      if (!headCursor || !headCursor.components.raycaster) return;

      const clickedEl = InteractionUtils.getIntersectedElement(headCursor, '.pickupable');
      if (clickedEl) {
        this.stateMachine.transition('onPickup', clickedEl);
      }
    } else if (this.stateMachine.is('holding')) {
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
    if (evt.code === 'Space') {
      if (this.stateMachine.is('holding')) {
        this.stateMachine.transition('onInspect');
      } else if (this.stateMachine.is('charging')) {
        this.stateMachine.transition('onCancel');
      } else if (this.stateMachine.is('inspecting')) {
        this.stateMachine.transition('onExitInspect');
      }
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
      const lookControls = this.camera.components['look-controls'];

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

  // Tick function for object movement
  tick: function () {
    // Check if we need to transition from holding to charging
    if (this.stateMachine.is('holding') && this.secondClickStartTime > 0) {
      if (Date.now() - this.secondClickStartTime > this.data.chargeThreshold) {
        this.stateMachine.transition('onCharge');
        this.secondClickStartTime = 0;
      }
    }

    // Update held object position and rotation
    if (this.stateMachine.is('holding') || this.stateMachine.is('charging')) {
      const heldObject = this.stateMachine.getData('heldObject');
      if (!heldObject) return;

      const camera = this.camera;
      const object3D = heldObject.object3D;

      // Calculate position
      camera.object3D.getWorldPosition(tempCameraWorldPos);
      camera.object3D.getWorldQuaternion(currentCameraWorldQuat);

      tempDirection.set(0, 0, -1);
      tempDirection.applyQuaternion(currentCameraWorldQuat);
      targetPosition.copy(tempCameraWorldPos).add(tempDirection.multiplyScalar(this.data.holdDistance));

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
      const chargeDuration = Math.min(Date.now() - chargeStartTime, this.data.maxChargeTime);
      const chargeRatio = chargeDuration / this.data.maxChargeTime;

      InteractionUtils.updateCursorVisual(this.cursor, 'charging', chargeRatio);
    }
  },

  // Helper methods

  _setupTickFunction: function () {
    if (this._tickFunction) {
      this.el.sceneEl.removeEventListener('tick', this._tickFunction);
    }
    this._tickFunction = this.tick.bind(this);
    this.el.sceneEl.addEventListener('tick', this._tickFunction);
  },

  _removeTickFunction: function () {
    if (this._tickFunction) {
      this.el.sceneEl.removeEventListener('tick', this._tickFunction);
      this._tickFunction = null;
    }
  }
};

export default DesktopMobileControls;
