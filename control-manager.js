// Refactored Control Manager using enter/exit VR events
AFRAME.registerComponent('control-manager', {
  init: function() {
    console.log("Control Manager Initializing...");
    this.sceneEl = this.el;
    this.cameraRig = document.querySelector('#cameraRig');
    this.camera = document.querySelector('#camera');
    this.leftHand = document.querySelector('#leftHand');
    this.rightHand = document.querySelector('#rightHand');
    // Find the entity holding the handy-controls component directly
    this.handyControlsEntity = document.querySelector('[handy-controls]'); 

    if (!this.handyControlsEntity) {
      // Attempt to find it via the material if the direct attribute selector fails (fallback)
      this.handyControlsEntity = this.cameraRig?.querySelector('[material*="color:gold"]');
      if (this.handyControlsEntity){
        console.warn("ControlManager: Found handy-controls entity via material fallback.");
      } else {
         console.error("ControlManager: Did not find entity with [handy-controls] attribute or via material fallback during init.");
      }
    }

    this.isVRMode = false;
    // We will set this.isMobile after DeviceManager finishes
    this.isMobile = false; 

    this.sceneEl.addEventListener('enter-vr', () => {
      console.log("Event: enter-vr detected.");
      this.isVRMode = true; 
      this.removeDesktopMobileMode();
      this.setupVRMode();
    });

    this.sceneEl.addEventListener('exit-vr', () => {
      console.log("Event: exit-vr detected.");
      if (this.isVRMode) { 
        this.isVRMode = false;
        this.removeVRMode();
        this.setupDesktopMobileMode();
      }
    });

    // ---- Revised Initial Setup Logic ----
    DeviceManager.init().then(() => {
      // Update mobile status now that DeviceManager is ready
      this.isMobile = DeviceManager.isMobile;
      console.log(`Control Manager: Initial Device Check - isVR: ${DeviceManager.isVR}, isMobile: ${this.isMobile}`);
      
      // Conditionally remove static colliders and disable shadows on mobile
      if (this.isMobile) {
          console.log("Mobile detected. Disabling shadows...");
          
          // Disable shadows from main light immediately
          const light = this.sceneEl.querySelector('#dirlight');
          if (light) {
              try {
                   if (light.components.light) {
                       light.setAttribute('light', 'castShadow', false);
                       console.log("Disabled shadow casting on #dirlight for mobile.");
                   } else {
                       console.warn("#dirlight found, but no light component to modify.");
                   }
              } catch (e) {
                   console.error("Error disabling shadows on #dirlight:", e);
              }
          } else {
               console.warn("Could not find #dirlight to disable shadows for mobile.");
          }
          
          // --- RE-ATTEMPT COMMENT OUT Mobile Collider Removal ---
          /* 
          console.log("Queueing collider removal for mobile...");
          // Delay removal slightly to ensure physics system is ready
          setTimeout(() => {
              console.log("Executing delayed collider removal for mobile...");
              const colliders = this.sceneEl.querySelectorAll('.venue-collider');
              console.log(`Found ${colliders.length} venue colliders to remove physics from.`);
              colliders.forEach(collider => {
                  if (collider.hasAttribute('physx-body')) {
                      collider.removeAttribute('physx-body');
                      // console.log(`Removed physx-body from ${collider.id || 'collider'}`);
                  }
              });
               console.log("Delayed collider removal complete.");
          }, 1000); // 1 second delay
          */
          // ---
      }
      
      if (DeviceManager.isVR) {
        this.isVRMode = true; 
        console.log("Initial state IS VR. Removing Desktop/Mobile components.");
        this.removeDesktopMobileMode();
      } else {
        this.isVRMode = false;
        console.log("Initial state is Desktop/Mobile. Setting up.");
        // Ensure setup occurs *after* potential collider removal
        this.setupDesktopMobileMode();
      }
      console.log("Control Manager Initial Setup Complete.");
    }).catch(error => {
        console.error("Error during DeviceManager initialization:", error);
        // Fallback to desktop/mobile if DeviceManager fails
        console.log("Fallback: Setting up Desktop/Mobile mode.");
        this.isVRMode = false;
        this.setupDesktopMobileMode();
    });
  },

  // ---- VR Mode Setup ----
  setupVRMode: function() {
    console.log("Setting up VR Mode...");
    this.removeDesktopMobileMode();

    if (this.cameraRig) {
      this.cameraRig.setAttribute('movement-controls', 'controls: checkpoint, nipple, trackpad, touch, gamepad, keyboard, mouse; speed:0.2;');
      this.cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0.01;exclude:.navmesh-hole;');
    } else {
      console.error("Camera Rig not found! Cannot set VR movement controls.");
    }

    if (this.camera) {
      this.camera.setAttribute('look-controls', 'enabled', false);
      const cursor = this.camera.querySelector('#cursor');
      if (cursor) cursor.setAttribute('visible', true);
      else console.warn("setupVRMode: Head cursor not found inside camera.");
    } else {
      console.error("Camera not found! Cannot disable look-controls.");
    }

    if (this.handyControlsEntity) {
      try {
        this.handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
        const handyControlsAttached = !!(this.handyControlsEntity.components && this.handyControlsEntity.components['handy-controls']);
        console.log(`Handy-controls attached: ${handyControlsAttached}`); // Keep this check
        // Keep cursor color logic for feedback
        const cursor = this.camera?.querySelector('#cursor');
        if (cursor) {
            const newColor = handyControlsAttached ? 'blue' : 'red';
            cursor.setAttribute('material', 'color', newColor);
            cursor.setAttribute('visible', true); // Ensure visible
        }
      } catch (e) {
        console.error("Error setting handy-controls attribute:", e);
      }
    } else {
      console.error("Handy controls entity not found!");
    }
    // Oculus Touch Controls assumed to be in HTML
    console.log("VR Mode Setup Complete.");
  },

  removeVRMode: function() {
    console.log("Removing VR Mode components...");
    if (this.cameraRig) {
      this.cameraRig.removeAttribute('movement-controls');
      this.cameraRig.removeAttribute('simple-navmesh-constraint');
    }
    console.log("VR Mode Components Removed.");
  },

  // ---- Desktop/Mobile Mode Setup ----
  setupDesktopMobileMode: function() {
    console.log("Setting up Desktop/Mobile Mode...");
    const cameraEl = document.querySelector('#camera');
    const cameraRig = document.querySelector('#cameraRig');
    const sceneEl = this.el.sceneEl;

    // Add necessary components if not present
    if (cameraEl && !cameraEl.hasAttribute('look-controls')) {
        cameraEl.setAttribute('look-controls', 'pointerLockEnabled: true');
    }
    if (cameraEl && !cameraEl.hasAttribute('wasd-controls')) {
        // <<< REDUCE ACCELERATION BY 25% >>>
        cameraEl.setAttribute('wasd-controls', 'fly: false; acceleration: 23;'); // Was 30
        console.log("Setting WASD controls with reduced acceleration (23).");
    } else if (cameraEl) {
         // If it exists, just set acceleration
         cameraEl.setAttribute('wasd-controls', 'acceleration', 23); // Was 30
         console.log("Updating existing WASD controls acceleration to 23.");
    }
    
    // Add mobile specific UI
    if (DeviceManager.isMobile) {
        console.log("Mobile detected, adding arrow controls UI.");
        if (!sceneEl.components['arrow-controls']) {
             sceneEl.setAttribute('arrow-controls', ''); 
        }
    } else {
         // Ensure arrow controls are removed if on desktop
         if (sceneEl.components['arrow-controls']) {
              sceneEl.removeAttribute('arrow-controls');
         }
    }

    // Add the main interaction component
    if (!sceneEl.components['desktop-and-mobile-controls']) {
        sceneEl.setAttribute('desktop-and-mobile-controls', '');
    }

    console.log("Desktop/Mobile Mode Setup Complete.");
  },

  removeDesktopMobileMode: function() {
    console.log("Removing Desktop/Mobile Mode components...");
    this.sceneEl.removeAttribute('desktop-and-mobile-controls');
    this.sceneEl.removeAttribute('arrow-controls');

    // Disable camera look/move controls typically used for desktop
    if (this.camera) {
      this.camera.setAttribute('look-controls', 'enabled', false);
      this.camera.removeAttribute('wasd-controls');
      this.camera.removeAttribute('simple-navmesh-constraint');
    }
    console.log("Desktop/Mobile Mode Components Removed.");
  },

  // ---- Cleanup ----
  remove: function() {
    // Clean up event listeners
    this.sceneEl.removeEventListener('enter-vr', this.onEnterVR);
    this.sceneEl.removeEventListener('exit-vr', this.onExitVR);
    // Remove any active mode components
    this.removeVRMode();
    this.removeDesktopMobileMode();
    console.log("Control Manager Removed.");
  }
}); 