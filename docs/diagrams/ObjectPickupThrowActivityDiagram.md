# Object Pickup and Throw Activity Diagram

```mermaid
flowchart TD
    %% Starting point
    Start([User Interaction]) --> CheckState{Current State?}

    %% Idle state branch
    CheckState -->|Idle| RaycastCheck{Raycast Hit\nPickupable?}
    RaycastCheck -->|No| ReturnToIdle[Return to Idle]
    RaycastCheck -->|Yes| StorePhysicsState[Store Original\nPhysics State]

    StorePhysicsState --> RemovePhysicsBody[Remove Existing\nPhysics Body]
    RemovePhysicsBody --> CreateKinematicBody[Create Kinematic\nPhysics Body]
    CreateKinematicBody --> SetHeldObject[Set heldObject\nReference]
    SetHeldObject --> UpdateActivityTime1[Update Activity\nTimestamp]
    UpdateActivityTime1 --> EmitGrabStart[Emit grab-start\nEvent]
    EmitGrabStart --> SetHoldingState[Set State to\n'holding']
    SetHoldingState --> SetupTickFunction[Setup Tick\nFunction]
    SetupTickFunction --> HoldingState([Holding State])

    %% Holding state branch
    CheckState -->|Holding| UserAction{User Action?}

    UserAction -->|Second Click\n(Quick)| DropObject[Drop Object]
    UserAction -->|Second Click\n(Hold)| StartCharging[Start Charging\nThrow]
    UserAction -->|Space Key/\nExamine Button| EnterInspection[Enter Inspection\nMode]

    %% Drop object flow
    DropObject --> UpdateActivityTime2[Update Activity\nTimestamp]
    UpdateActivityTime2 --> EmitGrabEnd1[Emit grab-end\nEvent]
    EmitGrabEnd1 --> RestorePhysicsState[Restore Original\nPhysics State]
    RestorePhysicsState --> ClearHeldObject[Clear heldObject\nReference]
    ClearHeldObject --> SetIdleState[Set State to\n'idle']
    SetIdleState --> ReturnToIdle

    %% Charging flow
    StartCharging --> SetChargingState[Set State to\n'charging']
    SetChargingState --> UpdateVisualFeedback[Update Visual\nFeedback]
    UpdateVisualFeedback --> UserReleased{User Released?}

    UserReleased -->|No| ContinueCharging{Continue\nCharging?}
    ContinueCharging -->|Yes| UpdateVisualFeedback
    ContinueCharging -->|No, Cancelled| CancelCharge[Cancel Charge]

    %% Examine button/right-click during charging
    UserAction -->|Examine Button/\nRight-click during\nCharging| CancelCharge

    CancelCharge --> SetHoldingState

    UserReleased -->|Yes| CalculateThrowForce[Calculate Throw\nForce]
    CalculateThrowForce --> CalculateDirection[Calculate Throw\nDirection]
    CalculateDirection --> CreateThrowVelocity[Create Throw\nVelocity]
    CreateThrowVelocity --> UpdateActivityTime3[Update Activity\nTimestamp]
    UpdateActivityTime3 --> EmitGrabEnd2[Emit grab-end\nEvent]
    EmitGrabEnd2 --> RestorePhysicsState2[Restore Original\nPhysics State]
    RestorePhysicsState2 --> ApplyVelocity[Apply Velocity\nto Object]
    ApplyVelocity --> WakeUpObject[Wake Up Object\nfor Physics]
    WakeUpObject --> ClearHeldObject2[Clear heldObject\nReference]
    ClearHeldObject2 --> SetIdleState2[Set State to\n'idle']
    SetIdleState2 --> ReturnToIdle

    %% Inspection flow
    EnterInspection --> StoreCamera[Store Camera\nOrientation]
    StoreCamera --> DisableControls[Disable Camera\n& Movement Controls]
    DisableControls --> SetInspectingState[Set State to\n'inspecting']
    SetInspectingState --> InspectingState([Inspecting State])

    %% Inspecting state branch
    CheckState -->|Inspecting| InspectAction{User Action?}

    InspectAction -->|Rotate Object| RotateObject[Rotate Object\nBased on Input]
    RotateObject --> InspectingState

    InspectAction -->|Exit Inspection| RestoreControls[Restore Camera\n& Movement Controls]
    RestoreControls --> RestoreCameraOrientation[Restore Camera\nOrientation]
    RestoreCameraOrientation --> SetHoldingState2[Set State to\n'holding']
    SetHoldingState2 --> HoldingState

    %% Physics Sleep Management
    subgraph PhysicsSleepManager[Physics Sleep Management]
        SleepCheck{Is Object\nActive?}
        SleepCheck -->|Yes| WakeObject[Wake Up\nObject]
        SleepCheck -->|No| AllowSleep[Allow Object\nto Sleep]

        DistanceCheck{Within Distance\nThreshold?}
        VisibilityCheck{In Camera\nView?}
        MovementCheck{Is Moving?}
        ActivityCheck{Recent\nActivity?}

        DistanceCheck -->|No| AllowSleep
        DistanceCheck -->|Yes| VisibilityCheck
        VisibilityCheck -->|No| MovementCheck
        VisibilityCheck -->|Yes| WakeObject
        MovementCheck -->|No| ActivityCheck
        MovementCheck -->|Yes| WakeObject
        ActivityCheck -->|No| AllowSleep
        ActivityCheck -->|Yes| WakeObject
    end

    %% Connect to Sleep Management
    EmitGrabStart --> WakeObject
    EmitGrabEnd1 --> SleepCheck
    EmitGrabEnd2 --> WakeObject

    %% Styling
    classDef state fill:#f9f,stroke:#333,stroke-width:2px
    classDef decision fill:#bbf,stroke:#333,stroke-width:1px
    classDef action fill:#bfb,stroke:#333,stroke-width:1px
    classDef start fill:#fbb,stroke:#333,stroke-width:2px
    classDef sleep fill:#dfd,stroke:#333,stroke-width:1px

    class Start,HoldingState,InspectingState,ReturnToIdle start
    class CheckState,RaycastCheck,UserAction,UserReleased,ContinueCharging,InspectAction decision
    class StorePhysicsState,RemovePhysicsBody,CreateKinematicBody,SetHeldObject,SetHoldingState,SetupTickFunction,DropObject,RestorePhysicsState,ClearHeldObject,SetIdleState,StartCharging,SetChargingState,UpdateVisualFeedback,CancelCharge,CalculateThrowForce,CalculateDirection,CreateThrowVelocity,RestorePhysicsState2,ApplyVelocity,ClearHeldObject2,SetIdleState2,EnterInspection,StoreCamera,DisableControls,SetInspectingState,RotateObject,RestoreControls,RestoreCameraOrientation,SetHoldingState2,UpdateActivityTime1,UpdateActivityTime2,UpdateActivityTime3,EmitGrabStart,EmitGrabEnd1,EmitGrabEnd2,WakeUpObject action
    class PhysicsSleepManager,SleepCheck,WakeObject,AllowSleep,DistanceCheck,VisibilityCheck,MovementCheck,ActivityCheck sleep
```
