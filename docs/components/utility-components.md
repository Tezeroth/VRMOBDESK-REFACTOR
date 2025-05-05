# Utility Components

This document describes the utility components that were previously part of the `model-utils.js` file and have been moved to separate component files in the modular structure.

## MagnetRangeDebug

The `magnet-range-debug` component visualizes the range of magnetic interaction points for debugging purposes. It creates a wireframe cylinder that follows the parent object and shows the radial and vertical range of the magnet.

### Schema

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| range | vec2 | {x: 0.2, y: 0.1} | The range of the magnet. x = radial range, y = vertical range |

### Usage

```html
<a-entity magnet-range-debug="range: 0.3 0.2"></a-entity>
```

### Behavior

- Creates a wireframe cylinder that follows the parent object
- The cylinder's radius represents the radial range of the magnet
- The cylinder's height represents the vertical range of the magnet
- The cylinder is updated every frame to match the parent's position and rotation
- The cylinder is removed when the component is removed

### Implementation Details

The component creates a separate entity for the debug visualization and updates its position and rotation every frame to match the parent entity. The cylinder is rotated 90 degrees so that it is vertical, and its dimensions are set based on the range property.

## MakeTransparent

The `make-transparent` component makes GLTF models completely transparent, which is useful for creating invisible colliders.

### Schema

This component has no properties.

### Usage

```html
<a-entity gltf-model="#my-model" make-transparent></a-entity>
```

### Behavior

- Makes all materials in the GLTF model transparent
- Sets the opacity to 0
- Disables depth writing to prevent depth issues

### Implementation Details

The component listens for the `model-loaded` event and then traverses the model's object3D hierarchy, making all materials transparent. It sets the `transparent` property to true, the `opacity` property to 0, and the `depthWrite` property to false to prevent depth issues.

## Migration from model-utils.js

These components were previously part of the `model-utils.js` file, which contained a collection of utility functions and components for working with 3D models. As part of the modular restructuring of the codebase, these components have been moved to separate files to improve maintainability and reduce dependencies.

### Benefits of Separation

1. **Reduced Dependencies**: Each component only depends on what it needs
2. **Improved Maintainability**: Each component is in its own file, making it easier to understand and modify
3. **Better Testing**: Components can be tested individually
4. **Clearer Documentation**: Each component has its own documentation
5. **Easier Reuse**: Components can be imported individually as needed

### Usage in Legacy Code

If you have legacy code that depends on the `model-utils.js` file, you should update it to import these components from their new locations:

```javascript
// Old way (deprecated)
// <script src="model-utils.js"></script>

// New way
import MagnetRangeDebug from './js/components/MagnetRangeDebug.js';
import MakeTransparent from './js/components/MakeTransparent.js';
```

Or use the components directly in your HTML:

```html
<!-- Old way (deprecated) -->
<!-- <script src="model-utils.js"></script> -->

<!-- New way -->
<script type="module" src="js/main.js"></script>

<!-- Then use the components -->
<a-entity magnet-range-debug="range: 0.3 0.2"></a-entity>
<a-entity gltf-model="#my-model" make-transparent></a-entity>
```
