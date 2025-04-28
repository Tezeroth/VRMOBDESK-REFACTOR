/**
 * JumpCollider - Adds a collider to detect wall collisions during jumps
 *
 * This component creates a semi-transparent cylindrical collider that detects
 * collisions with walls during jumps and triggers an immediate landing.
 */

const JumpCollider = {
  schema: {
    enabled: { type: 'boolean', default: true },
    height: { type: 'number', default: 1.6 },
    radius: { type: 'number', default: 0.3 }, // REDUCED radius to prevent false collisions
    opacity: { type: 'number', default: 0.2 }
  },

  init: function() {
    // Create the collider entity
    this.collider = document.createElement('a-entity');
    this.collider.setAttribute('id', 'jump-collider');

    // Set up the collider with a cylinder geometry
    this.collider.setAttribute('geometry', {
      primitive: 'cylinder',
      height: this.data.height,
      radius: this.data.radius
    });

    // Make the collider semi-transparent
    this.collider.setAttribute('material', {
      color: 'red',
      opacity: this.data.opacity,
      transparent: true
    });

    // Add the collider to the camera rig
    this.el.appendChild(this.collider);

    // Position the collider relative to the camera rig
    this.collider.setAttribute('position', {
      x: 0,
      y: this.data.height / 2, // Center the cylinder vertically
      z: 0
    });

    // Set up collision detection
    this.setupCollisionDetection();

    // Initially hide the collider
    this.collider.setAttribute('visible', false);

    // Bind tick function to ensure collider stays attached
    this.tick = this.tick.bind(this);
  },

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
  },

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
  },

  showCollider: function() {
    if (this.collider) {
      this.collider.setAttribute('visible', true);
      console.log('Showing jump collider');
    } else {
      console.warn('Cannot show collider - it does not exist');
      // Recreate the collider if it doesn't exist
      this.recreateCollider();
    }
  },

  hideCollider: function() {
    if (this.collider) {
      this.collider.setAttribute('visible', false);
    } else {
      console.warn('Cannot hide collider - it does not exist');
    }
  },

  recreateCollider: function() {
    console.log('Recreating jump collider');

    // Remove old collider if it exists
    if (this.collider && this.collider.parentNode) {
      this.collider.parentNode.removeChild(this.collider);
    }

    // Create a new collider
    this.collider = document.createElement('a-entity');
    this.collider.setAttribute('id', 'jump-collider');

    // Set up the collider with a cylinder geometry
    this.collider.setAttribute('geometry', {
      primitive: 'cylinder',
      height: this.data.height,
      radius: this.data.radius
    });

    // Make the collider semi-transparent
    this.collider.setAttribute('material', {
      color: 'red',
      opacity: this.data.opacity,
      transparent: true
    });

    // Add the collider to the camera rig
    this.el.appendChild(this.collider);

    // Position the collider relative to the camera rig
    this.collider.setAttribute('position', {
      x: 0,
      y: this.data.height / 2, // Center the cylinder vertically
      z: 0
    });

    // Initially hide the collider
    this.collider.setAttribute('visible', false);
  },

  /**
   * Update the collider position to match the player
   */
  updateCollider: function() {
    if (!this.collider) {
      this.recreateCollider();
      return;
    }

    // Make sure the collider is properly positioned
    this.collider.setAttribute('position', {
      x: 0,
      y: this.data.height / 2, // Center the cylinder vertically
      z: 0
    });

    // Ensure the collider is attached to the player
    if (!this.collider.parentNode || this.collider.parentNode !== this.el) {
      if (this.collider.parentNode) {
        this.collider.parentNode.removeChild(this.collider);
      }
      this.el.appendChild(this.collider);
    }
  },

  update: function() {
    if (this.collider) {
      // Update collider properties when component data changes
      this.collider.setAttribute('geometry', {
        height: this.data.height,
        radius: this.data.radius
      });

      this.collider.setAttribute('material', {
        opacity: this.data.opacity
      });

      this.collider.setAttribute('position', {
        x: 0,
        y: this.data.height / 2,
        z: 0
      });
    }
  },

  /**
   * Tick function to ensure collider stays attached and properly positioned
   */
  tick: function() {
    // Skip if collider doesn't exist
    if (!this.collider) {
      // If the collider doesn't exist, recreate it
      this.recreateCollider();
      return;
    }

    // Check if collider is still attached to the parent
    if (!this.collider.parentNode || this.collider.parentNode !== this.el) {
      console.warn('Jump collider detached, re-attaching');

      // Re-attach the collider if it's detached
      if (this.collider.parentNode) {
        this.collider.parentNode.removeChild(this.collider);
      }
      this.el.appendChild(this.collider);
    }

    // Ensure the collider's position is correct (with some tolerance)
    const currentPos = this.collider.getAttribute('position');
    const expectedY = this.data.height / 2;

    // Only correct if position is significantly off
    const tolerance = 0.01;
    if (Math.abs(currentPos.x) > tolerance ||
        Math.abs(currentPos.y - expectedY) > tolerance ||
        Math.abs(currentPos.z) > tolerance) {

      console.log('Correcting jump collider position');
      this.collider.setAttribute('position', {
        x: 0,
        y: expectedY,
        z: 0
      });
    }
  },

  /**
   * Clean up when component is removed
   */
  remove: function() {
    // Clean up when component is removed
    if (this.collider && this.collider.parentNode) {
      this.collider.parentNode.removeChild(this.collider);
    }
  }
};

export default JumpCollider;
