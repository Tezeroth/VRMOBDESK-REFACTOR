/**
 * lightmap component:
 * 
 * This component allows you to apply a lightmap texture to certain materials on a model.
 * A lightmap is a texture that stores pre-baked lighting information and can be used 
 * to add subtle illumination and shading to the model without the need for dynamic lights.
 * 
 * Schema Fields:
 * - src: The URL or reference to a texture map that will be used as the lightmap.
 * - intensity: A multiplier for controlling how bright the lightmap appears on the model.
 * - filter: A comma-separated string of material name filters. Only materials whose names 
 *   match one of these filters will get the lightmap applied.
 * - basis: (Not fully used in the provided code) A boolean that might indicate if the 
 *   texture should be considered a Basis compressed texture.
 * - channel: An integer indicating which channel (UV set or texture channel) to use for 
 *   the lightmap.
 */
AFRAME.registerComponent('lightmap', {
  schema: {
    src: {
      type: "map"   // A-Frame "map" type means it expects a texture or image URL
    },
    intensity: {
      default: 1    // The brightness multiplier for the lightmap
    },
    filter: {
      default: ''    // Filters to match material names, comma-separated
    },
    basis: {
      default: false // Indicates if basis compression might be expected (not used here)
    },
    channel: {
      type: 'int',
      default: 1     // The UV channel or texture coordinate channel to use for the lightmap
    }
  },
  init() {
    // If this.data.src is a string or an object, normalize to a string URL for texture loading
    const src = typeof this.data.src === 'string' ? this.data.src : this.data.src.src;

    // Load the texture using Three.js TextureLoader
    const texture = new THREE.TextureLoader().load(src);
    texture.flipY = false;    // Lightmaps often require no vertical flip to match UVs
    texture.channel = this.data.channel; // Store channel info on the texture (custom property)
    this.texture = texture;

    // When the object's 3D model is set (e.g. once a-gltf-model finishes loading),
    // call the update method to apply the lightmaps to the filtered materials.
    this.el.addEventListener('object3dset', this.update.bind(this));

    // Map to store original material -> replaced material associations
    this.materials = new Map();
  },
  update() {
    // Split filters by comma and trim spaces. 
    // Each filter should be a substring of the material name that triggers a replacement.
    const filters = this.data.filter.trim().split(',');

    // Traverse the entire object3D hierarchy 
    // to find meshes that match the material name filters
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        // Check if any filter matches the material name
        if (filters.some(filter => o.material.name.includes(filter))) {
          const sceneEl = this.el.sceneEl;
          const m = o.material;

          // If we have replaced this material before, reuse the cached version
          // Otherwise, create a new MeshPhongMaterial with the lightmap.
          o.material = this.materials.has(m) ? this.materials.get(m) : new THREE.MeshPhongMaterial({
            name: 'phong_' + m.name,
            lightMap: this.texture,
            lightMapIntensity: this.data.intensity,
            color: m.color,
            map: m.map,
            transparent: m.transparent,
            side: m.side,
            depthWrite: m.depthWrite,
            reflectivity: m.metalness, // Using metalness as reflectivity approximation
            toneMapped: m.toneMapped,
            // envMap retrieval as a getter so environment maps update dynamically if scene changes
            get envMap() {
              return sceneEl.object3D.environment;
            }
          });

          // Cache the new material for any other objects referencing the same original material
          this.materials.set(m, o.material);
        }
      }
    }.bind(this));
  }
});

export default {};
