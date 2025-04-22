/**
 * MultiplayerManager - Handles multiplayer functionality
 * 
 * This manager is responsible for:
 * - Establishing connections between users
 * - Synchronizing player positions and states
 * - Managing positional audio
 * - Handling shared physics interactions
 */

class MultiplayerManager {
  constructor() {
    this.isConnected = false;
    this.peers = [];
    this.localId = null;
    this.audioContext = null;
    this.audioEnabled = false;
    this.peerConnections = {};
    this.dataChannels = {};
    this.audioNodes = {};
    
    // Bind methods to preserve 'this' context
    this.init = this.init.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.enablePositionalAudio = this.enablePositionalAudio.bind(this);
    this.updatePeerPosition = this.updatePeerPosition.bind(this);
    this.broadcastPosition = this.broadcastPosition.bind(this);
    this.handlePeerMessage = this.handlePeerMessage.bind(this);
  }
  
  /**
   * Initialize the multiplayer system
   * @returns {MultiplayerManager} The manager instance
   */
  init() {
    console.log('Initializing multiplayer manager');
    
    // Generate a random user ID
    this.localId = 'user_' + Math.floor(Math.random() * 10000);
    console.log(`Generated local user ID: ${this.localId}`);
    
    // Setup event listeners for multiplayer events
    document.addEventListener('connect-multiplayer', this.connect);
    document.addEventListener('disconnect-multiplayer', this.disconnect);
    
    // Emit initialization event
    const event = new CustomEvent('multiplayer-initialized', { 
      detail: { localId: this.localId } 
    });
    document.dispatchEvent(event);
    
    return this;
  }
  
  /**
   * Connect to multiplayer server
   */
  connect() {
    if (this.isConnected) {
      console.log('Already connected to multiplayer server');
      return;
    }
    
    console.log('Connecting to multiplayer server...');
    
    // This will be implemented with actual WebRTC or WebSocket connection logic
    // For now, we'll simulate a connection
    setTimeout(() => {
      this.isConnected = true;
      console.log('Connected to multiplayer server (simulated)');
      
      // Start position broadcasting
      this._startPositionBroadcast();
      
      // Emit connected event
      const event = new CustomEvent('multiplayer-connected');
      document.dispatchEvent(event);
    }, 1000);
  }
  
  /**
   * Disconnect from multiplayer server
   */
  disconnect() {
    if (!this.isConnected) {
      console.log('Not connected to multiplayer server');
      return;
    }
    
    console.log('Disconnecting from multiplayer server...');
    
    // Stop position broadcasting
    this._stopPositionBroadcast();
    
    // Close all peer connections
    Object.values(this.peerConnections).forEach(connection => {
      if (connection && connection.close) {
        connection.close();
      }
    });
    
    // Reset state
    this.isConnected = false;
    this.peers = [];
    this.peerConnections = {};
    this.dataChannels = {};
    
    // Emit disconnected event
    const event = new CustomEvent('multiplayer-disconnected');
    document.dispatchEvent(event);
  }
  
