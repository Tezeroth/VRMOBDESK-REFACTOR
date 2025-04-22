# Quest 3 Performance Optimization Guide

## Current Performance Issues
- Choppy frame rate on Quest 3 standalone
- Potential physics overhead
- Possible rendering bottlenecks

## Optimization Techniques

### 1. Physics Optimization
```javascript
// In index.html, modify physx-body components:
<a-entity physx-body="type: dynamic; mass: 1; shape: box; updateRate: 30;">

// In main.js, add physics optimization:
AFRAME.registerComponent('physics-optimizer', {
  init: function() {
    // Reduce physics update rate
    this.el.sceneEl.systems.physics.setFixedTimeStep(1/30);
    
    // Limit active physics bodies
    this.el.sceneEl.systems.physics.setMaxSubSteps(1);
  }
});
```

### 2. Rendering Optimization
```javascript
// Add to index.html scene setup
<a-scene physics="driver: physx; gravity: 0 -9.8 0; maxSubSteps: 1; fixedTimeStep: 1/30;">

// Add LOD component to complex models
<a-entity lod="
  near: 5;
  medium: 10;
  far: 20;
  nearModel: #highPoly;
  mediumModel: #mediumPoly;
  farModel: #lowPoly;
">
```

### 3. Asset Loading Optimization
```javascript
// In main.js, add asset loading manager
AFRAME.registerComponent('asset-loader', {
  init: function() {
    // Implement progressive loading
    this.loadAssetsInBatches();
  },
  
  loadAssetsInBatches: function() {
    const assets = this.el.querySelectorAll('[data-load-priority]');
    let currentBatch = 0;
    const batchSize = 3;
    
    const loadNextBatch = () => {
      const batch = Array.from(assets).slice(currentBatch, currentBatch + batchSize);
      batch.forEach(asset => {
        // Load asset
        this.loadAsset(asset);
      });
      
      currentBatch += batchSize;
      if (currentBatch < assets.length) {
        setTimeout(loadNextBatch, 100);
      }
    };
    
    loadNextBatch();
  }
});
```

### 4. Model Optimization
```javascript
// In model-utils.js, add model optimization
function optimizeModel(model) {
  // Reduce polygon count for complex models
  if (model.geometry.attributes.position.count > 10000) {
    const modifier = new THREE.SimplifyModifier();
    const simplified = modifier.modify(model.geometry, Math.floor(model.geometry.attributes.position.count * 0.5));
    model.geometry = simplified;
  }
  
  // Optimize materials
  model.traverse((node) => {
    if (node.material) {
      node.material.roughness = 0.8;
      node.material.metalness = 0.2;
      node.material.needsUpdate = true;
    }
  });
}
```

### 5. Texture Optimization
```javascript
// Add to index.html for texture loading
<a-assets>
  <img id="texture" src="texture.jpg" crossorigin="anonymous">
  <img id="texture-compressed" src="texture-compressed.jpg" crossorigin="anonymous">
</a-assets>

// In main.js, add texture optimization
function optimizeTexture(texture) {
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
}
```

## Implementation Steps

1. **Physics Optimization**
   - Add `physics-optimizer` component to scene
   - Modify existing `physx-body` components
   - Implement object pooling for dynamic objects

2. **Rendering Optimization**
   - Add LOD to complex models
   - Implement frustum culling
   - Combine materials where possible
   - Reduce shadow quality if needed

3. **Asset Loading**
   - Implement progressive loading
   - Add loading indicators
   - Optimize initial load time

4. **Model Optimization**
   - Reduce polygon count for complex models
   - Optimize materials
   - Use simpler collision shapes

5. **Texture Optimization**
   - Compress textures
   - Use texture atlases
   - Implement mipmapping where appropriate

## Performance Monitoring
```javascript
// Add to main.js for performance monitoring
AFRAME.registerComponent('performance-monitor', {
  init: function() {
    this.fps = 0;
    this.frames = 0;
    this.lastTime = performance.now();
  },
  
  tick: function() {
    this.frames++;
    const time = performance.now();
    
    if (time >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (time - this.lastTime));
      this.frames = 0;
      this.lastTime = time;
      
      console.log(`FPS: ${this.fps}`);
      // Update UI with FPS counter
    }
  }
});
```

## Additional Recommendations

1. **Scene Optimization**
   - Reduce number of lights
   - Use simpler shadows
   - Implement occlusion culling
   - Use instancing for repeated objects

2. **Memory Management**
   - Implement object pooling
   - Clear unused assets
   - Monitor memory usage
   - Implement garbage collection triggers

3. **Network Optimization**
   - Compress asset downloads
   - Implement progressive loading
   - Cache assets locally
   - Use CDN for assets

4. **Code Optimization**
   - Minimize JavaScript execution time
   - Use requestAnimationFrame
   - Implement throttling for heavy operations
   - Use Web Workers for heavy computations

## Testing and Monitoring
1. Use Quest 3's built-in performance overlay
2. Monitor frame times
3. Check memory usage
4. Profile JavaScript execution
5. Monitor draw calls
6. Track physics updates

## Next Steps
1. Implement basic optimizations first
2. Monitor performance metrics
3. Identify bottlenecks
4. Apply targeted optimizations
5. Test on Quest 3 standalone
6. Iterate based on results 