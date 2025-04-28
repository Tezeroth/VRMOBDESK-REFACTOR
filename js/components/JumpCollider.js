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
    
    // IMPORTANT: Reduce the collision radius and implement hit filtering
    const collisionRadius = this.data.radius * 0.7;
    
    let closestCollision = null;
    let closestDistance = Infinity;
    
    // Track all hits within a small threshold to handle multiple colliders
    const hitThreshold = 0.1; // 10cm threshold
    const nearbyHits = [];

    for (const direction of this.directions) {
      this.raycaster.set(position, direction);
      this.raycaster.far = collisionRadius;
      
      const intersections = this.raycaster.intersectObjects(
        validWalls.map(el => el.object3D),
        true
      );
      
      // Process all hits within threshold
      for (const hit of intersections) {
        if (hit.distance < closestDistance + hitThreshold) {
          nearbyHits.push(hit);
        }
      }
    }
    
    // If we have multiple nearby hits, average their normals
    if (nearbyHits.length > 0) {
      const avgNormal = new THREE.Vector3();
      nearbyHits.forEach(hit => {
        if (hit.face) {
          avgNormal.add(hit.face.normal);
        }
      });
      avgNormal.divideScalar(nearbyHits.length).normalize();
      
      // Use the closest hit point for position
      const closest = nearbyHits.reduce((prev, curr) => 
        prev.distance < curr.distance ? prev : curr
      );
      
      return {
        collision: true,
        normal: avgNormal,
        collisionPoint: closest.point,
        distance: closest.distance
      };
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

