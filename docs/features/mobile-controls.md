# Mobile Controls Documentation

This document describes the mobile controls implementation in the VRMOBDESK application, including the movement controls, action buttons, and jump functionality.

## Overview

The mobile controls provide touch-based interaction for mobile devices, allowing users to:
- Move around the environment using arrow buttons
- Interact with objects (grab, throw, examine)
- Jump over obstacles
- Toggle the position of controls for left/right-handed users

## Components

### ArrowControls Component

The `ArrowControls` component manages the mobile control interface, creating and positioning the UI elements and handling user interactions.

```javascript
AFRAME.registerComponent('arrow-controls', {
  schema: {
    moveSpeed: { type: 'number', default: 2.0 }
  },

  init: function() {
    // Initialize state
    this.moveState = {
      up: false, down: false, left: false, right: false
    };
    this.actionButtonDown = { pickup: false, examine: false };
    this.controlsPosition = 'left'; // 'left' or 'right'

    // Create UI
    this.createControlsUI();
  }
  // ...
});
```

## UI Elements

### Movement Controls

The movement controls consist of four arrow buttons arranged in a directional pad layout:
- Up: Move forward
- Down: Move backward
- Left: Strafe left
- Right: Strafe right

These buttons form the bottom row of the control layout at the bottom left of the screen by default.

### Action Buttons

Two action buttons provide object interaction capabilities:
- Grab/Throw: Pick up objects, hold to charge a throw
- Examine/Cancel: Inspect objects in detail or cancel current action

These buttons are positioned in the top row, parallel with the up arrow button, creating a compact and intuitive control layout.

### Jump Button

A dedicated jump button allows the user to jump over obstacles. It's positioned at the bottom right of the screen by default.

```javascript
createJumpButton: function() {
  const jumpBtn = document.createElement('button');
  jumpBtn.id = 'jumpBtn';
  jumpBtn.className = 'jump-btn';
  jumpBtn.innerHTML = '↑ JUMP ↑';

  // Style and position the button
  // ...

  // Add event listeners for jumping
  ['mousedown', 'touchstart'].forEach(eventType => {
    jumpBtn.addEventListener(eventType, (e) => {
      // Trigger jump
      const cameraRig = document.querySelector('#cameraRig');
      if (cameraRig && cameraRig.components['jump-control']) {
        cameraRig.components['jump-control'].jump();
      }
    });
  });
}
```

### Toggle Button

A toggle button in the center bottom of the screen allows users to switch the position of the controls between left and right sides, accommodating both left and right-handed users.

```javascript
createToggleButton: function() {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggleControlsBtn';
  toggleBtn.className = 'toggle-controls-btn';
  toggleBtn.innerHTML = '⇄';

  // Style and position the button
  // ...

  // Add event listeners
  ['mousedown', 'touchstart'].forEach(eventType => {
    toggleBtn.addEventListener(eventType, (e) => {
      // Toggle position
      this.controlsPosition = this.controlsPosition === 'left' ? 'right' : 'left';
      this.updateControlsPosition();
    });
  });
}
```

## Layout

The mobile controls have two possible layouts that can be toggled by the user:

### Left-handed Layout (Default)
- Movement and action buttons: Bottom left
- Jump button: Bottom right
- Toggle button: Center bottom

### Right-handed Layout
- Movement and action buttons: Bottom right
- Jump button: Bottom left
- Toggle button: Center bottom

## CSS Styling

The controls use a consistent visual style with semi-transparent backgrounds and clear visual feedback for interactions:

```css
.arrow-controls {
  position: fixed;
  bottom: 20px;
  left: 20px; /* Default position */
  width: 180px;
  height: 120px;
  z-index: 9999;
  display: grid;
  grid-template-areas:
    "pickup up examine"
    "left down right";
  grid-template-rows: 45px 45px;
  grid-template-columns: 45px 45px 45px;
  gap: 15px 15px;
}

.arrow-btn {
  background-color: rgba(255, 255, 255, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.6);
  font-size: 20px;
}

.action-btn {
  background: linear-gradient(145deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2));
  border: 2px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.jump-btn {
  background: linear-gradient(145deg, rgba(100,255,100,0.4), rgba(100,255,100,0.2));
  border-radius: 50%;
  font-size: 20px;
}

.toggle-controls-btn {
  background: linear-gradient(145deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2));
  border-radius: 50%;
  font-size: 24px;
  border: 2px solid rgba(255,255,255,0.6);
}
```

## Integration with Other Systems

The mobile controls integrate with:

1. **Movement System**: Translates button presses into character movement
2. **Jump System**: Triggers jumps when the jump button is pressed
3. **Interaction System**: Handles object grabbing, throwing, and examination
4. **Device Manager**: Controls are only shown on mobile devices

## Responsive Design

The controls are only displayed on touch devices and are hidden on desktop:

```css
/* Show Controls only on Mobile */
@media (hover: none), (pointer: coarse) {
  .arrow-controls {
    display: grid !important;
  }
}

/* Hide Controls on Desktop */
@media (hover: hover) and (pointer: fine) {
  .arrow-controls {
    display: none !important;
  }
}
```

## User Experience Considerations

1. **Button Size**: Buttons are sized appropriately for touch interaction (45px minimum)
2. **Visual Feedback**: All buttons provide visual feedback when pressed
3. **Positioning**: Controls are positioned to avoid obscuring important content
4. **Customization**: Users can toggle between left and right-handed layouts
5. **Accessibility**: High contrast colors and clear iconography
