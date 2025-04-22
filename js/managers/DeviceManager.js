/**
 * DeviceManager - Handles device detection, permissions, and capabilities
 * 
 * This module is responsible for:
 * - Detecting VR capabilities
 * - Identifying mobile devices
 * - Checking for gyroscope availability
 * - Managing device permissions
 */

const DeviceManager = {
  isVR: false,
  isMobile: false,
  hasGyro: false,
  
  /**
   * Initialize the device manager
   * @returns {Promise<boolean>} Promise that resolves when initialization is complete
   */
  async init() {
    let vrSupported = false;
    // VR check
    if (navigator.xr) {
      try {
        vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      } catch (e) {
        vrSupported = false;
      }
    }
    
    // Mobile check
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    
    // Refined VR check: Consider VR true ONLY if supported AND NOT mobile
    this.isVR = vrSupported && !this.isMobile;
    
    // Gyro check
    this.hasGyro = window.DeviceOrientationEvent !== undefined;
    
    console.log(`DeviceManager Init Complete: vrSupported=${vrSupported}, isMobile=${this.isMobile}, Final isVR=${this.isVR}`);
    return true;
  },

  /**
   * Request permission to use the gyroscope
   * @returns {Promise<boolean>} Promise that resolves with permission status
   */
  async requestGyroPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        return false;
      }
    }
    return true;
  }
};

export default DeviceManager;
