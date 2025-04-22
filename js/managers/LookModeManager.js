/**
 * LookModeManager - Handles switching between swipe and gyro modes
 * 
 * This module is responsible for:
 * - Managing camera control modes (swipe vs gyro)
 * - Creating and managing the mode toggle UI
 * - Handling gyroscope input
 */

import DeviceManager from './DeviceManager.js';

const LookModeManager = {
  currentMode: 'swipe',
  gyroEnabled: false,
  
  /**
   * Initialize the look mode manager
   */
  init() {
    this.currentMode = localStorage.getItem('lookMode') || 'swipe';
    this.createToggleButton();
    
    if (DeviceManager.hasGyro) {
      this.initGyro();
    }
  },

  /**
   * Create the toggle button for switching between swipe and gyro modes
   */
  createToggleButton() {
    const button = document.createElement('button');
    button.className = 'look-mode-btn';
    this.updateButtonText(button);
    
    button.addEventListener('click', async () => {
      if (this.currentMode === 'swipe') {
        if (await DeviceManager.requestGyroPermission()) {
          this.setMode('gyro');
        } else {
          this.showPermissionDenied();
        }
      } else {
        this.setMode('swipe');
      }
    });
    
    document.body.appendChild(button);
  },

  /**
   * Update the button text based on current mode
   * @param {HTMLElement} button - The button element to update
   */
  updateButtonText(button) {
    button.innerHTML = this.currentMode === 'swipe' ? '⇄' : '⟲';
    button.title = `${this.currentMode.toUpperCase()} MODE${DeviceManager.hasGyro ? ' (tap to switch)' : ''}`;
    button.disabled = !DeviceManager.hasGyro;
  },

  /**
   * Set the look mode
   * @param {string} mode - The mode to set ('swipe' or 'gyro')
   */
  setMode(mode) {
    this.currentMode = mode;
    localStorage.setItem('lookMode', mode);
    this.updateButtonText(document.querySelector('.look-mode-btn'));
    
    if (mode === 'gyro') {
      this.enableGyro();
    } else {
      this.disableGyro();
    }
  },

  /**
   * Show permission denied overlay
   */
  showPermissionDenied() {
    const overlay = document.createElement('div');
    overlay.className = 'permission-overlay';
    overlay.innerHTML = `
      <div class="permission-content">
        <h2>Gyroscope Permission Required</h2>
        <p>Please enable device orientation access to use gyroscope controls.</p>
        <button>OK</button>
      </div>
    `;
    
    overlay.querySelector('button').onclick = () => {
      overlay.remove();
    };
    
    document.body.appendChild(overlay);
  },

  /**
   * Initialize gyroscope event listener
   */
  initGyro() {
    window.addEventListener('deviceorientation', this.handleGyro.bind(this), false);
  },

  /**
   * Handle gyroscope input
   * @param {DeviceOrientationEvent} event - The device orientation event
   */
  handleGyro(event) {
    if (!this.gyroEnabled || this.currentMode !== 'gyro') return;
    
    const camera = document.querySelector('#camera');
    if (!camera) return;

    const lookControls = camera.components['look-controls'];
    if (lookControls && lookControls.data.enabled) { 
        const yawObject = lookControls.yawObject; 
        const pitchObject = lookControls.pitchObject;

        // Convert orientation data to radians
        const betaRad = THREE.MathUtils.degToRad(event.beta);
        const gammaRad = THREE.MathUtils.degToRad(-event.gamma); // Negate gamma often needed

        // Apply pitch 
        pitchObject.rotation.x = betaRad; 

        // Apply yaw 
        yawObject.rotation.y = gammaRad;
    }
  },

  /**
   * Enable gyroscope controls
   */
  enableGyro() {
    this.gyroEnabled = true;
  },

  /**
   * Disable gyroscope controls
   */
  disableGyro() {
    this.gyroEnabled = false;
  }
};

export default LookModeManager;
