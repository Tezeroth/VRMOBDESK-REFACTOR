# Multiplayer Requirements Document

*Last Updated: Current Date*

## Overview

This document outlines the requirements and specifications for implementing multiplayer functionality with positional audio in the VRMOBDESK application. The implementation will enable users to interact in a shared virtual environment with spatial voice communication.

## Core Requirements

### 1. Connection Management

- **User Identification**: Unique IDs for each user in a session
- **Room-Based Sessions**: Support for multiple separate rooms/sessions
- **Connection Status**: Clear indication of connection state to users
- **Reconnection Handling**: Graceful recovery from temporary disconnections
- **Session Persistence**: Optional persistence of room state between connections
- **Connection Diagnostics**: Debug overlay showing RTT, packet loss, and connection quality

### 2. Player Representation

- **Avatar Visualization**: Visual representation of remote players
- **Position/Rotation Sync**: Accurate synchronization of player movements
- **Hand/Controller Tracking**: Synchronization of hand positions and gestures
- **Player Identification**: Visual indicators of player identity (name tags, colors)
- **Presence Indicators**: Visual feedback when players join/leave
- **Adaptive Avatar LOD**: Dynamic level of detail based on distance and device performance

### 3. State Synchronization

- **Transform Synchronization**: Position, rotation, and scale of players and objects
- **Physics Synchronization**: Consistent physics state across clients
- **Object Ownership**: Clear ownership model for interactive objects
- **Late-Join Synchronization**: Full state synchronization for players joining mid-session
- **Bandwidth Optimization**: Efficient use of network resources (delta compression, prioritization)
- **Conflict Resolution**: Timestamp-based or versioning system for resolving state conflicts
- **Rollback and Resimulation**: Optional system for critical sync conflicts in physics interactions

### 4. Positional Audio

- **Spatial Voice Chat**: Voice communication with 3D positioning
- **Distance-Based Attenuation**: Volume reduction based on distance
- **Direction-Based Filtering**: Directional audio based on source position
- **Voice Activity Detection**: Visual indicators of who is speaking
- **Audio Quality Controls**: Options for balancing quality vs. bandwidth
- **Dynamic Audio Culling**: Disable voice rendering for non-nearby users on low-end devices
- **Fallback Audio Modes**: Simplified audio processing for performance-constrained devices

### 5. Interaction Synchronization

- **Object Manipulation**: Synchronized grabbing, moving, and releasing of objects
- **Interaction Feedback**: Visual feedback of remote player interactions
- **Conflict Resolution**: Handling of simultaneous interaction attempts
- **Interaction Permissions**: Optional restrictions on who can interact with what
- **Input Validation**: Verification of physics interactions to prevent impossible actions
- **Action Replay**: Optional logging of critical interactions for auditing purposes

### 6. Performance Considerations

- **Bandwidth Efficiency**: Minimal network usage through optimization
- **CPU Efficiency**: Low processing overhead for networking code
- **Scalability**: Support for at least 5-10 simultaneous users
- **Cross-Platform Support**: Consistent experience across desktop, mobile, and VR
- **Fallback Mechanisms**: Graceful degradation when resources are limited
- **Dynamic Physics Settings**: Adaptive physics tick rates based on device performance
- **Performance Monitoring**: Real-time metrics for framerate, network usage, and system load

### 7. User Experience

- **Simple Connection Process**: Easy-to-use interface for joining sessions
- **Connection Status Feedback**: Clear indicators of connection state
- **Error Handling**: User-friendly error messages and recovery options
- **Session Management UI**: Interface for creating, joining, and leaving sessions
- **Voice Controls**: Mute/unmute and volume controls for voice chat
- **User Moderation**: Basic tools for managing disruptive users

### 8. Security Considerations

- **Input Validation**: Verification of all network messages to prevent exploits
- **Rate Limiting**: Protection against message flooding from malicious clients
- **Action Auditing**: Optional logging of user actions for security purposes
- **User Authentication**: Basic identity verification for persistent user accounts
- **Permission System**: Granular control over who can perform specific actions

## Technical Approach

### Network Architecture

