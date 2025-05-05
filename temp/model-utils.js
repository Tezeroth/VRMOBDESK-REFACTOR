/* global AFRAME, THREE */

/**
 * ⚠️ WARNING: DEPRECATED FILE ⚠️
 *
 * This file is deprecated and should not be used in production.
 * It has been replaced by the following files:
 * - js/components/SimpleNavmeshConstraint.js
 * - js/components/MakeTransparent.js
 * - js/components/MagnetRangeDebug.js
 *
 * Please use the new modular components instead.
 */













/**
 *
 * THE FUNCTIONS BELOW CAN THROW YOU OFF IF YOU KNOW HOW TO IMPORT GLTFS ALREADY. JUST IMPORT GLASS AS SEPERATE TRANSPARENT MATERIAL - NTS this code wont be required for next project"
 *
 *
 *
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
        // Restore original behavior: Set depthWrite based on component data for ALL materials
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
AFRAME.registerComponent('no-tonemapping', {
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


// --- Appended from make-transparent.js ---

//*SCRIPT TO ALLOW GLTF MODELS TO BECOME TRANSPARENT, well in this case INVISISBLE so they can act as colliders **//

AFRAME.registerComponent('make-transparent', {
  init: function () {
    this.el.addEventListener('model-loaded', (e) => {
      const object3D = e.detail.model;

      // Traverse the GLTF model and make all materials transparent
      object3D.traverse((node) => {
        if (node.isMesh && node.material) {
          node.material.transparent = true; // Enable transparency
          node.material.opacity = 0;      // Set desired opacity
          node.material.depthWrite = false; // Prevent depth issues
        }
      });
    });
  }
});


// --- Appended from simple-navmesh-constraint.js ---

/* global AFRAME, THREE */

AFRAME.registerComponent('simple-navmesh-constraint', {
  schema: {
    enabled: {
      default: true
    },
    navmesh: {
      default: ''
    },
    fall: {
      default: 0.5
    },
    height: {
      default: 1.6
    },
    exclude: {
      default: ''
    },
    xzOrigin: {
      default: ''
    }
  },

  init: function () {
    this.onSceneUpdated = this.onSceneUpdated.bind(this);

    this.el.sceneEl.addEventListener('child-attached', this.onSceneUpdated);
    this.el.sceneEl.addEventListener('child-detached', this.onSceneUpdated);

    this.objects = [];
    this.excludes = [];
  },

  remove: function () {
    this.el.sceneEl.removeEventListener('child-attached', this.onSceneUpdated);
    this.el.sceneEl.removeEventListener('child-detached', this.onSceneUpdated);
  },

  onSceneUpdated: function (evt) {
    // We already have an update on the way
    if (this.entitiesChanged) { return; }

    // Don't bother updating if the entity is not relevant to us
    if (evt.detail.el.matches(this.data.navmesh) || evt.detail.el.matches(this.data.exclude)) {
      this.entitiesChanged = true;
    }
  },

  updateNavmeshEntities: function () {
    this.objects.length = 0;
    this.excludes.length = 0;

    if (this.data.navmesh.length > 0) {
      for (const navmesh of document.querySelectorAll(this.data.navmesh)) {
	this.objects.push(navmesh.object3D);
      }
    }

    if (this.objects.length === 0) {
      console.warn('simple-navmesh-constraint: Did not match any elements');
    } else if (this.data.exclude.length > 0) {
      for (const excluded of document.querySelectorAll(this.data.exclude)) {
        this.objects.push(excluded.object3D);
        this.excludes.push(excluded);
      }
    }

    this.entitiesChanged = false;
  },

  update: function () {
    this.lastPosition = null;
    this.xzOrigin = this.data.xzOrigin ? this.el.querySelector(this.data.xzOrigin) : this.el;

    this.updateNavmeshEntities();
  },

  tick: (function () {
    const nextPosition = new THREE.Vector3();
    const tempVec = new THREE.Vector3();
    const scanPattern = [
      [0,1], // Default the next location
      [0,0.5], // Check that the path to that location was fine
      [30,0.4], // A little to the side shorter range
      [-30,0.4], // A little to the side shorter range
      [60,0.2], // Moderately to the side short range
      [-60,0.2], // Moderately to the side short range
      [80,0.06], // Perpendicular very short range
      [-80,0.06], // Perpendicular very short range
    ];
    const down = new THREE.Vector3(0,-1,0);
    const raycaster = new THREE.Raycaster();
    const gravity = -1;
    const maxYVelocity = 0.5;
    const results = [];
    let yVel = 0;
    let firstTry = true;

    return function tick(time, delta) {
      if (this.data.enabled === false) return;
      if (this.entitiesChanged) {
	this.updateNavmeshEntities();
      }
      if (this.lastPosition === null) {
        firstTry = true;
        this.lastPosition = new THREE.Vector3();
        this.xzOrigin.object3D.getWorldPosition(this.lastPosition);
        if (this.data.xzOrigin) this.lastPosition.y -= this.xzOrigin.object3D.position.y;
      }

      const el = this.el;
      if (this.objects.length === 0) return;

      this.xzOrigin.object3D.getWorldPosition(nextPosition);
      if (this.data.xzOrigin) nextPosition.y -= this.xzOrigin.object3D.position.y;
      if (nextPosition.distanceTo(this.lastPosition) <= 0.01) return;

      let didHit = false;
      // So that it does not get stuck it takes as few samples around the user and finds the most appropriate
      scanPatternLoop:
      for (const [angle, distance] of scanPattern) {
        tempVec.subVectors(nextPosition, this.lastPosition);
        tempVec.applyAxisAngle(down, angle*Math.PI/180);
        tempVec.multiplyScalar(distance);
        tempVec.add(this.lastPosition);
        tempVec.y += maxYVelocity;
        tempVec.y -= this.data.height;
        raycaster.set(tempVec, down);
        raycaster.far = this.data.fall > 0 ? this.data.fall + maxYVelocity : Infinity;
        raycaster.intersectObjects(this.objects, true, results);

        if (results.length) {
          // If it hit something we want to avoid then ignore it and stop looking
          for (const result of results) {
            if(this.excludes.includes(result.object.el)) {
              results.splice(0);
              continue scanPatternLoop;
            }
          }
          const hitPos = results[0].point;
          results.splice(0);
          hitPos.y += this.data.height;
          if (nextPosition.y - (hitPos.y - yVel*2) > 0.01) {
            yVel += Math.max(gravity * delta * 0.001, -maxYVelocity);
            hitPos.y = nextPosition.y + yVel;
          } else {
            yVel = 0;
          }
          tempVec.copy(hitPos);
          this.xzOrigin.object3D.parent.worldToLocal(tempVec);
          tempVec.sub(this.xzOrigin.object3D.position);
          if (this.data.xzOrigin) tempVec.y += this.xzOrigin.object3D.position.y;
          this.el.object3D.position.add(tempVec);

          this.lastPosition.copy(hitPos);
          didHit = true;
          break;
        }

      }

      if (didHit) {
        firstTry = false;
      }

      if (!firstTry && !didHit) {
        this.el.object3D.position.copy(this.lastPosition);
        this.el.object3D.parent.worldToLocal(this.el.object3D.position);
      }
    }
  }())
});


