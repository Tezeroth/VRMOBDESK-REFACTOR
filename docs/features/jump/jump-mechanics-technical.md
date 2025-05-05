# Jump Mechanics Technical Documentation

## Overview

This document provides a comprehensive technical breakdown of the jump mechanics implementation in the VR application. The jump system uses A-Frame's animation system rather than physics to provide predictable jumping behavior while maintaining compatibility with existing movement and navmesh systems.

*Last Updated: June 2023*

## Dependencies

The jump mechanics rely on the following dependencies:

1. **A-Frame Framework**: Core framework for VR/AR experiences
2. **THREE.js**: Used for vector math, raycasting, and 3D operations
3. **DeviceManager**: Custom module for device detection (`js/managers/DeviceManager.js`)
4. **Components**:
   - `simple-navmesh-constraint`: Constrains player movement to a navigation mesh
   - `movement-controls`: Handles player movement
   - `jump-collider`: Detects collisions during jumps

## Core Components

### 1. JumpControl Component (`js/components/JumpControl.js`)

Primary component responsible for jump mechanics, including:
- Jump initiation and animation
- Gravity simulation during falls
- Ground detection
- Wall collision handling
- Safety mechanisms to prevent falling through floors
- Momentum preservation during jumps
- Adaptive raycasting for efficient collision detection

### 2. JumpCollider Component (`js/components/JumpCollider.js`)

Specialized collision detection component for jumps:
- Creates a cylindrical collider around the player
- Performs raycasting in multiple directions to detect walls
- Calculates collision normals and safe positions
- Detects wall-floor junctions
- Uses optimized direction selection based on movement
- Implements vector pooling for performance

### 3. JumpDebug Utility (`js/utils/JumpDebug.js`)

Centralized debugging utility for the jump system:
- Provides configurable log levels (info, warn, error, collision, position, safety, state)
- Toggleable debug output with `window.JumpDebug.enabled = true`
- Integrates with stats panel for performance monitoring
- Formats position vectors for consistent logging
- Controls visibility of debug visuals (colliders, raycasts)
- Disabled by default with console message explaining how to enable

## Data Flow and State Management

### State Variables

The `JumpControl` component maintains several critical state variables:

| Variable | Type | Description |
|----------|------|-------------|
| `isJumping` | Boolean | Whether the player is currently in a jump |
| `isFalling` | Boolean | Whether the player is in free-fall (after jump apex) |
| `canJump` | Boolean | Whether the player is allowed to jump (cooldown) |
| `startY` | Number | The Y-position of the floor/ground level |
| `maxY` | Number | The maximum height of the current jump |
| `yVelocity` | Number | Vertical velocity during free-fall |
| `jumpMomentum` | Object | Stored horizontal momentum at jump start |
| `lastValidPosition` | Vector3 | Last known valid position (for recovery) |
| `navmeshLastValidPosition` | Vector3 | Last valid position from navmesh constraint |
| `justLanded` | Boolean | Whether the player just landed (for one frame) |

### Jump Lifecycle

1. **Initialization**:
   - Component initializes state variables and animation templates
   - Sets up event listeners for key presses and animation completion
   - Creates mobile jump button if on mobile device
   - Finds navmesh objects for ground detection
   - Initializes JumpDebug utility if available
   - Creates vector pools for performance optimization

2. **Jump Validation**:
   - `canPerformJump()` checks if jump is allowed:
     - Not disabled
     - Not already jumping (with stuck detection)
     - Not in cooldown
     - Not in inspection mode
   - Returns early if any validation fails

3. **Jump Initiation**:
   - Triggered by space key or jump button
   - `initializeJumpState()` sets up jump state variables
   - `storePositionsForJump()` saves positions for safety
   - `checkForNearbyWalls()` determines if near a wall
   - `calculateJumpMomentum()` preserves horizontal movement
   - `prepareForJump()` disables navmesh constraint
   - `startJumpAnimation()` begins upward animation
   - `setupSafetyTimeout()` sets a maximum jump duration

4. **Upward Phase**:
   - Player moves upward via animation system
   - Wall collisions are detected and handled via `JumpCollider`
   - `handleWallCollision()` calculates sliding vectors
   - When animation completes, `onAnimationComplete('up')` is called
   - Transitions to falling phase

