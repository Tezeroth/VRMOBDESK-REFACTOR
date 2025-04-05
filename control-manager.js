// Placeholder for Control Manager Logic
AFRAME.registerComponent('control-manager', {
  init: function() {
    console.log('Control Manager Initializing...');
    const sceneEl = this.el;

    // Wait for physics to be ready before setting up controls
    sceneEl.addEventListener('physics-ready', () => {
      console.log('Physics ready, proceeding with control setup...');
      
      // Original logic moved inside the event listener
      // We assume DeviceManager is available globally by now
      if (typeof DeviceManager === 'undefined' || !DeviceManager.hasOwnProperty('isVR')) {
          console.error('DeviceManager not ready when physics became ready!');
          // Potentially add a fallback or error handling here
          return; // Exit if DeviceManager is missing
      }
      
      console.log(`Device Detected: VR=${DeviceManager.isVR}, Mobile=${DeviceManager.isMobile}`);

      const cameraRig = document.getElementById('cameraRig');
      const handyControlsEntity = cameraRig.querySelector('[material="color:gold;metalness:1;roughness:0;"]'); // Find entity based on existing attribute
      const leftHand = document.getElementById('leftHand');
      const rightHand = document.getElementById('rightHand');

      if (DeviceManager.isVR) {
        console.log("Setting up VR controls...");
        // --- VR Setup ---
        if (cameraRig) {
            cameraRig.setAttribute('movement-controls', 'camera: #camera; controls: keyboard, touch, gamepad;');
            cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0;exclude:.navmesh-hole;'); // Using original height:0
        }
        if (handyControlsEntity) {
            handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
        }
        if (leftHand) {
            leftHand.setAttribute('oculus-touch-controls', 'hand: left;');
        }
        if (rightHand) {
            rightHand.setAttribute('oculus-touch-controls', 'hand: right;');
        }
        // Ensure head cursor raycaster is configured (already set in HTML, but good practice)
        const headCursor = document.querySelector('#camera > #cursor');
        if(headCursor) {
           headCursor.setAttribute('raycaster', 'objects: .clickable, .blocker, .pickupable');
        }

      } else {
        console.log("Setting up Desktop/Mobile controls...");
        // --- Desktop/Mobile Setup ---
        sceneEl.setAttribute('desktop-and-mobile-controls', '');
        sceneEl.setAttribute('arrow-controls', ''); // arrow-controls adds its own UI if not in VR

        // Configure camera entity for desktop/mobile
        const camera = document.getElementById('camera');
        if (camera) {
            // Ensure look-controls are enabled (desktop-and-mobile-controls will manage pointerLock)
            camera.setAttribute('look-controls', 'enabled: true; pointerLockEnabled: true;');
            // Add WASD controls directly to the camera entity
            camera.setAttribute('wasd-controls', '');
            // Add navmesh constraint directly to the camera for wasd-controls compatibility
            camera.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:1.65;exclude:.navmesh-hole;'); // Use non-zero height
        }

         // Ensure head cursor raycaster is configured
        const cursor = document.querySelector('#camera > #cursor');
        if(cursor) {
           cursor.setAttribute('raycaster', 'objects: .clickable, .blocker, .pickupable');
        } else {
           console.error("Cursor not found within #camera for Desktop/Mobile setup!");
        }
      }

      console.log("Control Manager Setup Complete.");

    }); // End of physics-ready listener
  }
}); 