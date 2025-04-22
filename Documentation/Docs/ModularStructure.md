# Modular Code Structure

This document describes the modular code structure of the VRMOBDESK application.

## Overview

The application has been refactored into a modular structure to improve maintainability, reusability, and prepare for multiplayer functionality. The code is organized into the following directories:

- `js/components/`: A-Frame components
- `js/managers/`: Manager modules
- `js/utils/`: Utility functions and helpers

## Components

Components are A-Frame components that can be attached to entities in the scene.

### ControlManager

**File**: `js/components/ControlManager.js`

Manages control schemes based on device type. It detects device capabilities, sets up appropriate controls for VR or Desktop/Mobile, and handles transitions between VR and non-VR modes.

### DesktopMobileControls

**File**: `js/components/DesktopMobileControls.js`

Handles desktop and mobile interactions. It manages object pickup and manipulation, object throwing with charge mechanics, object inspection mode, and touch and mouse input handling.

### ArrowControls

**File**: `js/components/ArrowControls.js`

Provides on-screen controls for mobile devices. It creates and manages on-screen controls for movement (arrow buttons) and object interaction (pickup, examine, throw).

### NavigateOnClick

**File**: `js/components/NavigateOnClick.js`

Handles navigation to other pages on click. It provides visual feedback on hover, navigation to specified URL on click, and support for both VR and non-VR interaction.

### TogglePhysics

**File**: `js/components/TogglePhysics.js`

Handles physics state for VR object interaction. It tracks grabbed state for objects and applies velocity when objects are released in VR.

## Managers

Managers are singleton objects that handle global state and functionality.

### DeviceManager

**File**: `js/managers/DeviceManager.js`

Handles device detection, permissions, and capabilities. It detects VR capabilities, identifies mobile devices, checks for gyroscope availability, and manages device permissions.

### LookModeManager

**File**: `js/managers/LookModeManager.js`

Handles switching between swipe and gyro modes. It manages camera control modes (swipe vs gyro), creates and manages the mode toggle UI, and handles gyroscope input.

### MultiplayerManager

**File**: `js/main.js` (will be moved to `js/managers/MultiplayerManager.js`)

Handles multiplayer functionality. It establishes connections between users, synchronizes player positions and states, manages positional audio, and handles shared physics interactions.

## Utilities

Utilities are helper functions and classes that provide common functionality.

### PhysicsUtils

**File**: `js/utils/PhysicsUtils.js`

Utility functions for physics operations. It provides helper functions for converting between physics body types, applying velocities, and managing physics states.

### InteractionUtils

**File**: `js/utils/InteractionUtils.js`

Utility functions for object interactions. It provides helper functions for raycasting and intersection testing, visual feedback for interactions, and object transformation utilities.

### StateMachine

**File**: `js/utils/StateMachine.js`

A simple state machine implementation. It provides a generic state machine that can be used to manage complex state transitions in a clean, maintainable way.

## Main Entry Point

**File**: `js/main.js`

The main entry point for the application. It imports all components and managers, registers components, initializes the application, and handles application startup.

## Multiplayer Preparation

The modular structure is designed to support multiplayer functionality. The `MultiplayerManager` module is being developed to handle:

1. **Connection Management**: Establishing WebRTC or WebSocket connections between users
2. **State Synchronization**: Keeping player positions and object states in sync
3. **Positional Audio**: Providing spatial audio based on player positions
4. **Physics Synchronization**: Ensuring physics interactions are consistent across clients

## Usage

To use the modular structure, include the main.js file in your HTML:

```html
<script type="module" src="js/main.js"></script>
```

This will register all components and initialize the application.

## Testing

A test file (`test-modular.html`) is provided to verify the modular structure. It includes a simple scene with pickupable objects and navigation targets.

## Fallback

If the modular structure has issues, you can fall back to the original scripts by uncommenting them in the index.html file:

```html
<!-- Uncomment these if modular structure has issues -->
<!--
<script src="VR.js"></script>
<script src="navigate-on-click.js"></script>
<script src="MOBDESK.js"></script>
<script src="control-manager.js"></script>
-->
```
