# Physics Synchronization Guide

This guide explains how to use the `PhysicsSyncManager` component to synchronize physics across multiple devices in a multiplayer WebRTC context.

## Overview

The `PhysicsSyncManager` component provides a solution for synchronizing PhysX physics tick rates and object states across different devices. It addresses the problem of "jitter" that occurs when different devices run physics simulations at different rates.

## Features

- Automatic detection of device capabilities and optimal physics tick rates
- Negotiation of a common tick rate across all connected clients
- Interpolation and prediction for smooth physics visualization
- Adaptive synchronization based on network conditions
- Support for different authority models (host or distributed)

## Basic Setup

Add the `physics-sync-manager` component to your A-Frame scene:

```html
<a-scene
  physics="driver: physx; gravity: 0 -9.8 0;"
  physics-sync-manager="debug: true;">
  <!-- Scene content -->
</a-scene>
```

## Configuration Options

| Property | Description | Default |
|----------|-------------|---------|
| enabled | Whether the component is active | true |
| minTickRate | Minimum acceptable tick rate (Hz) | 20 |
| maxTickRate | Maximum tick rate (Hz) | 60 |
| adaptiveSync | Dynamically adjust based on network conditions | true |
| interpolation | Enable interpolation for smoother visuals | true |
| authorityMode | Physics authority model ('host' or 'distributed') | 'host' |
| syncInterval | How often to sync in ms | 100 |
| debug | Enable debug logging | false |

## Registering Objects for Synchronization

To synchronize physics objects across the network, you need to register them with the `PhysicsSyncManager`:

```javascript
// Get the physics-sync-manager component
const physicsSyncManager = document.querySelector('a-scene').components['physics-sync-manager'];

// Register a physics object
const box = document.querySelector('#physics-box');
physicsSyncManager.registerObject(box, {
  syncPosition: true,
  syncRotation: true,
  syncVelocity: true,
  syncAngularVelocity: true,
  priority: 1, // Higher priority objects sync more frequently
  interpolate: true // Enable interpolation for this object
});
```

## Integration with Multiplayer System

The `PhysicsSyncManager` is designed to work with any WebRTC-based multiplayer system. It communicates through events that your multiplayer system should handle:

1. `send-to-peer` - Send a message to a specific peer
2. `broadcast-message` - Send a message to all peers
3. `physics-message` - Receive a message related to physics

Your multiplayer system should listen for these events and handle them appropriately:

```javascript
// In your multiplayer system
document.addEventListener('send-to-peer', function(event) {
  const peerId = event.detail.peerId;
  const message = event.detail.message;
  
  // Send the message to the specified peer using your WebRTC implementation
  yourWebRTCSystem.sendToPeer(peerId, message);
});

document.addEventListener('broadcast-message', function(event) {
  const message = event.detail.message;
  
  // Broadcast the message to all peers using your WebRTC implementation
  yourWebRTCSystem.broadcastMessage(message);
});

// When receiving a message from a peer
function onMessageFromPeer(peerId, message) {
  if (message.type && message.type.startsWith('physics-')) {
    // Forward physics-related messages to the PhysicsSyncManager
    document.dispatchEvent(new CustomEvent('physics-message', {
      detail: {
        ...message,
        senderId: peerId
      }
    }));
  }
}
```

## Example: Complete Multiplayer Scene

Here's a complete example of a multiplayer scene with physics synchronization:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Multiplayer Physics Demo</title>
  <script src="https://aframe.io/releases/1.3.0/aframe.min.js"></script>
  <script src="lib/physx.min.js"></script>
  <script src="js/components/PhysicsSyncManager.js"></script>
  <script src="js/managers/MultiplayerManager.js"></script>
</head>
<body>
  <a-scene
    physics="driver: physx; gravity: 0 -9.8 0; maxSubSteps: 4; fixedTimeStep: 1/60;"
    physics-sync-manager="debug: true; adaptiveSync: true; minTickRate: 20; maxTickRate: 60;"
    multiplayer-manager>
    
    <!-- Environment -->
    <a-plane position="0 0 0" rotation="-90 0 0" width="20" height="20" color="#7BC8A4" physx-body="type: static;"></a-plane>
    
    <!-- Physics Objects -->
    <a-box id="physics-box-1" position="0 2 -3" color="red" class="syncable"
           physx-body="type: dynamic; mass: 1;"></a-box>
    <a-sphere id="physics-box-2" position="1 2 -3" color="blue" class="syncable"
              physx-body="type: dynamic; mass: 1;"></a-sphere>
    
    <!-- Camera -->
    <a-entity id="rig" position="0 1.6 0">
      <a-entity id="camera" camera look-controls></a-entity>
    </a-entity>
  </a-scene>
  
  <script>
    // Initialize physics synchronization for all syncable objects
    document.addEventListener('physics-sync-ready', function() {
      const physicsSyncManager = document.querySelector('a-scene').components['physics-sync-manager'];
      
      // Register all syncable objects
      document.querySelectorAll('.syncable').forEach(function(el) {
        physicsSyncManager.registerObject(el, {
          priority: 1,
          interpolate: true
        });
      });
      
      console.log('Physics synchronization initialized');
    });
  </script>
</body>
</html>
```

## Troubleshooting

### Physics Objects Jittering

If physics objects are still jittering despite synchronization:

1. Increase the `syncInterval` to reduce network traffic
2. Enable `interpolation` for smoother visuals
3. Adjust the `minTickRate` and `maxTickRate` to find a balance between performance and smoothness

### High Latency Issues

For high-latency connections:

1. Set `adaptiveSync` to true to automatically adjust tick rates
2. Lower the `maxTickRate` to reduce the amount of data being sent
3. Consider using a more predictive physics model in your application

## Advanced Usage

### Custom Authority Models

The `PhysicsSyncManager` supports two authority models:

1. **Host** - One client (the host) has authority over all physics objects
2. **Distributed** - Different clients can have authority over different objects

To implement a distributed authority model:

```javascript
// When registering an object, specify who has authority
physicsSyncManager.registerObject(box, {
  authority: 'user_123', // ID of the user who has authority
  // other options...
});

// To transfer authority
function transferAuthority(objectId, newAuthorityId) {
  const syncObj = physicsSyncManager.syncedObjects.get(objectId);
  if (syncObj) {
    syncObj.authority = newAuthorityId;
    
    // Notify other peers about the authority change
    physicsSyncManager.broadcastMessage({
      type: 'physics-authority-change',
      objectId: objectId,
      newAuthority: newAuthorityId
    });
  }
}
```

### Performance Optimization

For better performance, especially on mobile devices:

1. Limit the number of synchronized physics objects
2. Use lower priority for less important objects
3. Disable interpolation for objects that don't need smooth movement
4. Consider using a lower tick rate for the entire physics simulation

## Conclusion

The `PhysicsSyncManager` provides a robust solution for synchronizing physics across multiple devices in a WebRTC-based multiplayer environment. By automatically detecting device capabilities and adapting to network conditions, it ensures a smooth and consistent experience for all users.
