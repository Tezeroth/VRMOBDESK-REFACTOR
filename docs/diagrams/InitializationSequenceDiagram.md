# Initialization Sequence Diagram

```mermaid
sequenceDiagram
    participant Browser
    participant AFrame as A-Frame
    participant Scene
    participant CM as ControlManager
    participant DM as DeviceManager
    participant PhysX
    participant PSM as PhysicsSleepManager
    participant PO as PhysicsOptimizer
    participant Assets
    participant LSM as LoadingScreenManager

    %% Initial Loading
    Browser->>AFrame: Load A-Frame library
    Browser->>PhysX: Load PhysX library
    Browser->>Scene: Parse a-scene element

    %% A-Frame Initialization
    AFrame->>Scene: Initialize scene
    Scene->>LSM: Initialize loading-screen-manager
    Scene->>CM: Initialize control-manager component

    %% Control Manager Setup
    CM->>CM: Find camera, rig, hands
    CM->>DM: Call DeviceManager.init()

    %% Device Detection
    activate DM
    DM->>DM: Check for VR support
    DM->>DM: Check if mobile device
    DM->>DM: Check for gyroscope

    alt successful initialization
        DM-->>CM: Return device capabilities
    else initialization error
        DM-->>CM: Return error
        CM->>CM: Fallback to desktop/mobile mode
    end
    deactivate DM

    %% Asset Loading
    Scene->>Assets: Load 3D models and textures
    Assets-->>Scene: Assets loaded

    %% PhysX Initialization
    Scene->>PhysX: Initialize physics system
    PhysX-->>Scene: Physics system ready
    Scene->>Scene: Emit physx-ready event

    %% Physics Optimization Setup
    Scene->>PSM: Initialize physics-sleep-manager
    PSM->>PSM: Wait for scene loaded

    Scene->>PO: Initialize physics-optimizer
    PO->>PO: Wait for physics ready

    %% Control Setup Based on Device
    alt is VR mode
        CM->>CM: setupVRMode()
        CM->>Scene: Remove desktop/mobile components
        CM->>Scene: Set up VR movement controls
        CM->>Scene: Enable hand controls
    else is Desktop/Mobile mode
        CM->>CM: setupDesktopMobileMode()
        CM->>Scene: Set up look-controls
        CM->>Scene: Set up movement-controls

        alt is Mobile
            CM->>Scene: Add arrow-controls
        end

        CM->>Scene: Add desktop-mobile-controls
    end

    %% Mobile-Specific Setup
    alt is Mobile
        CM->>CM: applyMobileOptimizations()
        CM->>Scene: Disable shadows for performance
        CM->>Scene: Apply mobile-specific UI adjustments
        PO->>PhysX: Apply mobile physics settings
        PO->>PhysX: Reduce physics update rate
        PO->>PhysX: Limit physics substeps
    end

    %% Physics Sleep Manager Initialization
    PSM->>PSM: Collect physics objects
    PSM->>PSM: Set up sleep management

    %% Final Initialization
    LSM->>LSM: Hide loading screen
    Scene-->>Browser: Scene ready for interaction

    %% Event Listeners Setup
    Scene->>Scene: Add enter-vr event listener
    Scene->>Scene: Add exit-vr event listener

    %% Look Mode Setup (if mobile with gyro)
    alt is Mobile with Gyro
        Scene->>Scene: Initialize LookModeManager
        Scene->>Scene: Create look mode toggle button
    end
```
