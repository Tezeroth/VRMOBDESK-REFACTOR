# State Diagram for Object Interactions

```mermaid
stateDiagram-v2
    [*] --> Idle

    %% Main States
    state Idle {
        [*] --> NoObjectSelected
        NoObjectSelected --> ObjectHovered : Cursor over pickupable
        ObjectHovered --> NoObjectSelected : Cursor moves away
    }

    state Holding {
        [*] --> FollowingCamera
        FollowingCamera --> ChargingThrow : Second click (hold)
        ChargingThrow --> FollowingCamera : Cancel (Space/Button/Right-click/Examine)
    }

    state Inspecting {
        [*] --> RotatingObject
    }

    %% Physics States
    state PhysicsSleepState {
        [*] --> Awake
        Awake --> Sleeping : Inactive for timeout period
        Sleeping --> Awake : Interaction or in view
    }

    %% State Transitions
    Idle --> Holding : Click/Tap on pickupable
    Holding --> Idle : Quick second click/Double tap
    Holding --> Throwing : Release during charge
    Throwing --> Idle : Physics takes over
    Holding --> Inspecting : Space/Examine button
    Inspecting --> Holding : Space/Cancel button

    %% Physics State Transitions
    Idle --> PhysicsSleepState : Physics objects
    Holding --> Awake : Object grabbed
    Throwing --> Awake : Object thrown

    %% Nested States
    state Throwing {
        [*] --> CalculateVelocity
        CalculateVelocity --> ApplyPhysics
        ApplyPhysics --> UpdateActivityTime
        UpdateActivityTime --> [*]
    }

    %% Transition Details
    Idle --> Holding : Click/Tap on pickupable
    note right of Idle
        Desktop: Left mouse click
        Mobile: Tap on object
        VR: Grip button/gesture
    end note

    Holding --> Throwing : Release during charge
    note right of Holding
        Desktop: Release mouse after charging
        Mobile: Release button after charging
        VR: Release grip with momentum
    end note

    Holding --> Inspecting : Space/Examine button
    note left of Inspecting
        Desktop: Space key
        Mobile: Examine button
        VR: Secondary button
    end note

    %% State Descriptions
    note right of Idle
        No object is being held
        Cursor can hover over pickupable objects
    end note

    note right of Holding
        Object follows camera position
        Physics body is kinematic
        Original physics state is stored in StateMachine data
        heldObject reference stored in StateMachine data
        Activity time updated
        Emit grab-start event
    end note

    note right of Inspecting
        Camera controls disabled
        Object can be rotated
        Movement controls disabled
        inspectedObject reference stored in StateMachine data
        Camera orientation stored for restoration
    end note

    note right of Throwing
        Calculate velocity based on charge time
        Convert object to dynamic physics body
        Apply calculated velocity
        Update activity time
        Emit grab-end event
    end note

    note right of PhysicsSleepState
        Managed by PhysicsSleepManager
        Objects beyond distance threshold sleep
        Objects not in view sleep
        Objects with no recent activity sleep
        Objects wake when needed
    end note
```
