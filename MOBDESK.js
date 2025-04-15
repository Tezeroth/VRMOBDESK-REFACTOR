// Register PhysX component
AFRAME.registerComponent('physx', {
  init: function() {
    this.el.sceneEl.systems.physx = this;
    this.initialized = false;
    this.initPhysX();
  },

  initPhysX: function() {
    const config = this.el.getAttribute('physx');
    if (!config) return;

    // Initialize PhysX with proper configuration
    this.el.sceneEl.setAttribute('physics-world-config', {
      maxSubSteps: 4,
      fixedTimeStep: 1/60,
      gravity: {x: 0, y: -9.81, z: 0},
      debug: false
    });

    this.initialized = true;
    this.el.sceneEl.emit('physx-ready');
  }
});

// Device Manager: Handles device detection, permissions, and capabilities
const DeviceManager = {
  isVR: false,
  isMobile: false,
  hasGyro: false,
  
  async init() {
    let vrSupported = false;
    // VR check
    if (navigator.xr) {
      try {
        vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      } catch (e) {
        vrSupported = false;
      }
    }
    
    // Mobile check
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    
    // Refined VR check: Consider VR true ONLY if supported AND NOT mobile
    this.isVR = vrSupported && !this.isMobile;
    
    // Gyro check
    this.hasGyro = window.DeviceOrientationEvent !== undefined;
    
    console.log(`DeviceManager Init Complete: vrSupported=${vrSupported}, isMobile=${this.isMobile}, Final isVR=${this.isVR}`); // Added detailed log
    return true;
  },

  async requestGyroPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        return false;
      }
    }
    return true;
  }
};

// Look Mode Manager: Handles switching between swipe and gyro modes
const LookModeManager = {
  currentMode: 'swipe',
  gyroEnabled: false,
  
  init() {
    this.currentMode = localStorage.getItem('lookMode') || 'swipe';
    this.createToggleButton();
    
    if (DeviceManager.hasGyro) {
      this.initGyro();
    }
  },

  createToggleButton() {
    const button = document.createElement('button');
    button.className = 'look-mode-btn';
    this.updateButtonText(button);
    
    button.addEventListener('click', async () => {
      if (this.currentMode === 'swipe') {
        if (await DeviceManager.requestGyroPermission()) {
          this.setMode('gyro');
        } else {
          this.showPermissionDenied();
        }
      } else {
        this.setMode('swipe');
      }
    });
    
    document.body.appendChild(button);
  },

  updateButtonText(button) {
    button.innerHTML = this.currentMode === 'swipe' ? '⇄' : '⟲';
    button.title = `${this.currentMode.toUpperCase()} MODE${DeviceManager.hasGyro ? ' (tap to switch)' : ''}`;
    button.disabled = !DeviceManager.hasGyro;
  },

  setMode(mode) {
    this.currentMode = mode;
    localStorage.setItem('lookMode', mode);
    this.updateButtonText(document.querySelector('.look-mode-btn'));
    
    if (mode === 'gyro') {
      this.enableGyro();
    } else {
      this.disableGyro();
    }
  },

  showPermissionDenied() {
    const overlay = document.createElement('div');
    overlay.className = 'permission-overlay';
    overlay.innerHTML = `
      <div class="permission-content">
        <h2>Gyroscope Permission Required</h2>
        <p>Please enable device orientation access to use gyroscope controls.</p>
        <button>OK</button>
      </div>
    `;
    
    overlay.querySelector('button').onclick = () => {
      overlay.remove();
    };
    
    document.body.appendChild(overlay);
  },

  initGyro() {
    window.addEventListener('deviceorientation', this.handleGyro.bind(this), false);
  },

  handleGyro(event) {
    if (!this.gyroEnabled || this.currentMode !== 'gyro') return;
    
    const camera = document.querySelector('#camera');
    if (!camera) return;

    const lookControls = camera.components['look-controls'];
    if (lookControls && lookControls.data.enabled) { 
        const yawObject = lookControls.yawObject; 
        const pitchObject = lookControls.pitchObject;

        // Revert to simple mapping: beta for pitch, -gamma for yaw
        const betaRad = THREE.MathUtils.degToRad(event.beta);
        const gammaRad = THREE.MathUtils.degToRad(-event.gamma); // Negate gamma often needed

        // Apply pitch 
        pitchObject.rotation.x = betaRad; 

        // Apply yaw 
        yawObject.rotation.y = gammaRad;
        
    }
  },

  enableGyro() {
    this.gyroEnabled = true;
    // Optional: Could try explicitly disabling look-controls internal updates here if needed
    // const lookControls = document.querySelector('#camera')?.components['look-controls'];
    // if (lookControls) lookControls.enabled = false; // Might disable pointer input too - needs care
  },

  disableGyro() {
    this.gyroEnabled = false;
    // Optional: Re-enable look-controls if disabled above
    // const lookControls = document.querySelector('#camera')?.components['look-controls'];
    // if (lookControls) lookControls.enabled = true;
  }
};

