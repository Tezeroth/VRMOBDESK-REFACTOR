# VRMOBDESK Program Flow

*Last Updated: June 2023*

This document describes the initialization sequence, event handling, state management, and mode switching in the VRMOBDESK application.

## Initialization Sequence

The application follows this initialization sequence:

1. **DOM Content Loading**:
   - Basic HTML structure loads
   - Scripts are loaded in the order specified in the HTML head

2. **A-Frame Initialization**:
   - A-Frame initializes the scene and entity-component system
   - The `a-scene` element triggers its initialization process

3. **PhysX Initialization**:
   - The PhysX physics engine is initialized with the specified configuration
   - The WASM module is loaded and initialized

4. **Device Detection**:
   - The `DeviceManager.init()` method is called to detect device capabilities
   - VR support, mobile status, and gyroscope availability are determined

5. **Control Setup**:
   - The `control-manager` component initializes based on device detection
   - Either VR or Desktop/Mobile controls are set up

6. **Asset Loading**:
   - 3D models, textures, and other assets are loaded
   - The loading screen is displayed during this process

7. **Scene Setup**:
   - Once assets are loaded, the scene is fully initialized
   - Physics bodies are created for objects
   - Navmesh is initialized for navigation constraints

8. **User Interface Initialization**:
   - Mobile controls are added if on a mobile device
   - Look mode toggle is initialized if gyroscope is available

## Event Handling

The application uses a combination of A-Frame events and DOM events:

### A-Frame Events

- **enter-vr**: Triggered when entering VR mode
  ```javascript
  this.sceneEl.addEventListener('enter-vr', () => {
    this.isVRMode = true;
    this.removeDesktopMobileMode();
    this.setupVRMode();
  });
  ```

- **exit-vr**: Triggered when exiting VR mode
  ```javascript
  this.sceneEl.addEventListener('exit-vr', () => {
    if (this.isVRMode) {
      this.isVRMode = false;
      this.removeVRMode();
      this.setupDesktopMobileMode();
    }
  });
  ```

- **object3dset**: Triggered when a 3D object is set on an entity
  ```javascript
  this.el.addEventListener('object3dset', this.update.bind(this));
  ```

- **model-loaded**: Triggered when a 3D model is loaded
  ```javascript
  this.el.addEventListener('model-loaded', (e) => {
    const object3D = e.detail.model;
    // Process the loaded model
  });
  ```

### DOM Events

- **click**: Handles mouse clicks for object interaction
  ```javascript
  window.addEventListener('click', this.onClick);
  ```

- **mousedown/mouseup**: Handles mouse button state for object manipulation
  ```javascript
  window.addEventListener('mousedown', this.onMouseDown);
  window.addEventListener('mouseup', this.onMouseUp);
  ```

- **touchstart/touchmove/touchend**: Handles touch events for mobile interaction
  ```javascript
  window.addEventListener('touchstart', this.onTouchStart);
  window.addEventListener('touchmove', this.onTouchMove);
  window.addEventListener('touchend', this.onTouchEnd);
  ```

- **keydown**: Handles keyboard input
  ```javascript
  window.addEventListener('keydown', this.onKeyPress);
  ```

- **deviceorientation**: Handles gyroscope input for mobile devices
  ```javascript
  window.addEventListener('deviceorientation', this.handleGyro.bind(this), false);
  ```

## State Management

### Device State

The `DeviceManager` maintains the device state:

```javascript
const DeviceManager = {
  isVR: false,
  isMobile: false,
  hasGyro: false,

  async init() {
    // Initialize device state
  }
}
```

### Control Mode State

The `control-manager` component manages the control mode state:

```javascript
AFRAME.registerComponent('control-manager', {
  init: function() {
    this.isVRMode = false;
    this.isMobile = false;

    // Initialize based on DeviceManager
    DeviceManager.init().then(() => {
      this.isMobile = DeviceManager.isMobile;

      if (DeviceManager.isVR) {
        this.isVRMode = true;
        this.removeDesktopMobileMode();
      } else {
        this.isVRMode = false;
        this.setupDesktopMobileMode();
      }
    });
  }
});
```

### Interaction State

The `desktop-mobile-controls` component manages the interaction state using a StateMachine:

