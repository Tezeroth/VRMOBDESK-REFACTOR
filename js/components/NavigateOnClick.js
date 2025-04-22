/**
 * NavigateOnClick - Handles navigation to other pages on click
 *
 * This component provides:
 * - Visual feedback on hover
 * - Navigation to specified URL on click
 * - Support for both VR and non-VR interaction
 */

// Component implementation
const NavigateOnClick = {
  schema: {
    target: { type: 'string' }, // Target URL
    hoverColor: { type: 'color', default: 'yellow' } // Hover color
  },

  init: function () {
    this.originalColors = new Map(); // Store original material colors or textures

    // Store original properties
    this.storeOriginalProperties();

    // Change material color on hover (works in non-VR and VR)
    this.el.addEventListener('mouseenter', () => {
      console.log('Mouseenter event on:', this.el.id);
      this.setHoverColor(true);
    });

    // Revert material color on mouse leave
    this.el.addEventListener('mouseleave', () => {
      console.log('Mouseleave event on:', this.el.id);
      this.setHoverColor(false);
    });

    // Handle navigation on mouse click (non-VR)
    this.el.addEventListener('click', (event) => {
      this.navigate();
      // Stop the event from propagating to underlying objects
      event.stopPropagation();
    });

    // Handle navigation via VR controller trigger (VR)
    this.el.sceneEl.addEventListener('triggerdown', (event) => {
      const controller = event.target; // The VR controller entity
      if (controller && controller.components && controller.components.raycaster) {
        const intersected = controller.components.raycaster.intersectedEls[0];
        if (intersected === this.el) {
          this.navigate();
          // Stop the event from propagating to underlying objects
          event.stopPropagation();
        }
      } else {
        console.warn('navigate-on-click: Triggerdown ignored, controller or raycaster not found on event target:', controller);
      }
    });
  },

  /**
   * Navigate to the target URL
   */
  navigate: function () {
    console.log('Navigate-on-click component received click for element:', this.el.id, 'Target:', this.data.target);
    if (this.data.target) {
      console.log(`Navigating to: ${this.data.target}`);
      window.location.href = this.data.target;
    } else {
      console.warn('No target URL specified for navigation.');
    }
  },

  /**
   * Store original material properties
   */
  storeOriginalProperties: function () {
    // For primitives, the mesh is immediately available
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      this.storeMeshColors(mesh);
    }

    // For models, wait for the `model-loaded` event
    this.el.addEventListener('model-loaded', () => {
      const mesh = this.el.getObject3D('mesh');
      if (mesh) {
        this.storeMeshColors(mesh);
      }
    });
  },

  /**
   * Store original colors for all materials in a mesh
   * @param {THREE.Object3D} mesh - The mesh to process
   */
  storeMeshColors: function (mesh) {
    mesh.traverse((node) => {
      if (node.isMesh && node.material && node.material.color) {
        this.originalColors.set(node, node.material.color.clone());
      }
    });
  },

  /**
   * Set or reset hover color on all materials
   * @param {boolean} hover - Whether to apply hover color (true) or restore original (false)
   */
  setHoverColor: function (hover) {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) return;

    mesh.traverse((node) => {
      if (node.isMesh) {
        const originalColor = this.originalColors.get(node);
        if (originalColor && node.material && node.material.color) {
          if (hover) {
            node.material.color.set(this.data.hoverColor);
          } else {
            node.material.color.copy(originalColor);
          }
        }
      }
    });
  },

  /**
   * Clean up event listeners and references
   */
  remove: function () {
    this.originalColors.clear();
  }
};

export default NavigateOnClick;
