/* jshint esversion: 9 */
/* global THREE, AFRAME */

/**
 * This component enables object picking, moving, and dropping in both VR and non-VR modes (desktop and mobile).
 * It uses raycasting to detect objects and PhysX for physics-based interactions.
 */
/* jshint esversion: 9 */
/* global THREE, AFRAME */

/* jshint esversion: 9 */
/* global THREE, AFRAME */

/**
 * This component hides the entity when AR hit testing starts and shows it again when VR mode is exited.
 * Useful for indicators or placeholders that you only want visible before the AR scene is anchored.
 */
AFRAME.registerComponent("hide-on-hit-test-start", {
  init: function() {
    var self = this;
    // Listen for the "ar-hit-test-start" event fired by the scene when AR hit testing begins.
    this.el.sceneEl.addEventListener("ar-hit-test-start", function() {
      // When AR hit test starts, hide this element.
      self.el.object3D.visible = false;
    });
    // When exiting VR (or AR, since AR is a subset of VR modes), show the element again.
    this.el.sceneEl.addEventListener("exit-vr", function() {
      self.el.object3D.visible = true;
    });
  }
});

/**
 * This component resets the entity's position and rotation to the origin (0,0,0) when AR mode starts.
 * It listens to the scene's "enter-vr" event and checks if we are in AR mode.
 */
AFRAME.registerComponent("origin-on-ar-start", {
  init: function() {
    var self = this.el;

    this.el.sceneEl.addEventListener("enter-vr", function() {
      // "ar-mode" state is set by A-Frame when AR is activated.
      if (this.is("ar-mode")) {
        // Reset the entity's position and rotation so it aligns with the real-world AR starting point.
        self.setAttribute('position', {x:0,y:0,z:0});
        self.setAttribute('rotation', {x:0,y:0,z:0});
      }
    });
  }
});

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
  
  const direction = new THREE.Vector3();

  AFRAME.registerComponent("ar-cursor", {
    dependencies: ["raycaster"],
    
    init() {
      const sceneEl = this.el;
      sceneEl.addEventListener("enter-vr", () => {
        if (sceneEl.is("ar-mode")) {
          sceneEl.xrSession.addEventListener("select", this.onselect.bind(this));
        }
      });
    },
    
    onselect(e) {
      const frame = e.frame;
      const referenceSpace = this.el.sceneEl.renderer.xr.getReferenceSpace();
      const inputSource = e.inputSource;
      const pose = frame.getPose(inputSource.targetRaySpace, referenceSpace);

      if (!pose) {
        console.warn("No pose available for input source.");
        return;
      }

      const raycaster = this.el.components.raycaster;
      if (!raycaster) {
        console.error("Raycaster component not found on element.");
        return;
      }

      const origin = raycaster.data.origin;
      const direction = raycaster.data.direction;

      origin.copy(pose.transform.position);
      direction.set(0, 0, -1).applyQuaternion(pose.transform.orientation);

      raycaster.refreshObjects();
      const intersects = raycaster.intersectedEls;

      if (intersects.length > 0) {
        intersects[0].emit("click");
      }
    }
  });
})();

/**
 * This component handles navigation between scenes/pages based on user interaction.
 * It changes the color of the object when hovered over and handles navigation on click/trigger.
 */
/*
AFRAME.registerComponent('navigate-on-click', {
  schema: {
    target: { type: 'string' }, // Target URL
    hoverColor: { type: 'color', default: 'yellow' } // Hover color
  },
  init: function () {
    this.originalColors = new Map(); // Store original material colors or textures
    this.raycaster = this.el.components.raycaster;
    
    if (!this.raycaster) {
      console.error("Raycaster component not found on element.");
      return;
    }

    console.log("Raycaster initialized:", this.raycaster);

    this.el.addEventListener('mouseenter', this.onMouseEnter.bind(this));
    this.el.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.el.addEventListener('click', this.onClick.bind(this));
  },
  onMouseEnter: function () {
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      mesh.traverse((node) => {
        if (node.isMesh && node.material.color) {
          this.originalColors.set(node, node.material.color.clone());
          node.material.color.set(this.data.hoverColor);
        }
      });
    }
  },
  onMouseLeave: function () {
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      mesh.traverse((node) => {
        if (node.isMesh && this.originalColors.has(node)) {
          node.material.color.copy(this.originalColors.get(node));
        }
      });
    }
  },
  
  onClick: function () {
    if (this.data.target) {
      window.location.href = this.data.target;
    }
  }
});
*/

/**
 * This component enables object picking, moving, and dropping in both VR and non-VR modes (desktop and mobile).
 * It uses raycasting to detect objects and PhysX for physics-based interactions.
 */
