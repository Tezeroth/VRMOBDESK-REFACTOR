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
      this.showStats();
    } else {
      this.hideStats();
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
    const scene = document.querySelector('a-scene');
    if (scene && scene.hasAttribute('stats')) {
      const statsEl = document.querySelector('.rs-base');
      if (statsEl) {
        statsEl.style.display = 'block';
      }
    }
  },

  /**
   * Hide the stats panel
   */
  hideStats: function() {
    const statsEl = document.querySelector('.rs-base');
    if (statsEl) {
      statsEl.style.display = 'none';
    }
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
  }
};

// Export as a regular object (not using export/import)
// This avoids breaking the existing code structure
window.JumpDebug = JumpDebug;

// Initialize: hide stats panel by default
document.addEventListener('DOMContentLoaded', function() {
  // Wait for the scene to load
  const scene = document.querySelector('a-scene');
  if (scene) {
    scene.addEventListener('loaded', function() {
      // Hide stats panel initially
      JumpDebug.hideStats();
    });
  }
});

// Add a helpful console message when the utility is loaded
console.info('JumpDebug utility loaded. To enable debug mode and show stats, run: window.JumpDebug.enabled = true');
