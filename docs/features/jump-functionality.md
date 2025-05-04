# Jump Functionality Documentation

This document describes the jump functionality implementation in the VRMOBDESK application, including support for keyboard, Oculus VR controllers, and mobile devices.

## Overview

The jump functionality allows users to navigate vertical obstacles in the virtual environment. It's implemented through the `JumpControl` component which handles:

- Jump physics and animations
- Input detection from multiple sources (keyboard, VR controllers, mobile)
- Collision detection during jumps
- Safe landing mechanics

## Input Methods

### Keyboard

Users can trigger a jump by pressing the spacebar key on desktop devices.

```javascript
onKeyDown: function (event) {
  // Jump when spacebar is pressed
  if (event.code === 'Space' || event.keyCode === 32) {
    this.jump();
  }
}
```

### VR Controllers (Oculus)

In VR mode, users can jump using any of the following controller buttons:
- A button
- B button
- X button
- Y button
- Grip button
- Thumbstick press

```javascript
onControllerButtonDown: function (event) {
  // Only process if in VR mode
  if (!DeviceManager.isVR) return;
  
  // Trigger jump on button press
  this.jump();
}
```

### Mobile Devices

On mobile devices, a dedicated jump button appears in the bottom-right corner of the screen.

```javascript
createJumpButton: function () {
  // Create and style jump button
  const jumpButton = document.createElement('button');
  jumpButton.id = 'jumpBtn';
  jumpButton.className = 'jump-btn';
  jumpButton.innerHTML = '↑ JUMP ↑';
  
  // Style the button
  // ...
  
  // Add event listeners for jumping
  ['mousedown', 'touchstart'].forEach(eventType => {
    jumpButton.addEventListener(eventType, (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.jump();
    }, { passive: false, capture: true });
  });
}
```

## Jump Mechanics

### Physics-Based Approach

The jump uses a combination of animation-based movement for the upward phase and physics-based falling for the downward phase:

1. **Upward Phase**: Uses A-Frame animation with easing
2. **Peak**: Transitions to physics-based falling
3. **Falling Phase**: Uses gravity and velocity calculations
4. **Landing**: Detects ground using raycasting

### State Machine

The jump functionality implements a simple state machine:

```
[READY] ---(jump trigger)---> [JUMPING_UP]
   ^                               |
   |                               | (peak reached)
   |                               v
[LANDED] <---(ground detected)--- [FALLING]
```

States are tracked through boolean flags:
- `isJumping`: Whether the player is currently in a jump
- `isFalling`: Whether the player is in the falling phase
- `canJump`: Whether the player is allowed to jump (cooldown control)

## Safety Mechanisms

Several safety mechanisms prevent common VR movement issues:

1. **Collision Detection**: Prevents jumping through walls
2. **Safe Landing**: Ensures player lands on valid surfaces
3. **Timeout Recovery**: Forces jump completion if stuck
4. **Post-Landing Collision Check**: Prevents clipping into walls after landing

## Integration with Other Systems

The jump functionality integrates with:

1. **NavMesh System**: Temporarily disables navmesh constraints during jumps
2. **Physics System**: Handles collisions during jumps
3. **Device Manager**: Adapts behavior based on device type

## UML Sequence Diagram

```
┌─────────┐          ┌────────────┐          ┌──────────────┐          ┌───────────┐
│  Input  │          │ JumpControl│          │JumpCollider   │          │  NavMesh  │
└────┬────┘          └─────┬──────┘          └──────┬───────┘          └─────┬─────┘
     │    triggerJump()    │                        │                        │
     │───────────────────>│                        │                        │
     │                     │                        │                        │
     │                     │ disableNavmesh()       │                        │
     │                     │────────────────────────┼───────────────────────>│
     │                     │                        │                        │
     │                     │ startJumpAnimation()   │                        │
     │                     │─────────────┐          │                        │
     │                     │             │          │                        │
     │                     │<────────────┘          │                        │
     │                     │                        │                        │
     │                     │ onAnimationComplete()  │                        │
     │                     │─────────────┐          │                        │
     │                     │             │          │                        │
     │                     │<────────────┘          │                        │
     │                     │                        │                        │
     │                     │ startFalling()         │                        │
     │                     │─────────────┐          │                        │
     │                     │             │          │                        │
     │                     │<────────────┘          │                        │
     │                     │                        │                        │
     │                     │ checkCollisions()      │                        │
     │                     │───────────────────────>│                        │
     │                     │                        │                        │
     │                     │      collisionResult   │                        │
     │                     │<───────────────────────│                        │
     │                     │                        │                        │
     │                     │ detectGround()         │                        │
     │                     │─────────────┐          │                        │
     │                     │             │          │                        │
     │                     │<────────────┘          │                        │
     │                     │                        │                        │
     │                     │ resetJump()            │                        │
     │                     │─────────────┐          │                        │
     │                     │             │          │                        │
     │                     │<────────────┘          │                        │
     │                     │                        │                        │
     │                     │ enableNavmesh()        │                        │
     │                     │────────────────────────┼───────────────────────>│
     │                     │                        │                        │
┌────┴────┐          ┌─────┴──────┐          ┌──────┴───────┐          ┌─────┴─────┐
│  Input  │          │ JumpControl│          │JumpCollider   │          │  NavMesh  │
└─────────┘          └────────────┘          └──────────────┘          └───────────┘
```

## Configuration Options

The JumpControl component can be configured with the following properties:

```javascript
schema: {
  height: { type: 'number', default: 1.5 },      // Maximum jump height
  distance: { type: 'number', default: 2 },      // Maximum horizontal distance
  cooldown: { type: 'number', default: 1000 },   // Cooldown between jumps (ms)
  upDuration: { type: 'number', default: 300 },  // Duration of upward phase (ms)
  downDuration: { type: 'number', default: 500 }, // Duration of falling phase (ms)
  respectNavmesh: { type: 'boolean', default: true } // Whether to respect navmesh
}
```

## Usage Example

To add jump functionality to an entity:

```html
<a-entity
  id="player"
  movement-controls
  jump-control="height: 1.5; cooldown: 800"
  jump-collider>
</a-entity>
```
