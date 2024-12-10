/* jshint esversion: 9 */
/* global THREE, AFRAME */

/**
 * This script defines an "ar-cursor" component for A-Frame that emulates a cursor in AR mode.
 * In AR mode, the user doesn't have a traditional screen-space cursor or controller ray visible by default.
 * This component listens for WebXR "select" events (like a tap on the screen in AR mode) and:
 * - Casts a ray from the AR session's input source (like where the user tapped).
 * - Finds intersected elements in the A-Frame scene under that ray.
 * - Emits a "click" event on the first visible intersected element.
 * - Cancels any ongoing AR hit-test so the user can place objects or interact directly.
 * 
 * The component relies on A-Frame's raycaster component to do intersection tests.
 * After the AR session is started and a select event occurs, it updates the raycaster's origin 
 * and direction based on the pose of the input source at the time of selection.
 * It then performs intersection checks and triggers a click event on the first visible element found.
 */

(function() {
  "use strict";
  
  // A reusable vector for direction calculations
  const direction = new THREE.Vector3();

  AFRAME.registerComponent("ar-cursor", {
    dependencies: ["raycaster"], // Requires the raycaster component on this entity
    
    init() {
      const sceneEl = this.el;
      
      // When the scene enters VR (which includes AR mode), check if it's AR mode.
      // If so, add an event listener for the 'select' event on the xrSession.
      sceneEl.addEventListener("enter-vr", () => {
        if (sceneEl.is("ar-mode")) {
          // sceneEl.xrSession is the active WebXR session
          sceneEl.xrSession.addEventListener("select", this.onselect.bind(this));
        }
      });
    },
    
    /**
     * onselect(event):
     * 
     * Called when the user performs a "select" action in AR mode (e.g., tapping the screen).
     * This function:
     * - Gets the XR frame and input source.
     * - Obtains the pose of the input source's targetRaySpace relative to the scene's reference space.
     * - Updates the raycaster origin and direction based on the pose's position and orientation.
     * - Performs intersection checks with the scene to find any clickable elements.
     * - If it finds a visible element, it emits a click event on that element.
     * - It also disables the AR hit-test if one was running, presumably so the user can now interact.
     */
    onselect(e) {
      const frame = e.frame;            // The XRFrame at the time of select
      const inputSource = e.inputSource; // The XRInputSource that triggered the select (e.g., AR screen tap)
      const referenceSpace = this.el.renderer.xr.getReferenceSpace(); // The XR reference space in which poses are computed
      
      // Get the pose of the input source (like a ray) from the current frame
      const pose = frame.getPose(inputSource.targetRaySpace, referenceSpace);
      if (!pose) return; // If no pose, we can't do anything
      const transform = pose.transform;
      
      // Set direction to (0,0,-1), which points "forward" in local space,
      // then rotate this direction by the transform's orientation (quaternion) 
      // so it matches the direction the input source is pointing in AR.
      direction.set(0, 0, -1);
      direction.applyQuaternion(transform.orientation);
      
      // Update the raycaster component with the new origin and direction derived from the pose.
      // This effectively sets up a ray going from the input source forward into the scene.
      this.el.setAttribute("raycaster", {
        origin: transform.position,
        direction: direction
      });
      
      // Perform the intersection test now that we've updated the raycaster's origin and direction.
      this.el.components.raycaster.checkIntersections();
      
      // Get the array of intersected elements, sorted by distance.
      const els = this.el.components.raycaster.intersectedEls;
      
      // Loop through intersected elements:
      // We only want to "click" the first one that is actually visible (not hidden by a parent).
      for (const el of els) {
        const obj = el.object3D;
        let elVisible = obj.visible;
        
        // Check all ancestors in the scene graph to ensure none are invisible.
        obj.traverseAncestors(parent => {
          if (parent.visible === false ) {
            elVisible = false;
          }
        });
        
        if (elVisible) {
          // If the element is visible, we stop the AR hit-test. 
          // The 'ar-hit-test' component is often used to place objects on surfaces.
          // Canceling it means we no longer update placement, 
          // allowing the user to interact with the scene normally.
          this.el.components['ar-hit-test'].hitTest = null;
          this.el.components['ar-hit-test'].bboxMesh.visible = false;
          
          // Emit a "click" event on the intersected element, 
          // passing intersection details (like where the ray hit).
          const details = this.el.components.raycaster.getIntersection(el);
          el.emit('click', details);
          
          // Stop after the first visible element. We don't want multiple clicks on multiple elements.
          break;
        }
      }
    }
  });
})();