  /**
   * Enable positional audio for multiplayer
   */
  enablePositionalAudio() {
    if (this.audioEnabled) return;
    
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create listener
      const listener = this.audioContext.listener;
      
      // Set initial position
      if (listener.positionX) {
        // Modern API
        listener.positionX.value = 0;
        listener.positionY.value = 0;
        listener.positionZ.value = 0;
        listener.forwardX.value = 0;
        listener.forwardY.value = 0;
        listener.forwardZ.value = -1;
        listener.upX.value = 0;
        listener.upY.value = 1;
        listener.upZ.value = 0;
      } else {
        // Legacy API
        listener.setPosition(0, 0, 0);
        listener.setOrientation(0, 0, -1, 0, 1, 0);
      }
      
      this.audioEnabled = true;
      console.log('Positional audio enabled');
    } catch (error) {
      console.error('Failed to initialize positional audio:', error);
    }
  }
  
  /**
   * Update the position of a peer
   * @param {string} peerId - The ID of the peer
   * @param {Object} position - The position {x, y, z}
   * @param {Object} rotation - The rotation {x, y, z}
   */
  updatePeerPosition(peerId, position, rotation) {
    // Find the peer
    const peerIndex = this.peers.findIndex(p => p.id === peerId);
    
    if (peerIndex === -1) {
      // New peer, add to list
      this.peers.push({
        id: peerId,
        position,
        rotation,
        lastUpdate: Date.now()
      });
      
      // Create peer entity in the scene
      this._createPeerEntity(peerId, position, rotation);
    } else {
      // Update existing peer
      this.peers[peerIndex].position = position;
      this.peers[peerIndex].rotation = rotation;
      this.peers[peerIndex].lastUpdate = Date.now();
      
      // Update peer entity in the scene
      this._updatePeerEntity(peerId, position, rotation);
    }
    
    // Update audio position if enabled
    if (this.audioEnabled && this.audioNodes[peerId]) {
      this._updateAudioPosition(peerId, position);
    }
  }
  
  /**
   * Broadcast local player position to all peers
   */
  broadcastPosition() {
    if (!this.isConnected) return;
    
    // Get camera position
    const camera = document.querySelector('#camera');
    if (!camera) return;
    
    const position = camera.object3D.position.clone();
    const rotation = camera.object3D.rotation.clone();
    
    // Create message
    const message = {
      type: 'position',
      id: this.localId,
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z
      },
      timestamp: Date.now()
    };
    
    // Send to all peers
    // This will be implemented with actual WebRTC or WebSocket
    console.log('Broadcasting position:', message);
  }
  
  /**
   * Handle incoming message from a peer
   * @param {Object} message - The message
   */
  handlePeerMessage(message) {
    if (!message || !message.type) return;
    
    switch (message.type) {
      case 'position':
        // Update peer position
        this.updatePeerPosition(
          message.id,
          message.position,
          message.rotation
        );
        break;
        
      case 'audio':
        // Handle audio data
        // This will be implemented with actual WebRTC
        break;
        
      case 'physics':
        // Handle physics interaction
        // This will be implemented with actual physics synchronization
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }
  }
  
  /**
   * Start broadcasting position at regular intervals
   * @private
   */
  _startPositionBroadcast() {
    // Broadcast position every 100ms
    this._positionInterval = setInterval(this.broadcastPosition, 100);
  }
  
  /**
   * Stop broadcasting position
   * @private
   */
  _stopPositionBroadcast() {
    if (this._positionInterval) {
      clearInterval(this._positionInterval);
      this._positionInterval = null;
    }
  }
  
  /**
   * Create a new entity for a peer in the scene
   * @param {string} peerId - The ID of the peer
   * @param {Object} position - The position {x, y, z}
   * @param {Object} rotation - The rotation {x, y, z}
   * @private
   */
  _createPeerEntity(peerId, position, rotation) {
    // Check if entity already exists
    if (document.querySelector(`#peer-${peerId}`)) return;
    
    // Create entity
    const entity = document.createElement('a-entity');
    entity.id = `peer-${peerId}`;
    entity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    entity.setAttribute('rotation', `${rotation.x} ${rotation.y} ${rotation.z}`);
    
    // Add avatar model
    const avatar = document.createElement('a-box');
    avatar.setAttribute('color', '#00aaff');
    avatar.setAttribute('scale', '0.5 0.5 0.5');
    entity.appendChild(avatar);
    
    // Add name tag
    const nameTag = document.createElement('a-text');
    nameTag.setAttribute('value', peerId);
    nameTag.setAttribute('position', '0 0.75 0');
    nameTag.setAttribute('align', 'center');
    nameTag.setAttribute('scale', '0.5 0.5 0.5');
    entity.appendChild(nameTag);
    
    // Add to scene
    document.querySelector('a-scene').appendChild(entity);
    
    console.log(`Created peer entity for ${peerId}`);
  }
  
  /**
   * Update the position and rotation of a peer entity
   * @param {string} peerId - The ID of the peer
   * @param {Object} position - The position {x, y, z}
   * @param {Object} rotation - The rotation {x, y, z}
   * @private
   */
  _updatePeerEntity(peerId, position, rotation) {
    const entity = document.querySelector(`#peer-${peerId}`);
    if (!entity) return;
    
    entity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    entity.setAttribute('rotation', `${rotation.x} ${rotation.y} ${rotation.z}`);
  }
  
  /**
   * Update the position of a peer's audio source
   * @param {string} peerId - The ID of the peer
   * @param {Object} position - The position {x, y, z}
   * @private
   */
  _updateAudioPosition(peerId, position) {
    const audioNode = this.audioNodes[peerId];
    if (!audioNode) return;
    
    if (audioNode.positionX) {
      // Modern API
      audioNode.positionX.value = position.x;
      audioNode.positionY.value = position.y;
      audioNode.positionZ.value = position.z;
    } else {
      // Legacy API
      audioNode.setPosition(position.x, position.y, position.z);
    }
  }
}

// Create singleton instance
const instance = new MultiplayerManager();

export default instance;