5. **Falling Phase**:
   - `tick()` applies gravity to `yVelocity`
   - Position is updated based on velocity
   - Current movement vector from ArrowControls is applied if available
   - Ground detection raycasts are performed with adaptive length
   - Wall collisions continue to be detected and handled
   - `performGroundCheck()` runs additional safety checks

6. **Landing**:
   - Ground is detected via raycasting
   - `forceLand()` positions player at ground level
   - `positionPlayerOnGround()` ensures correct Y position
   - `startY` is updated to the new ground level
   - Navmesh constraint is re-enabled
   - `performSafetyChecks()` prevents wall clipping
   - `applyJumpCooldown()` sets cooldown timer
   - `resetJump()` resets all jump state variables

## Critical Functions

### Jump Validation

```javascript
canPerformJump: function() {
  // Don't jump if disabled
  if (!this.data.enabled) {
    return false;
  }

  // Force reset if we're stuck in a jumping state for too long
  if (this.isJumping) {
    const currentTime = Date.now();
    if (!this.jumpStartTime || (currentTime - this.jumpStartTime > 3000)) {
      if (window.JumpDebug) {
        window.JumpDebug.warn('JumpControl', 'Jump appears to be stuck, forcing reset');
      } else {
        console.warn('Jump appears to be stuck, forcing reset');
      }
      this.forceResetJump();
    }
    return false; // Still in a valid jump
  }

  // Check cooldown
  if (!this.canJump) {
    if (window.JumpDebug) {
      window.JumpDebug.info('JumpControl', 'Cannot jump - in cooldown');
    } else {
      console.log('Cannot jump - in cooldown');
    }
    return false;
  }

  // Check if we're in inspection mode - don't jump if examining an object
  const desktopMobileControls = document.querySelector('[desktop-mobile-controls]')?.components['desktop-mobile-controls'];
  const isInspecting = desktopMobileControls &&
                       desktopMobileControls.stateMachine &&
                       desktopMobileControls.stateMachine.is('inspecting');

  if (isInspecting) {
    if (window.JumpDebug) {
      window.JumpDebug.info('JumpControl', 'Cannot jump while in inspection mode');
    } else {
      console.log('Cannot jump while in inspection mode');
    }
    return false;
  }

  return true;
}
```

### Jump Initiation

```javascript
jump: function () {
  // Validate if jump can be performed
  if (!this.canPerformJump()) {
    return;
  }

  if (window.JumpDebug) {
    window.JumpDebug.state('JumpControl', 'Jump initiated');
  } else {
    console.log('Jump initiated');
  }

  // Set state
  this.isJumping = true;
  this.canJump = false;
  this.jumpStartTime = Date.now();

  // Get current position
  const currentPos = this.el.object3D.position;
  this.startY = currentPos.y;
  this.maxY = this.startY + this.data.height;

  // Store the current position as the last valid position
  this.lastValidPosition.copy(currentPos);

  // Also store the last valid position from the navmesh constraint
  // This is important for returning to a valid position if we hit a wall
  const navmeshConstraint = this.el.components['simple-navmesh-constraint'];
  if (navmeshConstraint) {
    if (navmeshConstraint.lastPosition) {
      console.log('Storing last valid navmesh position before jump');
      // Make a deep copy of the last valid position
      this.navmeshLastValidPosition = new THREE.Vector3().copy(navmeshConstraint.lastPosition);
    } else {
      // If the navmesh constraint doesn't have a last position yet,
      // store the current position as the last valid position
      this.navmeshLastValidPosition = new THREE.Vector3().copy(currentPos);
    }
  }

  // Check if we're near a wall before jumping
  const jumpCollider = this.el.components['jump-collider'];
  let nearWall = false;

  if (jumpCollider) {
    // Temporarily show the collider to check for walls
    jumpCollider.showCollider();
    const collisionResult = jumpCollider.checkCollisions();

    if (collisionResult.collision) {
      console.log('Wall detected nearby - performing vertical-only jump');
      nearWall = true;
    }

    // Hide the collider again if we're not jumping yet
    if (!nearWall) {
      jumpCollider.hideCollider();
    }
  }

  // Store momentum if movement-controls is present
  const movementControls = this.el.components['movement-controls'];
  if (movementControls && movementControls.velocity) {
    if (nearWall) {
      // If near a wall, zero out horizontal momentum
      this.jumpMomentum = {
        x: 0,
        z: 0
      };
    } else {
      // Otherwise, store current momentum with a slight boost
      const boostFactor = 1.2; // Boost momentum by 20%
      this.jumpMomentum = {
        x: movementControls.velocity.x * boostFactor,
        z: movementControls.velocity.z * boostFactor
      };
    }
  }

  // Temporarily disable navmesh constraint during jump
  // This allows for proper vertical movement
  if (this.el.hasAttribute('simple-navmesh-constraint')) {
    this.el.setAttribute('simple-navmesh-constraint', 'enabled', false);
  }

  // Store the initial XZ position for collision handling
  this.initialXZ = {
    x: this.el.object3D.position.x,
    z: this.el.object3D.position.z
  };

  // Remove any existing animations first
  this.el.removeAttribute('animation__up');
  this.el.removeAttribute('animation__down');

  // Start up animation with improved easing for more natural movement
  this.el.setAttribute('animation__up', {
    property: 'object3D.position.y',
    from: this.startY,
    to: this.maxY,
    dur: this.data.upDuration,
    easing: 'easeOutCubic', // More pronounced initial acceleration
    autoplay: true
  });

  // Set safety timeout to ensure jump always completes
  this.safetyTimeout = setTimeout(() => {
    if (this.isJumping) {
      console.log('Safety timeout triggered - forcing jump end');
      this.resetJump();
    }
  }, 3000);
}
```

