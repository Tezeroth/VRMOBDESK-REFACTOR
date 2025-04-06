AFRAME.registerComponent("toggle-physics", {
  init: function() {
    this.originalColor = null;
    // Delay slightly to increase chance of model being loaded
    setTimeout(() => {
        const mesh = this.el.getObject3D('mesh');
        if (mesh && mesh.material && mesh.material.color) {
            this.originalColor = mesh.material.color.getStyle(); // Store original color as CSS string
            console.log(`toggle-physics init on ${this.el.id}: Stored original color ${this.originalColor}`);
        } else {
             console.warn(`toggle-physics init on ${this.el.id}: Could not find mesh material color to store.`);
        }
    }, 500); // 500ms delay
  },
  events: {
    pickup: function() {
      console.log(`*** toggle-physics: PICKUP event detected on ${this.el.id}`);
      // --- Visual Feedback --- 
      this.el.setAttribute('material', 'color', 'lime'); // Set color to green on pickup
      // --- End Feedback --- 
      this.el.addState('grabbed');
    },
    putdown: function(e) {
      console.log(`*** toggle-physics: PUTDOWN event detected on ${this.el.id}`);
       // --- Visual Feedback --- 
      if (this.originalColor) {
          this.el.setAttribute('material', 'color', this.originalColor); // Restore original color
      } else {
           this.el.setAttribute('material', 'color', 'yellow'); // Fallback to yellow if original wasn't stored
      }
      // --- End Feedback --- 
      this.el.removeState('grabbed');
      
      // --- TEST: Skip applying release velocity ---
      console.log(`*** toggle-physics: SKIPPING velocity application on putdown for ${this.el.id}`);
      /* 
      if (e.detail.frame && e.detail.inputSource) {
        const referenceSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
        const pose = e.detail.frame.getPose(e.detail.inputSource.gripSpace, referenceSpace);
        if (pose && pose.angularVelocity) {
          this.el.components['physx-body'].rigidBody.setAngularVelocity(pose.angularVelocity);
        }
        if (pose && pose.linearVelocity) {
          this.el.components['physx-body'].rigidBody.setLinearVelocity(pose.linearVelocity);
        }
      }
      */
      // --- END TEST ---
    }
  }
});



// Once the DOM content is fully loaded, run this setup function.
window.addEventListener("DOMContentLoaded", function() {
  console.log("DOMContentLoaded");
  // ... existing code ...
});