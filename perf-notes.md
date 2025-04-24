## [2025-04-24] Initial Perf Notes
- FPS ~50 on 3060. Calls up to 200.
- Big stutter @ 5s → suspect texture upload or GC
- Pickup pause → possible physics init + magnet logic overhead

## [2025-04-24] Performance Optimizations Implemented
- Added PhysicsSleepManager to put distant objects to sleep
- Added PhysicsOptimizer to adjust physics settings based on device
- Created PerformanceOptimizer to reduce first-interaction lag
- Optimized look-controls and raycaster settings
- Improved LoadingScreenManager to hide loading screen at the right time

See [Documentation/Docs/PerformanceNotes.md](./Documentation/Docs/PerformanceNotes.md) for detailed documentation of all performance optimizations.

### To Try:
- Move to single baked collider mesh for floors/walls, use unity 5 blocking tools to create an MVP for development and easy to understand boilerplate.
- Bake lighting. remember CATS for blender for texuture atlasing. investigate possibility of tri-planar mapping pbr, using UDIMS/atlases.
- try getting the nipple/joystick controls in from a-frame extras
- get some fancy shaders in it if you can, eg https://glitch.com/edit/#!/aluminum-sunny-mapusaurus?path=index.html%3A174%3A7
- find a solution to the physx colliders making too many draw calls. Instances copies without (transforms/rotations/scaling) of objects can theoretically keep this down. Perhaps some sort of voxel/chunk system, or LOD, or zones, or mipmapping. Go into a deep dive and look how game engines do it.


## Remember

- https://www.youtube.com/watch?v=dKo0rWXVAlc high to low bakes from scan or AI generation. Static meshes to go into one big texture atlas.

- for now recreate your colliders on another scene in blender,using world origin as origin and export like this https://www.youtube.com/watch?v=OfpE9Jy_obE