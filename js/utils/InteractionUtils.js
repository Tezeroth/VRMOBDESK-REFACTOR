/**
 * InteractionUtils - Utility functions for object interactions
 * 
 * This module provides helper functions for:
 * - Raycasting and intersection testing
 * - Visual feedback for interactions
 * - Object transformation utilities
 */

const InteractionUtils = {
  /**
   * Get the first intersected element that matches a selector
   * @param {Element} raycaster - The raycaster element
   * @param {string} selector - CSS selector to filter intersections
   * @returns {Element|null} The intersected element or null
   */
  getIntersectedElement(raycaster, selector) {
    if (!raycaster || !raycaster.components || !raycaster.components.raycaster) {
      return null;
    }
    
    const intersections = raycaster.components.raycaster.intersections;
    if (!intersections || intersections.length === 0) {
      return null;
    }
    
    // If no selector, return first intersection
    if (!selector) {
      return intersections[0].object.el;
    }
    
    // Find first intersection that matches selector
    for (const intersection of intersections) {
      const el = intersection.object.el;
      if (el && el.matches(selector)) {
        return el;
      }
    }
    
    return null;
  },
  
  /**
   * Update cursor visual based on interaction state
   * @param {Element} cursor - The cursor element
   * @param {string} state - The interaction state
   * @param {number} [chargeRatio=0] - Optional charge ratio for charging state
   */
  updateCursorVisual(cursor, state, chargeRatio = 0) {
    if (!cursor) return;
    
    const baseScale = 0.025;
    
    switch (state) {
      case 'idle':
      case 'holding':
        cursor.setAttribute('geometry', 'radiusInner', baseScale * 0.8);
        cursor.setAttribute('geometry', 'radiusOuter', baseScale);
        cursor.setAttribute('material', 'color', 'lime');
        break;
        
      case 'inspecting':
        cursor.setAttribute('geometry', 'radiusInner', baseScale * 0.8);
        cursor.setAttribute('geometry', 'radiusOuter', baseScale);
        cursor.setAttribute('material', 'color', 'red');
        break;
        
      case 'charging':
        const maxScaleMultiplier = 2.0;
        const scale = baseScale * (1 + chargeRatio * (maxScaleMultiplier - 1));
        const color = new THREE.Color(0xffff00).lerp(new THREE.Color(0xff0000), chargeRatio);
        
        cursor.setAttribute('geometry', 'radiusInner', scale * 0.8);
        cursor.setAttribute('geometry', 'radiusOuter', scale);
        cursor.setAttribute('material', 'color', `#${color.getHexString()}`);
        break;
    }
  },
  
  /**
   * Calculate relative rotation between two frames
   * @param {THREE.Quaternion} prevQuat - Previous quaternion
   * @param {THREE.Quaternion} currentQuat - Current quaternion
   * @param {THREE.Quaternion} resultQuat - Quaternion to store result
   */
  calculateRelativeRotation(prevQuat, currentQuat, resultQuat) {
    resultQuat.copy(prevQuat).conjugate();
    resultQuat.premultiply(currentQuat);
  },
  
  /**
   * Calculate object position relative to camera
   * @param {THREE.Object3D} cameraObject - Camera object3D
   * @param {number} distance - Distance from camera
   * @param {THREE.Vector3} resultVector - Vector to store result
   */
  calculatePositionInFrontOfCamera(cameraObject, distance, resultVector) {
    const tempDirection = new THREE.Vector3(0, 0, -1);
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    
    cameraObject.getWorldPosition(tempPosition);
    cameraObject.getWorldQuaternion(tempQuaternion);
    
    tempDirection.applyQuaternion(tempQuaternion);
    resultVector.copy(tempPosition).add(tempDirection.multiplyScalar(distance));
  }
};

export default InteractionUtils;