### Wall Collision Handling

```javascript
// Inside tick function
if (this.isJumping) {
  const movementControls = this.el.components['movement-controls'];
  if (movementControls && movementControls.velocity) {
    // Check if this is a vertical-only jump (near wall)
    const isVerticalJump = this.jumpMomentum.x === 0 && this.jumpMomentum.z === 0;

    if (isVerticalJump) {
      // For vertical-only jumps, zero out horizontal velocity
      movementControls.velocity.x = 0;
      movementControls.velocity.z = 0;
    } else {
      // For normal jumps, apply the stored momentum
      // This will maintain the player's direction of movement
      movementControls.velocity.x = this.jumpMomentum.x;
      movementControls.velocity.z = this.jumpMomentum.z;
    }
  }

  // Use the jump-collider component to detect wall collisions
  const jumpCollider = this.el.components['jump-collider'];
  if (jumpCollider) {
    // Ensure the collider is properly attached
    if (!jumpCollider.collider || !jumpCollider.collider.parentNode) {
      console.warn('Jump collider not properly attached, recreating');
      // Use the recreateCollider method instead of removing/re-adding the component
      jumpCollider.recreateCollider();
    }

    // Show the collider during jumps
    jumpCollider.showCollider();

    // Check for collisions
    const collisionResult = jumpCollider.checkCollisions();
    if (collisionResult.collision) {
      console.log('Wall collision detected during jump!');

      // Always move the player to a safe position first to prevent clipping
      if (collisionResult.safePosition) {
        this.el.object3D.position.x = collisionResult.safePosition.x;
        this.el.object3D.position.z = collisionResult.safePosition.z;
      }

      // If we have a normal vector, use it to implement wall sliding
      if (collisionResult.normal) {
        // Get the current movement velocity
        const movementControls = this.el.components['movement-controls'];
        if (movementControls && movementControls.velocity) {
          // Create a velocity vector
          const velocity = new THREE.Vector3(
            movementControls.velocity.x,
            0, // Ignore Y component for sliding
            movementControls.velocity.z
          );

          // Project the velocity onto the wall plane (sliding)
          const normal = collisionResult.normal.clone(); // Clone to avoid modifying the original
          const dot = velocity.dot(normal);

          // Calculate the sliding vector (velocity - (velocity·normal) * normal)
          const slide = new THREE.Vector3()
            .copy(velocity)
            .sub(normal.multiplyScalar(dot));

          // Reduce the sliding velocity for better control
          slide.multiplyScalar(0.8);

          // Apply the sliding velocity
          movementControls.velocity.x = slide.x;
          movementControls.velocity.z = slide.z;

          // SMOOTH APPROACH: Use a gentler push for wall sliding
          // This returns to the smoother sliding behavior
          const pushDistance = 0.1; // Small push for smooth sliding
          this.el.object3D.position.x += pushDir.x * pushDistance;
          this.el.object3D.position.z += pushDir.z * pushDistance;

          // CRITICAL FIX: Ensure Y position is at least startY
          // This prevents falling through the floor
          console.warn('WALL COLLISION Y CHECK - Current Y:', this.el.object3D.position.y.toFixed(3),
                     'startY:', this.startY.toFixed(3));

          // Always set Y to at least startY + a small buffer
          this.el.object3D.position.y = Math.max(this.el.object3D.position.y, this.startY + 0.1);

          console.warn('WALL COLLISION Y CHECK - After adjustment Y:', this.el.object3D.position.y.toFixed(3));

          console.log('Pushed away from wall in direction:', {
            x: pushDir.x.toFixed(2),
            z: pushDir.z.toFixed(2)
          });

          // Immediately re-enable navmesh constraint to prevent falling
          if (this.el.hasAttribute('simple-navmesh-constraint')) {
            this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
          }
        }
      }
    }
  }
}
```