// Main Control Component: Handles desktop and mobile interactions
AFRAME.registerComponent('desktop-and-mobile-controls', {
  init: function () {
    this.camera = document.querySelector('#camera');
    this.heldObject = null;
    this.objectBeingInspected = null;
    this.inspectionMode = false;
    this.interactionState = 'idle';
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.lastTapTime = 0;  // For double tap detection
    this.cursor = document.querySelector('#cursor');
    this._tickFunction = null;
    this._originalPhysicsState = null;
    
    // Throwing mechanics vars
    this.chargeStartTime = 0;
    this.maxChargeTime = 1500; // Max charge time in ms (e.g., 1.5 seconds)
    this.minThrowForce = 5;  
    this.maxThrowForce = 10; // << REDUCED again for buddy (was 12)
    this.secondClickStartTime = 0; // Track the start time of a potential charge/drop click
    this.chargeThreshold = 200;  // ms threshold to differentiate click-drop from charge-hold

    // --- State for Relative Rotation (Optimized) --- 
    this.prevCameraWorldQuat = new THREE.Quaternion();      
    this.currentCameraWorldQuat = new THREE.Quaternion(); 
    this.deltaQuat = new THREE.Quaternion();             
    // <<< ADD Reusable Vectors for Tick >>>
    this.tempCameraWorldPos = new THREE.Vector3();
    this.tempDirection = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3(); 

    // --- State for Examine Mode Camera Restoration (Revised) ---
    this.cameraPitchOnEnterInspect = 0; // Store pitchObject.rotation.x
    this.rigYawOnEnterInspect = 0;      // Store yawObject.rotation.y

    // Bind methods
    this.onClick = this.onClick.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    // Add/Modify Listeners
    window.addEventListener('click', this.onClick);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyPress);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove);
    window.addEventListener('touchstart', this.onTouchStart);
    window.addEventListener('touchend', this.onTouchEnd);

    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isSwiping = false;
  },

  remove: function () {
    // Clean up all event listeners
    window.removeEventListener('click', this.onClick);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyPress);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchend', this.onTouchEnd);
    
    if (this._tickFunction) {
      this.el.sceneEl.removeEventListener('tick', this._tickFunction);
      this._tickFunction = null;
    }
    
    if (this.heldObject) {
      // Ensure dropped state is correct on removal
      if (this.releaseObject) {
          this.releaseObject(); 
      } else if (this.dropObject) { // Fallback if releaseObject wasn't defined yet
          this.dropObject();
      }
    }
    this.interactionState = 'idle';
  },
  
  // --- Input Handlers ---

  onClick: function (evt) {
    // Primarily handle non-pickupable clickables now
    if (DeviceManager.isMobile) return;
    if (this.interactionState !== 'idle') return; // Don't interfere if holding/charging/inspecting
    if (evt.target.classList.contains('arrow-btn') || evt.target.classList.contains('action-btn') || evt.target.closest('.arrow-controls')) return; 

    const headCursor = document.querySelector('#camera > #cursor');
    if (!headCursor || !headCursor.components.raycaster) return;
    const intersection = headCursor.components.raycaster.intersections[0];
    if (!intersection) return;

    const clickedEl = intersection.object.el;
    if (clickedEl.classList.contains('clickable')) {
      console.log("Desktop click on .clickable:", clickedEl.id);
      clickedEl.emit('click', null, false); 
    }
    // Pickup is handled by onMouseDown now
  },

  onMouseDown: function(evt) {
      if (DeviceManager.isMobile) return;
      if (evt.button !== 0) return; // Only react to left mouse button
      if (evt.target.classList.contains('arrow-btn') || evt.target.classList.contains('action-btn') || evt.target.closest('.arrow-controls')) return;

      if (this.interactionState === 'idle') {
          // Attempt pickup on mouse down
          const headCursor = document.querySelector('#camera > #cursor');
          if (!headCursor || !headCursor.components.raycaster) return;
          const intersection = headCursor.components.raycaster.intersections[0];
          if (intersection) {
              const clickedEl = intersection.object.el;
              if (clickedEl.classList.contains('pickupable')) {
                  this.pickupObject(clickedEl);
                  // MouseUp for this click will now do nothing, object stays held
              }
          }
      } else if (this.interactionState === 'holding' && this.heldObject) {
          // User is holding and clicks again. Record time, decide in tick or mouseup if it's a charge or drop.
          console.log("Second click detected while holding. Timing...");
          this.secondClickStartTime = Date.now();
          // DO NOT change state to charging yet
      }
  },

  onMouseUp: function(evt) {
      if (DeviceManager.isMobile) return;
      if (evt.button !== 0) return;

      if (this.interactionState === 'charging') {
          // Finish throw 
          const chargeDuration = Math.min(Date.now() - this.chargeStartTime, this.maxChargeTime);
          const chargeRatio = chargeDuration / this.maxChargeTime;
          const throwForce = this.minThrowForce + (this.maxThrowForce - this.minThrowForce) * chargeRatio;
          console.log(`Throwing with force: ${throwForce} (Charge: ${chargeRatio.toFixed(2)})`);

          const camera = this.camera;
          const direction = new THREE.Vector3(0, 0.2, -1); 
          const quaternion = new THREE.Quaternion();
          camera.object3D.getWorldQuaternion(quaternion);
          direction.applyQuaternion(quaternion);
          const throwVelocity = direction.multiplyScalar(throwForce);

          this.releaseObject(throwVelocity);
          this.resetCursorVisual();
          
          // <<< FIX: Re-enable movement-controls on cameraRig >>>
          const cameraRig = document.querySelector('#cameraRig');
          if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
             cameraRig.setAttribute('movement-controls', 'enabled', true);
             console.log("Re-enabled movement-controls on rig after throwing.");
          }
          // <<< END FIX >>>
          
      } else if (this.interactionState === 'holding' && this.secondClickStartTime > 0) {
          // Mouse was released *before* charge threshold was met in tick -> Quick click, so drop.
          console.log("Quick second click detected -> Dropping object.");
          this.releaseObject(); // Simple drop
          this.resetCursorVisual();
          // secondClickStartTime is reset inside releaseObject
      }
      // If state is 'holding' but secondClickStartTime is 0, it means this is the mouseup from the *initial* pickup click.
      // We do nothing in that case, letting the object remain held.
  },

  pickupObject: function (el) {
    console.log("desktop-and-mobile-controls: pickupObject - Attempting to pick up:", el.id);
    if (this.interactionState !== 'idle') { // Check state instead of just heldObject
        console.warn("desktop-and-mobile-controls: pickupObject - Cannot pick up, current state is:", this.interactionState);
        return; 
    }
    
    const currentBody = el.getAttribute('physx-body');
    if (!currentBody) {
        console.error("desktop-and-mobile-controls: pickupObject - Target has no physx-body!", el.id);
        return;
    }
    this._originalPhysicsState = AFRAME.utils.extend({}, currentBody);
    console.log("desktop-and-mobile-controls: pickupObject - Stored original state:", JSON.stringify(this._originalPhysicsState));
    
    // --- Destroy existing body and create fresh kinematic one --- 
    try {
        console.log("pickupObject: Removing existing physx-body...");
        el.removeAttribute('physx-body'); 
        console.log("pickupObject: Re-adding as kinematic...");
        el.setAttribute('physx-body', 'type', 'kinematic');
        console.log("desktop-and-mobile-controls: pickupObject - Set physx-body to kinematic for", el.id);
        
        this.heldObject = el;
        this.interactionState = 'holding'; 

        // --- Set Initial Object Rotation & Store Camera Quat --- 
        const camera = this.camera;
        if (camera) {
            camera.object3D.getWorldQuaternion(this.prevCameraWorldQuat); // Store current camera rotation for first tick
            
            // Calculate and apply default target world rotation (based on current camera, facing away)
            const rotYPi = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
            const initialObjectQuat = new THREE.Quaternion();
            initialObjectQuat.copy(this.prevCameraWorldQuat).multiply(rotYPi);

            this.heldObject.object3D.quaternion.copy(initialObjectQuat);
            this.heldObject.object3D.updateMatrix();
            console.log("Set initial held object rotation and stored camera quat.");
        }
        // ---

    } catch (e) {
      console.error("desktop-and-mobile-controls: pickupObject - Error removing/re-adding physx-body:", e);
      this.heldObject = null; 
      this.interactionState = 'idle'; 
      this._originalPhysicsState = null;
      return;
    }
    // --- Remove old velocity zeroing - not needed for fresh body --- 

    // Attach tick listener
    if (this._tickFunction) {
        this.el.sceneEl.removeEventListener('tick', this._tickFunction);
    }
    this._tickFunction = this.tick.bind(this);
    this.el.sceneEl.addEventListener('tick', this._tickFunction);
    console.log("desktop-and-mobile-controls: pickupObject - Added tick listener.");
  },
  
  // Renamed dropObject to releaseObject, handles both drop and throw
  releaseObject: function (velocity = null) { // Accepts optional velocity
    if (!this.heldObject) return;

    const el = this.heldObject;
    console.log("desktop-and-mobile-controls: releaseObject called for:", el.id);

    const position = el.object3D.position.clone();
    const quaternion = el.object3D.quaternion.clone();
    const originalDynamicState = this._originalPhysicsState ? AFRAME.utils.extend({}, this._originalPhysicsState) : { type: 'dynamic', mass: 1 }; 
    originalDynamicState.type = 'dynamic';
    const previousHeldObject = el; 

    // Stop the tick listener immediately
    if (this._tickFunction) {
      this.el.sceneEl.removeEventListener('tick', this._tickFunction);
      this._tickFunction = null;
      console.log("Removed tick listener during release.");
    }

    // --- State Cleanup (do this first) ---
    this.heldObject = null;
    this.interactionState = 'idle'; 
    this.chargeStartTime = 0; 
    this.secondClickStartTime = 0; 
    console.log("Cleared component state.");

    // --- Physics Handling: Destroy kinematic, Recreate dynamic, optionally apply velocity --- 
    try {
        // Destroy the current kinematic body
        console.log("releaseObject: Removing kinematic physx-body...");
        previousHeldObject.removeAttribute('physx-body');
        
        // Recreate the dynamic body using original stored state
        console.log("releaseObject: Re-adding as dynamic using stored state:", originalDynamicState);
        previousHeldObject.setAttribute('physx-body', originalDynamicState);

        // Restore transform *after* recreating body
        previousHeldObject.object3D.position.copy(position);
        previousHeldObject.object3D.quaternion.copy(quaternion);
        previousHeldObject.object3D.updateMatrix();
        console.log("Restored transform after recreating dynamic body.");
        
        // --- Apply Velocity with Minimal Delay ---
        if (velocity) {
            console.log(`Calculated throwVelocity: x=${velocity.x.toFixed(3)}, y=${velocity.y.toFixed(3)}, z=${velocity.z.toFixed(3)}`);
            console.log("Scheduling velocity application (setTimeout 0ms delay) after dynamic recreate...");
            // Use setTimeout with 0 delay to wait for next event loop tick
            setTimeout(() => {
                console.log(`Timeout (0ms): Attempting velocity for ${previousHeldObject.id}`);
                const bodyComponent = previousHeldObject.components['physx-body'];
                // Add extra check for component existence in timeout callback
                if (!bodyComponent) {
                    console.warn("Timeout (0ms): physx-body component disappeared before velocity apply?");
                    return;
                }
                const rigidBody = bodyComponent.rigidBody;
                const currentType = bodyComponent.data.type;
                console.log(`Timeout (0ms): Body type: ${currentType}, rigidBody exists? ${!!rigidBody}`);
                
                if (rigidBody && currentType === 'dynamic') { 
                    try {
                        const plainVelocity = { x: velocity.x, y: velocity.y, z: velocity.z };
                        const zeroAngular = { x: 0, y: 0, z: 0 }; 
                        console.log("Applying plain JS velocity object (0ms delay):", plainVelocity);
                        rigidBody.setAngularVelocity(zeroAngular, true); 
                        rigidBody.setLinearVelocity(plainVelocity, true); 
                        rigidBody.wakeUp();
                        console.log("Timeout (0ms): Successfully called setLinearVelocity/setAngularVelocity.");
                    } catch (eVelocity) {
                         console.error("Timeout (0ms): Error applying velocity:", eVelocity);
                    }
                } else {
                     console.warn(`Timeout (0ms): rigidBody not available or not dynamic.`);
                }
            }, 0); // Use 0ms delay
        } else {
            // Simple drop - body is now dynamic
            const bodyComponent = previousHeldObject.components['physx-body'];
            const rigidBody = bodyComponent ? bodyComponent.rigidBody : null;
            if (rigidBody) rigidBody.wakeUp();
            console.log("Simple drop: Body recreated as dynamic.");
        }
        // --- End Velocity Apply ---

    } catch (e) {
        console.error("Error removing/recreating dynamic physics body during release:", e);
        // Fallback transform restore
        try { previousHeldObject.object3D.position.copy(position); previousHeldObject.object3D.quaternion.copy(quaternion); previousHeldObject.object3D.updateMatrix(); } catch (eT) { console.error("Fallback transform error:", eT); }
    }
  },

  tick: function () {
    // Check if we need to transition from holding to charging
    if (this.interactionState === 'holding' && this.secondClickStartTime > 0) {
        if (Date.now() - this.secondClickStartTime > this.chargeThreshold) {
            console.log("Hold threshold exceeded -> Starting charge.");
            this.interactionState = 'charging';
            this.chargeStartTime = this.secondClickStartTime;
            this.secondClickStartTime = 0;
            if (this.cursor) this.cursor.setAttribute('material', 'color', 'yellow');

            // <<< FIX: Disable movement-controls on cameraRig >>>
            const cameraRig = document.querySelector('#cameraRig');
            if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
               cameraRig.setAttribute('movement-controls', 'enabled', false);
               console.log("Disabled movement-controls on rig for charging.");
            }
            // <<< END FIX >>>
        }
    }

    // Follow camera if holding OR charging - Incremental Relative Rotation (Revised Position Logic)
    if ((this.interactionState === 'holding' || this.interactionState === 'charging') && this.heldObject) {
        const isCharging = this.interactionState === 'charging';
        
        const camera = this.camera;
        const object3D = this.heldObject.object3D;
        const currentPosition = object3D.position.clone(); // Clone for logging
        // Use reusable vectors from 'this' for calculations
        const tempCameraWorldPos = this.tempCameraWorldPos;
        const tempDirection = this.tempDirection.set(0, 0, -1); // Reset direction vector
        const targetPosition = this.targetPosition; // Use reusable vector for target
        const currentCameraWorldQuat = this.currentCameraWorldQuat;
        const deltaQuat = this.deltaQuat;
        const prevCameraWorldQuat = this.prevCameraWorldQuat;

        // Calculate Position
        camera.object3D.getWorldPosition(tempCameraWorldPos); // Get camera world pos into temp vec
        camera.object3D.getWorldQuaternion(currentCameraWorldQuat); // Get camera world quat
        tempDirection.applyQuaternion(currentCameraWorldQuat); // Apply camera rot to direction vec
        targetPosition.copy(tempCameraWorldPos).add(tempDirection.multiplyScalar(2)); // Calculate target pos
        object3D.position.copy(targetPosition); // Apply final calculated position to object
        
        // Calculate Rotation Delta (Optimized)
        deltaQuat.copy(prevCameraWorldQuat).conjugate();
        deltaQuat.premultiply(currentCameraWorldQuat);
        // Apply delta rotation
        object3D.quaternion.premultiply(deltaQuat);

        // Store current camera rotation for next frame
        prevCameraWorldQuat.copy(currentCameraWorldQuat);
        
    }
    
    // Update charge visual feedback (only needs to happen if charging)
    if (this.interactionState === 'charging' && this.heldObject) {
        const chargeDuration = Math.min(Date.now() - this.chargeStartTime, this.maxChargeTime);
        const chargeRatio = chargeDuration / this.maxChargeTime;
        if (this.cursor) {
            const baseScale = 0.025; 
            const maxScaleMultiplier = 2.0;
            const scale = baseScale * (1 + chargeRatio * (maxScaleMultiplier - 1));
            const color = new THREE.Color(0xffff00).lerp(new THREE.Color(0xff0000), chargeRatio);
            this.cursor.setAttribute('geometry', 'radiusInner', scale * 0.8);
            this.cursor.setAttribute('geometry', 'radiusOuter', scale);
            this.cursor.setAttribute('material', 'color', `#${color.getHexString()}`);
        }
    } 
    // No tick updates needed if 'idle' or 'inspecting'
  },

  onKeyPress: function (evt) {
    console.log(`onKeyPress: code=${evt.code}, interactionState=${this.interactionState}`);
    if (evt.code === 'Space') {
        if (this.interactionState === 'holding' && this.heldObject) {
             console.log("onKeyPress: Space detected while holding -> Entering inspect.");
             this.toggleInspectionMode(); 
        } else if (this.interactionState === 'charging') {
            console.log("onKeyPress: Space detected while charging -> Cancelling throw.");
            // <<< FIX: Re-enable movement-controls on cameraRig >>>
            const cameraRig = document.querySelector('#cameraRig');
            if (cameraRig && cameraRig.hasAttribute('movement-controls')) {
               cameraRig.setAttribute('movement-controls', 'enabled', true);
               console.log("Re-enabled movement-controls on rig after cancelling charge.");
            }
            // <<< END FIX >>>
            this.interactionState = 'holding'; // Set state AFTER enabling controls
            this.chargeStartTime = 0;
            this.secondClickStartTime = 0; 
            this.resetCursorVisual(); 
        } else if (this.interactionState === 'inspecting') {
             console.log("onKeyPress: Space detected while inspecting -> Exiting inspect.");
             this.toggleInspectionMode();
        } else {
             console.log("onKeyPress: Space detected in other state, doing nothing.");
        }
    }
  },

  onTouchStart: function (evt) {
     // Handle two-finger tap for inspection (unchanged)
    if (evt.touches.length === 2 && this.interactionState === 'holding' && this.heldObject) {
      this.toggleInspectionMode();
      return;
    }
    
    // Ignore taps on UI buttons
    if (evt.target.classList.contains('arrow-btn') || evt.target.classList.contains('action-btn')) {
      return;
    }

    // Store touch start info for swipe detection and potential charge start
    this.touchStartX = evt.touches[0].clientX;
    this.touchStartY = evt.touches[0].clientY;
    this.touchStartTime = Date.now();
    this.isSwiping = false;
    this.prevMouseX = evt.touches[0].clientX;
    this.prevMouseY = evt.touches[0].clientY;
    
    // If holding an object, touching screen could potentially start charge?
    // Let's use the ACTION button for charge/throw on mobile for clarity.
    // So, onTouchStart doesn't initiate charge here.
  },

  onTouchMove: function (evt) {
    // *** Add check to prevent camera look while inspecting ***
    if (this.interactionState === 'inspecting') {
        // Handle inspection rotation (logic moved here)
         if (evt.touches.length !== 1 || !this.objectBeingInspected) return; // Need object ref
          const touch = evt.touches[0];
          const sensitivity = 0.005;
          const moveDeltaX = (touch.clientX - this.prevMouseX) * sensitivity;
          const moveDeltaY = (touch.clientY - this.prevMouseY) * sensitivity;
          
          const threshold = 0.001;
          const absX = Math.abs(moveDeltaX);
          const absY = Math.abs(moveDeltaY);
          
          // Use objectBeingInspected for rotation
          const objectToRotate = this.objectBeingInspected.object3D;
          const camera = document.querySelector('#camera'); // Still need camera for axis
          const cameraQuaternion = new THREE.Quaternion();
          camera.object3D.getWorldQuaternion(cameraQuaternion);
          
           if (absX > threshold && absX > absY * 2) {
              const yAxis = new THREE.Vector3(0, 1, 0);
              const rotation = new THREE.Quaternion().setFromAxisAngle(yAxis, -moveDeltaX);
              objectToRotate.quaternion.multiply(rotation);
          } else if (absY > threshold && absY > absX * 2) {
              const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
              const rotation = new THREE.Quaternion().setFromAxisAngle(xAxis, moveDeltaY);
              objectToRotate.quaternion.multiply(rotation);
          }
          objectToRotate.updateMatrix();
          
          this.prevMouseX = touch.clientX;
          this.prevMouseY = touch.clientY;
          this.isSwiping = true; // Prevent tap if inspecting
          return; // Exit function after handling inspection rotation
    }
    
    // Standard swipe look controls (only run if not inspecting)
    if (evt.touches.length !== 1) return;
    const touch = evt.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.isSwiping = true;
    }
    if (this.isSwiping) {
      const sensitivity = 0.005;
      const moveDeltaX = (touch.clientX - this.prevMouseX) * sensitivity;
      const moveDeltaY = (touch.clientY - this.prevMouseY) * sensitivity;
      const lookControls = this.camera.components['look-controls'];
      if (lookControls) {
        lookControls.yawObject.rotation.y += moveDeltaX;
        const newPitch = lookControls.pitchObject.rotation.x + moveDeltaY;
        lookControls.pitchObject.rotation.x = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, newPitch));
      }
    }
    this.prevMouseX = touch.clientX;
    this.prevMouseY = touch.clientY;
  },

  onTouchEnd: function (evt) {
    // Handle UI button taps separately (modified in arrow-controls potentially)
    if (evt.target.classList.contains('arrow-btn') || evt.target.classList.contains('action-btn')) {
      return; 
    }

    // If it was a swipe, or if inspecting, don't process as a tap for pickup/drop
    if (this.isSwiping || this.interactionState === 'inspecting') {
        this.isSwiping = false;
        return;
    }
    
    // --- Simplified Tap Logic --- 
    // Single tap to attempt pickup (if idle)
    // Double tap to drop (if holding)
    // Charging/Throwing handled by action buttons below
    if (this.interactionState === 'idle') {
        const headCursor = document.querySelector('#camera > #cursor');
        if (!headCursor || !headCursor.components.raycaster) return;
        const intersection = headCursor.components.raycaster.intersections[0];
        if (intersection) {
            const tappedEl = intersection.object.el;
            if (tappedEl.classList.contains('clickable')) {
                tappedEl.emit('click', null, false);
            } else if (tappedEl.classList.contains('pickupable')) {
                this.pickupObject(tappedEl);
            }
        }
    } else if (this.interactionState === 'holding') {
        const currentTime = Date.now();
        const tapLength = currentTime - this.lastTapTime;
        if (tapLength < 500 && tapLength > 0) { // Double tap
            console.log("Mobile double-tap: Dropping object");
            this.releaseObject(); // Simple drop
            this.resetCursorVisual();
        } 
        this.lastTapTime = currentTime;
    }
    
    this.isSwiping = false;
  },

  toggleInspectionMode: function () {
    console.log("toggleInspectionMode called, current state:", this.interactionState);
    
    if (!this.heldObject && this.interactionState !== 'inspecting') { 
        console.warn("Cannot toggle inspection from state:", this.interactionState, "Held object:", this.heldObject);
        // Ensure reset if called in weird state
        this.interactionState = 'idle';
        this.inspectionMode = false;
        this.objectBeingInspected = null;
        this.heldObject = null;
        this.resetCursorVisual();
        return;
    }
    
    const cameraEl = this.camera;
    const cameraRig = document.querySelector('#cameraRig'); 
    const lookControls = cameraEl ? cameraEl.components['look-controls'] : null;
    const arrowControlsComp = this.el.sceneEl.components['arrow-controls'];
    const objectToToggle = this.interactionState === 'holding' ? this.heldObject : this.objectBeingInspected;

    if (this.interactionState === 'holding' && objectToToggle) {
        // --- Entering inspection ---
        console.log("Entering inspection mode for:", objectToToggle.id);

        // --- Store Camera/Rig Euler Rotations from look-controls --- 
        if (lookControls && lookControls.pitchObject && lookControls.yawObject) {
            this.cameraPitchOnEnterInspect = lookControls.pitchObject.rotation.x;
            this.rigYawOnEnterInspect = lookControls.yawObject.rotation.y;
            console.log("Stored look-controls pitch/yaw angles:", this.cameraPitchOnEnterInspect, this.rigYawOnEnterInspect);
        } else {
             console.warn("Could not store look-controls pitch/yaw on entering inspect.");
        }
        // ---
        
        this.inspectionMode = true; 
        this.interactionState = 'inspecting';
        this.objectBeingInspected = objectToToggle;
        this.heldObject = null; 
        console.log("Stored objectBeingInspected, nulled heldObject.");
        
        // Remove body / stop tick
        objectToToggle.removeAttribute('physx-body'); 
        console.log("Removed physx-body for inspection.");
        if (this._tickFunction) {
            this.el.sceneEl.removeEventListener('tick', this._tickFunction);
            this._tickFunction = null;
             console.log("Removed tick listener for inspection.");
        }
        
        // <<< REVERT to using enabled flag >>>
        if (lookControls) { lookControls.data.enabled = false; console.log("Disabled look-controls."); }
        if (cameraRig && cameraRig.hasAttribute('movement-controls')) { 
            // Set enabled to false
            cameraRig.setAttribute('movement-controls', 'enabled', false); 
            console.log("Disabled movement-controls on rig for inspection."); 
        }
        // <<< END REVERT >>>

        if (this.cursor) this.cursor.setAttribute('material', 'color', 'red');

    } else if (this.interactionState === 'inspecting'){
        if (!this.objectBeingInspected) { 
             console.error("Exiting inspect: Lost reference!");
             this.interactionState = 'idle'; 
             this.inspectionMode = false;
             this.heldObject = null;
             this.objectBeingInspected = null; 
             this.resetCursorVisual(); // Reset cursor AFTER state is idle
             return;
        }
        const objRef = this.objectBeingInspected; 

       // --- Exiting inspection --- 
        console.log("Exiting inspection mode for:", objRef.id);
        this.inspectionMode = false;

       const inspectQuaternion = objRef.object3D.quaternion.clone(); 
       const inspectPosition = objRef.object3D.position.clone(); 

       // --- Restore look-controls pitch/yaw BEFORE enabling --- 
       if (lookControls && lookControls.pitchObject && lookControls.yawObject) {
           lookControls.pitchObject.rotation.x = this.cameraPitchOnEnterInspect;
           lookControls.yawObject.rotation.y = this.rigYawOnEnterInspect;
           console.log("Restored look-controls pitch/yaw angles.");
       } else {
            console.warn("Could not restore look-controls pitch/yaw angles.");
       }
       // ---

       // <<< ADD DIAGNOSTIC LOGGING >>>
       console.log("Exiting Inspect: Checking components before re-enabling movement...");
       if (cameraRig) {
           const constraint = cameraRig.getAttribute('simple-navmesh-constraint');
           const movement = cameraRig.getAttribute('movement-controls');
           console.log(`  - simple-navmesh-constraint present: ${!!constraint}`);
           console.log(`  - movement-controls present: ${!!movement}`);
           if (movement) {
               console.log(`  - movement-controls current enabled state: ${movement.enabled}`);
               console.log(`  - movement-controls current speed state: ${movement.speed}`);
           }
       } else {
           console.error("Exiting Inspect: Cannot find cameraRig!");
       }
       // <<< END DIAGNOSTIC LOGGING >>>

       // <<< REVERT to using enabled flag >>>
       if (lookControls) { lookControls.data.enabled = true; console.log("Re-enabled look-controls."); }
       if (cameraRig && cameraRig.hasAttribute('movement-controls')) { 
           // Set enabled to true
           cameraRig.setAttribute('movement-controls', 'enabled', true); 
           console.log("Re-enabled movement-controls on rig after inspection."); 
           // ... diagnostic log for speed (can keep for now) ...
       }
       // <<< END REVERT >>>
       
       // Request pointer lock (only if not mobile) - Needs to happen AFTER enabling controls
       if (!DeviceManager.isMobile) {
           setTimeout(() => {
               console.log("Requesting pointer lock after exiting inspection.");
               // Check if look-controls is actually enabled before locking
               const lookControlsEnabled = cameraEl?.components['look-controls']?.data.enabled ?? cameraEl?.getAttribute('look-controls')?.enabled ?? false;
               if (lookControlsEnabled) {
                   if (document.body && document.body.requestPointerLock) {
                       document.body.requestPointerLock();
                   } else { console.warn("Could not request pointer lock: document.body or method missing."); }
               } else { console.warn("Pointer lock requested but look-controls still disabled?"); }
           }, 50); // Delay for controls to potentially register as enabled
       }

       // Recreate dynamic body simply
       console.log("Recreating dynamic body simply to exit inspect...");
       try {
           objRef.setAttribute('physx-body', 'type', 'dynamic');
           console.log(`SetAttribute physx-body type: dynamic`);
           objRef.object3D.position.copy(inspectPosition); 
           objRef.object3D.updateMatrix();
           
           // Schedule kinematic switch 
           console.log("Scheduling kinematic switch (100ms delay)...", inspectQuaternion);
           setTimeout(() => {
               console.log(`Timeout (100ms): Setting back to kinematic for: ${objRef.id}`);
                try {
                    objRef.setAttribute('physx-body', 'type', 'kinematic');
                    console.log("Timeout (100ms): Set physx-body type to kinematic.");

                    // --- Apply Final Inspect Rotation & Store Camera Quat --- 
                    objRef.object3D.quaternion.copy(inspectQuaternion); // Apply final rotation
                    if (cameraEl) { 
                        cameraEl.object3D.getWorldQuaternion(this.prevCameraWorldQuat); // Store camera's rotation for next tick
                    }
                    console.log("Applied final inspect rotation and stored camera quat.");
                    // --- 

                    // Restore holding state fully 
                    this.interactionState = 'holding';
                    this.heldObject = objRef; 
                    this.objectBeingInspected = null; 
                    if (!this._tickFunction) {
                        this._tickFunction = this.tick.bind(this);
                        this.el.sceneEl.addEventListener('tick', this._tickFunction);
                        console.log("Timeout (100ms): Re-attached tick listener.");
                    }
                    this._originalPhysicsState = null; 
                    console.log("Timeout (100ms): Cleared original physics state.");
                    this.resetCursorVisual(); 

                } catch (eKinematic) {
                    console.error("Timeout (100ms): Error setting kinematic:", eKinematic);
                    this.interactionState = 'idle';
                    this.heldObject = null;
                    this.objectBeingInspected = null;
                    this._originalPhysicsState = null; 
                    this.resetCursorVisual();
                }
           }, 100); 

       } catch (eDynamic) {
           console.error("Error setting dynamic physics body on inspect exit:", eDynamic);
           this.interactionState = 'idle';
           this.heldObject = null;
           this.objectBeingInspected = null;
           this._originalPhysicsState = null; 
           this.resetCursorVisual();
       }
        
    } else {
         console.warn("Cannot toggle inspection from state:", this.interactionState, "Held object:", this.heldObject);
         // Ensure reset if called in weird state
         this.interactionState = 'idle';
         this.inspectionMode = false;
         this.objectBeingInspected = null;
         this.heldObject = null;
         this.resetCursorVisual();
    }
  },
  
  resetCursorVisual: function() {
      if (this.cursor) {
          const baseScale = 0.025;
          this.cursor.setAttribute('geometry', 'radiusInner', baseScale * 0.8);
          this.cursor.setAttribute('geometry', 'radiusOuter', baseScale);
          // Set color based on state (lime=idle/holding, red=inspecting)
          const color = this.interactionState === 'inspecting' ? 'red' : 'lime';
          this.cursor.setAttribute('material', 'color', color);
      }
  },

  onMouseMove: function (evt) {
     // Allow mouse rotation only if inspecting the correct object
     if (this.interactionState === 'inspecting') {
          if (!this.objectBeingInspected) return;
          const deltaX = evt.movementX * 0.005;
          const deltaY = evt.movementY * 0.005;
          // Rotate the object being inspected
          this.objectBeingInspected.object3D.rotateY(-deltaX);
          this.objectBeingInspected.object3D.rotateX(deltaY);
     } else {
         // If NOT inspecting, let look-controls handle it (or do nothing if look-controls are disabled elsewhere)
         // Currently, we don't manually handle camera look here, relying on look-controls component.
         // This branch might be unnecessary unless we implement manual look.
     }
  },
});

