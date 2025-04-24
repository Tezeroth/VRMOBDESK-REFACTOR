/**
 * Components index - Registers all components with A-Frame
 */

import TogglePhysics from './TogglePhysics.js';
import PhysicsSleepManager from './PhysicsSleepManager.js';
import PhysicsOptimizer from './PhysicsOptimizer.js';
import LoadingScreenManager from './LoadingScreenManager.js';
import NavigateOnClick from './NavigateOnClick.js';
import ControlManager from './ControlManager.js';
import DesktopMobileControls from './DesktopMobileControls.js';
import ArrowControls from './ArrowControls.js';

// Register components with A-Frame
AFRAME.registerComponent('toggle-physics', TogglePhysics);
AFRAME.registerComponent('physics-sleep-manager', PhysicsSleepManager);
AFRAME.registerComponent('physics-optimizer', PhysicsOptimizer);
AFRAME.registerComponent('loading-screen-manager', LoadingScreenManager);
AFRAME.registerComponent('navigate-on-click', NavigateOnClick);
AFRAME.registerComponent('control-manager', ControlManager);
AFRAME.registerComponent('desktop-mobile-controls', DesktopMobileControls);
AFRAME.registerComponent('arrow-controls', ArrowControls);

// Export components for potential direct usage
export {
  TogglePhysics,
  PhysicsSleepManager,
  PhysicsOptimizer,
  LoadingScreenManager,
  NavigateOnClick,
  ControlManager,
  DesktopMobileControls,
  ArrowControls
};
