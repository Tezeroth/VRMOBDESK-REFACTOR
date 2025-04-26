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
    radius: { type: 'number', default: 0.5 },
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

    // Directions for raycasting (8 directions around the cylinder)
    this.directions = [];
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      this.directions.push(new THREE.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
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

    // Check for collisions in all directions
    for (const direction of this.directions) {
      this.raycaster.set(position, direction);
      this.raycaster.far = this.data.radius;

      // Check for intersections
      const intersections = this.raycaster.intersectObjects(
        validWalls.map(el => el.object3D),
        true // Check descendants
      );

      // If we hit a wall, log it and return collision info
      if (intersections.length > 0) {
        console.log('Wall collision detected!', intersections[0].object);

        // Calculate the safe position (slightly back from the collision point)
        const collisionPoint = intersections[0].point;
        const safeOffset = 0.2; // Move back 0.2 units from the collision

        // Calculate direction from collision point back to player
        const backDirection = new THREE.Vector3()
          .subVectors(position, collisionPoint)
          .normalize();

        // Calculate safe position
        const safePosition = new THREE.Vector3()
          .addVectors(
            collisionPoint,
            backDirection.multiplyScalar(safeOffset)
          );

        // Ensure the safe position is valid (not NaN)
        if (isNaN(safePosition.x) || isNaN(safePosition.y) || isNaN(safePosition.z)) {
          console.warn('Invalid safe position calculated, using player position');
          safePosition.copy(position);
        }

        // Log the safe position for debugging
        console.log('Calculated safe position:', safePosition);

        // Store the direction vector for debugging
        this.lastCollisionDirection = direction.clone();
        this.lastCollisionPoint = collisionPoint.clone();

        // Calculate the normal vector (perpendicular to the wall)
        // In this case, it's the opposite of the direction we're checking
        const normal = direction.clone().negate();

        return {
          collision: true,
          collisionPoint: collisionPoint,
          safePosition: safePosition,
          direction: direction.clone(),
          normal: normal
        };
      }
    }

    // Also check for collisions with the navmesh
    const navmesh = document.querySelector('.navmesh');
    if (navmesh && navmesh.object3D) {
      for (const direction of this.directions) {
        this.raycaster.set(position, direction);
        this.raycaster.far = this.data.radius;

        const intersections = this.raycaster.intersectObject(navmesh.object3D, true);

        if (intersections.length > 0) {
          console.log('Navmesh collision detected!');

          // Calculate the safe position (slightly back from the collision point)
          const collisionPoint = intersections[0].point;
          const safeOffset = 0.2; // Move back 0.2 units from the collision

          // Calculate direction from collision point back to player
          const backDirection = new THREE.Vector3()
            .subVectors(position, collisionPoint)
            .normalize();

          // Calculate safe position
          const safePosition = new THREE.Vector3()
            .addVectors(
              collisionPoint,
              backDirection.multiplyScalar(safeOffset)
            );

          return {
            collision: true,
            collisionPoint: collisionPoint,
            safePosition: safePosition
          };
        }
      }
    }

    return { collision: false };
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
