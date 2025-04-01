# A-Frame XR Boilerplate Component Documentation

## Overview
This document provides detailed documentation for all components in the A-Frame XR Boilerplate project, including their locations, parameters, and interactions. This documentation is intended to assist in merging this project with an FPS control system for 3D object manipulation.

## Core Components

### 1. hide-on-hit-test-start
**Location**: `main.js`
**Purpose**: Manages entity visibility during AR hit testing
**Events**:
- `ar-hit-test-start`: Hides the entity
- `exit-vr`: Shows the entity again
**Usage**: Applied to indicators or placeholders that should only be visible before AR scene anchoring

### 2. origin-on-ar-start
**Location**: `main.js`
**Purpose**: Resets entity position and rotation for AR mode
**Events**:
- `enter-vr`: Checks for AR mode and resets position/rotation to origin (0,0,0)
**Usage**: Applied to entities that need to align with real-world AR starting point

### 3. ar-cursor
**Location**: `main.js`
**Purpose**: Emulates cursor functionality in AR mode
**Dependencies**: `raycaster`
**Events**:
- `enter-vr`: Sets up AR mode select event listener
- `select`: Handles AR input selection
**Parameters**:
- Uses raycaster for intersection testing
- Emits click events on intersected elements
**Usage**: Essential for AR mode interaction

### 4. universal-object-interaction
**Location**: `main.js`
**Purpose**: Handles object picking, moving, and dropping in VR and non-VR modes
**Schema**:
```javascript
{
  pickupDistance: { type: "number", default: 5 },
  dropDistance: { type: "number", default: 10 },
  raycastTarget: { type: "selector", default: "#head [raycaster]" }
}
```
**Events**:
- Mouse/Touch events for non-VR:
  - `mousedown`/`touchstart`: Start interaction
  - `mousemove`/`touchmove`: Update interaction
  - `mouseup`/`touchend`: End interaction
- VR events:
  - `triggerdown`: VR select
  - `triggerup`: VR deselect
**Methods**:
- `startInteraction(x, y)`: Initiates object pickup
- `updateInteraction(x, y)`: Updates object position during interaction
- `endInteraction()`: Handles object drop
- `pickUpObject(object)`: Manages object pickup physics
- `dropObject(object)`: Manages object drop physics
**Usage**: Core component for object manipulation in both VR and non-VR modes

### 5. toggle-physics
**Location**: `main.js`
**Purpose**: Manages physics states during object interaction
**Events**:
- `pickup`: Adds 'grabbed' state
- `putdown`: Removes 'grabbed' state and applies controller velocities
**Parameters**:
- Uses `physx-body` component for physics manipulation
- Handles linear and angular velocities from controllers
**Usage**: Applied to objects that need physics-based interaction

## Scene Components

### 1. movement-controls
**Location**: `index.html` (on #cameraRig)
**Purpose**: Handles VR movement and navigation
**Parameters**:
- `controls`: "keyboard, touch, gamepad"
- `speed`: "5"
- `fly`: "true"
- `gravity`: "0"
**Usage**: Controls VR movement and navigation

### 2. handy-controls
**Location**: `index.html` (on #leftHand and #rightHand)
**Purpose**: Provides hand tracking and interaction
**Parameters**:
- `hand`: "left"/"right"
- `handModelStyle`: "lowPoly"
- `color`: "#ffcccc"/"#ccccff"
**Usage**: Hand tracking and interaction in VR

### 3. physx-body
**Location**: Various entities in `index.html`
**Purpose**: Physics simulation for objects
**Parameters**:
- `type`: "dynamic"/"static"/"kinematic"
- `shape`: "box"/"sphere"/"capsule"
- `mass`: "1"
- `restitution`: "0.2"
- `friction`: "0.5"
**Usage**: Applied to objects requiring physics simulation

## Integration Points for FPS System

### Key Areas for Integration
1. **Media Query Detection**
   - Purpose: Identify the current input method (VR vs desktop/mobile)
   - Implementation: Use media queries to detect VR capabilities
   - Example:
   ```javascript
   if (window.matchMedia('(display-mode: standalone)').matches) {
     // VR mode
   } else {
     // Desktop/Mobile mode
   }
   ```

2. **Raycaster Integration**
   - Current: VR uses controller-based raycaster
   - Integration: Need to merge camera-based raycaster for desktop/mobile
   - Key: Maintain separate raycaster systems but unified event handling

3. **Event System**
   - Current: VR events handled by `universal-object-interaction`
   - Integration: Need to map desktop/mobile events to same interaction system
   - Example:
   ```javascript
   // Unified event handling
   function handleInteraction(event) {
     const isVR = window.matchMedia('(display-mode: standalone)').matches;
     if (isVR) {
       // Handle VR interaction
     } else {
       // Handle desktop/mobile interaction
     }
   }
   ```

### Critical Considerations
1. **Input Detection**
   - Use media queries to detect VR capabilities
   - Fallback gracefully to desktop/mobile controls
   - Maintain separate control systems rather than merging them

2. **Raycaster Management**
   - VR: Use controller-based raycaster
   - Desktop/Mobile: Use camera-based raycaster
   - Ensure both systems emit compatible events

3. **Event Handling**
   - Create unified event handlers that work with both input methods
   - Map different input events to common interaction patterns
   - Maintain consistent physics behavior across modes

## Implementation Strategy
1. **Media Query Setup**
   ```javascript
   const vrQuery = window.matchMedia('(display-mode: standalone)');
   
   function handleModeChange(e) {
     if (e.matches) {
       // VR mode
       setupVRControls();
     } else {
       // Desktop/Mobile mode
       setupDesktopControls();
     }
   }
   
   vrQuery.addListener(handleModeChange);
   handleModeChange(vrQuery);
   ```

2. **Raycaster Configuration**
   ```javascript
   function setupRaycaster(mode) {
     if (mode === 'vr') {
       // VR raycaster setup
     } else {
       // Desktop/Mobile raycaster setup
     }
   }
   ```

3. **Event System**
   ```javascript
   function setupEventHandlers(mode) {
     const events = {
       vr: ['triggerdown', 'triggerup'],
       desktop: ['mousedown', 'mouseup'],
       mobile: ['touchstart', 'touchend']
     };
     
     events[mode].forEach(event => {
       element.addEventListener(event, handleInteraction);
     });
   }
   ```

## Notes for Integration
1. Keep VR and desktop/mobile control systems separate
2. Use media queries to detect and switch between modes
3. Focus on unifying the event handling system
4. Maintain consistent physics behavior across modes
5. Ensure raycaster systems work independently but emit compatible events

## File Structure
```
/
├── index.html          # Main scene and component definitions
├── main.js            # Core component implementations
├── model-utils.js     # Model loading and utility functions
└── COMPONENTS_DOCUMENTATION.md  # This documentation file
```

## Dependencies
- A-Frame 1.7.0
- PhysX
- Three.js
- WebXR API

## Notes for Integration
1. The `universal-object-interaction` component will need significant modification to handle FPS-style interactions
2. The movement system will need to be split into VR and non-VR modes
3. Physics interactions may need to be adjusted for FPS-style manipulation
4. Input handling will need to be unified across both interaction styles 