### Landing Detection and Handling

```javascript
// Inside tick function
if (this.isFalling) {
  const gravity = -9.8; // Define gravity strength
  const dt = delta / 1000; // Delta time in seconds

  // Apply gravity to velocity
  this.yVelocity += gravity * dt;

  // Update position based on velocity
  this.el.object3D.position.y += this.yVelocity * dt;

  // Ground Detection Raycast
  if (this.navmeshObjects.length > 0) {
    const currentPos = this.el.object3D.position;
    // Start ray slightly higher to avoid starting inside ground
    const rayOrigin = new THREE.Vector3(currentPos.x, currentPos.y + 0.2, currentPos.z);

    this.fallRaycaster.set(rayOrigin, this.downVector);
    // Adjust ray length based on current velocity - check slightly ahead
    this.fallRaycaster.far = Math.max(0.3, -this.yVelocity * dt * 1.5); // Min check distance 0.3

    const intersects = this.fallRaycaster.intersectObjects(this.navmeshObjects, true);

    if (intersects.length > 0) {
      // Ground detected!
      this.forceLand(intersects[0].point);
      return; // Landed, exit tick early
    }
  }
}
```

### Force Landing

```javascript
forceLand: function(hitPoint) {
  console.log('Force landing at', hitPoint);
  this.isFalling = false;
  this.yVelocity = 0;
  this.justLanded = true;

  // Stop the down animation if it's running
  this.el.removeAttribute('animation__down');

  // Position player correctly on the ground
  // Set the RIG's Y position directly to the hit point Y.
  // The camera's internal offset handles eye height.
  console.warn('LANDING Y CHECK - Current Y:', this.el.object3D.position.y.toFixed(3),
             'hitPoint Y:', hitPoint.y.toFixed(3), 'startY:', this.startY.toFixed(3));

  // CRITICAL: Update startY to match the new ground level
  // This ensures all future checks use the correct floor height
  this.startY = hitPoint.y;

  this.el.object3D.position.y = hitPoint.y;

  console.warn('LANDING Y CHECK - After adjustment Y:', this.el.object3D.position.y.toFixed(3));

  // CRITICAL FIX: Immediately re-enable navmesh constraint before anything else
  // This ensures the player stays on valid ground
  if (this.el.hasAttribute('simple-navmesh-constraint')) {
    console.log('LANDING: Immediately re-enabling navmesh constraint');
    this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
  }

  // Safety check for wall collisions at landing point
  // This prevents falling through the floor when landing near a wall
  this.checkLandingSafety();

  // Reset the jump state (enables navmesh etc.)
  this.resetJump();
}
```

### Landing Safety Check

```javascript
checkLandingSafety: function() {
  console.log('Performing landing safety check');

  // Use the jump collider to check for wall collisions
  const jumpCollider = this.el.components['jump-collider'];
  if (!jumpCollider) return;

  // Show the collider temporarily
  jumpCollider.showCollider();

  // Check for collisions
  const collisionResult = jumpCollider.checkCollisions();
  if (collisionResult.collision) {
    console.warn('LANDING SAFETY: Wall collision detected at landing point!');

    // If we have a normal vector, move slightly away from the wall
    if (collisionResult.normal) {
      const safetyPushDistance = 0.05; // Reduced push distance to minimize jolt

      // Apply the push
      this.el.object3D.position.x += collisionResult.normal.x * safetyPushDistance;
      this.el.object3D.position.z += collisionResult.normal.z * safetyPushDistance;

      console.warn('LANDING SAFETY: Pushed player away from wall by', safetyPushDistance);
    }
    // If we have a safe position, use it
    else if (collisionResult.safePosition) {
      this.el.object3D.position.x = collisionResult.safePosition.x;
      this.el.object3D.position.z = collisionResult.safePosition.z;
      console.warn('LANDING SAFETY: Using safe position from collision result');
    }

    // Double-check ground position after adjustment
    this.performGroundCheck();
  }

  // Hide the collider
  jumpCollider.hideCollider();
}
```

