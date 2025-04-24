/**
 * TogglePhysics - Handles physics state for VR object interaction
 *
 * This component:
 * - Tracks grabbed state for objects
 * - Applies velocity when objects are released in VR
 * - Updates activity timestamps for sleep management
 */

// Component implementation
const TogglePhysics = {
  init: function() {
    // Set up event handlers
    this.onPickup = this.onPickup.bind(this);
    this.onPutdown = this.onPutdown.bind(this);

    // Add event listeners
    this.el.addEventListener('pickup', this.onPickup);
    this.el.addEventListener('putdown', this.onPutdown);

    // Initialize last activity time for sleep management
    this.el.lastActivityTime = Date.now();
  },

  remove: function() {
    // Clean up event listeners
    this.el.removeEventListener('pickup', this.onPickup);
    this.el.removeEventListener('putdown', this.onPutdown);
  },

  /**
   * Handle pickup event
   * @param {Event} evt - The pickup event
   */
  onPickup: function(evt) {
    this.el.addState('grabbed');

    // Update activity timestamp for sleep management
    this.el.lastActivityTime = Date.now();

    // Emit grab-start event for sleep manager
    this.el.sceneEl.emit('grab-start', { target: this.el, el: this.el });

    // Ensure object is awake
    const physxBody = this.el.components['physx-body'];
    if (physxBody && physxBody.rigidBody) {
      physxBody.rigidBody.wakeUp();
    }
  },

  /**
   * Handle putdown event
   * @param {Event} evt - The putdown event
   */
  onPutdown: function(evt) {
    this.el.removeState('grabbed');

    // Update activity timestamp for sleep management
    this.el.lastActivityTime = Date.now();

    // Emit grab-end event for sleep manager
    this.el.sceneEl.emit('grab-end', { target: this.el, el: this.el });

    // Apply velocity from controller if available
    if (evt.detail.frame && evt.detail.inputSource) {
      try {
        const referenceSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
        const pose = evt.detail.frame.getPose(evt.detail.inputSource.gripSpace, referenceSpace);

        if (pose) {
          const physxBody = this.el.components['physx-body'];
          if (!physxBody || !physxBody.rigidBody) {
            console.warn('toggle-physics: No physx-body or rigidBody found on element:', this.el.id);
            return;
          }

          // Apply angular velocity if available
          if (pose.angularVelocity) {
            physxBody.rigidBody.setAngularVelocity(pose.angularVelocity);
          }

          // Apply linear velocity if available
          if (pose.linearVelocity) {
            physxBody.rigidBody.setLinearVelocity(pose.linearVelocity);
          }

          // Wake up the rigid body to ensure physics simulation
          physxBody.rigidBody.wakeUp();
        }
      } catch (error) {
        console.error('toggle-physics: Error applying velocity:', error);
      }
    }
  }
};

export default TogglePhysics;
