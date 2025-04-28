/**
 * VectorPool - A pool of reusable THREE.Vector3 objects
 * 
 * This utility helps reduce garbage collection by reusing Vector3 objects
 * instead of creating new ones each time they're needed.
 */

const VectorPool = {
  // Pool of available vectors
  _pool: [],
  
  // Maximum size of the pool to prevent memory leaks
  _maxPoolSize: 100,
  
  /**
   * Get a vector from the pool or create a new one if the pool is empty
   * @param {number} x - Optional x value to set
   * @param {number} y - Optional y value to set
   * @param {number} z - Optional z value to set
   * @returns {THREE.Vector3} A vector from the pool
   */
  get: function(x = 0, y = 0, z = 0) {
    let vector;
    
    if (this._pool.length > 0) {
      // Get a vector from the pool
      vector = this._pool.pop();
    } else {
      // Create a new vector if the pool is empty
      vector = new THREE.Vector3();
    }
    
    // Set the vector values
    vector.set(x, y, z);
    
    return vector;
  },
  
  /**
   * Release a vector back to the pool
   * @param {THREE.Vector3} vector - The vector to release
   */
  release: function(vector) {
    if (!vector) return;
    
    // Only add to the pool if we haven't reached the maximum size
    if (this._pool.length < this._maxPoolSize) {
      // Reset the vector to zero
      vector.set(0, 0, 0);
      this._pool.push(vector);
    }
  },
  
  /**
   * Clear the pool (useful for cleanup)
   */
  clear: function() {
    this._pool.length = 0;
  }
};

// Export the VectorPool
export default VectorPool;