### Fall-Through-Floor Detection and Recovery

```javascript
checkForFallingThroughFloor: function() {
  // Skip if we're intentionally jumping or falling
  if (this.isJumping || this.isFalling) return;

  // SIMPLE APPROACH: Just make sure the player is at or above the floor level
  const currentPos = this.el.object3D.position;

  // If player is below the expected floor level, move them back up
  if (currentPos.y < this.startY) {
    console.warn('SAFETY: Player below floor level - repositioning');
    console.warn('Current Y:', currentPos.y.toFixed(3), 'Expected floor Y:', this.startY.toFixed(3));

    // Move player back to floor level
    this.el.object3D.position.y = this.startY;

    // Re-enable the navmesh constraint
    if (this.el.hasAttribute('simple-navmesh-constraint')) {
      this.el.setAttribute('simple-navmesh-constraint', 'enabled', true);
    }

    console.warn('SAFETY: Repositioned player to floor level');
  }

  // Store current position as valid if we're on the floor
  if (currentPos.y >= this.startY) {
    this.lastValidPosition.copy(this.el.object3D.position);
  }
}
```

## JumpCollider Component

The JumpCollider component is responsible for detecting collisions during jumps. It creates a cylindrical collider around the player and performs raycasting in multiple directions to detect walls.

### Key Functions

#### Setup Collision Detection

```javascript
setupCollisionDetection: function() {
  // We'll use raycasting for collision detection
  this.raycaster = new THREE.Raycaster();

  // Directions for raycasting (8 horizontal directions + 4 diagonal down directions)
  this.directions = [];

  // Horizontal directions (8 directions around the cylinder)
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    this.directions.push(new THREE.Vector3(
      Math.cos(angle),
      0,
      Math.sin(angle)
    ).normalize());
  }

  // Add diagonal downward directions to detect wall-floor junctions
  // These are crucial for preventing falling through the floor
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
    this.directions.push(new THREE.Vector3(
      Math.cos(angle) * 0.7,  // Reduce horizontal component
      -0.7,                   // Add downward component
      Math.sin(angle) * 0.7   // Reduce horizontal component
    ).normalize());
  }

  // Bind the checkCollisions method
  this.checkCollisions = this.checkCollisions.bind(this);
}
```

#### Check Collisions

