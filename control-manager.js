// Placeholder for Control Manager Logic
AFRAME.registerComponent('control-manager', {
  init: function() {
    // Check if DeviceManager is ready
    if (typeof DeviceManager === 'undefined' || !DeviceManager.hasOwnProperty('isVR')) {
      console.log('Control Manager: DeviceManager not ready, waiting...');
      setTimeout(this.init.bind(this), 100); // Retry after 100ms
      return; // Stop execution for this attempt
    }

    // --- DeviceManager is ready, proceed with setup --- 
    console.log('Control Manager Initializing... (DeviceManager ready)');
    const sceneEl = this.el;

    // Proceed with setup using DeviceManager
    const isVR = DeviceManager.isVR;
    const isMobile = DeviceManager.isMobile;

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
          // Check if physics is ready before adding handy-controls
          if (sceneEl.is('physics-ready')) {
            console.log("Physics ready, adding handy-controls.");
            handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
          } else {
            console.log("DeviceManager ready, but physics not yet. Waiting for physics to add handy-controls...");
            sceneEl.addEventListener('physics-ready', () => {
              console.log("Physics ready event received, adding handy-controls.");
              handyControlsEntity.setAttribute('handy-controls', 'materialOverride:right;');
            }, {once: true}); // Ensure listener runs only once
          }
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