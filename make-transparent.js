
//*SCRIPT TO ALLOW GLTF MODELS TO BECOME TRANSPARENT, well in this case INVISISBLE so they can act as colliders **//

AFRAME.registerComponent('make-transparent', {
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
});
