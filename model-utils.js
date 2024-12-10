/* global AFRAME, THREE */

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
 *   texture should be considered a Basis compressed texture. Here it's defaulted to false 
 *   and not referenced in code.
 * - channel: An integer indicating which channel (UV set or texture channel) to use for 
 *   the lightmap. The code sets `texture.channel = this.data.channel` as a custom property, 
 *   but the default is channel 1.
 * 
 * How it works:
 * - On component initialization, the texture is loaded and flipped vertically (Y flipped).
 *   The flipping is disabled (texture.flipY = false) likely because of how the model's 
 *   UV coordinates are set up or how the texture was baked.
 * - Once the object3D is set on the entity (i.e., the model has loaded), it traverses 
 *   the scene graph starting from `this.el.object3D`, looking for meshes that have materials.
 * - If a material's name matches any of the provided filters, a new MeshPhongMaterial is 
 *   created to replace the original material, incorporating the loaded lightMap texture 
 *   and adjusting parameters to mimic the original material's properties where possible.
 * 
 * This approach creates a "cache" of replaced materials so that if the same original material 
 * is encountered again, it reuses the same replacement material, improving performance.
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


/**
 * depthwrite component:
 * 
 * This component allows you to toggle whether the material should write to the depth buffer.
 * Writing to the depth buffer controls whether objects properly occlude each other.
 * For example, you might want to disable depth writing for certain transparent objects 
 * so they don't appear as solid or to create special visual effects.
 * 
 * Schema:
 * - A boolean (default true) that determines if the material should write to the depth buffer.
 * 
 * On update, it traverses the entity's 3D object and applies the depthWrite setting to all materials.
 */
AFRAME.registerComponent('depthwrite', {
  schema: {
    default: true // Whether depth writing is enabled (true) or disabled (false)
  },
  init() {
    // Once the object is ready, apply the depthWrite property
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    this.el.object3D.traverse(function (o) {
      if (o.material) {
        // Set each material's depthWrite property based on the component's data
        o.material.depthWrite = this.data;
      }
    }.bind(this));
  }
});


/**
 * hideparts component:
 * 
 * This component allows you to hide specific named meshes within a model.
 * 
 * Schema:
 * - A comma-separated list of mesh names that should be hidden.
 * 
 * How it works:
 * - When the model is loaded, it traverses the entity's object3D.
 * - If a mesh's name is included in the filter list, that mesh is set to invisible (visible = false).
 * 
 * This is useful for removing certain parts of a model without editing the model itself.
 */
AFRAME.registerComponent('hideparts', {
  schema: {
    default: "" // Comma-separated mesh names to hide
  },
  init() {
    // Once the object's meshes are set, update the visibility
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    // Split the input string into an array of part names
    const filter = this.data.split(',');

    // Traverse the entire object hierarchy
    this.el.object3D.traverse(function (o) {
      // Check if this object is a mesh and if its name is in the filter list
      if (o.type === 'Mesh' && filter.includes(o.name)) {
        // Hide the matched meshes
        o.visible = false;
      }
    }.bind(this));
  }
});


/**
 * no-tonemapping component:
 * 
 * This component sets toneMapped = false on certain materials. 
 * Tone mapping is a process that adjusts the brightness of the scene to fit into 
 * the display range. Sometimes you don't want certain objects to be affected by tone mapping,
 * for example, UI elements or special effects.
 * 
 * Schema:
 * - A comma-separated string of material name filters. If a material's name matches 
 *   one of these filters, that material's toneMapped property is set to false.
 * 
 * How it works:
 * - On object load, it checks all materials and, if they match the filters, 
 *   sets toneMapped to false.
 */
AFRAME.register-component('no-tonemapping', {
  schema: {
    default: '' // Filters to match material names
  },
  init() {
    // Apply once the object's materials are ready
    this.el.addEventListener('object3dset', this.update.bind(this));
  },
  update() {
    // Split filters by comma and trim spaces
    const filters = this.data.trim().split(',');

    this.el.object3D.traverse(function (o) {
      if (o.material) {
        // If any filter matches the material name, disable tone mapping
        if (filters.some(filter => o.material.name.includes(filter))) {
          o.material.toneMapped = false;
        }
      }
    }.bind(this));
  }
});
