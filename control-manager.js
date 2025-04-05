// Placeholder for Control Manager Logic
AFRAME.registerComponent('control-manager', {
  init: function() {
    console.log('Control Manager Initializing...');
    const sceneEl = this.el;

    // Directly check for DeviceManager (assuming it's loaded by now)
    if (typeof DeviceManager === 'undefined' || !DeviceManager.hasOwnProperty('isVR')) {
        console.error('DeviceManager not ready during control-manager init!');
        // Decide how to handle this - maybe wait briefly or setup default controls?
        // For now, we'll just log the error and attempt to continue.
    }

    // Proceed with setup using DeviceManager if available, otherwise it might fail
    const isVR = typeof DeviceManager !== 'undefined' ? DeviceManager.isVR : false; // Default to false if DeviceManager missing
    const isMobile = typeof DeviceManager !== 'undefined' ? DeviceManager.isMobile : !isVR; // Default to mobile if not VR and DeviceManager missing

    console.log(`Device Detected: VR=${isVR}, Mobile=${isMobile}`);

    const cameraRig = document.getElementById('cameraRig');
    const handyControlsEntity = cameraRig.querySelector('[material="color:gold;metalness:1;roughness:0;"]');
    const leftHand = document.getElementById('leftHand');
    const rightHand = document.getElementById('rightHand');

    if (isVR) {
      console.log("Setting up VR controls...");
      // --- VR Setup ---
      if (cameraRig) {
          cameraRig.setAttribute('movement-controls', 'camera: #camera; controls: keyboard, touch, gamepad;');
          cameraRig.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:0;exclude:.navmesh-hole;');
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
      const headCursor = document.querySelector('#camera > #cursor');
      if(headCursor) {
         headCursor.setAttribute('raycaster', 'objects: .clickable, .blocker, .pickupable');
      }
    } else { // Assuming not VR means Desktop/Mobile
      console.log("Setting up Desktop/Mobile controls...");
      // --- Desktop/Mobile Setup ---
      sceneEl.setAttribute('desktop-and-mobile-controls', '');
      sceneEl.setAttribute('arrow-controls', '');

      const camera = document.getElementById('camera');
      if (camera) {
          camera.setAttribute('look-controls', 'enabled: true; pointerLockEnabled: true;');
          camera.setAttribute('wasd-controls', '');
          camera.setAttribute('simple-navmesh-constraint', 'navmesh:.navmesh;fall:0.5;height:1.65;exclude:.navmesh-hole;');
      }

      const cursor = document.querySelector('#camera > #cursor');
      if(cursor) {
         cursor.setAttribute('raycaster', 'objects: .clickable, .blocker, .pickupable');
      } else {
         console.error("Cursor not found within #camera for Desktop/Mobile setup!");
      }
    }

    console.log("Control Manager Setup Complete.");
  }
}); 