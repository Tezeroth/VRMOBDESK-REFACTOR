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

        return {
          collision: true,
          collisionPoint: collisionPoint,
          safePosition: safePosition
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
    }
  },

  hideCollider: function() {
    if (this.collider) {
      this.collider.setAttribute('visible', false);
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

  remove: function() {
    // Clean up when component is removed
    if (this.collider && this.collider.parentNode) {
      this.collider.parentNode.removeChild(this.collider);
    }
  }
};

export default JumpCollider;
