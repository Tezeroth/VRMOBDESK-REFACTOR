# Class Diagram for Main Components

```mermaid
classDiagram
    %% Main Classes/Components
    class DeviceManager {
        -boolean isVR
        -boolean isMobile
        -boolean hasGyro
        +async init()
        +async requestGyroPermission()
    }
    
    class LookModeManager {
        -string currentMode
        -boolean gyroEnabled
        +init()
        +createToggleButton()
        +updateButtonText(button)
        +setMode(mode)
        +showPermissionDenied()
        +initGyro()
        +handleGyro(event)
        +enableGyro()
        +disableGyro()
    }
    
    class ControlManager {
        -Element sceneEl
        -Element cameraRig
        -Element camera
        -Element leftHand
        -Element rightHand
        -Element handyControlsEntity
        -boolean isVRMode
        -boolean isMobile
        +init()
        +setupVRMode()
        +removeVRMode()
        +setupDesktopMobileMode()
        +removeDesktopMobileMode()
        +remove()
    }
    
    class DesktopAndMobileControls {
        -Element camera
        -Element heldObject
        -Element objectBeingInspected
        -boolean inspectionMode
        -string interactionState
        -number prevMouseX
        -number prevMouseY
        -number lastTapTime
        -Element cursor
        -Function _tickFunction
        -Object _originalPhysicsState
        -number chargeStartTime
        -number maxChargeTime
        -number minThrowForce
        -number maxThrowForce
        -number secondClickStartTime
        -number chargeThreshold
        -Vector3 tempCameraWorldPos
        -Vector3 tempDirection
        -Vector3 targetPosition
        -Quaternion prevCameraWorldQuat
        -Quaternion currentCameraWorldQuat
        -Quaternion deltaQuat
        -number cameraPitchOnEnterInspect
        -number rigYawOnEnterInspect
        +init()
        +remove()
        +onClick(evt)
        +onMouseDown(evt)
        +onMouseUp(evt)
        +pickupObject(el)
        +releaseObject(velocity)
        +tick()
        +onKeyPress(evt)
        +onTouchStart(evt)
        +onTouchMove(evt)
        +onTouchEnd(evt)
        +toggleInspectionMode()
        +resetCursorVisual()
        +onMouseMove(evt)
    }
    
    class ArrowControls {
        -Object moveState
        -Object actionButtonDown
        -number pickupButtonStartTime
        +init()
        +getMainControls()
        +createArrowButton(direction, symbol)
        +createActionButton(action, label)
    }
    
    class NavigateOnClick {
        -Map originalColors
        +init()
        +navigate()
        +storeOriginalProperties()
    }
    
    class SimpleNavmeshConstraint {
        -boolean enabled
        -string navmesh
        -number fall
        -number height
        -string exclude
        -string xzOrigin
        -Array objects
        -Array excludes
        -boolean entitiesChanged
        -Vector3 lastPosition
        +init()
        +remove()
        +onSceneUpdated(evt)
        +updateNavmeshEntities()
        +update()
        +tick(time, delta)
    }
    
    class TogglePhysics {
        +events: pickup()
        +events: putdown(e)
    }
    
    %% Utility Components
    class LightMap {
        -string src
        -number intensity
        -string filter
        -boolean basis
        -number channel
        -Texture texture
        -Map materials
        +init()
        +update()
    }
    
    class DepthWrite {
        -boolean default
        +init()
        +update()
    }
    
    class HideParts {
        -string default
        +init()
        +update()
    }
    
    class NoToneMapping {
        -string default
        +init()
        +update()
    }
    
    class MakeTransparent {
        +init()
    }
    
    %% Relationships
    DeviceManager <-- LookModeManager : uses
    DeviceManager <-- ControlManager : uses
    ControlManager --> DesktopAndMobileControls : manages
    ControlManager --> ArrowControls : manages
    DesktopAndMobileControls <-- ArrowControls : references
    
    %% Inheritance/Implementation
    SimpleNavmeshConstraint --|> AFrameComponent : implements
    LightMap --|> AFrameComponent : implements
    DepthWrite --|> AFrameComponent : implements
    HideParts --|> AFrameComponent : implements
    NoToneMapping --|> AFrameComponent : implements
    MakeTransparent --|> AFrameComponent : implements
    NavigateOnClick --|> AFrameComponent : implements
    TogglePhysics --|> AFrameComponent : implements
    ControlManager --|> AFrameComponent : implements
    DesktopAndMobileControls --|> AFrameComponent : implements
    ArrowControls --|> AFrameComponent : implements
```