// Arrow Controls Component
AFRAME.registerComponent('arrow-controls', {
  init: function() {
    if (DeviceManager && DeviceManager.isVR) {
      return; 
    }

    this.moveState = {
      up: false, down: false, left: false, right: false
    };
    this.actionButtonDown = { pickup: false, examine: false }; // Track button down state
    this.pickupButtonStartTime = 0;

    const arrowControls = document.createElement('div');
    arrowControls.className = 'arrow-controls';

    const buttons = { up: '↑', left: '←', right: '→', down: '↓' };
    const actionButtons = { pickup: 'GRAB/THROW', examine: 'EXAMINE/CANCEL' };

    Object.entries(buttons).forEach(([direction, symbol]) => {
      const btn = this.createArrowButton(direction, symbol);
      arrowControls.appendChild(btn);
    });

    Object.entries(actionButtons).forEach(([action, label]) => {
      const btn = this.createActionButton(action, label);
      arrowControls.appendChild(btn);
    });

    document.body.appendChild(arrowControls);
  },
  
  // <<< ADD Helper Method >>>
  getMainControls: function() {
      // Add extra logging for debugging
      const controls = document.querySelector('a-scene')?.components['desktop-and-mobile-controls'];
      if (!controls) {
          console.warn("getMainControls: Could not find desktop-and-mobile-controls component.");
      }
      return controls;
  },

  createArrowButton: function(direction, symbol) {
      const btn = document.createElement('button');
      btn.className = 'arrow-btn';
      btn.id = `${direction}Btn`;
      btn.innerHTML = symbol;
      
      ['mousedown', 'touchstart'].forEach(eventType => {
        btn.addEventListener(eventType, (e) => {
          e.preventDefault(); e.stopPropagation();
          this.moveState[direction] = true;
        }, { passive: false, capture: true }); // Use passive:false for movement
      });

      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(eventType => {
        btn.addEventListener(eventType, (e) => {
          e.preventDefault(); e.stopPropagation();
          this.moveState[direction] = false;
        }, { capture: true });
      });

      btn.addEventListener('touchmove', (e) => {
        e.preventDefault(); e.stopPropagation();
      }, { passive: false, capture: true });

      return btn;
  },
  
  createActionButton: function(action, label) {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.id = `${action}Btn`;
      btn.innerHTML = label;
      
      // Use mousedown/touchstart for starting actions
      ['mousedown', 'touchstart'].forEach(eventType => {
         btn.addEventListener(eventType, (e) => {
             e.preventDefault(); e.stopPropagation();
             // <<< CALL Helper Method >>>
             const controls = this.getMainControls();
             if (!controls) { 
                 console.error(`Action button (${action}, ${eventType}) pressed, but controls component not found!`); 
                 return; 
             }
             
             this.actionButtonDown[action] = true;
             
             if (action === 'pickup') {
                 if (controls.interactionState === 'idle') {
                     // Attempt pickup
                     const cursor = document.querySelector('#cursor'); // Should this be camera cursor?
                     const intersection = cursor?.components.raycaster?.intersections[0];
                     if (intersection && intersection.object.el.classList.contains('pickupable')) {
                          console.log(`Action Button: Attempting pickup of ${intersection.object.el.id}`);
                         controls.pickupObject(intersection.object.el);
                     } else {
                          console.log("Action Button: Pickup attempted, but no pickupable object found at cursor.");
                     }
                 } else if (controls.interactionState === 'holding') {
                     // Start charging throw
                     console.log("Mobile: Start charging throw...");
                     controls.interactionState = 'charging';
                     controls.chargeStartTime = Date.now();
                     // this.pickupButtonStartTime = Date.now(); // Not needed if using chargeStartTime from controls
                     if (controls.cursor) controls.cursor.setAttribute('material', 'color', 'yellow'); 
                 }
             } else if (action === 'examine') {
                  if (controls.interactionState === 'holding') {
                      console.log("Action Button: Toggling inspection mode (entering)");
                      controls.toggleInspectionMode();
                  } else if (controls.interactionState === 'charging') {
                     console.log("Action Button: Cancelling throw charge");
                     controls.interactionState = 'holding'; 
                     controls.chargeStartTime = 0;
                     controls.resetCursorVisual(); 
                  } else if (controls.interactionState === 'inspecting') {
                      console.log("Action Button: Toggling inspection mode (exiting)");
                      controls.toggleInspectionMode(); // Exit inspection
                  }
             }
         }, { passive: false, capture: true });
      });
      
      // Use mouseup/touchend for finishing actions
      ['mouseup', 'touchend'].forEach(eventType => {
          btn.addEventListener(eventType, (e) => {
              e.preventDefault(); e.stopPropagation();
              // <<< CALL Helper Method >>>
              const controls = this.getMainControls();
               if (!controls) { 
                   // console.warn(`Action button (${action}, ${eventType}) released, but controls component not found.`); 
                   return; 
               }
               
              if (!this.actionButtonDown[action]) return; 
              this.actionButtonDown[action] = false;

              if (action === 'pickup') {
                  if (controls.interactionState === 'charging') {
                       // Finish throw
                        const chargeDuration = Math.min(Date.now() - controls.chargeStartTime, controls.maxChargeTime);
                        const chargeRatio = chargeDuration / controls.maxChargeTime;
                        const throwForce = controls.minThrowForce + (controls.maxThrowForce - controls.minThrowForce) * chargeRatio;
                        console.log(`Mobile: Throwing with force: ${throwForce} (Charge: ${chargeRatio.toFixed(2)})`);

                        const camera = controls.camera;
                        const direction = new THREE.Vector3(0, 0.2, -1); 
                        const quaternion = new THREE.Quaternion();
                        if (!camera || !camera.object3D) { console.error("Throw: Camera not found!"); return; }
                        camera.object3D.getWorldQuaternion(quaternion);
                        direction.applyQuaternion(quaternion);
                        const throwVelocity = direction.multiplyScalar(throwForce);

                        controls.releaseObject(throwVelocity); 
                        controls.resetCursorVisual();
                  } 
              }
              // this.pickupButtonStartTime = 0; // Reset here if used
          }, { capture: true });
      });

      // Handle leaving button area while holding (cancel charge)
      btn.addEventListener('mouseleave', (e) => {
           // <<< CALL Helper Method >>>
           const controls = this.getMainControls();
           
           if (this.actionButtonDown[action]) {
               console.log("Mouse left button while charging, cancelling.");
               this.actionButtonDown[action] = false;
               if (action === 'pickup' && controls && controls.interactionState === 'charging') { 
                  controls.interactionState = 'holding'; 
                  controls.chargeStartTime = 0;
                  controls.resetCursorVisual(); 
               }
               // this.pickupButtonStartTime = 0; // Reset here if used
           }
      }, { capture: true });

      return btn;
  },

  tick: function() { 
    // --- Check if inspecting --- 
    const controls = this.el.sceneEl.components['desktop-and-mobile-controls'];
    if (controls && controls.interactionState === 'inspecting') {
        console.log("Arrow controls movement blocked due to inspecting state."); // Keep this active
        return; // Do not process movement if inspecting
    }
    // ---
    
    if (!this.moveState) return;
    const cameraRig = document.querySelector('#cameraRig'); 
    if (!cameraRig) return;
    
    const camera = document.querySelector('#camera');
    if (!camera) return;
    const lookControls = camera.components['look-controls'];
    if (!lookControls) return; 

    const moveVector = new THREE.Vector3(0, 0, 0);
    const moveSpeed = 0.1875; // <<< REDUCE speed by 25% >>>

    if (this.moveState.up)    moveVector.z -= 1;
    if (this.moveState.down)  moveVector.z += 1;
    if (this.moveState.left)  moveVector.x -= 1;
    if (this.moveState.right) moveVector.x += 1;

    if (moveVector.lengthSq() === 0) return; 

    const yaw = lookControls.yawObject.rotation.y;
    const rotation = new THREE.Euler(0, yaw, 0, 'YXZ');
    moveVector.applyEuler(rotation);
    moveVector.normalize();
    moveVector.multiplyScalar(moveSpeed);
    
    // --- Negate the vector to reverse directions ---
    moveVector.negate(); 
    // ---
    
    cameraRig.object3D.position.add(moveVector);
  }
});