```javascript
AFRAME.registerComponent('desktop-mobile-controls', {
  init: function () {
    // Create state machine for interaction states
    this.stateMachine = new StateMachine({
      initialState: 'idle',
      states: {
        idle: {
          onPickup: 'holding'
        },
        holding: {
          onRelease: 'idle',
          onCharge: 'charging',
          onInspect: 'inspecting'
        },
        charging: {
          onRelease: 'throwing',
          onCancel: 'holding'
        },
        throwing: {
          onComplete: 'idle'
        },
        inspecting: {
          onExitInspect: 'holding'
        }
      },
      onTransition: (from, to, action) => {
        console.log(`Transition from ${from} to ${to} via ${action}`);
      }
    });

    // Initialize event listeners and other state
  }
});
```

### Look Mode State

The `LookModeManager` manages the camera control mode:

```javascript
const LookModeManager = {
  currentMode: 'swipe', // 'swipe' or 'gyro'
  gyroEnabled: false,

  init() {
    this.currentMode = localStorage.getItem('lookMode') || 'swipe';
    // Initialize based on stored preference
  }
}
```

## Mode Switching

### VR Mode vs Desktop/Mobile Mode

The application switches between VR and non-VR modes based on device detection and user actions:

1. **Initial Setup**:
   ```javascript
   if (DeviceManager.isVR) {
     this.isVRMode = true;
     this.removeDesktopMobileMode();
   } else {
     this.isVRMode = false;
     this.setupDesktopMobileMode();
   }
   ```

2. **Entering VR**:
   ```javascript
   this.sceneEl.addEventListener('enter-vr', () => {
     this.isVRMode = true;
     this.removeDesktopMobileMode();
     this.setupVRMode();
   });
   ```

3. **Exiting VR**:
   ```javascript
   this.sceneEl.addEventListener('exit-vr', () => {
     if (this.isVRMode) {
       this.isVRMode = false;
       this.removeVRMode();
       this.setupDesktopMobileMode();
     }
   });
   ```

### VR Mode Setup

When entering VR mode, the following changes occur:

```javascript
setupVRMode: function() {
  // Remove desktop/mobile controls
  this.removeDesktopMobileMode();

  // Set up VR movement controls
  this.cameraRig.setAttribute('movement-controls', 'controls: checkpoint, nipple, trackpad, touch, gamepad, keyboard, mouse; speed:0.2;');
  this.cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0.01;exclude:.navmesh-hole;');

  // Disable camera look controls
  this.camera.setAttribute('look-controls', 'enabled', false);

  // Enable hand controls
  this.handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
}
```

### Desktop/Mobile Mode Setup

When entering desktop/mobile mode, the following changes occur:

```javascript
setupDesktopMobileMode: function() {
  // Enable camera look controls
  cameraEl.setAttribute('look-controls', 'pointerLockEnabled: true');

  // Set up movement controls
  cameraRig.setAttribute('movement-controls', 'enabled: true; controls: keyboard; speed: 0.2; fly: false;');
  cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0.01;exclude:.navmesh-hole;');

  // Add mobile UI if on mobile
  if (DeviceManager.isMobile) {
    sceneEl.setAttribute('arrow-controls', '');
  }

  // Add desktop/mobile interaction component
  sceneEl.setAttribute('desktop-mobile-controls', '');
}
```

## Interaction Flow

### Object Pickup Flow

1. User clicks/taps on a pickupable object
2. The `pickupObject` method is called
3. The original physics state is stored
4. The object's physics body is changed to kinematic
5. The object is attached to the camera view
6. The state machine transitions to 'holding' state via the 'onPickup' action
7. The tick function updates to move the object with the camera

```javascript
pickupObject: function (el) {
  // Store original physics state in the state machine data
  const currentBody = el.components['physx-body'];
  const originalState = AFRAME.utils.extend({}, currentBody.data);
  this.stateMachine.setData('originalPhysicsState', originalState);

  // Remove existing physics body and create kinematic one
  PhysicsUtils.convertToKinematic(el);

  // Store reference to held object in state machine data
  this.stateMachine.setData('heldObject', el);

  // Transition state machine to holding state
  this.stateMachine.transition('onPickup', el);

  // Set up tick function for object movement
  this._tickFunction = this.tick.bind(this);
  this.el.sceneEl.addEventListener('tick', this._tickFunction);
}
```

