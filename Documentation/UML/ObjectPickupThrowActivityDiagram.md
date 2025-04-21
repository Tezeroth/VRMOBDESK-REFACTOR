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
    SetHeldObject --> SetHoldingState[Set State to\n'holding']
    SetHoldingState --> SetupTickFunction[Setup Tick\nFunction]
    SetupTickFunction --> HoldingState([Holding State])
    
    %% Holding state branch
    CheckState -->|Holding| UserAction{User Action?}
    
    UserAction -->|Second Click\n(Quick)| DropObject[Drop Object]
    UserAction -->|Second Click\n(Hold)| StartCharging[Start Charging\nThrow]
    UserAction -->|Space Key/\nExamine Button| EnterInspection[Enter Inspection\nMode]
    
    %% Drop object flow
    DropObject --> RestorePhysicsState[Restore Original\nPhysics State]
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
    
    CancelCharge --> SetHoldingState
    
    UserReleased -->|Yes| CalculateThrowForce[Calculate Throw\nForce]
    CalculateThrowForce --> CalculateDirection[Calculate Throw\nDirection]
    CalculateDirection --> CreateThrowVelocity[Create Throw\nVelocity]
    CreateThrowVelocity --> RestorePhysicsState2[Restore Original\nPhysics State]
    RestorePhysicsState2 --> ApplyVelocity[Apply Velocity\nto Object]
    ApplyVelocity --> ClearHeldObject2[Clear heldObject\nReference]
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
    
    %% Styling
    classDef state fill:#f9f,stroke:#333,stroke-width:2px
    classDef decision fill:#bbf,stroke:#333,stroke-width:1px
    classDef action fill:#bfb,stroke:#333,stroke-width:1px
    classDef start fill:#fbb,stroke:#333,stroke-width:2px
    
    class Start,HoldingState,InspectingState,ReturnToIdle start
    class CheckState,RaycastCheck,UserAction,UserReleased,ContinueCharging,InspectAction decision
    class StorePhysicsState,RemovePhysicsBody,CreateKinematicBody,SetHeldObject,SetHoldingState,SetupTickFunction,DropObject,RestorePhysicsState,ClearHeldObject,SetIdleState,StartCharging,SetChargingState,UpdateVisualFeedback,CancelCharge,CalculateThrowForce,CalculateDirection,CreateThrowVelocity,RestorePhysicsState2,ApplyVelocity,ClearHeldObject2,SetIdleState2,EnterInspection,StoreCamera,DisableControls,SetInspectingState,RotateObject,RestoreControls,RestoreCameraOrientation,SetHoldingState2 action
```
