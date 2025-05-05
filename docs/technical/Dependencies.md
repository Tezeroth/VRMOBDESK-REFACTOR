# VRMOBDESK Dependencies

This document lists all external libraries and dependencies used by the VRMOBDESK application.

## Core Libraries

### A-Frame
- **Version**: 1.7.1
- **URL**: https://cdn.jsdelivr.net/npm/aframe@1.7.1/dist/aframe-master.min.js
- **Purpose**: Main WebVR/WebXR framework that provides the foundation for the 3D environment
- **Usage**: Creates the scene, entities, and component system

### PhysX
- **Version**: Not specified (local file)
- **URL**: lib/physx.min.js and lib/physx.release.wasm
- **Purpose**: Physics engine for realistic object behavior
- **Usage**: Provides physics simulation, collision detection, and object interaction
- **Configuration**:
  ```html
  physics="driver: physx; gravity: 0 -9.8 0; maxSubSteps: 4; fixedTimeStep: 1/60;"
  physx="autoLoad: true; wasmUrl: lib/physx.release.wasm"
  ```

## A-Frame Components and Extensions

### A-Frame Environment Component
- **Version**: 1.3.7
- **URL**: https://cdn.jsdelivr.net/npm/aframe-environment-component@1.3.7/dist/aframe-environment-component.min.js
- **Purpose**: Provides quick environment setup with various presets
- **Usage**: Creates the background environment with the "osiris" preset

### A-Frame Extras (Controls)
- **Version**: 7.5.4
- **URL**: https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.5.4/dist/aframe-extras.controls.min.js
- **Purpose**: Provides additional control schemes for movement
- **Usage**: Implements movement-controls for navigation

### A-Frame Extras (Sphere Collider)
- **Version**: 7.5.4
- **URL**: https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.5.4/dist/components/sphere-collider.min.js
- **Purpose**: Provides sphere-based collision detection
- **Usage**: Used for interaction detection

### Handy Controls
- **Version**: 3.1.11
- **URL**: https://cdn.jsdelivr.net/npm/handy-work@3.1.11/build/handy-controls.min.js
- **Purpose**: Provides hand tracking and interaction capabilities
- **Usage**: Implements hand-based object manipulation in VR

### Magnet Helpers
- **Version**: 3.1.11
- **URL**: https://cdn.jsdelivr.net/npm/handy-work@3.1.11/build/magnet-helpers.min.js
- **Purpose**: Provides magnetic interaction points for object manipulation
- **Usage**: Implements grab points on objects

### A-Frame HTML Mesh
- **Version**: 2.2.0
- **URL**: https://cdn.jsdelivr.net/npm/aframe-htmlmesh@2.2.0/build/aframe-html.min.js
- **Purpose**: Allows rendering HTML content as textures in 3D space
- **Usage**: Used for UI elements in the 3D environment

## Custom JavaScript Files

### Components

- **ControlManager.js**
  - **Purpose**: Manages control schemes based on device type
  - **Key Components**: `control-manager` component

- **DesktopMobileControls.js**
  - **Purpose**: Handles desktop and mobile interactions
  - **Key Components**: `desktop-mobile-controls` component

- **ArrowControls.js**
  - **Purpose**: Provides on-screen controls for mobile devices
  - **Key Components**: `arrow-controls` component

- **NavigateOnClick.js**
  - **Purpose**: Provides navigation functionality for clickable objects
  - **Key Components**: `navigate-on-click` component

- **TogglePhysics.js**
  - **Purpose**: Handles physics state for VR object interaction
  - **Key Components**: `toggle-physics` component

- **PhysicsSleepManager.js**
  - **Purpose**: Optimizes physics by managing sleep states of objects
  - **Key Components**: `physics-sleep-manager` component

- **PhysicsOptimizer.js**
  - **Purpose**: Adjusts physics settings based on device capabilities
  - **Key Components**: `physics-optimizer` component

- **PhysicsSyncManager.js**
  - **Purpose**: Synchronizes physics across clients in multiplayer
  - **Key Components**: `physics-sync-manager` component

- **LoadingScreenManager.js**
  - **Purpose**: Manages the loading screen and initialization sequence
  - **Key Components**: `loading-screen-manager` component

- **MakeTransparent.js**
  - **Purpose**: Makes GLTF models transparent for invisible colliders
  - **Key Components**: `make-transparent` component

- **SimpleNavmeshConstraint.js**
  - **Purpose**: Constrains movement to a navigation mesh
  - **Key Components**: `simple-navmesh-constraint` component

- **JumpControl.js**
  - **Purpose**: Provides jumping functionality for the player
  - **Key Components**: `jump-control` component

- **JumpCollider.js**
  - **Purpose**: Adds a collider to detect wall collisions during jumps
  - **Key Components**: `jump-collider` component

- **PlayerCollider.js**
  - **Purpose**: Adds a collider to the player to prevent moving through walls
  - **Key Components**: `player-collider` component

- **MagnetRangeDebug.js**
  - **Purpose**: Visualizes magnet ranges for debugging
  - **Key Components**: `magnet-range-debug` component

### Managers

- **DeviceManager.js**
  - **Purpose**: Handles device detection, permissions, and capabilities

- **LookModeManager.js**
  - **Purpose**: Handles switching between swipe and gyro modes

- **MultiplayerManager.js**
  - **Purpose**: Handles multiplayer functionality (in development)

### Utilities

- **PhysicsUtils.js**
  - **Purpose**: Utility functions for physics operations

- **InteractionUtils.js**
  - **Purpose**: Utility functions for object interactions

- **StateMachine.js**
  - **Purpose**: A simple state machine implementation

- **PerformanceOptimizer.js**
  - **Purpose**: Optimizes performance for first-time interactions

## CSS Files

### styles.css
- **Purpose**: Provides styling for UI elements
- **Key Styles**:
  - Mobile control buttons
  - Permission overlays
  - Loading screens
  - Look mode toggle button

## Additional Resources

### 3D Models and Assets
- Various GLTF/GLB models loaded from the Assets directory
- Navmesh for navigation constraints
- Lightmap textures for baked lighting

## Development Tools

### A-Frame Inspector
- **Version**: 1.7.0
- **URL**: https://cdn.jsdelivr.net/gh/c-frame/aframe-editor@1.7.0/dist/aframe-editor.min.js
- **Purpose**: Provides a visual editor for the A-Frame scene
- **Usage**: Enabled with the inspector attribute on the scene

### Draco Decoder
- **Version**: 1.5.7
- **URL**: https://www.gstatic.com/draco/versioned/decoders/1.5.7/
- **Purpose**: Provides decompression for Draco-compressed 3D models
- **Usage**: Configured with the gltf-model attribute on the scene
