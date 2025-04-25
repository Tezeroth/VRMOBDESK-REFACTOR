# VRMOBDESK Functionality

## Overview

VRMOBDESK is a web-based 3D interactive environment built with A-Frame that supports multiple platforms:
- Virtual Reality (VR) headsets
- Mobile devices
- Desktop browsers

The application automatically detects the user's device and provides the appropriate interface and controls. It features a physics-based interaction system that allows users to pick up, examine, throw, and interact with 3D objects in a virtual environment.

## Core Features

### 1. Device Detection and Adaptation

The `DeviceManager` component handles device detection and provides information about:
- VR capability
- Mobile device detection
- Gyroscope availability

Based on this information, the application adapts its interface and controls to provide the best experience for each platform.

### 2. Control Systems

#### Desktop Controls
- WASD keys for movement
- Mouse for looking around
- Left-click to pick up objects
- Second click while holding to charge and throw objects
- Right-click to examine objects
- Space bar to jump

#### Mobile Controls
- On-screen arrow buttons for movement
- Swipe to look around
- Tap to pick up objects
- Double-tap to drop objects
- Action buttons for throwing and examining objects
- Jump button for jumping
- Optional gyroscope controls for looking around

#### VR Controls
- Controller-based movement
- Hand tracking for object interaction
- Physics-based object manipulation
- Teleportation for navigation

### 3. Object Interaction

The application provides a sophisticated object interaction system that allows users to:

- **Pick up objects**: Grab objects with mouse, touch, or VR controllers
- **Examine objects**: Enter a special mode to closely examine objects from all angles
- **Throw objects**: Charge and throw objects with physics-based velocity
- **Manipulate objects**: Move and rotate objects in 3D space

### 4. Navigation System

The navigation system uses a navmesh to define walkable areas and prevent users from walking through walls or objects. Key features include:

- Navmesh-based movement constraints
- Collision detection with walls and objects
- Automatic step handling for small height differences
- Exclusion zones for objects (navmesh-holes)

### 5. Physics System

The application uses PhysX for physics simulation, providing:

- Realistic object behavior with gravity
- Collision detection and response
- Dynamic and kinematic physics bodies
- Physics-based throwing mechanics

### 6. Environment

The environment includes:

- 3D models with physics colliders
- Lightmapped surfaces for realistic lighting
- Interactive objects that can be picked up and manipulated
- Navigation elements like clickable objects for scene transitions

## Mode-Specific Functionality

### VR Mode

In VR mode, the application provides:
- Hand tracking for natural interaction
- Controller-based movement and teleportation
- Physics-based object manipulation
- Spatial audio (if configured)

### Mobile Mode

In mobile mode, the application provides:
- Touch-based controls with on-screen buttons
- Swipe or gyroscope-based camera control
- Simplified physics for better performance
- Adaptive UI for touch interaction

### Desktop Mode

In desktop mode, the application provides:
- Keyboard and mouse controls
- Physics-based object interaction
- Pointer lock for immersive camera control
- Full physics simulation

## Technical Features

- **Adaptive Performance**: Adjusts rendering quality based on device capabilities
- **Dynamic Loading**: Loads assets as needed to improve initial load time
- **Component-Based Architecture**: Uses A-Frame's component system for modular functionality
- **Event-Driven Interaction**: Uses events for communication between components
- **Responsive Design**: Adapts to different screen sizes and device capabilities
