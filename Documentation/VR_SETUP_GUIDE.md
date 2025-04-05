# VR Scene Setup Guide
## Setting up a VR scene with working controllers, navigation, and magnet-based grabbing

### Prerequisites
- A-Frame 1.7.0 or later
- PhysX physics system
- The following components:
  - `handy-controls`
  - `universal-object-interaction`
  - `toggle-physics`
  - `physics-optimizer`
  - `performance-monitor`

### 1. Basic Scene Setup
```html
<a-scene physics="driver: physx; gravity: 0 -9.8 0; maxSubSteps: 1; fixedTimeStep: 1/30;">
  <!-- Camera Rig -->
  <a-entity id="cameraRig" position="0 1.6 0">
    <a-entity id="head" camera position="0 0 0"></a-entity>
  </a-entity>

  <!-- Movement Controls -->
  <a-entity id="cameraRig" movement-controls="speed: 0.1; controls: keyboard, touch, gamepad;"></a-entity>
</a-scene>
```

### 2. Controller Setup
```html
<!-- Left Hand -->
<a-entity id="leftHand" 
    oculus-touch-controls="hand: left; handModelStyle: none;"
    universal-object-interaction="pickupDistance: 5; dropDistance: 10;"
    handy-controls="hand: left; handModelStyle: lowPoly; handColor: #ff0000;">
</a-entity>

<!-- Right Hand -->
<a-entity id="rightHand" 
    oculus-touch-controls="hand: right; handModelStyle: none;"
    universal-object-interaction="pickupDistance: 5; dropDistance: 10;"
    handy-controls="hand: right; handModelStyle: lowPoly; handColor: #00ff00;">
</a-entity>
```

### 3. Magnet System Setup
```html
<a-entity
  handy-controls="right:#right-gltf; left:#left-gltf; materialOverride:right;"
  material="color:gold;metalness:1;roughness:0;"
>
  <!-- Left Magnet -->
  <a-entity
    id="left-magnet"
    data-left="grip"
    data-magnet="magnet-left"
    grab-magnet-target="startEvents:squeezestart,pose_fist;stopEvents:pose_flat_fuseShort,squeezeend;noMagnetEl:#left-no-magnet;"
  ></a-entity>

  <!-- Right Magnet -->
  <a-entity
    id="right-magnet"
    data-right="grip"
    data-magnet="magnet-right"
    grab-magnet-target="startEvents:squeezestart,pose_fist;stopEvents:pose_flat_fuseShort,squeezeend;noMagnetEl:#right-no-magnet;"
  ></a-entity>

  <!-- No-magnet entities for UI/constraints -->
  <a-entity id="left-no-magnet" data-left="grip" data-no-magnet></a-entity>
  <a-entity id="right-no-magnet" data-right="grip" data-no-magnet></a-entity>

  <!-- Physics interaction points -->
  <a-sphere data-right="index-finger-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-right="middle-finger-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-right="ring-finger-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-right="pinky-finger-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-right="thumb-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-left="index-finger-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-left="middle-finger-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-left="ring-finger-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-left="pinky-finger-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
  <a-sphere data-left="thumb-tip" radius="0.004" visible="false" physx-body="type: kinematic;"></a-sphere>
</a-entity>
```

### 4. Making Objects Grabbable
To make an object grabbable, add the following attributes:
```html
<a-box
  position="0 1.6 -3"
  color="#4CC3D9"
  physx-body="type: dynamic; mass: 1;"
  grab-magnet-target="startEvents:squeezestart,pose_fist;stopEvents:pose_flat_fuseShort,squeezeend;"
  toggle-physics
></a-box>
```

### 5. Required Components
Add these components to your `main.js`:

```javascript
// Toggle Physics Component
AFRAME.registerComponent("toggle-physics", {
  init: function() {
    this.isGrabbing = false;
    this.grabbedObject = null;
    this.originalParent = null;
    this.originalPosition = new THREE.Vector3();
    this.originalRotation = new THREE.Euler();
    this.originalScale = new THREE.Vector3();
    this.raycaster = null;
    this.raycastTarget = null;
    
    // Initialize raycaster after scene is loaded
    this.el.sceneEl.addEventListener('loaded', () => {
      this.raycastTarget = document.querySelector(this.data.raycastTarget);
      if (this.raycastTarget) {
        this.raycaster = this.raycastTarget.components.raycaster;
      }
    });
  },

  // ... rest of the component code from main.js
});

// Physics Optimizer Component
AFRAME.registerComponent("physics-optimizer", {
  init: function() {
    // Wait for physics system to be ready
    this.el.sceneEl.addEventListener('physics-init', () => {
      const physics = this.el.sceneEl.systems.physics;
      // Reduce physics update rate to 30Hz
      physics.setFixedTimeStep(1/30);
      physics.setMaxSubSteps(1);
    });
  }
});
```

### 6. Required Scripts
Add these scripts to your HTML:
```html
<script src="https://aframe.io/releases/1.7.0/aframe.min.js"></script>
<script src="https://unpkg.com/aframe-physics-system@4.0.1/dist/aframe-physics-system.min.js"></script>
<script src="https://unpkg.com/aframe-handy-controls@0.5.0/dist/aframe-handy-controls.min.js"></script>
<script src="main.js"></script>
```

### 7. Important Notes
1. The magnet system requires specific event names:
   - Start events: `squeezestart,pose_fist`
   - Stop events: `pose_flat_fuseShort,squeezeend`

2. Physics bodies must be set to:
   - `type: dynamic` for grabbable objects
   - `type: kinematic` for the finger tip spheres

3. The `toggle-physics` component handles:
   - Switching physics state during grab/release
   - Maintaining object position/rotation during grabs
   - Proper cleanup on release

4. The `physics-optimizer` component:
   - Reduces physics update rate to 30Hz
   - Limits physics sub-steps
   - Improves performance on standalone VR devices

### 8. Testing Checklist
1. Verify controllers are visible
2. Check thumbstick movement works
3. Test grabbing objects with trigger buttons
4. Verify physics behavior during grabs
5. Check object release behavior
6. Monitor performance on target device

### 9. Common Issues
1. If objects don't grab:
   - Check `grab-magnet-target` events are correct
   - Verify physics body type is "dynamic"
   - Ensure `toggle-physics` component is present

2. If movement doesn't work:
   - Verify `movement-controls` is on the camera rig
   - Check `oculus-touch-controls` is properly configured

3. If performance is poor:
   - Enable the physics optimizer
   - Check physics update rate
   - Monitor frame rate with performance monitor 