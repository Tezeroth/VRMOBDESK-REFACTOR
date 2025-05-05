# JUMPTECH - A-Frame Jump Implementation

This document explains the technical implementation of the jumping mechanism in our A-Frame application.

## Overview

We implemented a reliable jumping system using A-Frame's animation system rather than physics. This approach provides predictable jumping behavior while maintaining compatibility with existing movement and navmesh systems.

## Key Components

### 1. Animation-Based Approach

Instead of using physics for vertical movement, we leverage A-Frame's animation system:

```javascript
// Up animation (rising phase)
this.el.setAttribute('animation__up', {
  property: 'object3D.position.y',  // Directly animate Y position
  from: this.startY,                // Start from ground level
  to: this.maxY,                    // Jump to maximum height
  dur: 400,                         // 400ms duration
  easing: 'easeOutQuad',            // Slow down as we reach the top
  autoplay: true                    // Start immediately
});
```

This approach gives us precise control over the jump trajectory without the unpredictability of physics simulations.

### 2. Two-Phase Animation Sequence

The jump is split into two distinct phases:
- **Rising Phase**: Moving upward with easeOutQuad easing (slows down at the top)
- **Falling Phase**: Moving downward with easeInQuad easing (accelerates toward the ground)

These phases are sequenced using animation completion events:

```javascript
// Listen for completion of up animation
this.el.addEventListener('animationcomplete__up', () => {
  // Start down animation when up animation completes
  this.el.setAttribute('animation__down', {
    property: 'object3D.position.y',
    from: currentPos.y,
    to: this.startY,
    dur: 300,
    easing: 'easeInQuad',
    autoplay: true
  });
});
```

### 3. Navmesh Integration

To prevent conflicts with the navmesh constraint system:
1. Temporarily disable the constraint during jumps
2. Update the constraint's yVelocity during the jump
3. Re-enable the constraint when landing

```javascript
// Disable constraint during jump
this.el.setAttribute('simple-navmesh-constraint', 'enabled', false);

// Re-enable when landing
this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
```

### 4. Momentum Preservation

Store the player's horizontal momentum at the start of the jump and reapply it during the falling phase:

```javascript
// Store momentum at jump start
this.jumpMomentum = { 
  x: movementControls.velocity.x, 
  z: movementControls.velocity.z 
};

// Apply momentum during fall
movementControls.velocity.x = this.jumpMomentum.x;
movementControls.velocity.z = this.jumpMomentum.z;
```

### 5. Safety Mechanisms

Multiple safety features ensure the jump always completes:
- Global timeout to force jump end after 3 seconds
- Detection of early landing
- Checks for getting stuck at the apex

## Angular Velocity for Object Throwing

For realistic object throwing, especially during jumps, we track the camera's angular velocity:

### 1. Track Camera Rotation

```javascript
// In init()
this.lastCameraRotation = new THREE.Euler();
this.cameraAngularVelocity = new THREE.Vector3();

// In tick()
const camera = this.camera.object3D;
const currentRotation = camera.rotation.clone();
this.cameraAngularVelocity.set(
  (currentRotation.x - this.lastCameraRotation.x) / dt,
  (currentRotation.y - this.lastCameraRotation.y) / dt,
  (currentRotation.z - this.lastCameraRotation.z) / dt
);
this.lastCameraRotation.copy(currentRotation);
```

### 2. Apply Angular Velocity to Thrown Objects

When throwing an object, apply both linear and angular velocity:

```javascript
throwObject: function(object) {
  // Get camera direction
  const cameraDirection = new THREE.Vector3(0, 0, -1);
  this.camera.object3D.getWorldDirection(cameraDirection);
  
  // Apply linear velocity based on camera direction and throw strength
  const throwVelocity = cameraDirection.multiplyScalar(this.throwStrength);
  
  // Add upward component if jumping
  if (this.isJumping) {
    throwVelocity.y += this.jumpVelocity * 0.5; // Add partial jump velocity
  }
  
  // Apply angular velocity based on camera rotation
  const angularImpulse = this.cameraAngularVelocity.clone().multiplyScalar(5);
  
  // Apply velocities to the object's physics body
  const physicsBody = object.components['physx-body'].body;
  physicsBody.setLinearVelocity(throwVelocity);
  physicsBody.setAngularVelocity(angularImpulse);
}
```

## Technical Challenges and Solutions

### Challenge 1: Physics vs. Animation

**Problem**: Physics-based jumping was unreliable, often getting stuck at the apex.

**Solution**: Used A-Frame's animation system for vertical movement, which provides precise control over the jump trajectory.

### Challenge 2: Navmesh Constraints

**Problem**: The navmesh constraint prevented vertical movement.

**Solution**: Temporarily disable the constraint during jumps and re-enable it when landing.

### Challenge 3: Position Reset

**Problem**: Jump sometimes reset the player to world origin (0,0,0).

**Solution**: Carefully preserve X and Z coordinates during the jump, only modifying the Y coordinate.

### Challenge 4: Momentum Preservation

**Problem**: Player lost momentum when jumping.

**Solution**: Store momentum at jump start and reapply it during the falling phase.

## Future Improvements

1. **Raycast Ground Detection**: Implement proper ground detection using raycasting instead of simple position checks.

2. **Variable Jump Height**: Allow for variable jump heights based on how long the jump button is pressed.

3. **Jump Animations**: Add camera bob or other visual feedback to enhance the jump feel.

4. **Surface-Based Jump Sound**: Play different jump/land sounds based on the surface material.

5. **Enhanced Angular Velocity**: Improve the angular velocity calculation for more realistic object throwing.
