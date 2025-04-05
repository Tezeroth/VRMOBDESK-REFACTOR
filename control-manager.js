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

    // Setup initial mode based on detection (usually desktop/mobile first)
    this.setupInitialMode();

    // Listen for mode changes
    this.sceneEl.addEventListener('enter-vr', this.onEnterVR);
    this.sceneEl.addEventListener('exit-vr', this.onExitVR);

    console.log("Control Manager Initialized and listening for VR mode changes.");
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
    console.log("Setting up VR Mode Components...");

    // Handy Controls (Physics Dependent)
    if (this.handyControlsEntity) {
        // Check if physics is ready using the system
        if (this.sceneEl.systems.physics && this.sceneEl.systems.physics.driver) {
            console.log("Physics system ready, adding handy-controls.");
            this.handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
        } else {
            console.warn("Physics system not detected when entering VR. Waiting for physics-ready event...");
            // Add a one-time listener for physics-ready
            this.sceneEl.addEventListener('physics-ready', () => {
                console.log("Physics-ready event received AFTER entering VR. Adding handy-controls.");
                // Double-check we are still in VR and the entity exists
                if (this.sceneEl.is('vr-mode') && this.handyControlsEntity) {
                    this.handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
                }
            }, { once: true });
        }
    } else {
        console.error("Handy controls entity not found!");
    }

    // Hand Controllers & Interaction
    if (this.leftHand) {
      this.leftHand.setAttribute('oculus-touch-controls', 'hand: left;');
      this.leftHand.setAttribute('universal-object-interaction', 'pickupDistance: 5; dropDistance: 10;');
    }
    if (this.rightHand) {
      this.rightHand.setAttribute('oculus-touch-controls', 'hand: right;');
      this.rightHand.setAttribute('universal-object-interaction', 'pickupDistance: 5; dropDistance: 10;');
    }

    // Restore VR Locomotion Controls to CameraRig
    if (this.cameraRig) {
      console.log("Adding VR movement-controls and navmesh constraint to cameraRig.");
      this.cameraRig.setAttribute('movement-controls', 'camera: #camera; controls: teleport, keyboard, touch, gamepad; speed: 0.15;'); // Added speed adjustment
      this.cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0;exclude:.navmesh-hole;'); // VR height
    }

    // Camera adjustments (Disable desktop controls BUT keep cursor visible)
    if (this.camera) {
        this.camera.removeAttribute('look-controls');
        this.camera.removeAttribute('wasd-controls');
        this.camera.removeAttribute('simple-navmesh-constraint');
        // Ensure cursor is visible for VR interactions
        const cursor = this.camera.querySelector('#cursor');
        if (cursor) {
             console.log("Ensuring VR head cursor is visible.");
             cursor.setAttribute('visible', true); 
        }
    }

    console.log("VR Mode Setup Complete.");
  },

  removeVRMode: function() {
    console.log("Removing VR Mode Components...");
    if (this.handyControlsEntity) {
      this.handyControlsEntity.removeAttribute('handy-controls');
    }
    if (this.leftHand) {
      this.leftHand.removeAttribute('oculus-touch-controls');
      this.leftHand.removeAttribute('universal-object-interaction');
    }
    if (this.rightHand) {
      this.rightHand.removeAttribute('oculus-touch-controls');
      this.rightHand.removeAttribute('universal-object-interaction');
    }
    // Remove VR movement controls from cameraRig
    if (this.cameraRig) {
      this.cameraRig.removeAttribute('movement-controls');
      this.cameraRig.removeAttribute('simple-navmesh-constraint');
    }
    console.log("VR Mode Components Removed.");
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