- **WebRTC for Peer-to-Peer**: Direct connections between clients for low latency
- **Signaling Server**: Central server for connection establishment only
- **Hybrid Authority Model**: Distributed authority with conflict resolution
- **Fallback to WebSockets**: Alternative when WebRTC is unavailable
- **SFU Integration Path**: Future capability to use Selective Forwarding Units for scaling beyond 10 users

### Synchronization Strategy

- **Interpolation**: Smooth movement between network updates
- **Prediction**: Local prediction of physics and movement
- **Ownership Transfer**: Dynamic transfer of object authority
- **Delta Compression**: Only sending changes rather than full state
- **Priority-Based Updates**: More frequent updates for important/nearby entities
- **Object Versioning**: Timestamp or version-based conflict resolution
- **Interest Management**: Focus network resources on relevant entities

### Implementation Phases

1. **Phase 0: Proof of Concept**
   - Create a "ghost room" with basic voice and avatar position
   - Test WebRTC signaling and connection handling in VR
   - Implement debug overlay showing framerate, RTT, and user count
   - Validate core networking approach before full implementation

2. **Phase 1: Connection Foundation**
   - Basic WebRTC/WebSocket implementation
   - Simple presence synchronization (join/leave)
   - Text chat functionality
   - Connection diagnostics and monitoring

3. **Phase 2: Player Synchronization**
   - Position/rotation synchronization
   - Basic avatar representation
   - Simple voice chat implementation
   - Adaptive quality based on device performance

4. **Phase 3: Interaction Synchronization**
   - Object ownership and manipulation
   - Physics synchronization
   - Full positional audio implementation
   - Conflict resolution for simultaneous interactions

5. **Phase 4: Optimization and Polish**
   - Bandwidth and CPU optimization
   - UI improvements
   - Error handling and recovery
   - Advanced avatar features
   - Security enhancements

## Integration with Existing Systems

The multiplayer implementation will integrate with these existing components:

1. **Physics System**: Synchronized with the PhysX implementation
2. **Interaction System**: Hooks into the existing object interaction framework
3. **Avatar System**: Research the best way to integrate avatars, and implement.
4. **Audio System**: Extends the current audio implementation with spatial features
5. **UI System**: Integrates with the existing UI framework

## Success Criteria

The multiplayer implementation will be considered successful when:

1. Users can reliably connect to shared sessions
2. Player movements and interactions are synchronized with minimal latency
3. Voice communication is clear and properly positioned in 3D space
4. The system can support at least 5 simultaneous users without performance issues
5. The user experience is intuitive and requires minimal setup
6. The implementation works consistently across desktop, mobile, and VR platforms
7. Performance remains acceptable on Quest and low-end mobile devices

## Technical Constraints

1. Must work in modern browsers without plugins
2. Must function across NATs and firewalls when possible
3. Must degrade gracefully when ideal conditions aren't available
4. Must maintain acceptable frame rates on target devices
5. Must work with the existing A-Frame/Three.js architecture
6. Must scale down appropriately for mobile and Quest devices

## Scaling Considerations

For future scaling beyond the initial implementation:

