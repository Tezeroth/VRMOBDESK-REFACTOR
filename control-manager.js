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
      console.log("EVENT: enter-vr detected by control-manager.");
      this.isVRMode = true; // Ensure flag is set
      console.log("-> Attempting VR transition steps..."); // Moved log up
      
      try {
          console.log("--> Calling removeDesktopMobileMode...");
          this.removeDesktopMobileMode(); 
          console.log("<-- removeDesktopMobileMode finished.");
      } catch (e) {
          console.error("*** ERROR during removeDesktopMobileMode in enter-vr listener:", e);
      }
      
      try {
          console.log("--> Calling setupVRMode...");
          this.setupVRMode();
          console.log("<-- setupVRMode finished.");
      } catch(e) {
           console.error("*** ERROR during setupVRMode in enter-vr listener:", e);
      }
      console.log("-> VR transition steps complete (or errors logged).");
    });

    this.sceneEl.addEventListener('exit-vr', () => {
      console.log("EVENT: exit-vr detected by control-manager.");
      if (this.isVRMode) { // Keep check here, only run if actually exiting VR mode
        this.isVRMode = false;
        console.log("Transitioning back to Desktop/Mobile Mode...");
        this.removeVRMode();
        this.setupDesktopMobileMode();
      }
    });

    // ---- Revised Initial Setup Logic ----
    DeviceManager.init().then(() => {
      // Update mobile status now that DeviceManager is ready
      this.isMobile = DeviceManager.isMobile;
      console.log(`Control Manager: Initial Device Check Complete - isVR: ${DeviceManager.isVR}, isMobile: ${this.isMobile}`);
      
      // Set initial state based *directly* on DeviceManager
      if (DeviceManager.isVR) {
        this.isVRMode = true; // Set internal flag immediately
        console.log("Initial state IS VR (Emulator/Device). Preemptively removing Desktop/Mobile components and waiting for 'enter-vr' event to setup VR mode.");
        // Remove potentially conflicting desktop components right away
        this.removeDesktopMobileMode(); 
        // **Crucially, DO NOT call setupVRMode here.** Wait for the 'enter-vr' event from user action.
      } else {
        this.isVRMode = false;
        console.log("Initial state is Desktop/Mobile. Setting up Desktop/Mobile mode.");
        // Explicitly remove any lingering VR components (safety check)
        this.removeVRMode(); 
        // Setup Desktop/Mobile as it's the initial state
        this.setupDesktopMobileMode();
      }
      console.log("Control Manager Initial Setup Complete. Listening for VR events.");
    }).catch(error => {
        console.error("Error during DeviceManager initialization:", error);
        // Fallback to desktop/mobile if DeviceManager fails
        console.log("Fallback: Setting up Desktop/Mobile mode due to DeviceManager error.");
        this.isVRMode = false;
        this.setupDesktopMobileMode();
    });
  },

  // Add temporary keydown handler for VR debugging
  handleVRKeyDown: function(event) {
      // Only act if in VR mode 
      if (!this.sceneEl.is('vr-mode')) return; 

      if (event.key === 'g') {
          console.log("VR Debug: 'g' key pressed. Attempting to emit squeezestart on right magnet.");
          const rightMagnet = document.getElementById('right-magnet');
          if (rightMagnet) {
              rightMagnet.emit('squeezestart', null, false); // Emit the event
              console.log("Emitted squeezestart on right-magnet.");
          } else {
              console.error("VR Debug: Could not find #right-magnet to emit event.");
          }
          event.preventDefault(); // Prevent default browser action
      }
       
       if (event.key === 'h') {
          console.log("VR Debug: 'h' key pressed. Attempting to emit squeezeend on right magnet.");
          const rightMagnet = document.getElementById('right-magnet');
          if (rightMagnet) {
              rightMagnet.emit('squeezeend', null, false); // Emit the event
              console.log("Emitted squeezeend on right-magnet.");
          } else {
              console.error("VR Debug: Could not find #right-magnet to emit event.");
          }
          event.preventDefault(); // Prevent default browser action
      }
  },

  // Determines the initial setup before any enter/exit events
  setupInitialMode: function() {
    if (this.sceneEl.is('vr-mode')) {
      console.log("Initial Mode: Already in VR. Setting up VR controls.");
      this.setupVRMode();
    } else {
      console.log("Initial Mode: Not in VR. Setting up Desktop/Mobile controls.");
      // Always start with desktop/mobile controls if not immediately in VR
      this.setupDesktopMobileMode();
    }
  },

  onEnterVR: function() {
    console.log("Event: enter-vr received.");
    this.removeDesktopMobileMode(); // Clean up desktop/mobile stuff
    this.setupVRMode();           // Setup VR stuff
  },

  onExitVR: function() {
    console.log("Event: exit-vr received.");
    this.removeVRMode();           // Clean up VR stuff
    this.setupDesktopMobileMode(); // Setup desktop/mobile stuff
  },

  // ---- VR Mode Setup ----
  setupVRMode: function() {
    console.log("Attempting to run setupVRMode..."); 

    // Remove desktop/mobile specific components first
    this.removeDesktopMobileMode();

    console.log("Setting up VR Mode Components (Boilerplate Alignment)...");

    // VR Movement Controls on cameraRig
    if (this.cameraRig) {
      console.log("Setting movement-controls and simple-navmesh-constraint on cameraRig for VR.");
      this.cameraRig.setAttribute('movement-controls', 'controls: checkpoint, nipple, trackpad, touch, gamepad, keyboard, mouse; speed:0.2;');
      this.cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0.01;exclude:.navmesh-hole;');
    } else {
      console.error("Camera Rig not found! Cannot set VR movement controls.");
    }

    // Look controls on camera (usually managed by VR headset)
    if (this.camera) {
      this.camera.setAttribute('look-controls', 'enabled', false); // Disable mouse/touch look in VR
       const cursor = this.camera.querySelector('#cursor');
       if (cursor) cursor.setAttribute('visible', true); // Ensure head cursor is visible
       else console.warn("setupVRMode: Head cursor not found inside camera.");
    } else {
        console.error("Camera not found! Cannot disable look-controls.");
    }

    // Handy Controls - Add directly
    console.log(`Checking for handyControlsEntity before adding component... Found: ${!!this.handyControlsEntity}`); 
    if (this.handyControlsEntity) {
        console.log("Found handyControlsEntity. Attempting to add handy-controls DIRECTLY.");
        let handyControlsAttached = false; // Flag
        try {
            this.handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
            // Check if component is actually attached
            handyControlsAttached = !!(this.handyControlsEntity.components && this.handyControlsEntity.components['handy-controls']);
            console.log(`Successfully attempted to add handy-controls. Attached: ${handyControlsAttached}`);
        } catch (e) {
            console.error("Error setting handy-controls attribute directly:", e);
            handyControlsAttached = false;
        }

        // Visual feedback via cursor color
        const cursor = this.camera?.querySelector('#cursor');
        console.log(`Cursor element found for color change? ${!!cursor}`); 
        if (cursor) {
            const newColor = handyControlsAttached ? 'blue' : 'red';
            console.log(`Setting head cursor color to ${newColor} based on handy-controls status.`); 
            cursor.setAttribute('material', 'color', newColor);
            cursor.setAttribute('visible', true);
        } else {
            console.warn("Could not find head cursor to update color.");
        }

    } else {
        console.error("Handy controls entity not found! Cannot add handy-controls.");
    }

    // Oculus Touch Controls on specific hand entities are expected to be in HTML
    console.log("Assuming Oculus Touch Controls are already present in HTML.");
    
    // --- DEBUG: Add event listeners for grip events --- 
    this.logGripDown = (evt) => { console.log(`*** GRIP DOWN detected on: ${evt.target.id}`); };
    this.logGripUp = (evt) => { console.log(`*** GRIP UP detected on: ${evt.target.id}`); };
    
    if (this.leftHand) {
        console.log("Adding gripdown/gripup listeners to leftHand");
        this.leftHand.addEventListener('gripdown', this.logGripDown);
        this.leftHand.addEventListener('gripup', this.logGripUp);
    } else { console.error("setupVRMode: LeftHand not found, cannot add listeners."); }
    
    if (this.rightHand) {
        console.log("Adding gripdown/gripup listeners to rightHand");
        this.rightHand.addEventListener('gripdown', this.logGripDown);
        this.rightHand.addEventListener('gripup', this.logGripUp);
    } else { console.error("setupVRMode: RightHand not found, cannot add listeners."); }
    // --- END DEBUG --- 

    console.log("VR Mode Setup Complete (Boilerplate Alignment - Direct Handy Controls)...");
  },

  removeVRMode: function() {
    console.log("Attempting to run removeVRMode..."); 
    console.log("Removing VR Mode Components (Leaving HTML components)...");
    // NOTE: handy-controls and oculus-touch-controls are NOT removed as they are in HTML now

    // --- DEBUG: Remove event listeners --- 
     if (this.leftHand) {
         console.log("Removing gripdown/gripup listeners from leftHand");
         this.leftHand.removeEventListener('gripdown', this.logGripDown);
         this.leftHand.removeEventListener('gripup', this.logGripUp);
     }
     if (this.rightHand) {
         console.log("Removing gripdown/gripup listeners from rightHand");
         this.rightHand.removeEventListener('gripdown', this.logGripDown);
         this.rightHand.removeEventListener('gripup', this.logGripUp);
     }
    // --- END DEBUG --- 

    // Remove VR movement controls from cameraRig
    if (this.cameraRig) {
      this.cameraRig.removeAttribute('movement-controls');
      this.cameraRig.removeAttribute('simple-navmesh-constraint');
    }

    // No need to explicitly reset cursor color here, setupDesktopMobileMode will handle it.

    console.log("VR Mode Components Removed (Except HTML components).");
  },

  // ---- Desktop/Mobile Mode Setup ----
  setupDesktopMobileMode: function() {
    console.log("Setting up Desktop/Mobile Mode Components...");

    // Add desktop/mobile interaction handler
    this.sceneEl.setAttribute('desktop-and-mobile-controls', '');

    // Add arrow UI only if mobile
    if (DeviceManager.isMobile) {
      console.log("Mobile detected, adding arrow controls UI.");
      this.sceneEl.setAttribute('arrow-controls', '');
    } else {
      this.sceneEl.removeAttribute('arrow-controls');
    }

    // Configure camera for desktop/mobile with adjusted WASD speed
    if (this.camera) {
      this.camera.setAttribute('look-controls', 'enabled: true; pointerLockEnabled: true;');
      console.log("Setting WASD controls with reduced acceleration (30).");
      this.camera.setAttribute('wasd-controls', 'acceleration: 30;');
      this.camera.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:1.65;exclude:.navmesh-hole;');
      const cursor = this.camera.querySelector('#cursor');
      if (cursor) {
           console.log("Setting head cursor color to lime and ensuring visible.");
           cursor.setAttribute('material', 'color', 'lime'); // Reset to default color
           cursor.setAttribute('visible', true);
      }
    }

    console.log("Desktop/Mobile Mode Setup Complete.");
  },

  removeDesktopMobileMode: function() {
    console.log("Removing Desktop/Mobile Mode Components...");
    this.sceneEl.removeAttribute('desktop-and-mobile-controls');
    this.sceneEl.removeAttribute('arrow-controls');

    // Disable camera look/move controls typically used for desktop
    if (this.camera) {
      this.camera.setAttribute('look-controls', 'enabled', false);
      this.camera.removeAttribute('wasd-controls');
      this.camera.removeAttribute('simple-navmesh-constraint');
       const cursor = this.camera.querySelector('#cursor');
       // Hide cursor in VR by default? Or let setupVRMode handle it?
       // Let's ensure setupVRMode makes it visible.
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