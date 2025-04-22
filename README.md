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
- **[js/managers/](./js/managers)**: Manager modules
  - DeviceManager: Handles device detection, permissions, and capabilities
  - LookModeManager: Handles switching between swipe and gyro modes
- **[js/utils/](./js/utils)**: Utility functions and helpers
  - PhysicsUtils: Utility functions for physics operations
  - InteractionUtils: Utility functions for object interactions
  - StateMachine: A simple state machine implementation

The legacy code is still available in the root directory for reference and fallback if needed.

## Development

### Directory Structure

```
VRMOBDESK/
├── Assets/             # 3D models, textures, and other assets
├── Documentation/      # Project documentation
│   ├── aug/            # Detailed documentation
│   └── UML/            # UML diagrams
├── js/                 # New modular JavaScript structure (in development)
│   ├── components/     # A-Frame components
│   ├── managers/       # Manager modules
│   └── utils/          # Utility functions
├── lib/                # External libraries
├── *.js                # Original JavaScript files (currently in use)
├── index.html          # Main HTML file
├── MOBDESK.css         # CSS styles
└── README.md           # This file
```

### Future Development

The project is now ready for:

1. **Multiplayer functionality**: Adding support for multiple users with positional audio
2. **Performance optimizations**: Improving performance across all platforms
3. **Enhanced VR interactions**: Adding more immersive VR interactions

The modular structure has been completed, making it easier to implement these features. See [Documentation/aug/MultiplayerPreparation.md](./Documentation/aug/MultiplayerPreparation.md) for details on the multiplayer implementation plan and [Documentation/aug/ModularStructure.md](./Documentation/aug/ModularStructure.md) for information about the modular code structure.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [A-Frame](https://aframe.io/) - WebVR framework
- [PhysX](https://github.com/c-frame/physx) - Physics engine
- [Handy Controls](https://github.com/c-frame/handy-work) - Hand tracking and interaction

