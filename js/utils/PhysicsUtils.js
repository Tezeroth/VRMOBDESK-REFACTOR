/**
 * PhysicsUtils - Utility functions for physics operations
 *
 * This module provides helper functions for common physics operations:
 * - Converting between physics body types
 * - Applying velocities
 * - Managing physics states
 */

const PhysicsUtils = {
  /**
   * Convert an entity to a kinematic physics body
   * @param {Element} el - The entity element
   * @returns {Object|null} The original physics state or null if failed
   */
  convertToKinematic(el) {
    if (!el) {
      console.warn('Cannot convert to kinematic: missing element');
      return null;
    }

    try {
      // Store original state
      const currentBody = el.getAttribute('physx-body');
      if (!currentBody) {
        console.error("Target has no physx-body!", el.id || el.tagName);
        return null;
      }

      const originalState = AFRAME.utils.extend({}, currentBody);
      console.log('Original physics state:', originalState);

      // Remove existing body and create kinematic one
      el.removeAttribute('physx-body');
      console.log('Removed physx-body attribute');

      el.setAttribute('physx-body', 'type: kinematic');
      console.log('Set physx-body to kinematic');

      console.log(`Converted ${el.id || 'entity'} to kinematic`);
      return originalState;
    } catch (e) {
      console.error("Error converting to kinematic:", e);
      return null;
    }
  },

  /**
   * Convert an entity back to its original physics state
   * @param {Element} el - The entity element
   * @param {Object} originalState - The original physics state
   * @param {THREE.Vector3} [velocity=null] - Optional velocity to apply
   * @returns {boolean} Success status
   */
  restoreOriginalState(el, originalState, velocity = null) {
    if (!el || !originalState) {
      console.warn('Cannot restore original state: missing element or state');
      return false;
    }

    console.log('Restoring original physics state:', originalState);

    try {
      // Store current transform
      const position = el.object3D.position.clone();
      const quaternion = el.object3D.quaternion.clone();

      // Ensure dynamic type
      const restoredState = AFRAME.utils.extend({}, originalState);
      restoredState.type = 'dynamic';

      // Remove kinematic body and recreate original
      el.removeAttribute('physx-body');
      el.setAttribute('physx-body', restoredState);

      // Restore transform
      el.object3D.position.copy(position);
      el.object3D.quaternion.copy(quaternion);
      el.object3D.updateMatrix();

      // Apply velocity if provided
      if (velocity) {
        this.applyVelocity(el, velocity);
      }

      return true;
    } catch (e) {
      console.error("Error restoring original state:", e);
      return false;
    }
  },

  /**
   * Apply velocity to a physics body
   * @param {Element} el - The entity element
   * @param {THREE.Vector3} velocity - The velocity to apply
   * @returns {boolean} Success status
   */
  applyVelocity(el, velocity) {
    if (!el || !velocity) return false;

    console.log(`Attempting to apply velocity: x=${velocity.x.toFixed(3)}, y=${velocity.y.toFixed(3)}, z=${velocity.z.toFixed(3)}`);

    // Use setTimeout to ensure physics body is ready
    setTimeout(() => {
      try {
        const bodyComponent = el.components['physx-body'];
        if (!bodyComponent) {
          console.warn("physx-body component not found");
          return false;
        }

        const rigidBody = bodyComponent.rigidBody;
        const currentType = bodyComponent.data.type;

        console.log(`Body type: ${currentType}, rigidBody exists: ${!!rigidBody}`);

        if (rigidBody && currentType === 'dynamic') {
          // Create plain objects for velocity to avoid any THREE.js object issues
          const plainVelocity = { x: velocity.x, y: velocity.y, z: velocity.z };
          const zeroAngular = { x: 0, y: 0, z: 0 };

          console.log('Setting zero angular velocity');
          rigidBody.setAngularVelocity(zeroAngular, true);

          console.log('Setting linear velocity:', plainVelocity);
          rigidBody.setLinearVelocity(plainVelocity, true);

          console.log('Waking up rigid body');
          rigidBody.wakeUp();

          console.log(`Successfully applied velocity`);
          return true;
        } else {
          console.warn("rigidBody not available or not dynamic");
          return false;
        }
      } catch (e) {
        console.error("Error applying velocity:", e);
        return false;
      }
    }, 50); // Increased timeout to ensure physics body is ready

    return true;
  },

  /**
   * Calculate throw velocity based on camera direction and force
   * @param {Element} camera - The camera element
   * @param {number} force - The throw force
   * @returns {THREE.Vector3} The calculated velocity
   */
  calculateThrowVelocity(camera, force) {
    if (!camera) return new THREE.Vector3();

    const direction = new THREE.Vector3(0, 0.2, -1);
    const quaternion = new THREE.Quaternion();

    camera.object3D.getWorldQuaternion(quaternion);
    direction.applyQuaternion(quaternion);

    return direction.multiplyScalar(force);
  }
};

export default PhysicsUtils;
