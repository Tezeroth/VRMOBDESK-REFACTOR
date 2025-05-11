# VRMOBDESK Changelog

All notable changes to the VRMOBDESK project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 05/05/2025, 

### Added
- Created this changelog file to track project changes
- Added jump functionality using animation-based approach for reliable jumping
- Added spacebar control for jumping in desktop mode
- Added jump button for mobile devices
- Added momentum preservation during jumps

### Changed
- Modified object examination in desktop mode to use right mouse button (RMB) exclusively
- Removed spacebar functionality for object examination to avoid conflicts with jumping
- Dedicated spacebar exclusively for jumping functionality
- Improved jump animation with increased height and adjusted timing for more realistic feel
- Enhanced jump easing functions for more natural movement
- Updated documentation in Interactions.md, ProgramFlow.md, and Functionality.md to reflect these changes

### Fixed
- Prevented browser context menu from appearing when right-clicking for object examination
- Implemented navmesh constraint integration to prevent conflicts during jumps
- Fixed conflict between jumping and object inspection when using spacebar
- Prevented jumping while in inspection mode to maintain consistent interaction states
- Added jump-collider component with visual feedback for wall collision detection
- Implemented immediate landing when colliding with walls during jumps
- Added wall proximity detection to perform vertical-only jumps when near walls
- Kept navmesh constraint enabled during vertical-only jumps to prevent wall clipping
- Implemented wall sliding system during jumps to prevent wall clipping
- Completely reversed approach: now pushing AWAY from walls after landing
- Fixed critical issue by adjusting position BEFORE re-enabling navmesh constraint
- Added double collision check with additional push-back for persistent wall collisions
- Added comprehensive logging to track wall collisions and position changes
- Improved jump animation with increased height and adjusted timing for more realistic feel
- Enhanced collider attachment to prevent detachment during repeated wall collisions
- Added automatic collider recreation to ensure jumping functionality is maintained
- Implemented safety check to prevent permanently losing the ability to jump

## [1.0.0] - 2024-04-25

### Added
- Initial release of VRMOBDESK with modular architecture
- Multi-platform support (VR, mobile, desktop)
- Physics-based interactions using PhysX
- Adaptive controls for different devices
- Navigation system with collision detection
- Object manipulation (pickup, examine, throw)
- Performance optimizations for different devices

## 06/05/2025

**Objective:** Address critical initialization failures in `JumpDebug.js` and `PhysicsSyncManager.js` to enable a stable physics simulation environment, laying the groundwork for networked multiplayer interactions.

**Stated Intentions & Priorities:**

1.  **Priority 1: Fix `JumpDebug.js` error and `PhysicsSyncManager.js` initialization failures.**
    *   The system was not working correctly due to these issues.
2.  **Priority 2: Re-evaluate `PhysicsSyncManager.js` strategy.**
    *   Move towards enforcing a single, consistent, fixed timestep for the PhysX simulation across all clients, rather than aligning with varying device refresh rates (which is problematic for networking).
3.  **Priority 3: Ensure rendering interpolation.**
    *   Smooth visuals if the fixed physics timestep is lower than the display refresh rate. This might be an A-Frame default or require specific setup with the PhysX integration.

**Summary of Changes & Debugging Steps:**

*   **`JumpDebug.js` Module Resolution:**
    *   Identified and resolved `SyntaxError: Unexpected token 'export'` by correctly handling ES6 module exports.
    *   Ensured `JumpDebug.js` was properly imported as a module in `index.html` (`type="module"`) and that consuming modules (e.g., `JumpControl.js`) used the correct import syntax (`import JumpDebug from '...'`).