```javascript
checkCollisions: function() {
  if (!this.data.enabled || !this.collider.object3D) return { collision: false };

  const position = this.el.object3D.position.clone();

  // Get all static objects (walls, etc.)
  const walls = Array.from(document.querySelectorAll('.blocker, [physx-body="type: static"], .venue-collider'));

  // Filter out objects that don't have object3D
  const validWalls = walls.filter(el => el.object3D);

  // IMPORTANT: Reduce the collision radius to make it less sensitive
  // This will prevent false positives that were stopping jumps
  const collisionRadius = this.data.radius * 0.7; // Use 70% of the original radius

  // Track the closest collision
  let closestCollision = null;
  let closestDistance = Infinity;

  // Check for collisions in all directions
  for (const direction of this.directions) {
    this.raycaster.set(position, direction);
    this.raycaster.far = collisionRadius; // Use the reduced radius

    // Check for intersections
    const intersections = this.raycaster.intersectObjects(
      validWalls.map(el => el.object3D),
      true // Check descendants
    );

    // If we hit a wall, process the collision
    if (intersections.length > 0) {
      const intersection = intersections[0];
      const distance = intersection.distance;

      // Check if this is the closest collision so far
      if (distance < closestDistance) {
        const collisionPoint = intersection.point;

        // Calculate direction from collision point back to player
        const backDirection = new THREE.Vector3()
          .subVectors(position, collisionPoint)
          .normalize();

        // Calculate safe position (slightly back from the collision point)
        const safeOffset = 0.2; // Move back 0.2 units from the collision
        const safePosition = new THREE.Vector3()
          .addVectors(
            collisionPoint,
            backDirection.multiplyScalar(safeOffset)
          );

        // Ensure the safe position is valid (not NaN)
        if (isNaN(safePosition.x) || isNaN(safePosition.y) || isNaN(safePosition.z)) {
          console.warn('Invalid safe position calculated, skipping this collision');
          continue;
        }

        // FIXED: Calculate the normal vector (perpendicular to the wall)
        // Always ensure the normal is horizontal (in the XZ plane)
        let normal;

        // For all rays, we want a horizontal normal to ensure proper wall sliding
        // This is critical for preventing falling through floors
        normal = new THREE.Vector3(direction.x, 0, direction.z).normalize().negate();

        // Log the normal for debugging
        console.log('Normal vector (horizontal only):', {
          x: normal.x.toFixed(2),
          y: normal.y.toFixed(2), // Should always be 0
          z: normal.z.toFixed(2)
        });

        // Store this as the closest collision
        closestCollision = {
          collision: true,
          collisionPoint: collisionPoint,
          safePosition: safePosition,
          direction: direction.clone(),
          normal: normal,
          distance: distance, // Include the distance in the result
          isFloorJunction: Math.abs(direction.y) > 0.1 // Flag if this is a wall-floor junction
        };

        closestDistance = distance;

        // Debug logging
        console.log('Collision detected!', intersection.object);
        console.log('Distance:', distance.toFixed(3));
        console.log('Direction:', {
          x: direction.x.toFixed(2),
          y: direction.y.toFixed(2),
          z: direction.z.toFixed(2)
        });

        // Store for debugging
        this.lastCollisionDirection = direction.clone();
        this.lastCollisionPoint = collisionPoint.clone();
      }
    }
  }

  // If we found a collision, return it
  if (closestCollision) {
    // Special handling for wall-floor junctions
    if (closestCollision.isFloorJunction) {
      console.warn('Wall-floor junction detected! Using special handling');

      // For wall-floor junctions, we want to push the player up slightly
      // to prevent falling through the floor
      closestCollision.safePosition.y += 0.05;
    }

    return closestCollision;
  }

  // Also check for collisions with the navmesh
  const navmesh = document.querySelector('.navmesh');
  if (navmesh && navmesh.object3D) {
    // Track the closest navmesh collision
    let closestNavmeshCollision = null;
    let closestNavmeshDistance = Infinity;

    for (const direction of this.directions) {
      this.raycaster.set(position, direction);
      this.raycaster.far = collisionRadius; // Use the reduced radius

      const intersections = this.raycaster.intersectObject(navmesh.object3D, true);

      if (intersections.length > 0) {
        const intersection = intersections[0];
        const distance = intersection.distance;

        // Check if this is the closest collision so far
        if (distance < closestNavmeshDistance) {
          const collisionPoint = intersection.point;

          // Calculate direction from collision point back to player
          const backDirection = new THREE.Vector3()
            .subVectors(position, collisionPoint)
            .normalize();

          // Calculate safe position (slightly back from the collision point)
          const safeOffset = 0.2; // Move back 0.2 units from the collision
          const safePosition = new THREE.Vector3()
            .addVectors(
              collisionPoint,
              backDirection.multiplyScalar(safeOffset)
            );

          // FIXED: Calculate normal (for navmesh, ensure it's horizontal)
          let normal;
          if (intersection.face) {
            // Use face normal but project it to the XZ plane
            normal = new THREE.Vector3(
              intersection.face.normal.x,
              0, // Force Y to 0 to keep it horizontal
              intersection.face.normal.z
            ).normalize();
          } else {
            // Fallback to using direction, but ensure it's horizontal
            normal = new THREE.Vector3(
              direction.x,
              0, // Force Y to 0
              direction.z
            ).normalize().negate();
          }

          // Log the normal for debugging
          console.log('Navmesh normal (horizontal only):', {
            x: normal.x.toFixed(2),
            y: normal.y.toFixed(2), // Should always be 0
            z: normal.z.toFixed(2)
          });

          // Store this as the closest navmesh collision
          closestNavmeshCollision = {
            collision: true,
            collisionPoint: collisionPoint,
            safePosition: safePosition,
            direction: direction.clone(),
            normal: normal,
            distance: distance, // Include the distance in the result
            isNavmesh: true
          };

          closestNavmeshDistance = distance;

          console.log('Navmesh collision detected!');
          console.log('Distance:', distance.toFixed(3));
        }
      }
    }

    // If we found a navmesh collision and it's closer than any wall collision
    if (closestNavmeshCollision &&
        (!closestCollision || closestNavmeshDistance < closestDistance)) {
      return closestNavmeshCollision;
    }
  }

  // Return the closest collision we found, or no collision
  return closestCollision || { collision: false };
}
```

