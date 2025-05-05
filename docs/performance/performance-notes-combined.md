# Performance Optimization Notes

This document provides detailed notes on performance optimizations implemented in the VRMOBDESK application.

## Initial Performance Observations [2025-04-24]

- FPS ~50 on 3060. Calls up to 200.
- Big stutter @ 5s → suspect texture upload or GC
- Pickup pause → possible physics init + magnet logic overhead

## Performance Optimizations Implemented [2025-04-24]

- Added PhysicsSleepManager to put distant objects to sleep
- Added PhysicsOptimizer to adjust physics settings based on device
- Created PerformanceOptimizer to reduce first-interaction lag
- Optimized look-controls and raycaster settings
- Improved LoadingScreenManager to hide loading screen at the right time

## Physics Optimizations

### PhysicsSleepManager

The PhysicsSleepManager component optimizes physics performance by managing the sleep states of physics objects:

- Objects beyond a certain distance from the camera are put to sleep
- Objects not visible in the camera frustum are put to sleep
- Objects with no recent activity are put to sleep
- Objects are awakened when they come into view, are interacted with, or are moving

This significantly reduces CPU usage by only performing physics calculations for objects that need them.

### PhysicsOptimizer

The PhysicsOptimizer component adjusts physics settings based on device capabilities:

- Reduces physics update rate on mobile devices (30Hz instead of 60Hz)
- Limits physics substeps on mobile devices
- Applies optimizations automatically based on device detection

These optimizations ensure that physics calculations are appropriate for the device's capabilities.

## First-Interaction Optimizations

### PerformanceOptimizer

The PerformanceOptimizer utility addresses the lag that can occur when first interacting with the scene:

- Pre-initializes look-controls to reduce first-interaction lag
- Optimizes the raycaster by starting with limited objects and gradually expanding
- Applies mobile-specific optimizations for better performance

### Look Controls Optimization

The look-controls component has been optimized with the following settings:

```html
<a-entity
  camera="near:0.01;"
  look-controls="pointerLockEnabled: true; magicWindowTrackingEnabled: false; reverseMouseDrag: false; touchEnabled: true; smoothingFactor: 0.1"
  position="0 1.65 0"
>
```

- `magicWindowTrackingEnabled: false` - Disables device orientation tracking on mobile in landscape mode
- `smoothingFactor: 0.1` - Adds smoothing to camera movement for better performance
- `touchEnabled: true` - Explicitly enables touch controls for better mobile support

### Raycaster Optimization

The raycaster has been optimized to reduce performance impact:

```html
<a-entity
  raycaster="objects: .clickable; far: 10"
  cursor="fuse: false;"
>
```

- Limited to only check for `.clickable` objects initially
- Reduced far distance to 10 units for better performance

## Loading Screen Optimization

The LoadingScreenManager component ensures that the loading screen is hidden at the appropriate time:

- Listens for the 'physx-started' event
- Intercepts the "Starting PhysX scene" console message
- Includes a fallback timeout to ensure the loading screen eventually disappears

This ensures that the application appears responsive and ready when the physics system is initialized.

## Mobile-Specific Optimizations

Several optimizations have been implemented specifically for mobile devices:

- Disabled shadows for better performance
- Reduced physics precision
- Limited raycaster distance
- Optimized touch controls

These optimizations ensure that the application runs smoothly on mobile devices with limited processing power.

## Future Optimization Opportunities

### Texture Atlasing

Combining multiple textures into texture atlases would reduce draw calls and improve rendering performance.

### Level of Detail (LOD) System

Implementing a LOD system for complex models would reduce polygon count for distant objects and improve performance.

### Occlusion Culling

Implementing occlusion culling would skip rendering of hidden objects and focus rendering resources on visible objects.

### Progressive Asset Loading

Implementing progressive loading would prioritize essential assets and improve initial load time.

## Additional Optimization Ideas

- Move to single baked collider mesh for floors/walls, use unity 5 blocking tools to create an MVP for development and easy to understand boilerplate.
- Bake lighting. Remember CATS for blender for texture atlasing. Investigate possibility of tri-planar mapping PBR, using UDIMS/atlases.
- Try getting the nipple/joystick controls in from a-frame extras
- Get some fancy shaders in it if you can, eg https://glitch.com/edit/#!/aluminum-sunny-mapusaurus?path=index.html%3A174%3A7
- Find a solution to the physx colliders making too many draw calls. Instances copies without (transforms/rotations/scaling) of objects can theoretically keep this down. Perhaps some sort of voxel/chunk system, or LOD, or zones, or mipmapping. Go into a deep dive and look how game engines do it.

## References

- https://www.youtube.com/watch?v=dKo0rWXVAlc - High to low bakes from scan or AI generation. Static meshes to go into one big texture atlas.
- https://www.youtube.com/watch?v=OfpE9Jy_obE - How to recreate colliders on another scene in blender, using world origin as origin and export.