*   **`PhysicsSyncManager.js` Initialization Debugging:**
    *   **Initial Problem:** The component was failing to initialize because it couldn't reliably detect when the PhysX physics system was fully ready. It was also looking for incorrect property names (e.g., `driver`, `world`) on the `aframe-physx` system object.
    *   **Step 1: Event-Driven Readiness:** Introduced a `physXEventFired` flag, set by listening to a `physx-started` event (emitted by `LoadingScreenManager.js` or the physics system itself). This helped gate initialization attempts until the core PhysX engine signaled it was starting.
    *   **Step 2: Correct Property Identification:** Through iterative logging and inspection of `sceneEl.systems.physx`, the correct properties for checking PhysX readiness were identified:
        *   `physicsSystem.PhysX` (the main PhysX API object)
        *   `physicsSystem.scene` (the PhysX simulation scene object)
        *   `physicsSystem.physXInitialized` (a boolean flag from the `aframe-physx` system indicating its internal readiness)
    *   **Step 3: Lifecycle Alignment:** Refined the readiness check in the `tick()` method to wait for `physXEventFired`, the presence of `physicsSystem.PhysX`, `physicsSystem.scene`, `physicsSystem.physXInitialized === true`, AND the availability of `sceneEl.components.physx` (the A-Frame component instance on the scene).
    *   **Step 4: Handling Scene Component Delay:** Observed that `sceneEl.components.physx` (the scene component instance) could become available a few ticks *after* the underlying `systems.physx` (and its `physXInitialized` flag) reported ready. The logic was adjusted to proceed with initialization if the *system* was ready, even if the scene component instance was momentarily pending, to allow `initializeSync` to use the ready system.
    *   **Step 5: Correcting `initializeSync` Checks:** Ensured that the checks *within* `initializeSync` itself (when re-accessing `sceneEl.systems.physx`) also used the correct property names (`.PhysX`, `.scene`, `.physXInitialized`). This resolved an issue where `initializeSync` would fail because it was using outdated checks (`.driver`, `.world`).
    *   **Step 6: `setPhysicsTickRate` Refinement:** Refactored `setPhysicsTickRate` to first attempt a direct method call on the physics system. As a fallback, it now tries to use `sceneEl.setAttribute('physx', 'fixedTimeStep', ...)`, correctly handling cases where `sceneEl.components.physx` might not yet be available when `setPhysicsTickRate` is first called during initialization. It also includes a last-resort attempt to set `fixedTimeStep` on `system.data` if other methods fail.

**Outcome:**

*   `PhysicsSyncManager.js` now successfully initializes by correctly identifying the PhysX system's ready state and its relevant API objects.
*   The component proceeds through its `detectDeviceCapabilities()` and `initializeSync()` methods without fatal errors related to physics system access.
*   The groundwork for implementing a fixed timestep strategy (Priority 2) and ensuring proper interpolation (Priority 3) is now much more solid.

## [Date - e.g., YYYY-MM-DD] - Ground Collider Update for PhysX Reliability

### Fixed
- **Reliable Ground Collider for PhysX**: Investigated an issue in `BasePlate/index2.html` where dynamic physics objects (cubes) were floating or not interacting correctly with an `<a-plane>` intended as a static ground collider.
  - **Observation**: Despite `useDefaultScene: false;` in the PhysX scene configuration and no `aframe-environment-component`, objects did not rest on an `<a-plane physx-body="type: static;">` at `y=0`.
  - **Solution**: Replaced the `<a-plane>` ground with an `<a-box physx-body="type: static; shape: box;">` (e.g., `<a-box class="navmesh" position="0 -0.05 0" width="50" height="0.1" depth="50" visible="false" physx-body="type: static; shape: box;">`). The top surface of this box is at `y=0`.
  - **Outcome**: Dynamic objects now correctly rest on this `<a-box>` ground collider. This indicates that for the current A-Frame/PhysX setup, using an `<a-box>` with an explicit `shape: box` provides a more robust and predictable static ground surface for physics interactions compared to an `<a-plane>`.
  - **Recommendation**: When a simple, flat, static physical ground is needed with PhysX, prefer using a thin `<a-box>` with `shape: box` over an `<a-plane>` for better reliability.
