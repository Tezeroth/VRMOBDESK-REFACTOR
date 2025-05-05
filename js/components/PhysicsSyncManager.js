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
    this.connectedPeers = new Map(); // Map of connected peers with their capabilities
    this.negotiatedTickRate = null; // The agreed-upon tick rate
    this.localCapabilities = {}; // Local device capabilities
    this.syncedObjects = new Map(); // Objects being synced
    this.lastSyncTime = 0;
    this.lastLatencyCheckTime = 0;
    this.networkLatencies = new Map(); // Track network latency to each peer
    this.isHost = false; // Whether this client is the host
    this.initAttempts = 0; // Track initialization attempts
    this.maxInitAttempts = 5; // Maximum number of initialization attempts

    // Bind methods
    this.detectDeviceCapabilities = this.detectDeviceCapabilities.bind(this);
    this.negotiateTickRate = this.negotiateTickRate.bind(this);
    this.syncPhysicsState = this.syncPhysicsState.bind(this);
    this.applyPhysicsState = this.applyPhysicsState.bind(this);
    this.onPeerConnect = this.onPeerConnect.bind(this);
    this.onPeerDisconnect = this.onPeerDisconnect.bind(this);
    this.onPhysicsMessage = this.onPhysicsMessage.bind(this);
    this.initializeSync = this.initializeSync.bind(this);
    this.onPhysXStarted = this.onPhysXStarted.bind(this);

    console.log('PhysicsSyncManager: Component initialized, waiting for scene and physics to be ready');

    // Listen for physx-started event (this is what LoadingScreenManager uses)
    this.el.sceneEl.addEventListener('physx-started', this.onPhysXStarted, { once: true });

    // Set up console.info interceptor to catch "Starting PhysX scene" message
    this.originalConsoleInfo = console.info;
    console.info = (...args) => {
      this.originalConsoleInfo.apply(console, args);
      if (args[0] === "Starting PhysX scene") {
        console.log('PhysicsSyncManager: "Starting PhysX scene" message detected');

        // Emit the physx-started event that LoadingScreenManager listens for
        // This ensures our component and LoadingScreenManager are in sync
        setTimeout(() => {
          this.el.sceneEl.emit('physx-started');
        }, 100);
      }
    };

    // Listen for multiplayer events
    this.el.sceneEl.addEventListener('peer-connected', this.onPeerConnect);
    this.el.sceneEl.addEventListener('peer-disconnected', this.onPeerDisconnect);
    this.el.sceneEl.addEventListener('physics-message', this.onPhysicsMessage);
  },

  /**
   * Handle PhysX started event
   */
  onPhysXStarted: function() {
    console.log('PhysicsSyncManager: "physx-started" event received');

    // Wait a moment for the physics system to be fully initialized
    setTimeout(() => {
      // Initialize device capabilities first
      this.detectDeviceCapabilities().then(() => {
        // Then try to initialize physics sync
        setTimeout(this.initializeSync, 1000);
      });
    }, 1000);
  },

  /**
   * Initialize the physics synchronization
   */
  initializeSync: function() {
    if (!this.data.enabled || this.isInitialized) return;

    // Increment attempt counter
    this.initAttempts++;

    console.log(`PhysicsSyncManager: Attempting to initialize... (attempt ${this.initAttempts}/${this.maxInitAttempts})`);

    // Check if we've exceeded the maximum number of attempts
    if (this.initAttempts > this.maxInitAttempts) {
      console.warn(`PhysicsSyncManager: Maximum initialization attempts (${this.maxInitAttempts}) reached. Giving up.`);

      // Force initialization with default values to prevent infinite retries
      this.localCapabilities = this.localCapabilities || {
        isMobile: AFRAME.utils.device.isMobile(),
        refreshRate: 60,
        recommendedTickRate: 30,
        maxTickRate: this.data.maxTickRate,
        minTickRate: this.data.minTickRate,
        devicePerformanceScore: 1.0
      };

      this.isInitialized = true;
      console.log('PhysicsSyncManager: Forced initialization with default values');
      this.el.emit('physics-sync-ready', { capabilities: this.localCapabilities });
      return;
    }

    // Access the PhysX system
    const physics = this.el.sceneEl.systems.physics;

    if (!physics) {
      console.log('PhysicsSyncManager: PhysX system not found, will retry later...');

      // Schedule a retry with increasing delay
      const delay = Math.min(1000 * this.initAttempts, 5000);
      setTimeout(() => {
        if (!this.isInitialized) {
          this.initializeSync();
        }
      }, delay);
      return;
    }

    // Log what we found
    console.log('PhysicsSyncManager: Found PhysX system:', {
      hasDriver: !!physics.driver,
      hasWorld: !!(physics.driver && physics.driver.world),
      hasSetFixedTimeStep: typeof physics.setFixedTimeStep === 'function'
    });

    // If we already have device capabilities, use them
    if (Object.keys(this.localCapabilities).length > 0) {
      // Initialize physics with default settings until negotiation
      this.setPhysicsTickRate(this.localCapabilities.recommendedTickRate);

      // Mark as initialized
      this.isInitialized = true;

      console.log('PhysicsSyncManager: Initialized with local capabilities:', this.localCapabilities);

      // Emit initialized event
      this.el.emit('physics-sync-ready', { capabilities: this.localCapabilities });
    } else {
      // Detect local device capabilities
      this.detectDeviceCapabilities().then(() => {
        // Initialize physics with default settings until negotiation
        this.setPhysicsTickRate(this.localCapabilities.recommendedTickRate);

        // Mark as initialized
        this.isInitialized = true;

        console.log('PhysicsSyncManager: Initialized with local capabilities:', this.localCapabilities);

        // Emit initialized event
        this.el.emit('physics-sync-ready', { capabilities: this.localCapabilities });
      }).catch(error => {
        console.error('PhysicsSyncManager: Error detecting device capabilities:', error);

        // Retry or use defaults
        if (this.initAttempts < this.maxInitAttempts) {
          setTimeout(() => this.initializeSync(), 1000);
        } else {
          // Use default values
          this.localCapabilities = {
            isMobile: AFRAME.utils.device.isMobile(),
            refreshRate: 60,
            recommendedTickRate: 30,
            maxTickRate: this.data.maxTickRate,
            minTickRate: this.data.minTickRate,
            devicePerformanceScore: 1.0
          };

          this.isInitialized = true;
          console.log('PhysicsSyncManager: Initialized with default capabilities due to error');
          this.el.emit('physics-sync-ready', { capabilities: this.localCapabilities });
        }
      });
    }
  },

  /**
   * Detect device capabilities including refresh rate and performance
   */
  detectDeviceCapabilities: async function() {
    // Get device information
    const isMobile = AFRAME.utils.device.isMobile() ||
                    (window.DeviceManager && window.DeviceManager.isMobile);

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
    if (isMobile) {
      // Mobile devices should use lower tick rates for better performance
      recommendedTickRate = refreshRate >= 90 ? 30 : 20;
    } else {
      // Desktop can handle higher tick rates
      recommendedTickRate = refreshRate >= 90 ? 60 : 30;
    }

    // Ensure tick rate is within acceptable bounds
    recommendedTickRate = Math.max(this.data.minTickRate,
                          Math.min(recommendedTickRate, this.data.maxTickRate));

    // Store capabilities
    this.localCapabilities = {
      isMobile,
      refreshRate,
      recommendedTickRate,
      maxTickRate: this.data.maxTickRate,
      minTickRate: this.data.minTickRate,
      devicePerformanceScore: await this.measureDevicePerformance()
    };

    if (this.data.debug) {
      console.log(`PhysicsSyncManager: Detected capabilities -
        refreshRate: ${refreshRate}Hz,
        recommendedTickRate: ${recommendedTickRate}Hz,
        isMobile: ${isMobile}`);
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
    const fixedTimeStep = 1 / tickRate;

    // Get PhysX system
    const physics = this.el.sceneEl.systems.physics;
    if (!physics) {
      console.warn('PhysicsSyncManager: PhysX system not found, will retry later');

      // Schedule a retry with a limit
      if (this.initAttempts < this.maxInitAttempts) {
        setTimeout(() => {
          if (this.isInitialized) {
            console.log('PhysicsSyncManager: Retrying setPhysicsTickRate...');
            this.setPhysicsTickRate(tickRate);
          }
        }, 1000);
      } else {
        console.warn('PhysicsSyncManager: Maximum retry attempts reached for setPhysicsTickRate');
      }
      return;
    }

    try {
      // Apply settings - try different methods
      let success = false;

      // Method 1: Direct method on physics system
      if (physics.setFixedTimeStep) {
        physics.setFixedTimeStep(fixedTimeStep);
        console.log('PhysicsSyncManager: Successfully set tick rate using physics.setFixedTimeStep');
        success = true;
      }
      // Method 2: Through the driver
      else if (physics.driver && physics.driver.setFixedTimeStep) {
        physics.driver.setFixedTimeStep(fixedTimeStep);
        console.log('PhysicsSyncManager: Successfully set tick rate using physics.driver.setFixedTimeStep');
        success = true;
      }
      // Method 3: Through the PhysX world
      else if (physics.driver && physics.driver.world && physics.driver.world.setFixedTimeStep) {
        physics.driver.world.setFixedTimeStep(fixedTimeStep);
        console.log('PhysicsSyncManager: Successfully set tick rate using physics.driver.world.setFixedTimeStep');
        success = true;
      }

      // Method 4: Fallback to scene attribute
      if (!success) {
        // Update scene attributes
        const currentPhysicsAttr = this.el.sceneEl.getAttribute('physics') || {};
        const updatedPhysicsAttr = Object.assign({}, currentPhysicsAttr, { fixedTimeStep: fixedTimeStep });

        this.el.sceneEl.setAttribute('physics', updatedPhysicsAttr);
        console.log('PhysicsSyncManager: Set tick rate using scene.setAttribute for physics');
      }

      console.log(`PhysicsSyncManager: Set PhysX tick rate to ${tickRate}Hz (${fixedTimeStep}s)`);
    } catch (error) {
      console.error('PhysicsSyncManager: Error setting PhysX tick rate:', error);
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
   * Tick function called by A-Frame on every frame
   */
  tick: function(time, deltaTime) {
    if (!this.isInitialized || !this.data.enabled) return;

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
      this.interpolatePhysicsStates(deltaTime);
    }
  },

  /**
   * Remove function called when component is removed
   */
  remove: function() {
    // Clean up event listeners
    this.el.sceneEl.removeEventListener('peer-connected', this.onPeerConnect);
    this.el.sceneEl.removeEventListener('peer-disconnected', this.onPeerDisconnect);
    this.el.sceneEl.removeEventListener('physics-message', this.onPhysicsMessage);

    // Restore original console.info if we modified it
    if (this.originalConsoleInfo) {
      console.info = this.originalConsoleInfo;
    }

    // Reset physics settings to defaults
    const physics = this.el.sceneEl.systems.physics;
    if (physics && physics.setFixedTimeStep) {
      // Use a reasonable default
      physics.setFixedTimeStep(1/60);
    }

    if (this.data.debug) {
      console.log('PhysicsSyncManager: Component removed, reset physics to defaults');
    }
  }
};

// Export the component without registering it here
// It will be registered in index.js
export default PhysicsSyncManager;
