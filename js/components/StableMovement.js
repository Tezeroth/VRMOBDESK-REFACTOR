/**
 * StableMovement - Provides stable movement regardless of camera pitch
 *
 * This component fixes the issue where looking down causes unexpected movement
 * by ensuring that only the yaw (horizontal rotation) affects movement direction.
 */

const StableMovement = {
  schema: {
    enabled: { type: 'boolean', default: true }
  },

  init: function() {
    // Store original methods from movement-controls
    this.originalVelocityCheck = null;
    this.originalGetMovementVector = null;
    
    // Bind methods
    this.modifiedGetMovementVector = this.modifiedGetMovementVector.bind(this);
    
    // Apply patches when the scene is loaded
    this.el.sceneEl.addEventListener('loaded', () => {
      this.patchMovementControls();
    });
  },

  update: function() {
    // If the component is disabled, restore original methods
    if (!this.data.enabled && this.originalGetMovementVector) {
      this.restoreOriginalMethods();
    } else if (this.data.enabled && !this.originalGetMovementVector) {
      this.patchMovementControls();
    }
  },

  remove: function() {
    // Restore original methods when component is removed
    this.restoreOriginalMethods();
  },

  /**
   * Patch the movement-controls component to use our modified methods
   */
  patchMovementControls: function() {
    const movementControls = this.el.components['movement-controls'];
    if (!movementControls) {
      console.warn('StableMovement: No movement-controls component found');
      return;
    }

    // Store original methods for later restoration
    if (!this.originalGetMovementVector) {
      this.originalGetMovementVector = movementControls.getMovementVector;
      
      // Replace with our modified method
      movementControls.getMovementVector = this.modifiedGetMovementVector;
      
      console.log('StableMovement: Successfully patched movement-controls');
    }
  },

  /**
   * Restore the original methods of movement-controls
   */
  restoreOriginalMethods: function() {
    const movementControls = this.el.components['movement-controls'];
    if (!movementControls) return;

    if (this.originalGetMovementVector) {
      movementControls.getMovementVector = this.originalGetMovementVector;
      this.originalGetMovementVector = null;
      console.log('StableMovement: Restored original movement-controls methods');
    }
  },

  /**
   * Modified version of getMovementVector that only uses yaw rotation
   * This prevents pitch (looking up/down) from affecting movement direction
   */
  modifiedGetMovementVector: function() {
    const movementControls = this.el.components['movement-controls'];
    if (!movementControls) return new THREE.Vector3(0, 0, 0);
    
    // Call the original method to get the basic movement vector
    const movementVector = this.originalGetMovementVector.call(movementControls);
    
    // If no movement, return zero vector
    if (movementVector.lengthSq() === 0) return movementVector;
    
    // Get camera and look-controls
    const camera = document.querySelector('#camera');
    if (!camera) return movementVector;
    
    const lookControls = camera.components['look-controls'];
    if (!lookControls) return movementVector;
    
    // Create a new vector for the stabilized movement
    const stableVector = new THREE.Vector3();
    
    // Get only the yaw rotation (horizontal rotation)
    const yawRotation = lookControls.yawObject.rotation.y;
    
    // Calculate movement direction using only yaw rotation
    // This is the key fix - we ignore pitch rotation completely
    const rotation = new THREE.Euler(0, yawRotation, 0, 'YXZ');
    
    // Apply the rotation to the movement vector
    stableVector.copy(movementVector).applyEuler(rotation);
    
    // Ensure Y component is preserved from original vector (for flying/jumping)
    stableVector.y = movementVector.y;
    
    return stableVector;
  }
};

export default StableMovement;
