/**
 * StateMachine - A simple state machine implementation
 * 
 * This module provides a generic state machine that can be used
 * to manage complex state transitions in a clean, maintainable way.
 */

class StateMachine {
  /**
   * Create a new state machine
   * @param {Object} config - Configuration object
   * @param {string} config.initialState - The initial state
   * @param {Object} config.states - State definitions
   * @param {Function} [config.onTransition] - Optional callback for state transitions
   */
  constructor(config) {
    this.currentState = config.initialState;
    this.states = config.states;
    this.onTransition = config.onTransition || (() => {});
    this.data = {};
  }
  
  /**
   * Get the current state
   * @returns {string} The current state
   */
  getState() {
    return this.currentState;
  }
  
  /**
   * Check if the current state matches the given state
   * @param {string} state - The state to check
   * @returns {boolean} True if current state matches
   */
  is(state) {
    return this.currentState === state;
  }
  
  /**
   * Check if a transition is allowed from the current state
   * @param {string} action - The action to check
   * @returns {boolean} True if the transition is allowed
   */
  can(action) {
    const currentStateObj = this.states[this.currentState];
    return !!(currentStateObj && currentStateObj[action]);
  }
  
  /**
   * Transition to a new state based on an action
   * @param {string} action - The action triggering the transition
   * @param {...any} args - Arguments to pass to the action handler
   * @returns {boolean} True if the transition was successful
   */
  transition(action, ...args) {
    const currentStateObj = this.states[this.currentState];
    
    if (!currentStateObj) {
      console.error(`State '${this.currentState}' not found in state machine`);
      return false;
    }
    
    const handler = currentStateObj[action];
    
    if (!handler) {
      console.warn(`Action '${action}' not allowed in state '${this.currentState}'`);
      return false;
    }
    
    const result = handler.apply(this, args);
    
    if (typeof result === 'string') {
      const prevState = this.currentState;
      this.currentState = result;
      
      // Call exit handler of previous state if it exists
      const exitHandler = currentStateObj.onExit;
      if (exitHandler) {
        exitHandler.call(this, this.currentState);
      }
      
      // Call entry handler of new state if it exists
      const newStateObj = this.states[this.currentState];
      const entryHandler = newStateObj && newStateObj.onEnter;
      if (entryHandler) {
        entryHandler.call(this, prevState);
      }
      
      // Call transition callback
      this.onTransition(prevState, this.currentState, action);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Set data in the state machine's data store
   * @param {string} key - The data key
   * @param {any} value - The data value
   */
  setData(key, value) {
    this.data[key] = value;
  }
  
  /**
   * Get data from the state machine's data store
   * @param {string} key - The data key
   * @returns {any} The data value
   */
  getData(key) {
    return this.data[key];
  }
  
  /**
   * Reset the state machine to its initial state
   * @param {string} [initialState] - Optional new initial state
   */
  reset(initialState) {
    if (initialState) {
      this.currentState = initialState;
    } else {
      this.currentState = Object.keys(this.states)[0];
    }
    this.data = {};
  }
}

export default StateMachine;
