# VRMOBDESK

#link to hosted demo: https://tezeroth.github.io/VRMOBDESK-REFACTOR/

# ![image](https://github.com/user-attachments/assets/a34c4914-99d2-4ed7-b4c5-fd17ac83a68d)


VRMOBDESK is a web-based VR/Mobile/Desktop interactive 3D environment built with A-Frame. It provides a versatile platform for creating immersive experiences that work across multiple devices.

## Features

- **Multi-platform support**: Works on VR headsets, mobile devices, and desktop browsers
- **Physics-based interactions**: Realistic object manipulation using PhysX
- **Adaptive controls**: Different control schemes for VR, mobile, and desktop
- **Navigation system**: Movement within the 3D environment with collision detection
- **Object manipulation**: Pick up, examine, throw, and interact with 3D objects

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

Comprehensive documentation is available in the `Documentation` folder:

- **[Documentation/Docs](./Documentation/Docs)**: Detailed documentation of the application's functionality, dependencies, and architecture
- **[Documentation/UML](./Documentation/UML)**: UML diagrams showing the application's structure and behavior

For specific documentation:
- [Functionality](./Documentation/Docs/Functionality.md)
- [Dependencies](./Documentation/Docs/Dependencies.md)
- [Program Flow](./Documentation/Docs/ProgramFlow.md)
- [Modular Structure](./Documentation/Docs/ModularStructure.md)

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
- **[js/managers/](./js/managers)**: Manager modules
  - DeviceManager: Handles device detection, permissions, and capabilities
  - LookModeManager: Handles switching between swipe and gyro modes
  - MultiplayerManager: Handles multiplayer functionality (in development)
- **[js/utils/](./js/utils)**: Utility functions and helpers
  - PhysicsUtils: Utility functions for physics operations
  - InteractionUtils: Utility functions for object interactions
  - StateMachine: A simple state machine implementation
  - PerformanceOptimizer: Optimizes performance for first-time interactions

The legacy code is still available in the root directory for reference and fallback if needed.

## Development

### Directory Structure

```
VRMOBDESK/
├── Assets/             # 3D models, textures, and other assets
├── Documentation/      # Project documentation
│   ├── Docs/           # Detailed documentation
│   └── UML/            # UML diagrams
├── js/                 # Modular JavaScript structure
│   ├── components/     # A-Frame components
│   ├── managers/       # Manager modules
│   └── utils/          # Utility functions
├── lib/                # External libraries
├── temp/               # Legacy code and test files
├── index.html          # Main HTML file
├── MOBDESK.css         # CSS styles
├── model-utils.js      # Legacy component utilities
└── README.md           # This file
```

### Future Development

The project is now ready for:

1. **Multiplayer functionality**: Adding support for multiple users with positional audio
2. **Performance optimizations**: Improving performance across all platforms
3. **Enhanced VR interactions**: Adding more immersive VR interactions

The modular structure has been completed, making it easier to implement these features. See [Documentation/Docs/MultiplayerPreparation.md](./Documentation/Docs/MultiplayerPreparation.md) for details on the multiplayer implementation plan and [Documentation/Docs/ModularStructure.md](./Documentation/Docs/ModularStructure.md) for information about the modular code structure. For performance optimization details, see [Documentation/Docs/OptimizationSummary.md](./Documentation/Docs/OptimizationSummary.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [A-Frame](https://aframe.io/) - WebVR framework
- [PhysX](https://github.com/c-frame/physx) - Physics engine
- [Handy Controls](https://github.com/c-frame/handy-work) - Hand tracking and interaction

