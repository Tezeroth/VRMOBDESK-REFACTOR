// Refactored Control Manager using enter/exit VR events
AFRAME.registerComponent('control-manager', {
  init: function() {
    // Check if DeviceManager is ready (still needed for initial mobile check)
    if (typeof DeviceManager === 'undefined' || !DeviceManager.hasOwnProperty('isVR')) {
      console.log('Control Manager: DeviceManager not ready, waiting...');
      setTimeout(this.init.bind(this), 100);
      return;
    }
    console.log('Control Manager Initializing... (DeviceManager ready)');

    this.sceneEl = this.el;
    this.cameraRig = document.getElementById('cameraRig');
    this.camera = document.getElementById('camera');
    // Use a more robust selector for the entity holding handy-controls
    this.handyControlsEntity = this.cameraRig?.querySelector('[material*="color:gold"]');
    this.leftHand = document.getElementById('leftHand');
    this.rightHand = document.getElementById('rightHand');

    // Bind event handlers
    this.onEnterVR = this.onEnterVR.bind(this);
    this.onExitVR = this.onExitVR.bind(this);
    this.handleVRKeyDown = this.handleVRKeyDown.bind(this);

    // Setup initial mode based on detection (usually desktop/mobile first)
    this.setupInitialMode();

    // Listen for mode changes
    this.sceneEl.addEventListener('enter-vr', this.onEnterVR);
    this.sceneEl.addEventListener('exit-vr', this.onExitVR);

    console.log("Control Manager Initialized and listening for VR mode changes.");
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
    console.log("Setting up VR Mode Components (Boilerplate Alignment - Combined Physics Check/Wait)...");

    // Handy Controls - Add when physics is ready
    if (this.handyControlsEntity) {
        console.log("Found handyControlsEntity. Checking/waiting for physics to add handy-controls."); 
        
        // Check if physics is ALREADY ready
        if (this.sceneEl.is('physics-ready')) {
            console.log("Physics was already ready. Attempting to add handy-controls directly.");
            try {
                this.handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
                console.log("Successfully added handy-controls attribute directly (physics was ready).");
            } catch (e) {
                console.error("Error setting handy-controls attribute directly (physics was ready):", e);
            }
        } else {
            // If not ready yet, add a listener
            console.warn("Physics not ready yet. Adding one-time listener for physics-ready event...");
            this.sceneEl.addEventListener('physics-ready', () => {
                console.log("Physics-ready event received.");
                // Double-check we are still in VR mode and the entity exists when the event fires
                if (this.sceneEl.is('vr-mode') && this.handyControlsEntity) {
                   console.log("Attempting to add handy-controls attribute now via listener.");
                   try {
                       this.handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
                       console.log("Successfully added handy-controls attribute via physics-ready listener.");
                   } catch (e) {
                       console.error("Error setting handy-controls attribute via physics-ready listener:", e);
                   }
                } else {
                    console.log("Conditions not met (not VR mode or entity missing) when physics-ready fired.");
                }
            }, { once: true }); // Ensure it only runs once per enter-vr
        }
    } else {
        console.error("Handy controls entity not found! Cannot add handy-controls.");
    }

    // Oculus Touch Controls on specific hand entities
    if (this.leftHand) {
      this.leftHand.setAttribute('oculus-touch-controls', 'hand: left;');
      this.leftHand.removeAttribute('universal-object-interaction'); 
      console.log("Added oculus-touch-controls to leftHand.");
    }
    if (this.rightHand) {
      this.rightHand.setAttribute('oculus-touch-controls', 'hand: right;');
      this.rightHand.removeAttribute('universal-object-interaction'); 
      console.log("Added oculus-touch-controls to rightHand.");
    }
    
    // Restore VR Locomotion Controls to CameraRig
    if (this.cameraRig) {
      console.log("Adding VR movement-controls and navmesh constraint to cameraRig.");
      this.cameraRig.setAttribute('movement-controls', 'camera: #camera; controls: teleport, keyboard, touch, gamepad; speed: 0.15;'); 
      this.cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0;exclude:.navmesh-hole;');
    }

    // Camera adjustments (Keep cursor visible for VR)
    if (this.camera) {
        this.camera.removeAttribute('look-controls');
        this.camera.removeAttribute('wasd-controls');
        this.camera.removeAttribute('simple-navmesh-constraint');
        const cursor = this.camera.querySelector('#cursor');
        if (cursor) {
             console.log("Ensuring VR head cursor is visible.");
             cursor.setAttribute('visible', true); 
        }
    }

    console.log("VR Mode Setup Complete (Boilerplate Alignment - Combined Physics Check/Wait)...");
  },

  removeVRMode: function() {
    console.log("Removing VR Mode Components (Leaving HTML components)...");
    // Remove handy-controls - NO LONGER REMOVED
    /*
    if (this.handyControlsEntity) {
      this.handyControlsEntity.removeAttribute('handy-controls');
    }
    */
    // Remove Oculus controls - NO LONGER REMOVED
    /*
    if (this.leftHand) {
      this.leftHand.removeAttribute('oculus-touch-controls');
      this.leftHand.removeAttribute('universal-object-interaction');
    }
    if (this.rightHand) {
      this.rightHand.removeAttribute('oculus-touch-controls');
      this.rightHand.removeAttribute('universal-object-interaction');
    }
    */
    // Remove VR movement controls from cameraRig
    if (this.cameraRig) {
      this.cameraRig.removeAttribute('movement-controls');
      this.cameraRig.removeAttribute('simple-navmesh-constraint');
    }
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
      // Ensure arrows are removed if not mobile
      this.sceneEl.removeAttribute('arrow-controls');
    }

    // Configure camera for desktop/mobile with adjusted WASD speed
    if (this.camera) {
      this.camera.setAttribute('look-controls', 'enabled: true; pointerLockEnabled: true;');
      // Adjust WASD acceleration (default is 65)
      console.log("Setting WASD controls with reduced acceleration (30).");
      this.camera.setAttribute('wasd-controls', 'acceleration: 30;'); 
      this.camera.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:1.65;exclude:.navmesh-hole;');
      const cursor = this.camera.querySelector('#cursor');
      if (cursor) cursor.setAttribute('visible', true); // Show head cursor
    }

    console.log("Desktop/Mobile Mode Setup Complete.");
  },

  removeDesktopMobileMode: function() {
    console.log("Removing Desktop/Mobile Mode Components...");
    this.sceneEl.removeAttribute('desktop-and-mobile-controls');
    this.sceneEl.removeAttribute('arrow-controls'); // Remove arrows regardless

    if (this.camera) {
      this.camera.removeAttribute('look-controls');
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