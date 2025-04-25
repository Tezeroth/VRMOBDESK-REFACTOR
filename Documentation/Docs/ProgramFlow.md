# VRMOBDESK Program Flow

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

The `desktop-and-mobile-controls` component manages the interaction state:

```javascript
AFRAME.registerComponent('desktop-and-mobile-controls', {
  init: function () {
    this.interactionState = 'idle'; // 'idle', 'holding', 'charging', 'inspecting'
    this.heldObject = null;
    this.objectBeingInspected = null;

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
  sceneEl.setAttribute('desktop-and-mobile-controls', '');
}
```

## Interaction Flow

### Object Pickup Flow

1. User clicks/taps on a pickupable object
2. The `pickupObject` method is called
3. The original physics state is stored
4. The object's physics body is changed to kinematic
5. The object is attached to the camera view
6. The interaction state changes to 'holding'
7. The tick function updates to move the object with the camera

```javascript
pickupObject: function (el) {
  // Store original physics state
  this._originalPhysicsState = AFRAME.utils.extend({}, currentBody);

  // Remove existing physics body and create kinematic one
  el.removeAttribute('physx-body');
  el.setAttribute('physx-body', 'type', 'kinematic');

  // Update state
  this.heldObject = el;
  this.interactionState = 'holding';

  // Set up tick function for object movement
  this._tickFunction = this.tick.bind(this);
  this.el.sceneEl.addEventListener('tick', this._tickFunction);
}
```

### Object Throw Flow

1. User clicks/taps and holds while holding an object
2. The interaction state changes to 'charging'
3. The charge time is tracked
4. Visual feedback shows charge level
5. User releases the click/tap
6. Throw velocity is calculated based on charge time
7. The object's physics body is changed back to dynamic
8. Velocity is applied to the object
9. The interaction state changes to 'idle'

```javascript
// In onMouseUp or equivalent
if (this.interactionState === 'charging') {
  const chargeDuration = Math.min(Date.now() - this.chargeStartTime, this.maxChargeTime);
  const chargeRatio = chargeDuration / this.maxChargeTime;
  const throwForce = this.minThrowForce + (this.maxThrowForce - this.minThrowForce) * chargeRatio;

  // Calculate throw direction
  const direction = new THREE.Vector3(0, 0.2, -1);
  direction.applyQuaternion(camera.object3D.quaternion);
  const throwVelocity = direction.multiplyScalar(throwForce);

  // Release with velocity
  this.releaseObject(throwVelocity);
}
```

### Inspection Mode Flow

1. User right-clicks (desktop) or taps Examine button (mobile) while holding an object
2. The state machine transitions to 'inspecting' state via the 'onInspect' action
3. Camera and movement controls are disabled
4. The object is detached from the camera
5. The interaction state changes to 'inspecting'
6. Mouse/touch movement rotates the object
7. User right-clicks (desktop) or taps Cancel (mobile) to exit inspection mode
8. The state machine transitions back to 'holding' state via the 'onExitInspect' action
9. Camera and movement controls are re-enabled
10. The object is reattached to the camera
11. The interaction state changes back to 'holding'

```javascript
toggleInspectionMode: function () {
  if (this.interactionState === 'holding' && this.heldObject) {
    // Enter inspection mode
    this.inspectionMode = true;
    this.interactionState = 'inspecting';
    this.objectBeingInspected = this.heldObject;
    this.heldObject = null;

    // Disable controls
    lookControls.data.enabled = false;
    cameraRig.setAttribute('movement-controls', 'enabled', false);

  } else if (this.interactionState === 'inspecting') {
    // Exit inspection mode
    this.inspectionMode = false;

    // Re-enable controls
    lookControls.data.enabled = true;
    cameraRig.setAttribute('movement-controls', 'enabled', true);

    // Restore object to held state
    this.interactionState = 'holding';
    this.heldObject = this.objectBeingInspected;
    this.objectBeingInspected = null;
  }
}
```
