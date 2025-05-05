# External Components Reference

This document provides information about external components that could be integrated into the project.

## Handy Controls Component

The project could benefit from integrating the Handy Controls component from Glitch:
https://glitch.com/~aframe-arc-handy-controls-component

This is a boilerplate project for getting started with VR and AR with A-Frame that demonstrates many WebXR features.

## Available Components

### ar-cursor.js

This component enables clicking on objects in AR using any XR input such as tapping on the screen or using an external controller.

Add it to the `<a-scene>` element along with a raycaster:

```html
<a-scene ar-cursor raycaster="objects: #my-objects *">
```

### ar-shadow-helper.js

This component lets a plane track a particular object so that it receives an optimal amount of shadow from a directional light. It works well for augmented reality with the `shader:shadow` material.

It also includes `auto-shadow-cam` which controls the orthogonal shadow camera of a directional light so that the camera covers the minimal area required to fully light an object.

```html
<a-light id="dirlight" auto-shadow-cam intensity="0.4" light="castShadow:true;type:directional" position="10 10 10"></a-light>
    
<a-entity
  material="shader:shadow; depthWrite:false; opacity:0.9;"
  visible="false"
  geometry="primitive:shadow-plane;"
  shadow="cast:false;receive:true;"
  ar-shadow-helper="target:#my-objects;light:#dirlight;"
></a-entity>
```

### model-utils.js

This file provides utilities for modifying 3D models and how they are displayed:

* `exposure="0.5"` - Add this to `<a-scene>` to change the exposure of the scene
* `no-tonemapping` - Opts an object out of tone mapping (useful for flat materials that look like light sources)
* `lightmap="src:#bake;intensity:10;filter:Window,Ceiling,floor;"` - Lets you use a lightmap on a GLTF model
* `depthwrite` - Overwrites a material's depthwrite property (useful for transparency depth issues)
* `hideparts` - Makes certain elements of a GLTF object invisible

### simple-navmesh-constraint.js

This component allows you to constrain an object to another object. If you set the `fall` property, the object won't fall unless the floor underneath it is within that distance.

This component works by comparing the object's position between frames. It should be placed after any components which move the object such as `wasd-controls`.

If the object needs to float off the floor (like the camera), set the `height` property and it will stay that far from the ground.

```html
<a-assets>
 <a-asset-item id="navmesh-glb" src="navmesh.glb"></a-asset-item>
</a-assets>
<a-gltf-model class="navmesh" src="#navmesh-glb" visible="false"></a-gltf-model>
<a-camera wasd-controls="acceleration:20;" simple-navmesh-constraint="navmesh:.navmesh;fall:0.5;height:1.65;" look-controls>
```

For camera rigs with `blink-controls` and `movement-controls`, set `height:0` and set the camera position instead:

```html
<a-entity
  id="cameraRig"
  simple-navmesh-constraint="navmesh:.navmesh;fall:0.5;height:0;exclude:.navmesh-hole;"
  movement-controls="speed:0.15;camera:#head;"
  position="-1 0 1"
>
  <a-entity id="head" camera look-controls position="0 1.65 0"></a-entity>
</a-entity>
```

Note: You can't use `wasd-controls` if you're using `movement-controls`. The `exclude:.navmesh-hole` option allows you to have a navmesh that excludes some other geometries.

## Integration Considerations

When integrating these components, consider:

1. Compatibility with existing physics system (PhysX)
2. Potential conflicts with existing control systems
3. Performance impact, especially on mobile devices
4. Necessary modifications to work with the current architecture

Some of these components may already be implemented in the project in a different form, so careful evaluation is needed before integration.
