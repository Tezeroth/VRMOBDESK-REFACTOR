# VRMOBDESK

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

- **[Documentation/aug](./Documentation/aug)**: Detailed documentation of the application's functionality, dependencies, and architecture
- **[Documentation/UML](./Documentation/UML)**: UML diagrams showing the application's structure and behavior

## Optimized Code Structure

The codebase has been optimized for maintainability, performance, and future multiplayer support:

- **[js/](./js)**: Contains the optimized, modular code structure
  - **[js/components/](./js/components)**: A-Frame components
  - **[js/managers/](./js/managers)**: Manager modules
  - **[js/utils/](./js/utils)**: Utility functions and helpers

## Development

### Project Structure

```
VRMOBDESK/
├── Assets/             # 3D models, textures, and other assets
├── Documentation/      # Project documentation
│   ├── aug/            # Detailed documentation
│   └── UML/            # UML diagrams
├── js/                 # Optimized JavaScript modules
│   ├── components/     # A-Frame components
│   ├── managers/       # Manager modules
│   └── utils/          # Utility functions
├── lib/                # External libraries
├── index.html          # Main HTML file
├── MOBDESK.css         # CSS styles
└── README.md           # This file
```

### Future Development

The project is being prepared for multiplayer functionality with positional audio. See [Documentation/aug/MultiplayerPreparation.md](./Documentation/aug/MultiplayerPreparation.md) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [A-Frame](https://aframe.io/) - WebVR framework
- [PhysX](https://github.com/c-frame/physx) - Physics engine
- [Handy Controls](https://github.com/c-frame/handy-work) - Hand tracking and interaction