AFRAME.registerComponent('loading-screen-manager', {
    init: function () {
        console.log("loading-screen-manager: init called."); 
        this.boundOnLoad = this.onload.bind(this); // Bind once

        // Check if window.load already fired
        if (document.readyState === 'complete') {
            console.log("loading-screen-manager: init - document already complete, calling onload directly.");
            this.onload(); // Call onload immediately
        } else {
            console.log("loading-screen-manager: init - adding window.load listener.");
            window.addEventListener('load', this.boundOnLoad); // Add listener
        }
    },
    remove: function () { // <<< ADD remove function for cleanup >>>
        console.log("loading-screen-manager: remove called.");
        // Remove listener if it was added
        window.removeEventListener('load', this.boundOnLoad);
    },
    onload: function () {
        console.log("loading-screen-manager: onload triggered."); // Simplified log message
        const loadingOverlay = document.getElementById('loading-overlay');
        let timer = null; 

        const hideOverlay = () => {
            console.log("loading-screen-manager: hideOverlay function entered."); 
            if (!loadingOverlay) {
                 console.error("loading-screen-manager: hideOverlay - Could not find #loading-overlay element!"); 
                 return;
            }
            console.log("loading-screen-manager: hideOverlay - Found #loading-overlay element."); 
            
            try {
                 if (loadingOverlay.style.display !== 'none') {
                    console.log("loading-screen-manager: hideOverlay - Setting opacity to 0..."); 
                    loadingOverlay.style.opacity = '0';
                    setTimeout(() => {
                        console.log("loading-screen-manager: hideOverlay - Setting display to 'none' after fade."); 
                        loadingOverlay.style.display = 'none';
                        console.log("Hiding loading overlay (triggered by simple 10s timer)."); 
                    }, 500); 
                 } else {
                     console.log("loading-screen-manager: hideOverlay - Overlay already hidden."); 
                 }
            } catch (e) {
                console.error("loading-screen-manager: hideOverlay - Error applying styles:", e); 
            }
        };

        // --- Simplified Logic: Just use a timer --- 
        console.log("Starting simple 10-second timer for loading screen...");
        timer = setTimeout(() => {
            console.warn("10s timer triggered: Calling hideOverlay()."); 
            hideOverlay(); 
        }, 10000); 
        // --- End Simplified Logic ---
    }
}); 

