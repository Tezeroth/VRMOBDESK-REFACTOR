/**
 * PhysicsSyncManager - Synchronizes physics across multiple devices
 *
 * This component:
 * - Detects device capabilities and network conditions
 * - Negotiates a common physics tick rate with all connected clients
 * - Implements interpolation and prediction for smooth physics
 * - Synchronizes physics states across the network
 */

const PhysicsSyncManager = {
  schema: {
    enabled: { type: 'boolean', default: true },
    minTickRate: { type: 'number', default: 20 }, // Minimum acceptable tick rate (Hz)
    maxTickRate: { type: 'number', default: 60 }, // Maximum tick rate (Hz)
    adaptiveSync: { type: 'boolean', default: true }, // Dynamically adjust based on network conditions
    interpolation: { type: 'boolean', default: true }, // Enable interpolation for smoother visuals
    authorityMode: { type: 'string', default: 'host', oneOf: ['host', 'distributed'] }, // Physics authority model
    syncInterval: { type: 'number', default: 100 }, // How often to sync in ms
    debug: { type: 'boolean', default: false } // Enable debug logging
  },

  init: function() {
    this.isInitialized = false;
    this.physicsSystemReady = false;
    this.physXEventFired = false;
    this.physxSystemInspected = false;
    this.connectedPeers = new Map();
    this.negotiatedTickRate = null;
    this.localCapabilities = {};
    this.syncedObjects = new Map();
    this.lastSyncTime = 0;
    this.lastLatencyCheckTime = 0;
    this.networkLatencies = new Map();
    this.isHost = false;
    this.initAttempts = 0; 
    this.maxInitAttempts = 10; // Increased attempts, will be controlled by tick

    // Bind methods
    this.detectDeviceCapabilities = this.detectDeviceCapabilities.bind(this);
    this.negotiateTickRate = this.negotiateTickRate.bind(this);
    this.syncPhysicsState = this.syncPhysicsState.bind(this);
    this.applyPhysicsState = this.applyPhysicsState.bind(this);
    this.onPeerConnect = this.onPeerConnect.bind(this);
    this.onPeerDisconnect = this.onPeerDisconnect.bind(this);
    this.onPhysicsMessage = this.onPhysicsMessage.bind(this);
    this.initializeSync = this.initializeSync.bind(this);
    this.onPhysXCustomStarted = this.onPhysXCustomStarted.bind(this); // Bind new handler

    console.log('PhysicsSyncManager: Component instance created. Waiting for physics system in tick and physx-started event.');

    // Listen for the physx-started event (emitted by LoadingScreenManager or potentially the physics system itself)
    this.el.sceneEl.addEventListener('physx-started', this.onPhysXCustomStarted, { once: true });

    // Listen for multiplayer events - these are fine
    this.el.sceneEl.addEventListener('peer-connected', this.onPeerConnect);
    this.el.sceneEl.addEventListener('peer-disconnected', this.onPeerDisconnect);
    this.el.sceneEl.addEventListener('physics-message', this.onPhysicsMessage);
  },

  tick: function(time, timeDelta) {
    if (!this.data.enabled) return;

    if (!this.physicsSystemReady) {
      const sceneEl = this.el.sceneEl;
      const physicsSystem = sceneEl.systems.physx;
      const scenePhysicsComponent = sceneEl.components.physx;

      // Only do intensive checks and logging after physx-started event might have occurred
      if (this.physXEventFired && !this.physxSystemInspected && physicsSystem) {
        console.log('PhysicsSyncManager: systems.physx object is defined AND physx-started event received. Inspecting:', physicsSystem);
        console.log('PhysicsSyncManager: Keys of systems.physx:', Object.keys(physicsSystem));
        if (typeof physicsSystem.init === 'function') console.log('PhysicsSyncManager: systems.physx has an init() method (called by A-Frame).');
        if (typeof physicsSystem.play === 'function') console.log('PhysicsSyncManager: systems.physx has a play() method (called by A-Frame).');
        
        // Check for new candidate properties
        if (physicsSystem.hasOwnProperty('PhysX')) {
            console.log('PhysicsSyncManager: Found systems.physx.PhysX:', physicsSystem.PhysX);
        } else {
            console.log('PhysicsSyncManager: systems.physx.PhysX NOT found.');
        }
        if (physicsSystem.hasOwnProperty('scene')) {
            console.log('PhysicsSyncManager: Found systems.physx.scene:', physicsSystem.scene);
        } else {
            console.log('PhysicsSyncManager: systems.physx.scene NOT found.');
        }
        if (physicsSystem.hasOwnProperty('physXInitialized')) {
            console.log('PhysicsSyncManager: Found systems.physx.physXInitialized:', physicsSystem.physXInitialized);
        } else {
            console.log('PhysicsSyncManager: systems.physx.physXInitialized NOT found.');
        }
        // Keep the original driver/world check for completeness of the inspection log, though we expect them to be undefined
        if (physicsSystem.driver) {
            console.log('PhysicsSyncManager: systems.physx.driver found upon inspection after physx-started (LEGACY CHECK):', physicsSystem.driver);
            if (physicsSystem.driver.world) {
                console.log('PhysicsSyncManager: systems.physx.driver.world also found upon inspection (LEGACY CHECK).');
            }
        } else {
            console.log('PhysicsSyncManager: systems.physx.driver NOT found upon inspection (LEGACY CHECK).');
        }
        this.physxSystemInspected = true; // Mark as inspected
      }

      if (this.initAttempts % 60 === 0) { // Log details periodically
        console.log('PhysicsSyncManager (Tick Check V5 - checking new properties): Waiting for PhysX. Current state:', 
                    'physXEventFired:', this.physXEventFired,
                    'sceneEl.hasLoaded:', sceneEl.hasLoaded,
                    'physicsSystem defined:', !!physicsSystem, 
                    'physicsSystem.PhysX defined:', !!(physicsSystem && physicsSystem.PhysX),
                    'physicsSystem.scene defined:', !!(physicsSystem && physicsSystem.scene),
                    'physicsSystem.physXInitialized:', (physicsSystem ? physicsSystem.physXInitialized : 'N/A'),
                    'scenePhysicsComponent defined:', !!scenePhysicsComponent,
                    'scenePhysicsComponent data:', scenePhysicsComponent ? scenePhysicsComponent.data : sceneEl.getAttribute('physx') 
                    );
        if (sceneEl.hasLoaded && !physicsSystem) {
            console.log('PhysicsSyncManager: Available scene systems (still no systems.physx yet?): ', Object.keys(sceneEl.systems));
        }
      }

      // Main readiness check: Focus on state *after* physx-started has fired, using new property names.
      if (this.physXEventFired && sceneEl.hasLoaded && physicsSystem && 
          physicsSystem.PhysX && physicsSystem.scene && physicsSystem.physXInitialized === true) {

        if (scenePhysicsComponent) {
          console.log('PhysicsSyncManager: All conditions met (physx-started, scene loaded, system.PhysX, system.scene, system.physXInitialized=true, sceneComponent). Ready!');
          this.physicsSystemReady = true; 
          this.detectDeviceCapabilities().then(() => {
            this.initializeSync();
          }).catch(error => {
            console.error('PhysicsSyncManager: Error detecting device capabilities during tick-based init:', error);
          });
        } else {
          // PhysX system itself is ready, but the A-Frame component instance on the scene might still be initializing.
          // Let's try to proceed if this is the only thing missing, as our core functions use systems.physx.
          if (this.initAttempts % 60 === 0) { // Log this state periodically if it persists
            console.warn('PhysicsSyncManager: PhysX SYSTEM is ready (PhysX, scene, physXInitialized=true), but scene.components.physx instance is not yet defined. Attempting to proceed as core logic uses systems.physx.');
          }
          // TEMPORARILY PROCEEDING - If errors occur in initializeSync or setPhysicsTickRate, this might be why.
          this.physicsSystemReady = true; 
          this.detectDeviceCapabilities().then(() => {
            this.initializeSync();
          }).catch(error => {
            console.error('PhysicsSyncManager: Error detecting device capabilities (scene component was pending):', error);
          });
        }
      } else {
        // Optional: Log a less frequent message if physics is still not ready
        // if (this.initAttempts % 60 === 0) { // Log once per second approx if still waiting
        //      console.log('PhysicsSyncManager: Waiting for PhysX system in tick...');
        // }
        this.initAttempts++; // Use initAttempts to avoid immediate, constant re-checks if needed
      }
      return; // Don't proceed further in tick until physics is ready
    }

    if (!this.isInitialized) {
      // If physicsSystemReady is true, but not fully initialized (e.g. initializeSync is retrying)
      // initializeSync has its own retry logic, so we don't call it directly here repeatedly
      // unless initializeSync itself needs to be re-triggered based on some condition.
      // For now, rely on initializeSync's internal retries if it was called from the block above.
      return;
    }

    // Measure network latency periodically
    if (time - this.lastLatencyCheckTime > 2000) {
      this.measureNetworkLatency();
      this.lastLatencyCheckTime = time;

      // Adjust tick rate if using adaptive sync
      if (this.data.adaptiveSync && this.connectedPeers.size > 0) {
        this.adaptTickRate();
      }
    }

    // Sync physics states
    if (time - this.lastSyncTime > this.data.syncInterval) {
      this.syncAllObjects();
      this.lastSyncTime = time;
    }

    // Interpolate physics states
    if (this.data.interpolation) {
      this.interpolatePhysicsStates(timeDelta);
    }
  },

  initializeSync: function() {
    // Removed the check for this.isInitialized at the very start, as tick handler controls flow
    if (!this.data.enabled) return;

    console.log('PhysicsSyncManager: Entering initializeSync after capabilities detected.');

    const physicsSystem = this.el.sceneEl.systems.physx; // Renamed for clarity, consistent with tick()

    // Updated check to use correct property names and physXInitialized flag
    if (!physicsSystem || !physicsSystem.PhysX || !physicsSystem.scene || physicsSystem.physXInitialized !== true) { 
      console.warn('PhysicsSyncManager: PhysX system (.PhysX, .scene, or .physXInitialized) not fully available in initializeSync. This might indicate a deeper issue if tick() thought it was ready.');
      this.localCapabilities = this.localCapabilities || { recommendedTickRate: 30 }; // Ensure defaults, e.g., 30Hz
      this.isInitialized = true; 
      console.error('PhysicsSyncManager: Forced initialization with defaults due to unexpected physics system unavailability in initializeSync.');
      this.el.emit('physics-sync-ready', { capabilities: this.localCapabilities });
      return;
    }

    console.log('PhysicsSyncManager: Successfully accessed PhysX system (systems.physx.PhysX and .scene) in initializeSync.');
    // Log what we found
    // ... (rest of the logging and capability handling) ...

    // If we already have device capabilities (they should be set by now from the tick handler)
    if (Object.keys(this.localCapabilities).length > 0) {
      this.setPhysicsTickRate(this.localCapabilities.recommendedTickRate);
      this.isInitialized = true;
      console.log('PhysicsSyncManager: Fully initialized with local capabilities:', this.localCapabilities);
      this.el.emit('physics-sync-ready', { capabilities: this.localCapabilities });
    } else {
      // This case should ideally not be hit if detectDeviceCapabilities in tick() succeeded.
      console.error('PhysicsSyncManager: localCapabilities not set before initializeSync. This is unexpected.');
      // Fallback to default detection or error
      this.detectDeviceCapabilities().then(() => { // Try one more time
          this.setPhysicsTickRate(this.localCapabilities.recommendedTickRate);
          this.isInitialized = true;
          console.log('PhysicsSyncManager: Re-detected and initialized capabilities:', this.localCapabilities);
          this.el.emit('physics-sync-ready', { capabilities: this.localCapabilities });
      }).catch(finalError => {
          console.error('PhysicsSyncManager: Final attempt to detect capabilities failed.', finalError);
          this.localCapabilities = { /* ... hardcoded default values ... */ };
          this.isInitialized = true; // Initialize with failsafe defaults
          console.log('PhysicsSyncManager: Initialized with HARDCODED default capabilities due to final error.');
          this.el.emit('physics-sync-ready', { capabilities: this.localCapabilities });
      });
    }
  },

  detectDeviceCapabilities: async function() {
    // Get device information
    const isMobileVal = AFRAME.utils.device.isMobile() ||
                    (window.DeviceManager && typeof window.DeviceManager.isMobile === 'boolean' ? window.DeviceManager.isMobile : AFRAME.utils.device.isMobile()); // More robust check for DeviceManager

    // Detect screen refresh rate
    let refreshRate = 60; // Default assumption

    // Try to detect actual refresh rate if possible
    if (window.screen && window.screen.displayRate) {
      refreshRate = window.screen.displayRate;
    } else if (window.requestAnimationFrame) {
      // Fallback method to estimate refresh rate
      refreshRate = await this.estimateRefreshRate();
    }

    // Determine recommended physics tick rate based on device capabilities
    // For stability, we use a tick rate that's a divisor of the refresh rate
    let recommendedTickRate;
    if (isMobileVal) {
      // Mobile devices should use lower tick rates for better performance
      recommendedTickRate = refreshRate >= 90 ? 30 : 20;
    } else {
      // Desktop can handle higher tick rates
      recommendedTickRate = refreshRate >= 90 ? 60 : 30;
    }

    // Ensure tick rate is within acceptable bounds
    const effectiveMinTickRate = this.data.minTickRate || 20; // Default if schema not ready
    const effectiveMaxTickRate = this.data.maxTickRate || 60; // Default if schema not ready

    recommendedTickRate = Math.max(effectiveMinTickRate,
                          Math.min(recommendedTickRate, effectiveMaxTickRate));

    // Store capabilities
    this.localCapabilities = {
      isMobile: isMobileVal,
      refreshRate,
      recommendedTickRate,
      maxTickRate: this.data.maxTickRate,
      minTickRate: this.data.minTickRate,
      devicePerformanceScore: await this.measureDevicePerformance()
    };

    if (this.data.debug || !this.isInitialized) { // Log if debug or first time
      console.log(`PhysicsSyncManager: Detected capabilities -
        refreshRate: ${refreshRate}Hz,
        recommendedTickRate: ${recommendedTickRate}Hz,
        isMobile: ${isMobileVal}`);
    }

    return this.localCapabilities;
  },

  /**
   * Estimate screen refresh rate
   * @returns {Promise<number>} Estimated refresh rate
   */
  estimateRefreshRate: function() {
    return new Promise(resolve => {
      let times = [];
      let lastTime = performance.now();

      const measureFrames = (timestamp) => {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        times.push(deltaTime);

        if (times.length < 50) {
          requestAnimationFrame(measureFrames);
        } else {
          // Calculate median frame time to avoid outliers
          times.sort((a, b) => a - b);
          const medianTime = times[Math.floor(times.length / 2)];
          const estimatedRefreshRate = Math.round(1000 / medianTime);

          // Round to common refresh rates
          let normalizedRate = 60;
          if (estimatedRefreshRate > 100) normalizedRate = 120;
          else if (estimatedRefreshRate > 75) normalizedRate = 90;
          else if (estimatedRefreshRate > 50) normalizedRate = 60;
          else normalizedRate = 30;

          resolve(normalizedRate);
        }
      };

      requestAnimationFrame(measureFrames);
    });
  },

  /**
   * Measure device performance to help determine optimal settings
   * @returns {Promise<number>} Performance score (higher is better)
   */
  measureDevicePerformance: function() {
    return new Promise(resolve => {
      const startTime = performance.now();
      let counter = 0;

      // Simple benchmark - how many iterations in a fixed time
      const iterate = () => {
        if (performance.now() - startTime < 100) {
          // Do some math operations to simulate load
          for (let i = 0; i < 10000; i++) {
            Math.sqrt(i) * Math.cos(i) / (Math.sin(i) + 1);
            counter++;
          }
          setTimeout(iterate, 0);
        } else {
          // Calculate performance score
          const score = counter / 100000; // Normalize
          resolve(score);
        }
      };

      iterate();
    });
  },

  /**
   * Negotiate a common tick rate with all connected peers
   */
  negotiateTickRate: function() {
    if (!this.isInitialized || this.connectedPeers.size === 0) return;

    // Collect all capabilities
    const allCapabilities = [this.localCapabilities];
    this.connectedPeers.forEach(peer => {
      if (peer.capabilities) {
        allCapabilities.push(peer.capabilities);
      }
    });

    // Find the lowest common acceptable tick rate
    // This ensures all devices can keep up
    let lowestTickRate = this.data.maxTickRate;
    allCapabilities.forEach(cap => {
      if (cap.recommendedTickRate < lowestTickRate) {
        lowestTickRate = cap.recommendedTickRate;
      }
    });

    // Ensure it's not below minimum
    lowestTickRate = Math.max(lowestTickRate, this.data.minTickRate);

    // Apply the negotiated tick rate
    this.negotiatedTickRate = lowestTickRate;
    this.setPhysicsTickRate(lowestTickRate);

    if (this.data.debug) {
      console.log(`PhysicsSyncManager: Negotiated tick rate: ${lowestTickRate}Hz`);
    }

    // Broadcast the negotiated rate to all peers
    this.broadcastMessage({
      type: 'physics-tick-rate',
      tickRate: lowestTickRate
    });

    // Emit event for other components
    this.el.emit('physics-tick-rate-changed', { tickRate: lowestTickRate });
  },

  /**
   * Set the PhysX tick rate in the engine
   * @param {number} tickRate - The tick rate in Hz
   */
  setPhysicsTickRate: function(tickRate) {
    const physicsSystem = this.el.sceneEl.systems.physx;
    const fixedTimeStep = 1 / tickRate;

    if (physicsSystem && typeof physicsSystem.setFixedTimeStep === 'function') {
      // Ideal case: direct method on the system
      physicsSystem.setFixedTimeStep(fixedTimeStep);
      console.log(`PhysicsSyncManager: Physics fixedTimeStep set to ${fixedTimeStep} (for ${tickRate}Hz via direct system call).`);
    } else {
      // Fallback: Attempt to set it via the scene component's attribute
      // This relies on the aframe-physx component to listen to its data changes and apply them.
      console.log(`PhysicsSyncManager: No direct setFixedTimeStep method on system. Attempting to set via scene attribute 'physx.fixedTimeStep'.`);
      try {
        // Ensure the scene has the physx component initialized enough to update its data
        if (this.el.sceneEl.components.physx) {
          this.el.sceneEl.setAttribute('physx', 'fixedTimeStep', fixedTimeStep);
          console.log(`PhysicsSyncManager: Successfully called setAttribute('physx', 'fixedTimeStep', ${fixedTimeStep}) (for ${tickRate}Hz). PhysX component should update.`);
        } else {
          // If scene.components.physx isn't ready, we might need to update the system's data directly, if possible,
          // or accept that we can only set it initially.
          // For now, log that the component wasn't ready for setAttribute.
          console.warn(`PhysicsSyncManager: scene.components.physx not available to set fixedTimeStep via setAttribute. Tick rate might not be dynamically applied if not supported by system's direct update via attribute change.`);
          // As a last resort, if the system data object is directly modifiable and respected:
          if (physicsSystem && physicsSystem.data && physicsSystem.data.hasOwnProperty('fixedTimeStep')) {
            console.log(`PhysicsSyncManager: Attempting to set fixedTimeStep directly on system.data (current: ${physicsSystem.data.fixedTimeStep}).`);
            physicsSystem.data.fixedTimeStep = fixedTimeStep;
            // This might require the system to have an update() method that reacts to changes in its own this.data
            if(typeof physicsSystem.update === 'function'){
                // physicsSystem.update(oldData); // We don't have oldData here easily
                console.log('PhysicsSyncManager: Underlying physx system might need its update() method called if it does not react to data changes automatically.');
            }
            console.log(`PhysicsSyncManager: Set fixedTimeStep directly on system.data to ${fixedTimeStep}. System needs to process this change.`);
          } else {
            console.warn('PhysicsSyncManager: Cannot set fixedTimeStep directly on system.data either.');
          }
        }
      } catch (e) {
        console.error(`PhysicsSyncManager: Error attempting to set fixedTimeStep via setAttribute or directly on system data for ${tickRate}Hz.`, e);
      }
    }
  },

  /**
   * Adapt tick rate based on network conditions
   */
  adaptTickRate: function() {
    if (!this.data.adaptiveSync || !this.negotiatedTickRate) return;

    // Calculate average latency
    let totalLatency = 0;
    let count = 0;

    this.networkLatencies.forEach(latency => {
      totalLatency += latency;
      count++;
    });

    if (count === 0) return;

    const avgLatency = totalLatency / count;

    // Adjust tick rate based on latency
    let newTickRate = this.negotiatedTickRate;

    if (avgLatency > 200) {
      // High latency - reduce tick rate
      newTickRate = Math.max(this.data.minTickRate, this.negotiatedTickRate - 10);
    } else if (avgLatency < 50 && this.negotiatedTickRate < this.data.maxTickRate) {
      // Low latency - can increase tick rate if all peers support it
      let canIncrease = true;
      this.connectedPeers.forEach(peer => {
        if (peer.capabilities && peer.capabilities.recommendedTickRate < this.negotiatedTickRate + 10) {
          canIncrease = false;
        }
      });

      if (canIncrease) {
        newTickRate = Math.min(this.data.maxTickRate, this.negotiatedTickRate + 10);
      }
    }

    // Apply new tick rate if changed
    if (newTickRate !== this.negotiatedTickRate) {
      this.negotiatedTickRate = newTickRate;
      this.setPhysicsTickRate(newTickRate);

      if (this.data.debug) {
        console.log(`PhysicsSyncManager: Adapted tick rate to ${newTickRate}Hz based on network latency (${avgLatency.toFixed(2)}ms)`);
      }

      // Broadcast the new rate
      this.broadcastMessage({
        type: 'physics-tick-rate',
        tickRate: newTickRate
      });
    }
  },

  /**
   * Register an object for physics synchronization
   * @param {Element} el - The element to synchronize
   * @param {Object} options - Synchronization options
   */
  registerObject: function(el, options = {}) {
    if (!el || !el.components['physx-body']) {
      console.warn('PhysicsSyncManager: Cannot register object without physx-body component');
      return;
    }

    const id = el.id || el.getAttribute('data-sync-id') || `sync-obj-${Math.random().toString(36).substr(2, 9)}`;

    // Set ID on element if not already set
    if (!el.id) {
      el.id = id;
    }

    // Add to synced objects
    this.syncedObjects.set(id, {
      el: el,
      lastSyncTime: 0,
      authority: options.authority || null, // Who has authority over this object
      interpolationBuffer: [], // Buffer for interpolation
      options: {
        syncPosition: options.syncPosition !== false,
        syncRotation: options.syncRotation !== false,
        syncVelocity: options.syncVelocity !== false,
        syncAngularVelocity: options.syncAngularVelocity !== false,
        priority: options.priority || 0, // Higher priority objects sync more frequently
        interpolate: options.interpolate !== false && this.data.interpolation
      }
    });

    if (this.data.debug) {
      console.log(`PhysicsSyncManager: Registered object for sync: ${id}`);
    }

    return id;
  },

  /**
   * Unregister an object from physics synchronization
   * @param {string|Element} idOrEl - The ID or element to unregister
   */
  unregisterObject: function(idOrEl) {
    const id = typeof idOrEl === 'string' ? idOrEl : idOrEl.id;

    if (this.syncedObjects.has(id)) {
      this.syncedObjects.delete(id);

      if (this.data.debug) {
        console.log(`PhysicsSyncManager: Unregistered object: ${id}`);
      }
    }
  },

  /**
   * Handle peer connection
   * @param {Event} evt - The peer-connected event
   */
  onPeerConnect: function(evt) {
    const peerId = evt.detail.id;

    // Add to connected peers
    this.connectedPeers.set(peerId, {
      id: peerId,
      capabilities: evt.detail.capabilities || null,
      lastSyncTime: 0,
      latency: 0
    });

    if (this.data.debug) {
      console.log(`PhysicsSyncManager: Peer connected: ${peerId}`);
    }

    // Send local capabilities
    this.sendMessageToPeer(peerId, {
      type: 'physics-capabilities',
      capabilities: this.localCapabilities
    });

    // Renegotiate tick rate with all peers
    this.negotiateTickRate();
  },

  /**
   * Handle peer disconnection
   * @param {Event} evt - The peer-disconnected event
   */
  onPeerDisconnect: function(evt) {
    const peerId = evt.detail.id;

    // Remove from connected peers
    if (this.connectedPeers.has(peerId)) {
      this.connectedPeers.delete(peerId);

      if (this.data.debug) {
        console.log(`PhysicsSyncManager: Peer disconnected: ${peerId}`);
      }

      // Renegotiate tick rate with remaining peers
      this.negotiateTickRate();
    }
  },

  /**
   * Handle incoming physics messages
   * @param {Event} evt - The physics-message event
   */
  onPhysicsMessage: function(evt) {
    const message = evt.detail;
    const senderId = message.senderId;

    if (!message || !message.type) return;

    switch (message.type) {
      case 'physics-capabilities':
        // Update peer capabilities
        if (this.connectedPeers.has(senderId)) {
          this.connectedPeers.get(senderId).capabilities = message.capabilities;

          if (this.data.debug) {
            console.log(`PhysicsSyncManager: Received capabilities from ${senderId}:`, message.capabilities);
          }

          // Renegotiate tick rate
          this.negotiateTickRate();
        }
        break;

      case 'physics-tick-rate':
        // Update tick rate if received from authority
        // In host mode, only the host can set the tick rate
        if (this.data.authorityMode === 'host' && !this.isHost) {
          this.setPhysicsTickRate(message.tickRate);
          this.negotiatedTickRate = message.tickRate;

          if (this.data.debug) {
            console.log(`PhysicsSyncManager: Received tick rate from host: ${message.tickRate}Hz`);
          }
        }
        break;

      case 'physics-state':
        // Apply physics state from peer
        this.applyPhysicsState(message.objectId, message.state, senderId);
        break;

      case 'physics-ping':
        // Respond to ping with pong
        this.sendMessageToPeer(senderId, {
          type: 'physics-pong',
          timestamp: message.timestamp
        });
        break;

      case 'physics-pong':
        // Calculate latency
        const latency = performance.now() - message.timestamp;
        if (this.connectedPeers.has(senderId)) {
          this.connectedPeers.get(senderId).latency = latency;
          this.networkLatencies.set(senderId, latency);

          if (this.data.debug && this.data.adaptiveSync) {
            console.log(`PhysicsSyncManager: Latency to ${senderId}: ${latency.toFixed(2)}ms`);
          }
        }
        break;
    }
  },

  /**
   * Send a message to a specific peer
   * @param {string} peerId - The peer ID
   * @param {Object} message - The message to send
   */
  sendMessageToPeer: function(peerId, message) {
    // Add sender ID and timestamp
    message.senderId = this.el.sceneEl.systems.multiplayer?.localId || 'local';
    message.timestamp = performance.now();

    // Emit event for multiplayer system to handle
    this.el.sceneEl.emit('send-to-peer', {
      peerId: peerId,
      message: message
    });
  },

  /**
   * Broadcast a message to all peers
   * @param {Object} message - The message to broadcast
   */
  broadcastMessage: function(message) {
    // Add sender ID and timestamp
    message.senderId = this.el.sceneEl.systems.multiplayer?.localId || 'local';
    message.timestamp = performance.now();

    // Emit event for multiplayer system to handle
    this.el.sceneEl.emit('broadcast-message', {
      message: message
    });
  },

  /**
   * Synchronize physics state of an object
   * @param {string} objectId - The object ID
   */
  syncPhysicsState: function(objectId) {
    if (!this.syncedObjects.has(objectId)) return;

    const syncObj = this.syncedObjects.get(objectId);
    const el = syncObj.el;

    // Skip if no physics body
    const bodyComponent = el.components['physx-body'];
    if (!bodyComponent || !bodyComponent.rigidBody) return;

    // Get current state
    const state = this.getObjectPhysicsState(el);

    // Broadcast state to all peers
    this.broadcastMessage({
      type: 'physics-state',
      objectId: objectId,
      state: state
    });

    // Update last sync time
    syncObj.lastSyncTime = performance.now();
  },

  /**
   * Get the physics state of an object
   * @param {Element} el - The element
   * @returns {Object} The physics state
   */
  getObjectPhysicsState: function(el) {
    const bodyComponent = el.components['physx-body'];
    const rigidBody = bodyComponent.rigidBody;
    const state = {};

    // Position
    const position = new THREE.Vector3();
    el.object3D.getWorldPosition(position);
    state.position = {
      x: position.x,
      y: position.y,
      z: position.z
    };

    // Rotation (quaternion)
    const quaternion = new THREE.Quaternion();
    el.object3D.getWorldQuaternion(quaternion);
    state.quaternion = {
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w
    };

    // Linear velocity
    if (rigidBody.getLinearVelocity) {
      const linearVelocity = rigidBody.getLinearVelocity();
      state.linearVelocity = linearVelocity;
    }

    // Angular velocity
    if (rigidBody.getAngularVelocity) {
      const angularVelocity = rigidBody.getAngularVelocity();
      state.angularVelocity = angularVelocity;
    }

    // Add timestamp
    state.timestamp = performance.now();

    return state;
  },

  /**
   * Apply physics state to an object
   * @param {string} objectId - The object ID
   * @param {Object} state - The physics state
   * @param {string} senderId - The sender ID
   */
  applyPhysicsState: function(objectId, state, senderId) {
    if (!this.syncedObjects.has(objectId)) return;

    const syncObj = this.syncedObjects.get(objectId);
    const el = syncObj.el;

    // Skip if no physics body
    const bodyComponent = el.components['physx-body'];
    if (!bodyComponent || !bodyComponent.rigidBody) return;

    // Check authority
    if (syncObj.authority && syncObj.authority !== senderId) {
      // This peer doesn't have authority, ignore update
      return;
    }

    // If using interpolation, add to buffer
    if (syncObj.options.interpolate) {
      syncObj.interpolationBuffer.push({
        state: state,
        timestamp: performance.now()
      });

      // Limit buffer size
      if (syncObj.interpolationBuffer.length > 10) {
        syncObj.interpolationBuffer.shift();
      }
    } else {
      // Direct application without interpolation
      this.applyStateToObject(el, state);
    }
  },

  /**
   * Apply state directly to an object
   * @param {Element} el - The element
   * @param {Object} state - The physics state
   */
  applyStateToObject: function(el, state) {
    const bodyComponent = el.components['physx-body'];
    const rigidBody = bodyComponent.rigidBody;

    // Wake up the rigid body
    if (typeof rigidBody.wakeUp === 'function') {
      rigidBody.wakeUp();
    }

    // Apply position
    if (state.position) {
      el.object3D.position.set(
        state.position.x,
        state.position.y,
        state.position.z
      );
    }

    // Apply rotation (quaternion)
    if (state.quaternion) {
      el.object3D.quaternion.set(
        state.quaternion.x,
        state.quaternion.y,
        state.quaternion.z,
        state.quaternion.w
      );
    }

    // Apply linear velocity
    if (state.linearVelocity && rigidBody.setLinearVelocity) {
      rigidBody.setLinearVelocity(state.linearVelocity);
    }

    // Apply angular velocity
    if (state.angularVelocity && rigidBody.setAngularVelocity) {
      rigidBody.setAngularVelocity(state.angularVelocity);
    }
  },

  /**
   * Interpolate physics states for smoother visuals
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  interpolatePhysicsStates: function(deltaTime) {
    // Process each synced object
    this.syncedObjects.forEach((syncObj, objectId) => {
      // Skip if not using interpolation or buffer is too small
      if (!syncObj.options.interpolate || syncObj.interpolationBuffer.length < 2) return;

      const buffer = syncObj.interpolationBuffer;
      const now = performance.now();

      // Find the two states to interpolate between
      let state1 = buffer[0].state;
      let state2 = buffer[1].state;
      let t1 = buffer[0].timestamp;
      let t2 = buffer[1].timestamp;

      // Find the appropriate states based on render delay
      const renderDelay = this.calculateRenderDelay();
      const targetTime = now - renderDelay;

      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i].timestamp <= targetTime && buffer[i+1].timestamp >= targetTime) {
          state1 = buffer[i].state;
          state2 = buffer[i+1].state;
          t1 = buffer[i].timestamp;
          t2 = buffer[i+1].timestamp;
          break;
        }
      }

      // Calculate interpolation factor
      const alpha = Math.max(0, Math.min(1, (targetTime - t1) / (t2 - t1)));

      // Create interpolated state
      const interpolatedState = this.interpolateStates(state1, state2, alpha);

      // Apply interpolated state
      this.applyStateToObject(syncObj.el, interpolatedState);

      // Clean up old buffer entries
      while (buffer.length > 0 && buffer[0].timestamp < now - 1000) {
        buffer.shift();
      }
    });
  },

  /**
   * Interpolate between two physics states
   * @param {Object} state1 - First state
   * @param {Object} state2 - Second state
   * @param {number} alpha - Interpolation factor (0-1)
   * @returns {Object} Interpolated state
   */
  interpolateStates: function(state1, state2, alpha) {
    const result = {};

    // Interpolate position
    if (state1.position && state2.position) {
      const pos1 = new THREE.Vector3(state1.position.x, state1.position.y, state1.position.z);
      const pos2 = new THREE.Vector3(state2.position.x, state2.position.y, state2.position.z);
      const position = pos1.lerp(pos2, alpha);

      result.position = {
        x: position.x,
        y: position.y,
        z: position.z
      };
    }

    // Interpolate rotation (quaternion)
    if (state1.quaternion && state2.quaternion) {
      const q1 = new THREE.Quaternion(
        state1.quaternion.x,
        state1.quaternion.y,
        state1.quaternion.z,
        state1.quaternion.w
      );

      const q2 = new THREE.Quaternion(
        state2.quaternion.x,
        state2.quaternion.y,
        state2.quaternion.z,
        state2.quaternion.w
      );

      const quaternion = q1.slerp(q2, alpha);

      result.quaternion = {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w
      };
    }

    // Interpolate velocities
    if (state1.linearVelocity && state2.linearVelocity) {
      result.linearVelocity = {
        x: state1.linearVelocity.x + (state2.linearVelocity.x - state1.linearVelocity.x) * alpha,
        y: state1.linearVelocity.y + (state2.linearVelocity.y - state1.linearVelocity.y) * alpha,
        z: state1.linearVelocity.z + (state2.linearVelocity.z - state1.linearVelocity.z) * alpha
      };
    }

    if (state1.angularVelocity && state2.angularVelocity) {
      result.angularVelocity = {
        x: state1.angularVelocity.x + (state2.angularVelocity.x - state1.angularVelocity.x) * alpha,
        y: state1.angularVelocity.y + (state2.angularVelocity.y - state1.angularVelocity.y) * alpha,
        z: state1.angularVelocity.z + (state2.angularVelocity.z - state1.angularVelocity.z) * alpha
      };
    }

    return result;
  },

  /**
   * Calculate appropriate render delay based on network conditions
   * @returns {number} Render delay in milliseconds
   */
  calculateRenderDelay: function() {
    if (this.networkLatencies.size === 0) return 100; // Default delay

    // Calculate average latency
    let totalLatency = 0;
    let count = 0;

    this.networkLatencies.forEach(latency => {
      totalLatency += latency;
      count++;
    });

    const avgLatency = totalLatency / count;

    // Add buffer to average latency
    // Higher latency = more buffer needed
    let renderDelay = avgLatency * 1.5;

    // Ensure minimum and maximum values
    renderDelay = Math.max(50, Math.min(renderDelay, 300));

    return renderDelay;
  },

  /**
   * Measure network latency to all peers
   */
  measureNetworkLatency: function() {
    // Send ping to all peers
    this.connectedPeers.forEach((peer, peerId) => {
      this.sendMessageToPeer(peerId, {
        type: 'physics-ping',
        timestamp: performance.now()
      });
    });
  },

  /**
   * Sync all registered objects
   */
  syncAllObjects: function() {
    this.syncedObjects.forEach((syncObj, objectId) => {
      // Check if it's time to sync this object based on priority
      const timeSinceLastSync = performance.now() - syncObj.lastSyncTime;
      const syncInterval = this.data.syncInterval / (1 + syncObj.options.priority * 0.5);

      if (timeSinceLastSync >= syncInterval) {
        this.syncPhysicsState(objectId);
      }
    });
  },

  /**
   * Remove function called when component is removed
   */
  remove: function() {
    // Clean up event listeners
    this.el.sceneEl.removeEventListener('peer-connected', this.onPeerConnect);
    this.el.sceneEl.removeEventListener('peer-disconnected', this.onPeerDisconnect);
    this.el.sceneEl.removeEventListener('physics-message', this.onPhysicsMessage);

    // Reset physics settings to defaults
    const physics = this.el.sceneEl.systems.physx;
    if (physics && physics.setFixedTimeStep) {
      // Use a reasonable default
      physics.setFixedTimeStep(1/60);
    }

    if (this.data.debug) {
      console.log('PhysicsSyncManager: Component removed, reset physics to defaults');
    }
  },

  onPhysXCustomStarted: function() {
    console.log('PhysicsSyncManager: Received physx-started event.');
    this.physXEventFired = true;
    // We don't immediately try to initialize here; 
    // tick() will pick it up along with other readiness checks.
  }
};

// Export the component without registering it here
// It will be registered in index.js
export default PhysicsSyncManager;
