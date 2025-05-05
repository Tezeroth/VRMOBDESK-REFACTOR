/**
 * ComponentRegistry - A central registry for A-Frame components
 * 
 * This module provides a centralized way to register A-Frame components,
 * preventing duplicate registrations and providing a way to access
 * registered components.
 */

const ComponentRegistry = {
  /**
   * Store of registered components
   * @private
   */
  _components: {},

  /**
   * Register a component with A-Frame
   * @param {string} name - The name of the component
   * @param {object} implementation - The component implementation
   * @returns {boolean} - Whether the registration was successful
   */
  register(name, implementation) {
    // Check if component is already registered
    if (this._components[name] || AFRAME.components[name]) {
      console.log(`Component ${name} already registered, skipping.`);
      return false;
    }

    // Register the component with A-Frame
    AFRAME.registerComponent(name, implementation);
    
    // Store in our registry
    this._components[name] = implementation;
    
    console.log(`Registered component: ${name}`);
    return true;
  },

  /**
   * Register multiple components at once
   * @param {Object} components - Object with component names as keys and implementations as values
   * @returns {Object} - Object with registration results (success/failure) for each component
   */
  registerAll(components) {
    const results = {};
    
    for (const [name, implementation] of Object.entries(components)) {
      results[name] = this.register(name, implementation);
    }
    
    return results;
  },

  /**
   * Get a registered component
   * @param {string} name - The name of the component
   * @returns {object|null} - The component implementation or null if not found
   */
  get(name) {
    return this._components[name] || null;
  },

  /**
   * Check if a component is registered
   * @param {string} name - The name of the component
   * @returns {boolean} - Whether the component is registered
   */
  isRegistered(name) {
    return !!this._components[name] || !!AFRAME.components[name];
  },

  /**
   * Get all registered component names
   * @returns {string[]} - Array of registered component names
   */
  getAllNames() {
    return Object.keys(this._components);
  },

  /**
   * Get all registered components
   * @returns {Object} - Object with component names as keys and implementations as values
   */
  getAll() {
    return { ...this._components };
  }
};

export default ComponentRegistry;
