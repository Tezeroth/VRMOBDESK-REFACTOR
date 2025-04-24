/**
 * MakeTransparent - Makes GLTF models transparent
 * 
 * This component makes GLTF models completely transparent,
 * which is useful for creating invisible colliders.
 */

const MakeTransparent = {
  init: function () {
    this.el.addEventListener('model-loaded', (e) => {
      const object3D = e.detail.model;

      // Traverse the GLTF model and make all materials transparent
      object3D.traverse((node) => {
        if (node.isMesh && node.material) {
          node.material.transparent = true; // Enable transparency
          node.material.opacity = 0;      // Set desired opacity
          node.material.depthWrite = false; // Prevent depth issues
        }
      });
    });
  }
};

export default MakeTransparent;