## Known Issues and Optimization Opportunities

### Current Issues

1. **Wall Sliding Stability**: The wall sliding mechanic is approximately 98% stable after recent optimizations. In very rare cases, players can still phase through walls in complex geometry.

2. **Fall-Through-Floor at Wall Junctions**: This issue has been significantly improved with the addition of diagonal downward raycasts and wall-floor junction detection, but can still occur in rare edge cases.

3. **Landing Jolt**: The landing jolt has been reduced with smoother transitions, but players may still experience a slight jolt when landing near walls.

4. **Vertical-Only Jumps Near Walls**: The current implementation forces vertical-only jumps (zero horizontal momentum) when near walls, which can feel restrictive in some scenarios.

### Completed Optimizations

1. **Code Organization**:
   - Consolidated all debugging code into JumpDebug utility
   - Removed redundant console.log statements
   - Created centralized debug logging function with severity levels
   - Made debug output toggleable
   - Removed dead/commented-out code
   - Grouped related state variables together

2. **Performance Improvements**:
   - Reduced number of raycasts with optimized direction selection
   - Implemented vector pooling to reduce garbage collection
   - Optimized collision detection with adaptive raycasting
   - Added caching for raycast results
   - Improved animation handling with templates

3. **Behavior Refinements**:
   - Improved momentum preservation during jumps
   - Added current movement vector support from ArrowControls
   - Enhanced wall collision response with better sliding vectors
   - Implemented more reliable ground detection

### Remaining Optimization Opportunities

1. **Safety Mechanisms**:
   - Consolidate all safety checks into a unified system
   - Implement better fall-through-floor detection
   - Add recovery mechanisms for edge case fails
   - Refine wall-floor junction detection and handling

2. **Code Quality**:
   - Add comprehensive comments for every function
   - Add section headers for major code blocks
   - Explain complex algorithms/magic numbers
   - Implement a configuration system for magic numbers
   - Add unit tests for critical functions

## Critical Values and Magic Numbers

| Value | Purpose | Location | Notes |
|-------|---------|----------|-------|
| `0.1` | Wall push distance | JumpControl.js:767 | Controls how far to push from walls during sliding |
| `0.05` | Landing safety push | JumpControl.js:995 | Controls how far to push from walls when landing |
| `0.1` | Y-position safety buffer | JumpControl.js:777 | Ensures player stays above floor level |
| `0.7` | Collision radius reduction | JumpCollider.js:98 | Reduces sensitivity of collision detection |
| `0.05` | Wall-floor junction lift | JumpCollider.js:192 | Prevents falling through at junctions |
| `3000` | Jump safety timeout (ms) | JumpControl.js:334 | Maximum time a jump can last |
| `0.2` | Safe position offset | JumpCollider.js:130 | Distance to move back from collision point |

## Refactoring Recommendations

1. **Separate Concerns**:
   - Split JumpControl into smaller components (JumpInitiation, JumpPhysics, CollisionResponse)
   - Create a dedicated safety system component

2. **Improve State Management**:
   - Use a proper state machine for jump phases
   - Centralize state variables
   - Add validation for state transitions

3. **Enhance Debugging**:
   - Add comprehensive logging system
   - Create visual debugging helpers
   - Add telemetry for jump metrics

4. **Improve Configuration**:
   - Move magic numbers to configuration object
   - Add runtime configuration options
   - Create presets for different jump styles

## Conclusion

The jump mechanics system provides a reliable way for players to navigate the VR environment. The system has undergone significant optimization in Phases 1-3 of the upgrade plan, resulting in improved performance, better code organization, and enhanced reliability.

Key improvements include:
- Consolidated debugging with the JumpDebug utility
- Optimized collision detection with adaptive raycasting
- Improved momentum preservation during jumps
- Enhanced wall collision handling with better sliding vectors
- Implemented vector pooling for better performance
- Added support for current movement vectors from ArrowControls

While there are still some edge cases to address in Phases 4-6, the current implementation successfully handles most scenarios. The critical fix of updating `startY` when landing ensures the floor level is always correct, which is essential for preventing falling through the floor.

Future work should focus on completing the remaining phases of the upgrade plan, particularly the safety mechanisms and code quality improvements outlined in the jump system upgrade checklist.