// --- Function to Lock Screen Orientation ---
async function lockInitialOrientation() {
    console.log("Attempting to lock initial screen orientation...");
    try {
        // Check for screen.orientation support
        if (screen && screen.orientation && typeof screen.orientation.lock === 'function') {
            let lockType = "default"; // Corresponds to device default, often portrait
            
            // Determine current orientation type
            const currentType = screen.orientation.type;
            console.log(`Current orientation type: ${currentType}`);

            if (currentType.startsWith('landscape')) {
                lockType = 'landscape';
            } else if (currentType.startsWith('portrait')) {
                lockType = 'portrait';
            } // Keep 'default' if unknown type

            console.log(`Attempting to lock to: ${lockType}`);
            await screen.orientation.lock(lockType);
            console.log(`Screen orientation successfully locked to ${lockType}.`);
        
        } else {
            console.warn("Screen Orientation Lock API not fully supported on this browser/device.");
        }
    } catch (error) {
        console.error("Screen orientation lock failed:", error);
        // This might happen if the browser requires user interaction first,
        // or if the specific lock type is not allowed.
    }
}
// ---

window.addEventListener('load', async () => {
  await DeviceManager.init();
  
  if (DeviceManager.isMobile) { 
      await lockInitialOrientation();
  }

  // Initialize Managers needed before hiding overlay
  if (!DeviceManager.isVR) {
    LookModeManager.init(); 
    // Make sure Control Manager setup is called *before* the timeout starts.
    // Assuming control-manager component initializes itself, or is triggered elsewhere early.
  }
  
  // <<< ADD Check after load >>>
  setTimeout(() => {
      console.log("Check inside window.load (after 1s delay): AFRAME.components['loading-screen-manager'] exists?", 
                  AFRAME.components.hasOwnProperty('loading-screen-manager'));
  }, 1000);
  // <<< End Add Check >>>
  
}); 

// <<< ADD Check at end of script >>>
console.log("Check at end of MOBDESK.js: AFRAME.components['loading-screen-manager'] exists?", 
            AFRAME.components.hasOwnProperty('loading-screen-manager'));
// <<< End Add Check >>> 