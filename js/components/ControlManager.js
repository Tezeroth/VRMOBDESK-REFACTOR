/**
 * ControlManager - Manages control schemes based on device type
 *
 * This component is responsible for:
 * - Detecting device capabilities
 * - Setting up appropriate controls for VR or Desktop/Mobile
 * - Handling transitions between VR and non-VR modes
 */

import DeviceManager from '../managers/DeviceManager.js';
import LookModeManager from '../managers/LookModeManager.js';

const ControlManager = {
  schema: {
    mobileOptimize: { type: 'boolean', default: true }
  },

  init: function() {
    console.log("Control Manager Initializing...");

    // Store references to key elements
    this.sceneEl = this.el;
    this.cameraRig = document.querySelector('#cameraRig');
    this.camera = document.querySelector('#camera');
    this.leftHand = document.querySelector('#leftHand');
    this.rightHand = document.querySelector('#rightHand');

    // Find handy-controls entity
    this.handyControlsEntity = document.querySelector('[handy-controls]');
    if (!this.handyControlsEntity) {
      this.handyControlsEntity = this.cameraRig?.querySelector('[material*="color:gold"]');
      if (this.handyControlsEntity) {
        console.warn("ControlManager: Found handy-controls entity via material fallback.");
      } else {
        console.error("ControlManager: Did not find entity with [handy-controls] attribute or via material fallback during init.");
      }
    }

    // Initialize state
    this.isVRMode = false;
    this.isMobile = false;

    // Set up event listeners for VR mode changes
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

    // Initialize device detection
    DeviceManager.init().then(() => {
      // Update mobile status
      this.isMobile = DeviceManager.isMobile;
      console.log(`Control Manager: Initial Device Check - isVR: ${DeviceManager.isVR}, isMobile: ${this.isMobile}`);

      // Apply mobile optimizations if needed
      if (this.isMobile && this.data.mobileOptimize) {
        this.applyMobileOptimizations();
      }

      // Set up initial mode
      if (DeviceManager.isVR) {
        this.isVRMode = true;
        console.log("Initial state IS VR. Removing Desktop/Mobile components.");
        this.removeDesktopMobileMode();
        this.setupVRMode();
      } else {
        this.isVRMode = false;
        console.log("Initial state is Desktop/Mobile. Setting up.");
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

  /**
   * Apply optimizations for mobile devices
   */
  applyMobileOptimizations: function() {
    console.log("Mobile detected. Applying optimizations...");

    // Disable shadows from main light
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

    // Simplify materials for better performance
    document.querySelectorAll('[material]').forEach(el => {
      if (el.getAttribute('material') && !el.classList.contains('important-material')) {
        try {
          const material = el.getAttribute('material');
          // Only modify if it has metalness or roughness
          if (material.metalness !== undefined || material.roughness !== undefined) {
            el.setAttribute('material', 'roughness', 1);
            el.setAttribute('material', 'metalness', 0);
          }
        } catch (e) {
          // Ignore errors for individual materials
        }
      }
    });
  },

  /**
   * Set up VR mode controls
   */
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
        console.log(`Handy-controls attached: ${handyControlsAttached}`);

        // Update cursor color for feedback
        const cursor = this.camera?.querySelector('#cursor');
        if (cursor) {
          const newColor = handyControlsAttached ? 'blue' : 'red';
          cursor.setAttribute('material', 'color', newColor);
          cursor.setAttribute('visible', true);
        }
      } catch (e) {
        console.error("Error setting handy-controls attribute:", e);
      }
    } else {
      console.error("Handy controls entity not found!");
    }

    console.log("VR Mode Setup Complete.");
  },

  /**
   * Remove VR mode controls
   */
  removeVRMode: function() {
    console.log("Removing VR Mode components...");

    if (this.cameraRig) {
      this.cameraRig.removeAttribute('movement-controls');
      this.cameraRig.removeAttribute('simple-navmesh-constraint');
    }

    console.log("VR Mode Components Removed.");
  },

  /**
   * Set up Desktop/Mobile mode controls
   */
  setupDesktopMobileMode: function() {
    console.log("Setting up Desktop/Mobile Mode...");

    const cameraEl = document.querySelector('#camera');
    const cameraRig = document.querySelector('#cameraRig');
    const sceneEl = this.el.sceneEl;

    // Add necessary components if not present
    if (cameraEl && !cameraEl.hasAttribute('look-controls')) {
      cameraEl.setAttribute('look-controls', 'pointerLockEnabled: true; magicWindowTrackingEnabled: false');
    } else if (cameraEl) {
      // Ensure magicWindowTrackingEnabled is false for existing look-controls
      cameraEl.setAttribute('look-controls', 'magicWindowTrackingEnabled', false);
    }

    if (cameraRig && !cameraRig.hasAttribute('movement-controls')) {
      // Use movement-controls, enabling keyboard for WASD
      cameraRig.setAttribute('movement-controls', 'enabled: true; controls: keyboard; speed: 0.2; fly: false;');
      console.log("Setting movement-controls (keyboard) on cameraRig.");
    } else if (cameraRig) {
      // If it exists, ensure keyboard is enabled and set speed
      cameraRig.setAttribute('movement-controls', 'enabled', true);
      cameraRig.setAttribute('movement-controls', 'controls', 'keyboard');
      cameraRig.setAttribute('movement-controls', 'speed', 0.2);
      console.log("Updating existing movement-controls (keyboard) on cameraRig.");
    }

    // Add Navmesh Constraint for Desktop/Mobile
    if (cameraRig && !cameraRig.hasAttribute('simple-navmesh-constraint')) {
      cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0.01;exclude:.navmesh-hole;');
      console.log("Setting simple-navmesh-constraint for Desktop/Mobile mode.");
    }

    // Add mobile specific UI
    if (DeviceManager.isMobile) {
      console.log("Mobile detected, adding arrow controls UI.");
      if (!sceneEl.components['arrow-controls']) {
        sceneEl.setAttribute('arrow-controls', '');
      }

      // Initialize look mode manager for mobile
      if (DeviceManager.hasGyro) {
        LookModeManager.init();
      }
    } else {
      // Ensure arrow controls are removed if on desktop
      if (sceneEl.components['arrow-controls']) {
        sceneEl.removeAttribute('arrow-controls');
      }
    }

    // Add the main interaction component
    if (!sceneEl.components['desktop-mobile-controls']) {
      sceneEl.setAttribute('desktop-mobile-controls', '');
    }

    console.log("Desktop/Mobile Mode Setup Complete.");
  },

  /**
   * Remove Desktop/Mobile mode controls
   */
  removeDesktopMobileMode: function() {
    console.log("Removing Desktop/Mobile Mode components...");

    this.sceneEl.removeAttribute('desktop-mobile-controls');
    this.sceneEl.removeAttribute('arrow-controls');

    // Disable camera look/move controls typically used for desktop
    if (this.camera) {
      this.camera.setAttribute('look-controls', 'enabled', false);
    }

    // Remove constraint and movement-controls from cameraRig
    if (this.cameraRig) {
      this.cameraRig.removeAttribute('simple-navmesh-constraint');
      console.log("Removed simple-navmesh-constraint from cameraRig.");
      this.cameraRig.removeAttribute('movement-controls');
      console.log("Removed movement-controls from cameraRig.");
    }

    console.log("Desktop/Mobile Mode Components Removed.");
  },

  /**
   * Clean up event listeners
   */
  remove: function() {
    // Clean up event listeners
    this.sceneEl.removeEventListener('enter-vr', this.onEnterVR);
    this.sceneEl.removeEventListener('exit-vr', this.onExitVR);

    // Remove any active mode components
    this.removeVRMode();
    this.removeDesktopMobileMode();

    console.log("Control Manager Removed.");
  }
};

export default ControlManager;
