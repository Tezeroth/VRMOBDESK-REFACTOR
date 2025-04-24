/**
 * PerformanceOptimizer - Utility for optimizing performance
 * 
 * This utility provides functions to optimize performance,
 * particularly for first-interaction lag.
 */

import DeviceManager from '../managers/DeviceManager.js';

const PerformanceOptimizer = {
  /**
   * Initialize performance optimizations
   */
  init: function() {
    // Pre-initialize look controls
    this.preInitLookControls();
    
    // Optimize raycaster
    this.optimizeRaycaster();
    
    // Apply mobile-specific optimizations
    if (DeviceManager.isMobile) {
      this.applyMobileOptimizations();
    }
    
    console.log('PerformanceOptimizer: Initialized');
  },
  
  /**
   * Pre-initialize look controls to reduce first-interaction lag
   */
  preInitLookControls: function() {
    // Wait for camera to be available
    const initCamera = () => {
      const camera = document.querySelector('#camera');
      if (camera) {
        // Force initialization of look-controls if available
        if (camera.components && camera.components['look-controls']) {
          try {
            // Call updateOrientation to initialize internal state
            camera.components['look-controls'].updateOrientation();
            console.log('PerformanceOptimizer: Pre-initialized look-controls');
          } catch (e) {
            console.warn('PerformanceOptimizer: Error pre-initializing look-controls', e);
          }
        } else {
          // Look controls not available yet, try again later
          setTimeout(initCamera, 500);
        }
      } else {
        // Camera not available yet, try again later
        setTimeout(initCamera, 500);
      }
    };
    
    // Start initialization process
    setTimeout(initCamera, 500);
  },
  
  /**
   * Optimize raycaster settings
   */
  optimizeRaycaster: function() {
    // Wait for cursor to be available
    const initRaycaster = () => {
      const cursor = document.querySelector('#cursor');
      if (cursor) {
        // Optimize raycaster settings
        if (cursor.hasAttribute('raycaster')) {
          // Start with limited objects and gradually expand
          cursor.setAttribute('raycaster', 'objects', '.clickable');
          
          // After a delay, expand to include more objects
          setTimeout(() => {
            cursor.setAttribute('raycaster', 'objects', '.clickable, .pickupable');
            console.log('PerformanceOptimizer: Expanded raycaster objects');
          }, 2000);
          
          console.log('PerformanceOptimizer: Optimized raycaster');
        }
      } else {
        // Cursor not available yet, try again later
        setTimeout(initRaycaster, 500);
      }
    };
    
    // Start initialization process
    setTimeout(initRaycaster, 500);
  },
  
  /**
   * Apply mobile-specific optimizations
   */
  applyMobileOptimizations: function() {
    // Reduce raycaster far distance on mobile
    const cursor = document.querySelector('#cursor');
    if (cursor && cursor.hasAttribute('raycaster')) {
      cursor.setAttribute('raycaster', 'far', 5); // Shorter distance for mobile
    }
    
    // Optimize physics for mobile
    const scene = document.querySelector('a-scene');
    if (scene && scene.systems.physics && scene.systems.physics.driver) {
      try {
        // Lower physics precision for better performance
        if (scene.systems.physics.driver.world && scene.systems.physics.driver.world.solver) {
          scene.systems.physics.driver.world.solver.iterations = 4; // Lower value for mobile
          console.log('PerformanceOptimizer: Applied physics optimizations for mobile');
        }
      } catch (e) {
        console.warn('PerformanceOptimizer: Error optimizing physics for mobile', e);
      }
    }
    
    console.log('PerformanceOptimizer: Applied mobile optimizations');
  }
};

export default PerformanceOptimizer;
