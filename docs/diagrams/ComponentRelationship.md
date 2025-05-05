# Component Relationship Diagram

```mermaid
graph TD
    %% Main Components
    Scene[A-Frame Scene]
    DeviceManager[DeviceManager]
    ControlManager[control-manager]
    DesktopMobileControls[desktop-mobile-controls]
    LookModeManager[LookModeManager]
    ArrowControls[arrow-controls]
    PhysX[PhysX System]
    NavMesh[NavMesh System]

    %% Registration System
    ComponentRegistry[ComponentRegistry]
    ComponentMap[Component Map]

    %% Physics Optimization Components
    PhysicsSleepManager[physics-sleep-manager]
    PhysicsOptimizer[physics-optimizer]
    PhysicsUtils[PhysicsUtils]

    %% Model Utility Components
    LightMap[lightmap]
    DepthWrite[depthwrite]
    HideParts[hideparts]
    NoToneMapping[no-tonemapping]
    MakeTransparent[make-transparent]
    NavMeshConstraint[simple-navmesh-constraint]

    %% Interaction Components
    NavigateOnClick[navigate-on-click]
    TogglePhysics[toggle-physics]

    %% Jump System Components
    JumpControl[jump-control]
    JumpCollider[jump-collider]
    PlayerCollider[player-collider]

    %% Multiplayer Components
    PhysicsSyncManager[physics-sync-manager]
    MultiplayerManager[MultiplayerManager]

    %% Debug Components
    MagnetRangeDebug[magnet-range-debug]

    %% UI Components
    LoadingScreenManager[loading-screen-manager]

    %% Utility Components
    StateMachine[StateMachine]
    InteractionUtils[InteractionUtils]
    PerformanceOptimizer[PerformanceOptimizer]

    %% Component Registration Relationships
    ComponentMap --> ComponentRegistry
    ComponentRegistry --> Scene

    %% Component Map Relationships
    ComponentMap --> ControlManager
    ComponentMap --> DesktopMobileControls
    ComponentMap --> ArrowControls
    ComponentMap --> NavigateOnClick
    ComponentMap --> TogglePhysics
    ComponentMap --> PhysicsSleepManager
    ComponentMap --> PhysicsOptimizer
    ComponentMap --> PhysicsSyncManager
    ComponentMap --> LoadingScreenManager
    ComponentMap --> MakeTransparent
    ComponentMap --> NavMeshConstraint
    ComponentMap --> JumpControl
    ComponentMap --> JumpCollider
    ComponentMap --> PlayerCollider
    ComponentMap --> MagnetRangeDebug

    %% Relationships
    Scene --> ControlManager
    Scene --> PhysX
    Scene --> NavMesh
    Scene --> PhysicsSleepManager
    Scene --> PhysicsOptimizer
    Scene --> LoadingScreenManager

    ControlManager --> DeviceManager
    ControlManager --> DesktopMobileControls
    ControlManager --> ArrowControls

    DesktopMobileControls --> LookModeManager
    DesktopMobileControls --> PhysicsUtils
    DesktopMobileControls --> InteractionUtils
    DesktopMobileControls --> StateMachine

    %% Physics Relationships
    PhysicsSleepManager --> PhysX
    PhysicsOptimizer --> PhysX
    PhysicsUtils --> PhysX
    TogglePhysics --> PhysicsSleepManager

    %% Model Utility Relationships
    Scene --> LightMap
    Scene --> DepthWrite
    Scene --> HideParts
    Scene --> NoToneMapping
    Scene --> MakeTransparent
    Scene --> NavMeshConstraint

    %% Interaction Relationships
    Scene --> NavigateOnClick
    Scene --> TogglePhysics

    %% Component Dependencies
    DesktopMobileControls --> PhysX
    NavMeshConstraint --> NavMesh
    ArrowControls <--> DesktopMobileControls
    LookModeManager --> DeviceManager
    PhysicsOptimizer --> DeviceManager
    PerformanceOptimizer --> DeviceManager

    %% Jump System Relationships
    Scene --> JumpControl
    Scene --> JumpCollider
    Scene --> PlayerCollider
    JumpControl --> JumpCollider
    JumpControl --> PlayerCollider
    JumpControl --> DeviceManager
    ArrowControls --> JumpControl

    %% Multiplayer Relationships
    Scene --> PhysicsSyncManager
    Scene --> MultiplayerManager
    PhysicsSyncManager --> MultiplayerManager
    PhysicsSyncManager --> PhysX

    %% Debug Relationships
    Scene --> MagnetRangeDebug

    %% Conditional Relationships
    DeviceManager -- "if mobile" --> ArrowControls
    DeviceManager -- "if VR" --> TogglePhysics
    DeviceManager -- "if not VR" --> DesktopMobileControls

    %% Style
    classDef core fill:#f9f,stroke:#333,stroke-width:2px
    classDef physics fill:#fbb,stroke:#333,stroke-width:1px
    classDef utility fill:#bbf,stroke:#333,stroke-width:1px
    classDef interaction fill:#bfb,stroke:#333,stroke-width:1px
    classDef ui fill:#bff,stroke:#333,stroke-width:1px
    classDef registration fill:#ffb,stroke:#333,stroke-width:1px

    class Scene,DeviceManager,ControlManager,DesktopMobileControls,LookModeManager,ArrowControls,PhysX,NavMesh core
    class PhysicsSleepManager,PhysicsOptimizer,PhysicsUtils physics
    class LightMap,DepthWrite,HideParts,NoToneMapping,MakeTransparent,NavMeshConstraint,StateMachine,InteractionUtils,PerformanceOptimizer utility
    class NavigateOnClick,TogglePhysics interaction
    class LoadingScreenManager ui
    class ComponentRegistry,ComponentMap registration
    classDef utility fill:#bbf,stroke:#333,stroke-width:1px
    classDef interaction fill:#bfb,stroke:#333,stroke-width:1px
    classDef ui fill:#bff,stroke:#333,stroke-width:1px
    classDef jump fill:#fbf,stroke:#333,stroke-width:1px
    classDef multiplayer fill:#ff9,stroke:#333,stroke-width:1px
    classDef debug fill:#999,stroke:#333,stroke-width:1px

    class Scene,DeviceManager,ControlManager,DesktopMobileControls,LookModeManager,ArrowControls,PhysX,NavMesh core
    class PhysicsSleepManager,PhysicsOptimizer,PhysicsUtils,PhysicsSyncManager physics
    class LightMap,DepthWrite,HideParts,NoToneMapping,MakeTransparent,NavMeshConstraint,StateMachine,InteractionUtils utility
    class NavigateOnClick,TogglePhysics interaction
    class LoadingScreenManager ui
    class JumpControl,JumpCollider,PlayerCollider jump
    class MultiplayerManager multiplayer
    class MagnetRangeDebug debug
```
