# VRMOBDESK Interactions

This document details the interaction systems implemented in the VRMOBDESK application across different platforms.

## Device Detection

The application uses the `DeviceManager` to detect the user's device and capabilities:

```javascript
const DeviceManager = {
  isVR: false,
  isMobile: false,
  hasGyro: false,
  
  async init() {
    // Detect VR support
    // Detect mobile device
    // Check for gyroscope
  }
}
```

Based on this detection, the `control-manager` component sets up the appropriate control scheme:

```javascript
if (DeviceManager.isVR) {
  this.setupVRMode();
} else {
  this.setupDesktopMobileMode();
}
```

## Desktop Interactions

### Movement Controls

- **WASD Keys**: Move forward, left, backward, right
- **Mouse**: Look around (with pointer lock)
- **Space**: Toggle inspection mode when holding an object

### Object Interaction

1. **Pickup**:
   - Left-click on a pickupable object
   - Object becomes kinematic and follows the camera

2. **Examine**:
   - Press Space while holding an object
   - Camera controls are disabled
   - Mouse movement rotates the object
   - Press Space again to exit examine mode

3. **Throw**:
   - While holding an object, click and hold
   - Charging animation shows throw power
   - Release to throw with velocity based on charge time

4. **Drop**:
   - Quick second click while holding an object

### Navigation

- Click on objects with the `navigate-on-click` component to navigate to other scenes

## Mobile Interactions

### Movement Controls

- **Arrow Buttons**: On-screen buttons for movement
- **Swipe**: Swipe to look around
- **Gyroscope** (if available): Toggle between swipe and gyroscope modes with the look-mode button

### Object Interaction

1. **Pickup**:
   - Tap on a pickupable object
   - Object becomes kinematic and follows the camera

2. **Examine**:
   - Tap the "EXAMINE" button while holding an object
   - Swipe to rotate the object
   - Tap "CANCEL" to exit examine mode

3. **Throw**:
   - While holding an object, press and hold the "GRAB/THROW" button
   - Charging animation shows throw power
   - Release to throw with velocity based on charge time

4. **Drop**:
   - Double-tap while holding an object

### Look Mode Toggle

Mobile devices with gyroscope support can switch between swipe and gyroscope modes:

```javascript
const LookModeManager = {
  currentMode: 'swipe',
  gyroEnabled: false,
  
  init() {
    // Initialize look mode from localStorage or default to swipe
    // Create toggle button
  },
  
  setMode(mode) {
    // Switch between 'swipe' and 'gyro' modes
  }
}
```

## VR Interactions

### Movement Controls

- **Thumbstick/Trackpad**: Move in the direction indicated
- **Teleportation**: If supported by the scene

### Hand Tracking

The application uses the `handy-controls` component for hand tracking:

```html
<a-entity
  material="color:gold;metalness:1;roughness:0;"
  handy-controls="materialOverride:right;">
  <!-- Hand tracking elements -->
</a-entity>
```

### Object Interaction

1. **Pickup**:
   - Reach for an object with your hand
   - Squeeze the controller trigger or make a grab gesture
   - Object attaches to your hand

2. **Examine**:
   - While holding an object, use specific gestures or button combinations
   - Object can be rotated and examined closely

3. **Throw**:
   - While holding an object, make a throwing motion
   - Release the trigger or open your hand
   - Object is thrown with velocity based on hand movement

4. **Magnet Interaction**:
   Objects have magnetic interaction points defined with:

   ```html
   <a-entity
     id="object-handle"
     data-magnet-range="0.2,0.1,360,180"
     data-pick-up="parent"
     class="magnet-left magnet-right">
   </a-entity>
   ```

## Interaction States

The `desktop-and-mobile-controls` component manages interaction states:

- **idle**: No object is being held
- **holding**: An object is being held
- **charging**: Preparing to throw an object
- **inspecting**: Examining an object closely

State transitions are handled in the component's methods:

```javascript
// State transition examples
pickupObject() {
  // idle -> holding
}

toggleInspectionMode() {
  // holding <-> inspecting
}

releaseObject() {
  // holding/charging -> idle
}
```

## Cursor and Visual Feedback

The application provides visual feedback for interactions:

- **Cursor**: Changes color based on interaction state
  - Green: idle/holding
  - Yellow/Red: charging (color intensity indicates charge level)
  - Red: inspecting

- **Object Highlighting**: Objects change color when hovered over (using the `navigate-on-click` component)

## Permission Handling

For features requiring device permissions (like gyroscope):

```javascript
async requestGyroPermission() {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    } catch (error) {
      return false;
    }
  }
  return true;
}
```

If permission is denied, a permission overlay is shown:

```javascript
showPermissionDenied() {
  const overlay = document.createElement('div');
  overlay.className = 'permission-overlay';
  // Show permission request explanation
}
```

## Physics Interaction

The application uses PhysX for physics-based interactions:

- Objects have physics bodies with different types:
  - **static**: Non-moving objects like walls and furniture
  - **dynamic**: Objects that can be moved and affected by physics
  - **kinematic**: Objects controlled by the user (when held)

- When picking up objects, their physics state changes:
  ```javascript
  // Store original state
  this._originalPhysicsState = AFRAME.utils.extend({}, currentBody);
  
  // Remove existing body and create kinematic one
  el.removeAttribute('physx-body');
  el.setAttribute('physx-body', 'type', 'kinematic');
  ```

- When releasing objects, they return to dynamic state:
  ```javascript
  // Recreate dynamic body
  previousHeldObject.removeAttribute('physx-body');
  previousHeldObject.setAttribute('physx-body', originalDynamicState);
  
  // Apply velocity for throwing
  if (velocity) {
    rigidBody.setLinearVelocity(plainVelocity, true);
  }
  ```
