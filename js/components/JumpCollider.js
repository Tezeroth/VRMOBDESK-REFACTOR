/**
 * JumpCollider - Adds a collider to detect wall collisions during jumps
 *
 * This component creates a semi-transparent cylindrical collider that detects
 * collisions with walls during jumps and triggers an immediate landing.
 *
 * Optimized for performance with:
 * - Reduced number of raycasts
 * - Vector object pooling
 * - Cached wall objects
 * - Adaptive collision detection
 */

// JumpDebug utility is attached to the window object in JumpDebug.js
// Make sure to include the script in your HTML before this component

import VectorPool from '../utils/VectorPool.js';

const JumpCollider = {
  schema: {
    enabled: { type: 'boolean', default: true },
    height: { type: 'number', default: 1.6 },
    radius: { type: 'number', default: 0.3 }, // Optimized radius for accurate collision detection
    opacity: { type: 'number', default: 0 }   // Default to invisible (0 opacity)
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

    // Performance optimization variables
    this.wallObjectsCache = null;       // Cache for wall objects
    this.wallCacheTime = 0;             // When the wall cache was last updated
    this.wallCacheLifetime = 1000;      // How long the wall cache is valid (ms)
    this.collisionCheckThrottle = 1;    // Only check collisions every N frames
    this.frameCounter = 0;              // Counter for throttling collision checks
    this.lastCollisionResult = null;    // Cache for collision results
    this.collisionCacheTime = 0;        // When the collision cache was last updated
    this.collisionCacheLifetime = 100;  // How long the collision cache is valid (ms)

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

    // Directions for raycasting - OPTIMIZED: reduced from 12 to 8 directions
    // 6 horizontal + 2 diagonal down directions (most critical ones)
    this.directions = [];

    // Pre-computed direction vectors for better performance
    // Using 6 horizontal directions instead of 8 (45° spacing instead of 30°)
    const horizontalDirections = [
      { x: 1, y: 0, z: 0 },       // +X
      { x: 0.5, y: 0, z: 0.866 },  // +X+Z (60° angle)
      { x: -0.5, y: 0, z: 0.866 }, // -X+Z (120° angle)
      { x: -1, y: 0, z: 0 },      // -X
      { x: -0.5, y: 0, z: -0.866 }, // -X-Z (240° angle)
      { x: 0.5, y: 0, z: -0.866 }  // +X-Z (300° angle)
    ];

    // Add horizontal directions
    for (const dir of horizontalDirections) {
      // Use the vector pool to create the direction vector
      const dirVector = VectorPool.get(dir.x, dir.y, dir.z).normalize();
      this.directions.push(dirVector);
    }

    // Add only 2 diagonal downward directions (most critical for wall-floor junctions)
    // These are crucial for preventing falling through the floor
    const diagonalDirections = [
      { x: 0.7, y: -0.7, z: 0 },   // +X down
      { x: 0, y: -0.7, z: 0.7 }    // +Z down
    ];

    for (const dir of diagonalDirections) {
      const dirVector = VectorPool.get(dir.x, dir.y, dir.z).normalize();
      this.directions.push(dirVector);
    }

    // Bind the checkCollisions method
    this.checkCollisions = this.checkCollisions.bind(this);
  },

  /**
   * Get wall objects with caching for better performance
   * @returns {Array} Array of valid wall objects
   */
  getWallObjects: function() {
    const currentTime = performance.now();

    // Check if we can use the cached wall objects
    if (this.wallObjectsCache &&
        (currentTime - this.wallCacheTime < this.wallCacheLifetime)) {
      return this.wallObjectsCache;
    }

    // Get all static objects (walls, etc.)
    const walls = Array.from(document.querySelectorAll('.blocker, [physx-body="type: static"], .venue-collider'));

    // Filter out objects that don't have object3D
    const validWalls = walls.filter(el => el.object3D);

    // Cache the result
    this.wallObjectsCache = validWalls;
    this.wallCacheTime = currentTime;

    return validWalls;
  },

  /**
   * Check for collisions with optimized performance
   * Uses caching, throttling, and vector pooling
   */
  checkCollisions: function() {
    if (!this.data.enabled || !this.collider.object3D) return { collision: false };

    // Check if we can use the cached collision result
    const currentTime = performance.now();
    if (this.lastCollisionResult &&
        (currentTime - this.collisionCacheTime < this.collisionCacheLifetime)) {
      return this.lastCollisionResult;
    }

    // Get position from pool instead of cloning
    const position = VectorPool.get().copy(this.el.object3D.position);

    // Get wall objects (with caching)
    const validWalls = this.getWallObjects();

    // Use a slightly reduced collision radius for more precise hit detection
    const collisionRadius = this.data.radius * 0.7;

    let closestDistance = Infinity;

    // Track all hits within a small threshold to handle multiple colliders
    const hitThreshold = 0.1; // 10cm threshold
    const nearbyHits = [];

    // Get wall object3Ds once instead of mapping in each iteration
    const wallObjects = validWalls.map(el => el.object3D);

    for (const direction of this.directions) {
      this.raycaster.set(position, direction);
      this.raycaster.far = collisionRadius;

      const intersections = this.raycaster.intersectObjects(wallObjects, true);

      // Process all hits within threshold
      for (const hit of intersections) {
        if (hit.distance < closestDistance + hitThreshold) {
          nearbyHits.push(hit);
          if (hit.distance < closestDistance) {
            closestDistance = hit.distance;
          }
        }
      }
    }

    // Return position to pool
    VectorPool.release(position);

    // If we have multiple nearby hits, average their normals
    if (nearbyHits.length > 0) {
      // Get avgNormal from pool
      const avgNormal = VectorPool.get();

      // Count valid normals for proper averaging
      let validNormalCount = 0;

      nearbyHits.forEach(hit => {
        if (hit.face && hit.face.normal) {
          avgNormal.add(hit.face.normal);
          validNormalCount++;
        }
      });

      // Only normalize if we have valid normals
      if (validNormalCount > 0) {
        avgNormal.divideScalar(validNormalCount).normalize();
      } else {
        // Default to upward normal if no valid normals found
        avgNormal.set(0, 1, 0);
      }

      // Use the closest hit point for position
      const closest = nearbyHits.reduce((prev, curr) =>
        prev.distance < curr.distance ? prev : curr
      );

      // Create result object
      const result = {
        collision: true,
        normal: avgNormal,
        collisionPoint: closest.point,
        distance: closest.distance
      };

      // Cache the result
      this.lastCollisionResult = result;
      this.collisionCacheTime = currentTime;

      return result;
    }

    // No collision
    const result = { collision: false };

    // Cache the result
    this.lastCollisionResult = result;
    this.collisionCacheTime = currentTime;

    return result;
  },

  showCollider: function() {
    if (this.collider) {
      // Only show the collider if debug mode is enabled
      if (window.JumpDebug && window.JumpDebug.enabled) {
        this.collider.setAttribute('visible', true);
        window.JumpDebug.info('JumpCollider', 'Showing jump collider (debug mode)');
      } else {
        // Keep the collider invisible in normal gameplay
        this.collider.setAttribute('visible', false);
      }
    } else {
      if (window.JumpDebug) {
        window.JumpDebug.warn('JumpCollider', 'Cannot show collider - it does not exist');
      } else {
        console.warn('Cannot show collider - it does not exist');
      }
      // Recreate the collider if it doesn't exist
      this.recreateCollider();
    }
  },

  hideCollider: function() {
    if (this.collider) {
      this.collider.setAttribute('visible', false);
    } else {
      if (window.JumpDebug) {
        window.JumpDebug.warn('JumpCollider', 'Cannot hide collider - it does not exist');
      } else {
        console.warn('Cannot hide collider - it does not exist');
      }
    }
  },

  recreateCollider: function() {
    if (window.JumpDebug) {
      window.JumpDebug.info('JumpCollider', 'Recreating jump collider');
    } else {
      console.log('Recreating jump collider');
    }

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

    // Make the collider invisible by default, only visible in debug mode
    this.collider.setAttribute('material', {
      color: 'red',
      opacity: 0, // Start with zero opacity
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

      // Only show the collider if debug mode is enabled
      const opacity = (window.JumpDebug && window.JumpDebug.enabled) ? 0.2 : 0;

      this.collider.setAttribute('material', {
        opacity: opacity
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
      if (window.JumpDebug) {
        window.JumpDebug.warn('JumpCollider', 'Jump collider detached, re-attaching');
      } else {
        console.warn('Jump collider detached, re-attaching');
      }

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

      if (window.JumpDebug) {
        window.JumpDebug.position('JumpCollider', 'Correcting jump collider position');
      } else {
        console.log('Correcting jump collider position');
      }

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

    // Clean up direction vectors
    if (this.directions) {
      // Return all direction vectors to the pool
      this.directions.forEach(dir => {
        VectorPool.release(dir);
      });
      this.directions = [];
    }

    // Clear cached objects
    this.wallObjectsCache = null;
    this.lastCollisionResult = null;
  }
};

export default JumpCollider;

