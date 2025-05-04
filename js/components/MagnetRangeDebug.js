/**
 * MagnetRangeDebug - Visualizes the range of magnetic interaction points
 * 
 * This component creates a visual representation of the magnetic interaction range
 * for debugging purposes. It creates a wireframe cylinder that follows the parent
 * object and shows the radial and vertical range of the magnet.
 */

const MagnetRangeDebug = {
  schema: {
    range: {type: 'vec2', default: {x: 0.2, y: 0.1}} // radial (X), vertical (Y)
  },

  init: function () {
    // Create a separate <a-entity> for the debug guide
    this.guideEl = document.createElement('a-entity');
    this.el.sceneEl.appendChild(this.guideEl);

    const rangeX = this.data.range.x; // Radial range
    const rangeY = this.data.range.y; // Vertical range

    // Use a cylinder wireframe to visualize the range
    // radius = rangeX, height = rangeY*2
    const geometryStr = `primitive: cylinder; radius: ${rangeX}; height: ${rangeY * 2}; segmentsRadial: 32;`;
    const materialStr = `color: #00ff00; wireframe: true; transparent: true; opacity: 0.5;`;

    // Set up the guide entity
    this.guideEl.setAttribute('geometry', geometryStr);
    this.guideEl.setAttribute('material', materialStr);
    this.guideEl.setAttribute('rotation', '90 0 0');    // Rotate so cylinder is vertical
    this.guideEl.setAttribute('physx-body', 'none');    // Ensure no physics on the guide
    this.guideEl.classList.add('magnet-guide');
  },

  tick: function () {
    // Each frame, copy the parent's world transform to the guide
    const obj = this.el.object3D;
    obj.updateMatrixWorld(true);

    // Decompose the parent's matrixWorld
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    obj.matrixWorld.decompose(pos, rot, scale);

    // Apply those transforms to the guide entity
    this.guideEl.object3D.position.copy(pos);
    this.guideEl.object3D.quaternion.copy(rot);
    this.guideEl.object3D.scale.copy(scale);
  },

  remove: function () {
    // Cleanup: remove the guide entity if this component is removed
    if (this.guideEl && this.guideEl.parentNode) {
      this.guideEl.parentNode.removeChild(this.guideEl);
    }
  }
};

export default MagnetRangeDebug;