// --- Appended from show-magnet-range.js ---

AFRAME.registerComponent('magnet-range-debug', {
  schema: {
    range: {type: 'vec2', default: {x: 0.2, y: 0.1}} // radial (X), vertical (Y)
  },

  init: function () {
    // Create a separate <a-entity> for the debug guide
    this.guideEl = document.createElement('a-entity');
    this.el.sceneEl.appendChild(this.guideEl);

    const rangeX = this.data.range.x; // Radial range
    const rangeY = this.data.range.y; // Vertical range

    // Use a cylinder wireframe to visualize the range
    // radius = rangeX, height = rangeY*2
    const geometryStr = `primitive: cylinder; radius: ${rangeX}; height: ${rangeY * 2}; segmentsRadial: 32;`;
    const materialStr = `color: #00ff00; wireframe: true; transparent: true; opacity: 0.5;`;

    // Set up the guide entity
    this.guideEl.setAttribute('geometry', geometryStr);
    this.guideEl.setAttribute('material', materialStr);
    this.guideEl.setAttribute('rotation', '90 0 0');    // Rotate so cylinder is vertical
    this.guideEl.setAttribute('physx-body', 'none');    // Ensure no physics on the guide
    this.guideEl.classList.add('magnet-guide');
  },

  tick: function () {
    // Each frame, copy the parent's world transform to the guide
    const obj = this.el.object3D;
    obj.updateMatrixWorld(true);

    // Decompose the parent's matrixWorld
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    obj.matrixWorld.decompose(pos, rot, scale);

    // Apply those transforms to the guide entity
    this.guideEl.object3D.position.copy(pos);
    this.guideEl.object3D.quaternion.copy(rot);
    this.guideEl.object3D.scale.copy(scale);
  },

  remove: function () {
    // Cleanup: remove the guide entity if this component is removed
    if (this.guideEl && this.guideEl.parentNode) {
      this.guideEl.parentNode.removeChild(this.guideEl);
    }
  }
});
