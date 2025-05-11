/**
 * SimpleNavmeshConstraint - Constrains movement to a navmesh
 *
 * This component constrains an entity's movement to a navigation mesh,
 * which is useful for implementing walking on terrain with proper collision.
 */

/* global THREE */

const SimpleNavmeshConstraint = {
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

    // GUARD CLAUSE: Ensure navmesh and exclude selectors are valid before using them
    const navmeshSelector = this.data.navmesh;
    const excludeSelector = this.data.exclude;

    if (!navmeshSelector || navmeshSelector.trim() === '') {
      // If navmesh selector is empty, we can't match against it for relevance.
      // Depending on logic, you might also check excludeSelector here or assume if navmesh is empty, it's too early.
      // console.warn('SimpleNavmeshConstraint: onSceneUpdated called with no valid navmesh selector yet.');
      return;
    }

    // Check if the event target element exists and has the 'matches' method
    if (!evt || !evt.detail || !evt.detail.el || typeof evt.detail.el.matches !== 'function') {
      // console.warn('SimpleNavmeshConstraint: onSceneUpdated called with invalid event target.');
      return;
    }

    // Don't bother updating if the entity is not relevant to us
    let isRelevant = evt.detail.el.matches(navmeshSelector);
    if (excludeSelector && excludeSelector.trim() !== '') {
      isRelevant = isRelevant || evt.detail.el.matches(excludeSelector);
    }

    if (isRelevant) {
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
      // ---> ADDED: Declare jumpControl once at the start <---
      const jumpControl = this.el.components['jump-control'];
      // ---> END ADDED <---

      // ---> ADDED: Log enabled state at start of tick <---
      // console.log(`NavmeshConstraint Tick: Enabled=${this.data.enabled}`); // Log every frame - potentially noisy
      if (!this.data.enabled) return; // Early exit if already disabled
      // ---> END ADDED <---

      if (this.data.enabled === false) return; // Original check (redundant now but safe)
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

      // CRITICAL: Check if we're outside the navmesh by casting a ray down
      // This is a more direct way to detect if we're outside the navmesh
      tempVec.copy(nextPosition);
      tempVec.y += maxYVelocity;
      tempVec.y -= this.data.height;
      raycaster.set(tempVec, down);
      raycaster.far = this.data.fall > 0 ? this.data.fall + maxYVelocity : Infinity;
      raycaster.intersectObjects(this.objects, true, results);

      // If no results, we're outside the navmesh
      if (results.length === 0) {
        // Check if we're jumping - uses the jumpControl declared above
        if (jumpControl && jumpControl.isJumping) {
          // If jumping, let JumpControl handle the movement/landing
          results.splice(0); // Clear results just in case
          return; // Exit tick early, don't teleport
        }
      }

      // Clear results array (might have been populated by the jump check return)
      results.splice(0);

      // Skip if we haven't moved enough
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

          // ---> ADDED: Check jumpControl's justLanded flag <---
          const skipPositionUpdate = jumpControl && jumpControl.justLanded;
          // ---> END ADDED <---

          if (nextPosition.y - (hitPos.y - yVel*2) > 0.01) {
            yVel += Math.max(gravity * delta * 0.001, -maxYVelocity);
            hitPos.y = nextPosition.y + yVel;
          } else {
            yVel = 0;
          }

          // ---> MODIFIED: Only update position if not just landed <---
          if (!skipPositionUpdate) {
            tempVec.copy(hitPos);
            this.xzOrigin.object3D.parent.worldToLocal(tempVec);
            tempVec.sub(this.xzOrigin.object3D.position);
            if (this.data.xzOrigin) tempVec.y += this.xzOrigin.object3D.position.y;
            this.el.object3D.position.add(tempVec);
          } else {
            console.log('SimpleNavmeshConstraint: Skipping position update due to justLanded flag.');
            // ---> ADDED: Log positions during skipped update <---
            const playerY = nextPosition.y;
            const constraintY = hitPos.y; // The Y value the constraint calculated
            console.log(`  Player Y: ${playerY.toFixed(3)}, Constraint Calculated Y: ${constraintY.toFixed(3)}, Diff: ${(playerY - constraintY).toFixed(3)}`);
            // ---> END ADDED <---
          }
          // ---> END MODIFIED <---

          // Always update lastPosition
          this.lastPosition.copy(hitPos);
          didHit = true;
          break;
        }
      }

      if (didHit) {
        firstTry = false;
      }

      if (!firstTry && !didHit) {
        // CRITICAL LOGGING: We're about to leave the navmesh!
        console.warn('NAVMESH BOUNDARY CROSSED: Player is leaving the navmesh!');
        console.warn('Current position:', JSON.stringify({
          x: this.el.object3D.position.x.toFixed(3),
          y: this.el.object3D.position.y.toFixed(3),
          z: this.el.object3D.position.z.toFixed(3)
        }));
        console.warn('Last valid position:', JSON.stringify({
          x: this.lastPosition.x.toFixed(3),
          y: this.lastPosition.y.toFixed(3),
          z: this.lastPosition.z.toFixed(3)
        }));

        // Check if the jump control component is active - uses the jumpControl declared above
        if (jumpControl) {
          console.warn('Jump state:', jumpControl.isJumping ? 'JUMPING' : 'NOT JUMPING');
          if (jumpControl.isJumping) {
            console.warn('Jump phase:',
              this.el.hasAttribute('animation__up') ? 'RISING' :
              this.el.hasAttribute('animation__down') ? 'FALLING' : 'UNKNOWN');
          }
        }

        // Log the navmesh constraint state
        console.warn('Navmesh constraint enabled:', this.data.enabled);

        // ---> ADDED: Log state before boundary recovery <---
        console.warn(`NAVMESH_CONSTRAINT: Boundary Recovery (Not Jumping). Scan pattern failed.`);
        console.warn(`  Current Position (el.object3D.position): x=${this.el.object3D.position.x.toFixed(3)}, y=${this.el.object3D.position.y.toFixed(3)}, z=${this.el.object3D.position.z.toFixed(3)}`);
        if (this.lastPosition) {
          console.warn(`  Last Valid Position: x=${this.lastPosition.x.toFixed(3)}, y=${this.lastPosition.y.toFixed(3)}, z=${this.lastPosition.z.toFixed(3)}`);
        } else {
          console.warn(`  Last Valid Position: null`);
        }
        // ---> END ADDED <---

        // Restore to last valid position
        this.el.object3D.position.copy(this.lastPosition);
        this.el.object3D.parent.worldToLocal(this.el.object3D.position);
        console.warn('Restored to last valid position');
      }
    }
  }())
};

export default SimpleNavmeshConstraint;