AFRAME.registerComponent("universal-object-interaction", {
  schema: {
    pickupDistance: { type: "number", default: 5 }, // Max distance for picking up objects
    dropDistance: { type: "number", default: 10 }, // Max distance for dropping objects
    raycastTarget: { type: "selector", default: "#head [raycaster]" } // More specific: Raycaster on the camera cursor
  },

  init: function () {
    // Variables to track the currently picked-up object
    this.pickedObject = null;
    this.originalParent = null;
    this.originalPosition = new THREE.Vector3();
    this.originalQuaternion = new THREE.Quaternion();

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    // Add event listeners for non-VR inputs
    if (!this.el.sceneEl.is("vr-mode") && !this.el.sceneEl.is("ar-mode")) {
      this.el.sceneEl.canvas.addEventListener("mousedown", this.onMouseDown, { passive: false });
      this.el.sceneEl.canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
      this.el.sceneEl.canvas.addEventListener("mousemove", this.onMouseMove, { passive: false });
      this.el.sceneEl.canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
      this.el.sceneEl.canvas.addEventListener("mouseup", this.onMouseUp, { passive: false });
      this.el.sceneEl.canvas.addEventListener("touchend", this.onTouchEnd, { passive: false });
    }

    // Add event listeners for VR inputs
    this.el.sceneEl.addEventListener("triggerdown", this.onVRSelect.bind(this));
    this.el.sceneEl.addEventListener("triggerup", this.onVRDeselect.bind(this));
  },

  /**
   * Handle mouse down event (non-VR).
   */
  onMouseDown: function (event) {
    event.preventDefault();
    this.startInteraction(event.clientX, event.clientY);
  },

  /**
   * Handle touch start event (non-VR).
   */
  onTouchStart: function (event) {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.startInteraction(touch.clientX, touch.clientY);
    }
  },

  /**
   * Start interaction (pick up object).
   */
  startInteraction: function (x, y) {
    const raycaster = this.data.raycastTarget.components.raycaster;
    if (!raycaster || !raycaster.ray) {
      console.error("Raycaster not initialized.");
      return;
    }

    const camera = this.el.sceneEl.camera;

    // Convert screen coordinates to normalized device coordinates (NDC)
    const mouse = new THREE.Vector2();
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    // Set raycaster origin and direction
    raycaster.ray.origin.setFromMatrixPosition(camera.matrixWorld);
    raycaster.ray.direction.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(raycaster.ray.origin).normalize();

    // Perform raycasting
    const intersects = raycaster.intersectObjects(this.el.sceneEl.object3D.children, true);

    if (intersects.length > 0) {
      const object = intersects[0].object.el;
      if (object && object.components["physx-body"]) {
        this.pickUpObject(object);
      }
    }
  },

  /**
   * Handle mouse move event (non-VR).
   */
  onMouseMove: function (event) {
    event.preventDefault();
    this.updateInteraction(event.clientX, event.clientY);
  },

  /**
   * Handle touch move event (non-VR).
   */
  onTouchMove: function (event) {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.updateInteraction(touch.clientX, touch.clientY);
    }
  },

  /**
   * Update interaction (move object).
   */
  updateInteraction: function (x, y) {
    if (this.pickedObject) {
      const raycaster = this.data.raycastTarget.components.raycaster;
      const camera = this.el.sceneEl.camera;

      // Convert screen coordinates to normalized device coordinates (NDC)
      const mouse = new THREE.Vector2();
      mouse.x = (x / window.innerWidth) * 2 - 1;
      mouse.y = -(y / window.innerHeight) * 2 + 1;

      // Set raycaster origin and direction
      raycaster.ray.origin.setFromMatrixPosition(camera.matrixWorld);
      raycaster.ray.direction.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(raycaster.ray.origin).normalize();

      // Move the picked object along the ray
      const distance = this.data.pickupDistance;
      const newPosition = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(distance));
      this.pickedObject.setAttribute("position", newPosition);
    }
  },

  /**
   * Handle mouse up event (non-VR).
   */
  onMouseUp: function () {
    this.endInteraction();
  },

  /**
   * Handle touch end event (non-VR).
   */
  onTouchEnd: function () {
    this.endInteraction();
  },

  /**
   * End interaction (drop object).
   */
  endInteraction: function () {
    if (this.pickedObject) {
      this.dropObject(this.pickedObject);
      this.pickedObject = null;
    }
  },

  /**
   * Handle VR select event (pick up object).
   */
  onVRSelect: function (event) {
    const controller = event.detail.target;
    const intersects = controller.components.raycaster.intersectedEls;

    if (intersects.length > 0) {
      const object = intersects[0];
      if (object && object.components["physx-body"]) {
        this.pickUpObject(object);
      }
    }
  },

  /**
   * Handle VR deselect event (drop object).
   */
  onVRDeselect: function () {
    if (this.pickedObject) {
      this.dropObject(this.pickedObject);
      this.pickedObject = null;
    }
  },

  /**
   * Pick up an object.
   */
  pickUpObject: function (object) {
    this.pickedObject = object;
    this.originalParent = object.parentNode;
    this.originalPosition.copy(object.getAttribute("position"));
    this.originalQuaternion.copy(object.getAttribute("rotation"));

    // Attach the object to the camera (non-VR) or controller (VR)
    if (this.el.sceneEl.is("vr-mode")) {
      const controller = this.el.sceneEl.querySelector("[raycaster]");
      controller.appendChild(object);
    } else {
      this.el.sceneEl.camera.el.appendChild(object);
    }

    // Disable physics while the object is picked up
    object.components["physx-body"].rigidBody.setActivationState(4); // DISABLE_SIMULATION
  },

  /**
   * Drop an object.
   */
  dropObject: function (object) {
    // Re-enable physics
    object.components["physx-body"].rigidBody.setActivationState(1); // ENABLE_SIMULATION

    // Restore the object to its original position and parent
    this.originalParent.appendChild(object);
    object.setAttribute("position", this.originalPosition);
    object.setAttribute("rotation", this.originalQuaternion);
  },

  remove: function () {
    // Clean up event listeners
    this.el.sceneEl.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.el.sceneEl.canvas.removeEventListener("touchstart", this.onTouchStart);
    this.el.sceneEl.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.el.sceneEl.canvas.removeEventListener("touchmove", this.onTouchMove);
    this.el.sceneEl.canvas.removeEventListener("mouseup", this.onMouseUp);
    this.el.sceneEl.canvas.removeEventListener("touchend", this.onTouchEnd);
  }
});