### Object Throw Flow

1. User clicks/taps and holds while holding an object
2. The state machine transitions to 'charging' state via the 'onCharge' action
3. The charge time is tracked
4. Visual feedback shows charge level
5. User releases the click/tap
6. The state machine transitions to 'throwing' state via the 'onRelease' action
7. Throw velocity is calculated based on charge time
8. The object's physics body is changed back to dynamic
9. Velocity is applied to the object
10. The state machine transitions to 'idle' state via the 'onComplete' action

```javascript
// In onMouseDown or equivalent
if (this.stateMachine.is('holding')) {
  this.chargeStartTime = Date.now();
  this.stateMachine.transition('onCharge');
  // Update cursor visual to show charging
  InteractionUtils.updateCursorVisual(this.cursor, 'charging', 0);
}

// In onMouseUp or equivalent
if (this.stateMachine.is('charging')) {
  const chargeDuration = Math.min(Date.now() - this.chargeStartTime, this.maxChargeTime);
  const chargeRatio = chargeDuration / this.maxChargeTime;
  const throwForce = this.minThrowForce + (this.maxThrowForce - this.minThrowForce) * chargeRatio;

  // Calculate throw direction
  const direction = new THREE.Vector3(0, 0.2, -1);
  direction.applyQuaternion(this.camera.object3D.quaternion);
  const throwVelocity = direction.multiplyScalar(throwForce);

  // Transition to throwing state
  this.stateMachine.transition('onRelease', throwVelocity);

  // In the throwing state handler:
  const heldObject = this.stateMachine.getData('heldObject');
  const originalState = this.stateMachine.getData('originalPhysicsState');

  // Restore original physics state but with dynamic type
  PhysicsUtils.restoreOriginalState(heldObject, originalState, 'dynamic');

  // Apply calculated velocity
  PhysicsUtils.applyVelocity(heldObject, throwVelocity);

  // Complete the throw
  this.stateMachine.transition('onComplete');
}
```

### Inspection Mode Flow

1. User right-clicks (desktop) or taps Examine button (mobile) while holding an object
2. The state machine transitions to 'inspecting' state via the 'onInspect' action
3. Camera and movement controls are disabled
4. The object is detached from the camera
5. Camera orientation is stored for restoration
6. Mouse/touch movement rotates the object
7. User right-clicks (desktop) or taps Cancel (mobile) to exit inspection mode
8. The state machine transitions back to 'holding' state via the 'onExitInspect' action
9. Camera and movement controls are re-enabled
10. The object is reattached to the camera
11. Camera orientation is restored

```javascript
// On right-click or examine button press
if (this.stateMachine.is('holding') && this.stateMachine.can('onInspect')) {
  const heldObject = this.stateMachine.getData('heldObject');

  // Store camera orientation
  this.cameraPitchOnEnterInspect = this.camera.getAttribute('rotation').x;
  this.rigYawOnEnterInspect = this.cameraRig.getAttribute('rotation').y;

  // Store object being inspected
  this.stateMachine.setData('inspectedObject', heldObject);

  // Disable controls
  const lookControls = this.camera.components['look-controls'];
  lookControls.data.enabled = false;
  this.cameraRig.setAttribute('movement-controls', 'enabled', false);

  // Transition to inspecting state
  this.stateMachine.transition('onInspect');
}

// On right-click or cancel button press during inspection
if (this.stateMachine.is('inspecting') && this.stateMachine.can('onExitInspect')) {
  // Re-enable controls
  const lookControls = this.camera.components['look-controls'];
  lookControls.data.enabled = true;
  this.cameraRig.setAttribute('movement-controls', 'enabled', true);

  // Restore camera orientation
  this.camera.setAttribute('rotation', {x: this.cameraPitchOnEnterInspect, y: 0, z: 0});
  this.cameraRig.setAttribute('rotation', {x: 0, y: this.rigYawOnEnterInspect, z: 0});

  // Transition back to holding state
  this.stateMachine.transition('onExitInspect');
}
```
