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
    handy-controls="hand: right; handModelStyle: lowPoly; handColor: #0000ff;">
</a-entity>
```

### 3. Magnet-Based Grabbing
```html
<!-- Grabbable Object -->
<a-entity
  id="grabbable-cube"
  geometry="primitive: box; width: 0.2; height: 0.2; depth: 0.2;"
  material="color: #ff0000;"
  position="0 1 -1"
  physx-body="type: dynamic; mass: 1; shape: box;"
  toggle-physics>
  
  <!-- Magnet Point -->
  <a-entity
    id="magnet-point"
    class="magnet-left magnet-right"
    data-magnet-range="0.2,0.1,360,180"
    data-pick-up="parent"
    position="0 0 0">
  </a-entity>
</a-entity>
```

### 4. Physics Optimization
```html
<a-entity physics-optimizer></a-entity>
```

### 5. Performance Monitoring
```html
<a-entity performance-monitor="visible: true; position: 0 0.1 -0.5;"></a-entity>
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

3. The `data-magnet-range` attribute format is:
   - First value: Radial range (horizontal distance)
   - Second value: Vertical range (height)
   - Third value: Horizontal angle range (in degrees)
   - Fourth value: Vertical angle range (in degrees)

4. The `data-pick-up` attribute should be set to:
   - `parent` to pick up the parent entity
   - `self` to pick up only the magnet point entity

5. For optimal performance:
   - Use simple collision shapes
   - Limit the number of dynamic physics bodies
   - Use the physics-optimizer component
   - Monitor performance with the performance-monitor component
