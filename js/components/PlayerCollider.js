/**
 * PlayerCollider - Adds a collider to the player to prevent moving through walls
 *
 * This component creates an invisible collider attached to the player's camera rig
 * to prevent jumping through walls and other objects.
 */

const PlayerCollider = {
  schema: {
    enabled: { type: 'boolean', default: true },
    height: { type: 'number', default: 1.8 },
    radius: { type: 'number', default: 0.3 }
  },

  init: function() {
    // Create the collider entity
    this.collider = document.createElement('a-entity');
    this.collider.setAttribute('id', 'player-collider');

    // Set up the collider with a cylinder geometry
    this.collider.setAttribute('geometry', {
      primitive: 'cylinder',
      height: this.data.height,
      radius: this.data.radius
    });

    // Make the collider invisible
    this.collider.setAttribute('material', {
      opacity: 0,
      transparent: true
    });

    // Add physics body to the collider
    // Use only supported properties for physx-body
    this.collider.setAttribute('physx-body', {
      type: 'kinematic'
    });

    // Add class for collision detection
    this.collider.classList.add('blocker');

    // Add the collider to the scene
    this.el.appendChild(this.collider);

    // Position the collider relative to the camera rig
    this.collider.setAttribute('position', {
      x: 0,
      y: this.data.height / 2, // Center the cylinder vertically
      z: 0
    });

    // Bind methods
    this.updateCollider = this.updateCollider.bind(this);
  },

  update: function() {
    if (this.collider) {
      // Update collider properties when component data changes
      this.collider.setAttribute('geometry', {
        height: this.data.height,
        radius: this.data.radius
      });

      this.collider.setAttribute('position', {
        x: 0,
        y: this.data.height / 2,
        z: 0
      });
    }
  },

  updateCollider: function() {
    // This method can be called to update the collider position
    // if the camera rig moves in ways other than through the physics system
    if (this.collider && this.data.enabled) {
      // Get the current position of the camera rig
      const rigPosition = this.el.object3D.position;

      // Update the collider's position to match the camera rig's position
      // but maintain its vertical offset
      this.collider.setAttribute('position', {
        x: 0,
        y: this.data.height / 2,
        z: 0
      });

      // Update the physics body position
      // Note: We don't need to manually update the transform
      // as A-Frame will handle this automatically in the next tick
    }
  },

  remove: function() {
    // Clean up when component is removed
    if (this.collider && this.collider.parentNode) {
      this.collider.parentNode.removeChild(this.collider);
    }
  }
};

export default PlayerCollider;
