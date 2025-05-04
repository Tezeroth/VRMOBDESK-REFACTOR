# VRMOBDESK

### [Live Demo](https://tezeroth.github.io/VRMOBDESK-REFACTOR/)

![VRMOBDESK Preview](https://github.com/user-attachments/assets/a34c4914-99d2-4ed7-b4c5-fd17ac83a68d)

VRMOBDESK is a web-based VR/Mobile/Desktop interactive 3D environment built with A-Frame. It provides a versatile platform for creating immersive experiences that work across multiple devices with optimized performance and intuitive controls.

## Features

- **Multi-platform support**: Works seamlessly on VR headsets, mobile devices, and desktop browsers
- **Physics-based interactions**: Realistic object manipulation using PhysX with optimized performance
- **Adaptive controls**: Intelligent control schemes that adapt to VR, mobile, and desktop devices
- **Navigation system**: Smooth movement within the 3D environment with collision detection
- **Jump functionality**: Animation-based jumping with momentum preservation and navmesh integration
- **Object manipulation**: Pick up, examine (using right-click in desktop mode), throw, and interact with 3D objects naturally
- **Performance optimized**: Implements sleep management for physics objects and device-specific optimizations
- **Mobile-friendly**: Supports both touch controls and gyroscope-based camera movement
- **Modular architecture**: Well-organized codebase ready for extension and customization

## Getting Started

### Prerequisites

- A modern web browser with WebGL and WebXR support
- For VR: A compatible VR headset (Oculus Quest, HTC Vive, etc.)
- For mobile: A smartphone or tablet with gyroscope (optional but recommended)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/Tezeroth/VRMOBDESK.git
   ```

2. Navigate to the project directory:
   ```
   cd VRMOBDESK
   ```

3. Start a local web server:
   ```
   # Using Python 3
   python -m http.server

   # Using Node.js
   npx serve
   ```

4. Open your browser and navigate to `http://localhost:8000` (or the port specified by your server)

## Documentation

Comprehensive documentation is available in the `docs` folder:

- **[Documentation Overview](./docs/README.md)**: Complete documentation index and structure

### Key Documentation Files:

- [Functionality](./docs/features/functionality.md) - Overview of application features and capabilities
- [Dependencies](./docs/technical/Dependencies.md) - External libraries and dependencies
- [Program Flow](./docs/architecture/program-flow.md) - Application initialization and execution flow
- [Modular Structure](./docs/architecture/modular-structure.md) - Details of the modular code architecture
- [Performance Notes](./docs/performance/performance-notes.md) - Performance optimization documentation
- [Multiplayer Preparation](./docs/multiplayer/multiplayer-preparation.md) - Plans for multiplayer implementation

## Project Structure

The project has been refactored into a modular structure:

- **[js/components/](./js/components)**: A-Frame components
  - ControlManager: Manages control schemes based on device type
  - DesktopMobileControls: Handles desktop and mobile interactions
  - ArrowControls: Provides on-screen controls for mobile devices
  - NavigateOnClick: Handles navigation to other pages on click
  - TogglePhysics: Handles physics state for VR object interaction
  - PhysicsSleepManager: Optimizes physics by managing sleep states of objects
  - PhysicsOptimizer: Adjusts physics settings based on device capabilities
  - LoadingScreenManager: Manages the loading screen and initialization sequence
  - MakeTransparent: Makes GLTF models transparent for invisible colliders
  - SimpleNavmeshConstraint: Constrains movement to a navigation mesh
- **[js/managers/](./js/managers)**: Manager modules
  - DeviceManager: Handles device detection, permissions, and capabilities
  - LookModeManager: Handles switching between swipe and gyro modes
  - MultiplayerManager: Handles multiplayer functionality (in development)
- **[js/utils/](./js/utils)**: Utility functions and helpers
  - PhysicsUtils: Utility functions for physics operations
  - InteractionUtils: Utility functions for object interactions
  - StateMachine: A simple state machine implementation
  - PerformanceOptimizer: Optimizes performance for first-time interactions

Some legacy code has been moved to the `temp/` directory, while essential components like model-utils.js remain in the root directory for backward compatibility.

## Development

### Directory Structure

```
VRMOBDESK/
├── Assets/             # 3D models, textures, and other assets
├── docs/               # Project documentation
│   ├── architecture/   # System architecture documentation
│   ├── features/       # Feature-specific documentation
│   ├── multiplayer/    # Multiplayer-related documentation
│   ├── performance/    # Performance-related documentation
│   ├── technical/      # Technical documentation
│   └── diagrams/       # UML and other diagrams
├── js/                 # Modular JavaScript structure
│   ├── components/     # A-Frame components
│   ├── managers/       # Manager modules
│   └── utils/          # Utility functions
├── lib/                # External libraries
├── temp/               # Legacy code and test files
├── index.html          # Main HTML file
├── MOBDESK.css         # CSS styles
├── model-utils.js      # Legacy components for lightmap and glass rendering
└── README.md           # This file
```

### Future Development Roadmap

The project is now ready for the next phase of development:

1. **Draw Call Optimization**
   - Implement texture atlasing to reduce draw calls
   - Create instanced colliders to improve physics performance
   - Add level-of-detail (LOD) system for complex models
   - Implement occlusion culling for better rendering performance
   - Modernize remaining legacy components (lightmap, glass rendering)

2. **Multiplayer Implementation**
   - Develop WebRTC/WebSocket-based networking
   - Implement state synchronization for physics objects
   - Create avatar systems for player representation
   - Add positional audio for immersive communication

3. **Enhanced VR Interactions**
   - Improve hand tracking and gesture recognition
   - Add haptic feedback for more immersive interactions
   - Implement two-handed object manipulation
   - Create specialized VR UI elements

The modular architecture provides a solid foundation for these features. For detailed implementation plans, see:
- [Multiplayer Preparation](./docs/multiplayer/multiplayer-preparation.md)
- [Performance Optimization](./docs/performance/performance-notes.md)
- [Modular Structure](./docs/architecture/modular-structure.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [A-Frame](https://aframe.io/) - WebVR framework for building immersive experiences
- [PhysX](https://github.com/c-frame/physx) - High-performance physics engine
- [Handy Controls](https://github.com/c-frame/handy-work) - Hand tracking and interaction system
- [A-Frame Environment](https://github.com/supermedium/aframe-environment-component) - Environment generation
- [A-Frame Extras](https://github.com/c-frame/aframe-extras) - Additional components and controls
