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

### VR.js
- **Purpose**: Handles VR-specific functionality
- **Key Components**: 
  - `toggle-physics` component for VR object interaction

### model-utils.js
- **Purpose**: Provides utilities for working with 3D models
- **Key Components**:
  - `lightmap` component for applying lightmaps to models
  - `depthwrite` component for controlling depth buffer writing
  - `hideparts` component for hiding specific parts of models
  - `no-tonemapping` component for disabling tone mapping on materials
  - `make-transparent` component for making objects transparent
  - `simple-navmesh-constraint` component for navigation constraints
  - `magnet-range-debug` component for visualizing magnet ranges

### navigate-on-click.js
- **Purpose**: Provides navigation functionality for clickable objects
- **Key Components**:
  - `navigate-on-click` component for URL navigation on object click

### MOBDESK.js
- **Purpose**: Main application logic
- **Key Components**:
  - `physx` component for PhysX integration
  - `DeviceManager` for device detection
  - `LookModeManager` for camera control modes
  - `desktop-and-mobile-controls` component for non-VR interaction

### control-manager.js
- **Purpose**: Manages control schemes based on device type
- **Key Components**:
  - `control-manager` component for switching between VR and non-VR controls

## CSS Files

### MOBDESK.css
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
