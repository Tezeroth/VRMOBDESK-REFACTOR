/**
 * JumpCollider - Adds a collider to detect wall collisions during jumps
 *
 * This component creates a semi-transparent cylindrical collider that detects
 * collisions with walls during jumps and triggers an immediate landing.
 */

import JumpDebug from '../utils/JumpDebug.js';

// Vector pool for reusing vector objects to reduce garbage collection
const VectorPool = {
  _pool: [],
  _inUse: new Set(),

  get: function() {
    // Reuse a vector from the pool if available
    if (this._pool.length > 0) {
      const vector = this._pool.pop();
      this._inUse.add(vector);
      return vector.set(0, 0, 0); // Reset to zero
    }

    // Create a new vector if none are available
    const newVector = new THREE.Vector3();
    this._inUse.add(newVector);
    return newVector;
  },

  release: function(vector) {
    if (this._inUse.has(vector)) {
      this._inUse.delete(vector);
      this._pool.push(vector);
    }
  },

  releaseAll: function() {
    this._inUse.forEach(vector => {
      this._pool.push(vector);
    });
    this._inUse.clear();
  }
};

const JumpCollider = {
  schema: {
    enabled: { type: 'boolean', default: true },
    height: { type: 'number', default: 1.6 },
    radius: { type: 'number', default: 0.3 }, // Optimized radius for accurate collision detection
    opacity: { type: 'number', default: 0 },  // Default to invisible (0 opacity)
    cacheRefreshInterval: { type: 'number', default: 2000 }, // How often to refresh wall cache (ms)
    raycastCacheDuration: { type: 'number', default: 100 },  // How long to cache raycast results (ms)
    adaptiveRaycastEnabled: { type: 'boolean', default: true }, // Whether to use adaptive raycast frequency
    proximityThreshold: { type: 'number', default: 1.0 }, // Distance to walls that triggers high-precision mode (meters)
    farRaycastInterval: { type: 'number', default: 5 } // Only raycast every N frames when far from walls
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

    // Initialize wall cache
    this.cachedWalls = null;
    this.lastCacheTime = 0;

    // Initialize raycast cache
    this.raycastCache = {
      results: {},       // Cache of raycast results by direction key
      timestamp: 0,      // When the cache was last updated
      playerPosition: null, // Player position when cache was created
      positionThreshold: 0.05 // How far player can move before cache is invalidated
    };

    // Initialize adaptive raycast system
    this.adaptiveRaycast = {
      nearWall: false,           // Whether player is near a wall
      lastFullCheckTime: 0,      // When we last did a full proximity check
      frameCounter: 0,           // Counter for frames since last check
      proximityCheckInterval: 500, // How often to do a full proximity check (ms)
      lastProximityDistance: Infinity // Last measured distance to nearest wall
    };

    // Set up collision detection
    this.setupCollisionDetection();

    // Initially hide the collider
    this.collider.setAttribute('visible', false);

    // Bind tick function to ensure collider stays attached
    this.tick = this.tick.bind(this);

    // Initial cache population
    this.refreshWallCache();
  },

  setupCollisionDetection: function() {
    // We'll use raycasting for collision detection
    this.raycaster = new THREE.Raycaster();

    // Store all possible directions for raycasting
    this.allDirections = {
      // Horizontal directions (8 directions around the cylinder)
      horizontal: [],
      // Diagonal downward directions to detect wall-floor junctions
      diagonal: []
    };

    // Create horizontal directions (8 directions around the cylinder)
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      // Create permanent direction vectors (not pooled since these are permanent)
      const direction = new THREE.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
      ).normalize();

      this.allDirections.horizontal.push(direction);
    }

    // Create diagonal downward directions to detect wall-floor junctions
    // These are crucial for preventing falling through the floor
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      // Create permanent direction vectors (not pooled since these are permanent)
      const direction = new THREE.Vector3(
        Math.cos(angle) * 0.7,  // Reduce horizontal component
        -0.7,                   // Add downward component
        Math.sin(angle) * 0.7   // Reduce horizontal component
      ).normalize();

      this.allDirections.diagonal.push(direction);
    }

    // Initialize the active directions array
    this.directions = [...this.allDirections.horizontal, ...this.allDirections.diagonal];

    // Bind the checkCollisions method
    this.checkCollisions = this.checkCollisions.bind(this);

    // Pre-populate the vector pool with some vectors to reduce initial allocations
    for (let i = 0; i < 10; i++) {
      VectorPool._pool.push(new THREE.Vector3());
    }

    if (JumpDebug.enabled) {
      JumpDebug.info('JumpCollider', `Pre-populated vector pool with ${VectorPool._pool.length} vectors`);
    }
  },

  /**
   * Refresh the cached wall objects
   * This is called periodically to avoid querying the DOM on every collision check
   */
  refreshWallCache: function() {
    if (JumpDebug.enabled) {
      JumpDebug.info('JumpCollider', 'Refreshing wall cache');
    }

    // Get all static objects (walls, etc.)
    const walls = Array.from(document.querySelectorAll('.blocker, [physx-body="type: static"], .venue-collider'));

    // Filter out objects that don't have object3D and extract their object3D
    this.cachedWalls = walls
      .filter(el => el.object3D)
      .map(el => el.object3D);

    // Update the cache timestamp
    this.lastCacheTime = Date.now();

    if (JumpDebug.enabled) {
      JumpDebug.info('JumpCollider', `Cached ${this.cachedWalls.length} wall objects`);
    }
  },

  /**
   * Get the wall objects, using cache if available and not expired
   * @returns {Array} Array of THREE.Object3D wall objects
   */
  getWallObjects: function() {
    const now = Date.now();

    // If cache is expired or doesn't exist, refresh it
    if (!this.cachedWalls || now - this.lastCacheTime > this.data.cacheRefreshInterval) {
      this.refreshWallCache();
    }

    return this.cachedWalls;
  },

  /**
   * Get optimized directions for raycasting based on movement
   * @param {boolean} useAllDirections - Whether to use all directions regardless of movement
   * @returns {Array} Array of direction vectors
   */
  getOptimizedDirections: function(useAllDirections) {
    // If useAllDirections is true, use all directions
    if (useAllDirections) {
      return [...this.allDirections.horizontal, ...this.allDirections.diagonal];
    }

    // Get the movement controls component to check movement direction
    const movementControls = this.el.components['movement-controls'];

    // If no movement controls or no velocity, use all directions
    if (!movementControls || !movementControls.velocity) {
      return [...this.allDirections.horizontal, ...this.allDirections.diagonal];
    }

    // Get the movement velocity using a pooled vector
    const velocity = VectorPool.get().set(
      movementControls.velocity.x,
      0,
      movementControls.velocity.z
    );

    // If not moving, use all directions
    if (velocity.lengthSq() < 0.0001) {
      // Don't forget to release the vector
      VectorPool.release(velocity);
      return [...this.allDirections.horizontal, ...this.allDirections.diagonal];
    }

    // Normalize the velocity
    velocity.normalize();

    // Select the directions that are most relevant to the movement direction
    const selectedDirections = [];

    // Always include the diagonal directions for floor junction detection
    selectedDirections.push(...this.allDirections.diagonal);

    // Find the horizontal directions that are most aligned with the movement
    for (const direction of this.allDirections.horizontal) {
      // Calculate the dot product to measure alignment
      const alignment = velocity.dot(direction);

      // Include directions that are somewhat aligned with movement
      // This includes the movement direction and adjacent directions
      if (alignment > 0.5 || alignment < -0.5) {
        selectedDirections.push(direction);
      }
    }

    // Release the velocity vector
    VectorPool.release(velocity);

    // Always ensure we have at least 3 horizontal directions
    if (selectedDirections.length - this.allDirections.diagonal.length < 3) {
      return [...this.allDirections.horizontal, ...this.allDirections.diagonal];
    }

    return selectedDirections;
  },

  checkCollisions: function() {
    if (!this.data.enabled || !this.collider.object3D) return { collision: false };

    // Clear any previously pooled vectors
    VectorPool.releaseAll();

    // Get position from object3D (using pooled vector)
    const position = VectorPool.get().copy(this.el.object3D.position);

    // Get wall objects from cache
    const wallObjects = this.getWallObjects();

    // Use a slightly reduced collision radius for more precise hit detection
    const collisionRadius = this.data.radius * 0.7;

    // Determine if we should use all directions or optimized directions
    // During jumps, we want to be more thorough with collision detection
    const jumpControl = this.el.components['jump-control'];
    const isJumping = jumpControl && (jumpControl.isJumping || jumpControl.isFalling);

    // Adaptive raycast system - check if we should do a full collision check
    let shouldDoFullCheck = true;

    if (this.data.adaptiveRaycastEnabled && !isJumping) {
      // Increment frame counter
      this.adaptiveRaycast.frameCounter++;

      // Check if we need to update wall proximity
      const now = Date.now();
      if (now - this.adaptiveRaycast.lastFullCheckTime > this.adaptiveRaycast.proximityCheckInterval) {
        // Do a full proximity check
        this.checkWallProximity(position);
        this.adaptiveRaycast.frameCounter = 0;
      }

      // If we're far from walls, we can skip some frames
      if (!this.adaptiveRaycast.nearWall &&
          this.adaptiveRaycast.frameCounter % this.data.farRaycastInterval !== 0) {
        shouldDoFullCheck = false;

        if (JumpDebug.enabled) {
          JumpDebug.info('JumpCollider', 'Skipping collision check (far from walls)');
        }
      }
    }

    // If we're skipping the check, return no collision
    if (!shouldDoFullCheck) {
      // Release all pooled vectors
      VectorPool.releaseAll();
      return { collision: false };
    }

    // Get optimized directions based on movement and jump state
    // Use all directions during jumps for safety
    const directions = this.getOptimizedDirections(isJumping);

    // Debug the directions being used
    if (JumpDebug.enabled) {
      this.debugDirections(directions);
    }

    let closestDistance = Infinity;

    // Track all hits within a small threshold to handle multiple colliders
    const hitThreshold = 0.1; // 10cm threshold
    const nearbyHits = [];

    // Check if we can use the raycast cache
    const canUseCache = !isJumping && this.isRaycastCacheValid(position);

    // If cache is valid, update timestamp to extend its life
    if (canUseCache) {
      this.raycastCache.timestamp = Date.now();

      if (JumpDebug.enabled) {
        JumpDebug.info('JumpCollider', 'Using raycast cache');
      }
    } else {
      // Cache is invalid, update it with new position
      this.clearRaycastCache();
      this.raycastCache.timestamp = Date.now();
      this.raycastCache.playerPosition = position.clone();

      if (JumpDebug.enabled && !isJumping) {
        JumpDebug.info('JumpCollider', 'Refreshing raycast cache');
      }
    }

    for (const direction of directions) {
      // Get a unique key for this direction
      const dirKey = this.getDirectionKey(direction);

      // Check if we have a cached result for this direction
      if (canUseCache && this.raycastCache.results[dirKey]) {
        // Use cached intersections
        const cachedIntersections = this.raycastCache.results[dirKey];

        // Process cached hits
        for (const hit of cachedIntersections) {
          if (hit.distance < closestDistance + hitThreshold) {
            nearbyHits.push(hit);
          }
        }
      } else {
        // Perform new raycast
        this.raycaster.set(position, direction);
        this.raycaster.far = collisionRadius;

        const intersections = this.raycaster.intersectObjects(
          wallObjects,
          true
        );

        // Cache the results if not jumping
        if (!isJumping) {
          // We need to clone the intersections to avoid reference issues
          const clonedIntersections = intersections.map(hit => {
            return {
              distance: hit.distance,
              point: hit.point.clone(),
              face: hit.face ? {
                normal: hit.face.normal.clone()
              } : null
            };
          });

          this.raycastCache.results[dirKey] = clonedIntersections;
        }

        // Process all hits within threshold
        for (const hit of intersections) {
          if (hit.distance < closestDistance + hitThreshold) {
            nearbyHits.push(hit);
          }
        }
      }
    }

    // If we have multiple nearby hits, average their normals
    if (nearbyHits.length > 0) {
      // Use pooled vector for average normal
      const avgNormal = VectorPool.get();

      nearbyHits.forEach(hit => {
        if (hit.face) {
          // Use face normal directly without creating new vectors
          avgNormal.add(hit.face.normal);
        }
      });

      avgNormal.divideScalar(nearbyHits.length).normalize();

      // Use the closest hit point for position
      const closest = nearbyHits.reduce((prev, curr) =>
        prev.distance < curr.distance ? prev : curr
      );

      // Create a copy of the normal to return (since we'll release the pooled one)
      const normalCopy = new THREE.Vector3().copy(avgNormal);

      // Release all pooled vectors
      VectorPool.releaseAll();

      return {
        collision: true,
        normal: normalCopy,
        collisionPoint: closest.point,
        distance: closest.distance
      };
    }

    // Release all pooled vectors
    VectorPool.releaseAll();

    return { collision: false };
  },

  /**
   * Debug function to log the number of directions being used
   * Only logs when debug mode is enabled
   * @param {Array} directions - The array of directions being used
   */
  debugDirections: function(directions) {
    if (JumpDebug.enabled) {
      const horizontalCount = directions.filter(dir => Math.abs(dir.y) < 0.01).length;
      const diagonalCount = directions.length - horizontalCount;

      JumpDebug.info('JumpCollider',
        `Using ${directions.length} directions (${horizontalCount} horizontal, ${diagonalCount} diagonal)`);
    }
  },

  showCollider: function() {
    if (this.collider) {
      // Only show the collider if debug mode is enabled
      if (JumpDebug.enabled) {
        this.collider.setAttribute('visible', true);
        JumpDebug.info('JumpCollider', 'Showing jump collider (debug mode)');

        // Debug the current directions being used
        const jumpControl = this.el.components['jump-control'];
        const isJumping = jumpControl && (jumpControl.isJumping || jumpControl.isFalling);
        const directions = this.getOptimizedDirections(isJumping);
        this.debugDirections(directions);
      } else {
        // Keep the collider invisible in normal gameplay
        this.collider.setAttribute('visible', false);
      }
    } else {
      if (JumpDebug) {
        JumpDebug.warn('JumpCollider', 'Cannot show collider - it does not exist');
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
      if (JumpDebug) {
        JumpDebug.warn('JumpCollider', 'Cannot hide collider - it does not exist');
      } else {
        console.warn('Cannot hide collider - it does not exist');
      }
    }
  },

  recreateCollider: function() {
    if (JumpDebug) {
      JumpDebug.info('JumpCollider', 'Recreating jump collider');
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
      const opacity = JumpDebug.enabled ? 0.2 : 0;

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
      if (JumpDebug) {
        JumpDebug.warn('JumpCollider', 'Jump collider detached, re-attaching');
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

      if (JumpDebug) {
        JumpDebug.position('JumpCollider', 'Correcting jump collider position');
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
   * Check if the raycast cache is valid
   * @param {THREE.Vector3} position - Current player position
   * @returns {boolean} Whether the cache is valid
   */
  isRaycastCacheValid: function(position) {
    const now = Date.now();

    // Cache is invalid if it's expired
    if (now - this.raycastCache.timestamp > this.data.raycastCacheDuration) {
      return false;
    }

    // Cache is invalid if player has moved too far
    if (!this.raycastCache.playerPosition) {
      return false;
    }

    // Calculate distance moved
    const distMoved = position.distanceTo(this.raycastCache.playerPosition);

    // Cache is invalid if player has moved beyond threshold
    if (distMoved > this.raycastCache.positionThreshold) {
      return false;
    }

    return true;
  },

  /**
   * Clear the raycast cache
   */
  clearRaycastCache: function() {
    this.raycastCache.results = {};
    this.raycastCache.timestamp = 0;
    this.raycastCache.playerPosition = null;
  },

  /**
   * Get a unique key for a direction vector
   * @param {THREE.Vector3} direction - Direction vector
   * @returns {string} Unique key for the direction
   */
  getDirectionKey: function(direction) {
    return `${direction.x.toFixed(4)},${direction.y.toFixed(4)},${direction.z.toFixed(4)}`;
  },

  /**
   * Check proximity to walls
   * @param {THREE.Vector3} position - Current player position
   * @returns {Object} Proximity information including distance to nearest wall
   */
  checkWallProximity: function(position) {
    // Get wall objects from cache
    const wallObjects = this.getWallObjects();

    // Use a longer ray for proximity detection
    const proximityRadius = this.data.proximityThreshold * 1.2;

    // Use pooled vector for calculations
    const direction = VectorPool.get();
    let nearestDistance = Infinity;
    let nearestNormal = null;

    // Check in all horizontal directions
    for (const dir of this.allDirections.horizontal) {
      // Set up the raycaster
      direction.copy(dir);
      this.raycaster.set(position, direction);
      this.raycaster.far = proximityRadius;

      // Cast the ray
      const intersections = this.raycaster.intersectObjects(
        wallObjects,
        true
      );

      // Check if we hit anything
      if (intersections.length > 0) {
        const hit = intersections[0];
        if (hit.distance < nearestDistance) {
          nearestDistance = hit.distance;
          nearestNormal = hit.face ? hit.face.normal : null;
        }
      }
    }

    // Release the pooled vector
    VectorPool.release(direction);

    // Update the adaptive raycast state
    this.adaptiveRaycast.lastProximityDistance = nearestDistance;
    this.adaptiveRaycast.nearWall = nearestDistance < this.data.proximityThreshold;
    this.adaptiveRaycast.lastFullCheckTime = Date.now();

    // Debug output
    if (JumpDebug.enabled) {
      JumpDebug.info('JumpCollider',
        `Wall proximity: ${nearestDistance.toFixed(2)}m, Near wall: ${this.adaptiveRaycast.nearWall}`);
    }

    return {
      distance: nearestDistance,
      nearWall: this.adaptiveRaycast.nearWall,
      normal: nearestNormal
    };
  },

  /**
   * Reset the adaptive raycast system
   */
  resetAdaptiveRaycast: function() {
    this.adaptiveRaycast.nearWall = false;
    this.adaptiveRaycast.lastFullCheckTime = 0;
    this.adaptiveRaycast.frameCounter = 0;
    this.adaptiveRaycast.lastProximityDistance = Infinity;

    if (JumpDebug.enabled) {
      JumpDebug.info('JumpCollider', 'Reset adaptive raycast system');
    }
  },

  /**
   * Force refresh all caches
   * This can be called when the scene changes (e.g., new walls are added)
   */
  forceRefreshCache: function() {
    if (JumpDebug) {
      JumpDebug.info('JumpCollider', 'Forcing cache refresh');
    } else {
      console.log('Forcing cache refresh');
    }

    this.refreshWallCache();
    this.clearRaycastCache();
    this.resetAdaptiveRaycast();
  },

  /**
   * Clean up when component is removed
   */
  remove: function() {
    // Clean up when component is removed
    if (this.collider && this.collider.parentNode) {
      this.collider.parentNode.removeChild(this.collider);
    }

    // Clear cached walls to free memory
    this.cachedWalls = null;

    // Clear raycast cache
    this.clearRaycastCache();

    // Reset adaptive raycast system
    this.resetAdaptiveRaycast();

    // Release all pooled vectors
    VectorPool.releaseAll();

    // Clear the vector pool to free memory
    VectorPool._pool = [];
  }
};

export default JumpCollider;

