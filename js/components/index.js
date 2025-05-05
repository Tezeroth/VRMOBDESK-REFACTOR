/**
 * Components index - Exports all components for registration
 *
 * This file imports all components and exports them for registration
 * by the ComponentRegistry. It does NOT register components directly
 * to avoid duplicate registrations.
 */

import TogglePhysics from './TogglePhysics.js';
import PhysicsSleepManager from './PhysicsSleepManager.js';
import PhysicsOptimizer from './PhysicsOptimizer.js';
import PhysicsSyncManager from './PhysicsSyncManager.js';
import LoadingScreenManager from './LoadingScreenManager.js';
import NavigateOnClick from './NavigateOnClick.js';
import ControlManager from './ControlManager.js';
import DesktopMobileControls from './DesktopMobileControls.js';
import ArrowControls from './ArrowControls.js';
import MakeTransparent from './MakeTransparent.js';
import SimpleNavmeshConstraint from './SimpleNavmeshConstraint.js';
import JumpControl from './JumpControl.js';
import JumpCollider from './JumpCollider.js';
import PlayerCollider from './PlayerCollider.js';
import MagnetRangeDebug from './MagnetRangeDebug.js';

// Define component mapping for registration
export const componentMap = {
  'toggle-physics': TogglePhysics,
  'physics-sleep-manager': PhysicsSleepManager,
  'physics-optimizer': PhysicsOptimizer,
  'physics-sync-manager': PhysicsSyncManager,
  'loading-screen-manager': LoadingScreenManager,
  'navigate-on-click': NavigateOnClick,
  'control-manager': ControlManager,
  'desktop-mobile-controls': DesktopMobileControls,
  'arrow-controls': ArrowControls,
  'make-transparent': MakeTransparent,
  'simple-navmesh-constraint': SimpleNavmeshConstraint,
  'jump-control': JumpControl,
  'jump-collider': JumpCollider,
  'player-collider': PlayerCollider,
  'magnet-range-debug': MagnetRangeDebug
};

// Export components for potential direct usage
export {
  TogglePhysics,
  PhysicsSleepManager,
  PhysicsOptimizer,
  PhysicsSyncManager,
  LoadingScreenManager,
  NavigateOnClick,
  ControlManager,
  DesktopMobileControls,
  ArrowControls,
  MakeTransparent,
  SimpleNavmeshConstraint,
  JumpControl,
  JumpCollider,
  PlayerCollider,
  MagnetRangeDebug
};