1. **Voice Communication Scaling**
   - WebRTC direct connections work well up to ~10 users
   - For larger rooms, implement SFU servers (mediasoup, Janus, Jitsi's JVB)
   - Consider routing voice through a central low-latency server

2. **Physics and State Synchronization**
   - Implement spatial partitioning for large environments
   - Consider server authority for critical game state in larger deployments
   - Use interest management to limit updates to relevant entities

3. **Performance Optimization for Mobile/Quest**
   - Implement adaptive LOD for avatars based on distance and device capability
   - Dynamically adjust physics settings based on device performance
   - Disable or simplify voice processing for distant users
   - Implement aggressive culling of non-essential network updates



## Conclusion

The recent code optimizations have established a solid foundation for implementing multiplayer functionality. The modular architecture, state management improvements, and performance optimizations will make it easier to add networking capabilities while maintaining good performance across all devices.

The jump system optimizations in particular have improved the reliability and performance of movement mechanics, which will be critical for smooth multiplayer synchronization. The vector pooling and optimized collision detection will help reduce the performance impact of network synchronization.

The next steps will involve:
1. Researching cost-effective hosting options for the signaling server
2. Implementing the WebRTC connection layer
3. Setting up state synchronization for player movement and interactions
4. Adding positional audio support for voice chat
5. Creating a basic avatar system for player representation

These steps will be detailed in a separate multiplayer implementation plan once the research phase is complete.

## WebRTC Implementation Checklist

### 1. Signaling Server Setup
- [ ] Create a new directory for the signaling server
- [ ] Initialize Node.js project with `npm init -y`
- [ ] Install required dependencies:
  - [ ] Express (`npm install express`)
  - [ ] Socket.io (`npm install socket.io`)
  - [ ] CORS middleware (`npm install cors`)
- [ ] Create `signaling-server.js` with the following functionality:
  - [ ] Set up Express server with CORS enabled
  - [ ] Initialize Socket.io
  - [ ] Implement room management logic
  - [ ] Handle user join/leave events
  - [ ] Implement WebRTC signaling (offer/answer/ICE candidates)
  - [ ] Add error handling and logging
- [ ] Test the signaling server locally
- [ ] Deploy the signaling server to a hosting service (Heroku, Glitch, etc.)

### 2. Client-Side WebRTC Implementation
- [ ] Add required libraries to the project:
  - [ ] Socket.io client
  - [ ] SimplePeer (or another WebRTC library)
- [ ] Update `MultiplayerManager.js` with WebRTC functionality:
  - [ ] Replace simulated connections with actual WebRTC connections
  - [ ] Implement connection to signaling server
  - [ ] Add peer connection establishment logic
  - [ ] Implement data channel creation and management
  - [ ] Add methods for sending/receiving data
  - [ ] Implement peer entity creation/management in the scene
  - [ ] Add position broadcasting
  - [ ] Implement error handling and reconnection logic
- [ ] Create UI for connection status and controls

### 3. Integration with PhysicsSyncManager
- [ ] Modify `PhysicsSyncManager.js` to work with the WebRTC implementation:
  - [ ] Update `sendMessageToPeer` method to use MultiplayerManager
  - [ ] Update `broadcastMessage` method to use MultiplayerManager
  - [ ] Ensure physics messages are properly routed between components
- [ ] Add event listeners for physics-related messages in MultiplayerManager
- [ ] Test physics synchronization between clients

### 4. Testing and Debugging
- [ ] Create a test plan for multiplayer functionality
- [ ] Test connection establishment between multiple clients
- [ ] Test position synchronization
- [ ] Test physics object synchronization
- [ ] Add debug logging for network activity
- [ ] Implement network statistics display
- [ ] Test across different network conditions

### 5. Positional Audio Implementation
- [ ] Research WebRTC audio stream handling
- [ ] Implement audio stream capture and transmission
- [ ] Add spatial audio positioning based on peer locations
- [ ] Implement distance-based attenuation
- [ ] Add audio controls (mute/unmute, volume)
- [ ] Test audio quality and synchronization

### 6. Deployment and Optimization
- [ ] Set up TURN server for NAT traversal (or use a service)
- [ ] Optimize data transmission (compression, delta updates)
- [ ] Implement adaptive quality based on network conditions
- [ ] Add connection quality indicators
- [ ] Test on target devices (desktop, mobile, VR)
- [ ] Document deployment process

### 7. Security Considerations
- [ ] Implement input validation for all network messages
- [ ] Add rate limiting to prevent flooding
- [ ] Consider encryption for sensitive data
- [ ] Implement basic authentication if needed
- [ ] Test for common security vulnerabilities

This checklist provides a detailed roadmap for implementing WebRTC-based multiplayer functionality in the VRMOBDESK application. Each section can be tackled sequentially, with testing performed at each stage to ensure proper functionality.

## External Resources

### Networked A-Frame
For avatar implementation, consider exploring the Networked A-Frame project:
https://github.com/networked-aframe/naf-valid-avatars/blob/main/docs/integrate_in_your_project.md

This provides a cutting-edge approach to avatar implementation in A-Frame with support for features like inverse kinematics.
