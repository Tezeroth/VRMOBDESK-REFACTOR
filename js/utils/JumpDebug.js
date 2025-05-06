/**
 * JumpDebug - Centralized debugging utility for the jump system
 *
 * This utility provides consistent debugging functionality for the jump system,
 * including configurable log levels and the ability to toggle debug output.
 */

// Debug configuration
const JumpDebug = {
  // Debug settings
  _enabled: false,  // Private property for enabled state

  // Define getter and setter for enabled property
  get enabled() {
    return this._enabled;
  },

  set enabled(value) {
    this._enabled = value;
    // Toggle stats display based on debug state
    if (value) {
      console.info('Debug mode enabled. Stats panel is now visible.');
      this.showStats();
      this.showPhysicsProperties();
    } else {
      console.info('Debug mode disabled. Stats panel is now hidden.');
      this.hideStats();
      this.hidePhysicsProperties();
    }
  },

  // Log level settings (can be individually toggled)
  levels: {
    info: true,     // Basic information
    warn: true,     // Warnings
    error: true,    // Errors
    collision: true, // Collision-related logs
    position: true,  // Position-related logs
    safety: true,    // Safety mechanism logs
    state: true      // State change logs
  },

  /**
   * Log an informational message
   * @param {string} source - Source of the log (e.g., 'JumpControl', 'JumpCollider')
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include
   */
  info: function(source, message, data) {
    if (!this.enabled || !this.levels.info) return;

    if (data !== undefined) {
      console.log(`[${source}] ${message}`, data);
    } else {
      console.log(`[${source}] ${message}`);
    }
  },

  /**
   * Log a warning message
   * @param {string} source - Source of the log (e.g., 'JumpControl', 'JumpCollider')
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include
   */
  warn: function(source, message, data) {
    if (!this.enabled || !this.levels.warn) return;

    if (data !== undefined) {
      console.warn(`[${source}] ${message}`, data);
    } else {
      console.warn(`[${source}] ${message}`);
    }
  },

  /**
   * Log an error message
   * @param {string} source - Source of the log (e.g., 'JumpControl', 'JumpCollider')
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include
   */
  error: function(source, message, data) {
    if (!this.enabled || !this.levels.error) return;

    if (data !== undefined) {
      console.error(`[${source}] ${message}`, data);
    } else {
      console.error(`[${source}] ${message}`);
    }
  },

  /**
   * Log a collision-related message
   * @param {string} source - Source of the log (e.g., 'JumpControl', 'JumpCollider')
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include
   */
  collision: function(source, message, data) {
    if (!this.enabled || !this.levels.collision) return;

    if (data !== undefined) {
      console.log(`[${source}] COLLISION: ${message}`, data);
    } else {
      console.log(`[${source}] COLLISION: ${message}`);
    }
  },

  /**
   * Log a position-related message
   * @param {string} source - Source of the log (e.g., 'JumpControl', 'JumpCollider')
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include
   */
  position: function(source, message, data) {
    if (!this.enabled || !this.levels.position) return;

    if (data !== undefined) {
      console.log(`[${source}] POSITION: ${message}`, data);
    } else {
      console.log(`[${source}] POSITION: ${message}`);
    }
  },

  /**
   * Log a safety mechanism message
   * @param {string} source - Source of the log (e.g., 'JumpControl', 'JumpCollider')
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include
   */
  safety: function(source, message, data) {
    if (!this.enabled || !this.levels.safety) return;

    if (data !== undefined) {
      console.warn(`[${source}] SAFETY: ${message}`, data);
    } else {
      console.warn(`[${source}] SAFETY: ${message}`);
    }
  },

  /**
   * Log a state change message
   * @param {string} source - Source of the log (e.g., 'JumpControl', 'JumpCollider')
   * @param {string} message - The message to log
   * @param {any} data - Optional data to include
   */
  state: function(source, message, data) {
    if (!this.enabled || !this.levels.state) return;

    if (data !== undefined) {
      console.log(`[${source}] STATE: ${message}`, data);
    } else {
      console.log(`[${source}] STATE: ${message}`);
    }
  },

  /**
   * Format a position vector for logging
   * @param {THREE.Vector3} position - The position to format
   * @returns {string} Formatted position string
   */
  formatPosition: function(position) {
    if (!position) return 'null';
    return `x=${position.x.toFixed(3)}, y=${position.y.toFixed(3)}, z=${position.z.toFixed(3)}`;
  },

  /**
   * Enable all debug output and show stats panel
   */
  enableAll: function() {
    this.enabled = true;
    Object.keys(this.levels).forEach(key => {
      this.levels[key] = true;
    });
    this.showStats();
  },

  /**
   * Disable all debug output and hide stats panel
   */
  disableAll: function() {
    this.enabled = false;
    this.hideStats();
  },

  /**
   * Show the stats panel
   */
  showStats: function() {
    // Try to find the stats panel with a small delay to ensure it's initialized
    setTimeout(() => {
      const statsEl = document.querySelector('.rs-base');
      if (statsEl) {
        statsEl.style.display = 'block';
      }
    }, 100);
  },

  /**
   * Hide the stats panel
   */
  hideStats: function() {
    // Try to find the stats panel with a small delay to ensure it's initialized
    setTimeout(() => {
      const statsEl = document.querySelector('.rs-base');
      if (statsEl) {
        statsEl.style.display = 'none';
      }
    }, 100);
  },

  /**
   * Enable specific debug levels
   * @param {Array<string>} levels - Array of level names to enable
   */
  enableLevels: function(levels) {
    levels.forEach(level => {
      if (this.levels.hasOwnProperty(level)) {
        this.levels[level] = true;
      }
    });
  },

  /**
   * Disable specific debug levels
   * @param {Array<string>} levels - Array of level names to disable
   */
  disableLevels: function(levels) {
    levels.forEach(level => {
      if (this.levels.hasOwnProperty(level)) {
        this.levels[level] = false;
      }
    });
  },

  /**
   * Display current physics properties from a-scene
   */
  showPhysicsProperties: function() {
    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) {
      console.warn('[JumpDebug] Could not find a-scene to get physics properties.');
      return;
    }
    const physicsAttrs = sceneEl.getAttribute('physics');
    if (physicsAttrs) {
      console.info('[JumpDebug] A-Scene Physics Properties:', physicsAttrs);
      
      let displayEl = document.getElementById('jumpdebug-physics-props');
      if (!displayEl) {
        displayEl = document.createElement('div');
        displayEl.id = 'jumpdebug-physics-props';
        displayEl.style.position = 'fixed';
        displayEl.style.bottom = '10px';
        displayEl.style.left = '10px';
        displayEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
        displayEl.style.color = 'white';
        displayEl.style.padding = '10px';
        displayEl.style.fontFamily = 'monospace';
        displayEl.style.fontSize = '10px';
        displayEl.style.zIndex = '10001'; // Above stats
        displayEl.style.maxWidth = '300px';
        displayEl.style.overflowWrap = 'break-word';
        document.body.appendChild(displayEl);
      }
      
      let content = '<strong>Physics Properties:</strong><br>';
      for (const key in physicsAttrs) {
        if (physicsAttrs.hasOwnProperty(key)) {
          content += `${key}: ${JSON.stringify(physicsAttrs[key])}<br>`;
        }
      }
      displayEl.innerHTML = content;
      displayEl.style.display = 'block';

    } else {
      console.warn('[JumpDebug] No physics attribute found on a-scene.');
    }
  },

  /**
   * Hide the physics properties display
   */
  hidePhysicsProperties: function() {
    const displayEl = document.getElementById('jumpdebug-physics-props');
    if (displayEl) {
      displayEl.style.display = 'none';
    }
  },

  /**
   * Initialize the JumpDebug utility
   * This method is called when the module is imported
   */
  initialize: function() {
    // For backward compatibility, also attach to window object
    // window.JumpDebug = this; // Let's remove this for a cleaner module pattern

    // Hide stats panel by default when the page loads
    window.addEventListener('load', () => {
      // Hide stats panel initially (it will be shown if debug is enabled later)
      this.hideStats();
      this.hidePhysicsProperties();
    });

    // Add a helpful console message when the utility is loaded
    console.info('JumpDebug utility loaded. To enable debug mode and show stats, run: JumpDebug.enabled = true');
  }
};

// Call initialize
JumpDebug.initialize();

export default JumpDebug;
