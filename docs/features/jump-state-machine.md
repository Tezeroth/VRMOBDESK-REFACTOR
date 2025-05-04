# Jump State Machine

This document describes the state machine implementation for the jump functionality in the VRMOBDESK application.

## State Diagram

```
                                  ┌───────────────────┐
                                  │                   │
                                  │  READY_TO_JUMP    │◄────────────────┐
                                  │  canJump = true   │                 │
                                  │  isJumping = false│                 │
                                  │                   │                 │
                                  └─────────┬─────────┘                 │
                                            │                           │
                                            │ Jump Triggered            │
                                            │ (Spacebar/VR Button/      │
                                            │  Mobile Button)           │
                                            ▼                           │
┌─────────────────────┐           ┌───────────────────┐                 │
│                     │           │                   │                 │
│   JUMP_COOLDOWN     │◄──────────┤    JUMPING_UP     │                 │
│   canJump = false   │  Cooldown │  isJumping = true │                 │
│   isJumping = false │  Timer    │  isFalling = false│                 │
│                     │  Expires  │                   │                 │
└─────────────────────┘           └─────────┬─────────┘                 │
                                            │                           │
                                            │ Peak Reached              │
                                            │ (Animation Complete)      │
                                            │                           │
                                            ▼                           │
                                  ┌───────────────────┐                 │
                                  │                   │                 │
                                  │     FALLING       │                 │
                                  │  isJumping = true │                 │
                                  │  isFalling = true │                 │
                                  │                   │                 │
                                  └─────────┬─────────┘                 │
                                            │                           │
                                            │ Ground Detected           │
                                            │ (Raycast Hit)             │
                                            │                           │
                                            ▼                           │
                                  ┌───────────────────┐                 │
                                  │                   │                 │
                                  │     LANDING       │                 │
                                  │  isJumping = false│                 │
                                  │  isFalling = false│─────────────────┘
                                  │  justLanded = true│ Reset Complete
                                  │                   │
                                  └───────────────────┘
```

## State Transitions

### READY_TO_JUMP → JUMPING_UP
- **Trigger**: User presses jump button (spacebar, VR controller button, or mobile jump button)
- **Actions**:
  - Store initial position
  - Disable navmesh constraint
  - Start upward animation
  - Set `isJumping = true`
  - Set up safety timeout

### JUMPING_UP → FALLING
- **Trigger**: Upward animation completes
- **Actions**:
  - Remove upward animation
  - Set `isFalling = true`
  - Initialize physics-based falling
  - Set initial Y velocity to 0

### FALLING → LANDING
- **Trigger**: Ground detected via raycasting
- **Actions**:
  - Set `isJumping = false`
  - Set `isFalling = false`
  - Set `justLanded = true`
  - Check for wall collisions
  - Re-enable navmesh constraint

### LANDING → READY_TO_JUMP
- **Trigger**: Landing sequence complete
- **Actions**:
  - Set `justLanded = false`
  - Reset position if needed
  - Start cooldown timer

### READY_TO_JUMP → JUMP_COOLDOWN
- **Trigger**: Jump completed
- **Actions**:
  - Set `canJump = false`
  - Start cooldown timer

### JUMP_COOLDOWN → READY_TO_JUMP
- **Trigger**: Cooldown timer expires
- **Actions**:
  - Set `canJump = true`

## Safety Transitions

### ANY_STATE → READY_TO_JUMP
- **Trigger**: Safety timeout expires (3 seconds)
- **Actions**:
  - Force reset all jump state
  - Re-enable navmesh constraint
  - Log warning message

### JUMPING_UP/FALLING → LANDING
- **Trigger**: Wall collision detected
- **Actions**:
  - End jump early
  - Start landing animation
  - Apply safety measures to prevent falling through floor

## State Variables

| Variable | Description | States |
|----------|-------------|--------|
| `isJumping` | Whether player is currently in a jump | `true` in JUMPING_UP and FALLING, `false` otherwise |
| `isFalling` | Whether player is in falling phase | `true` in FALLING, `false` otherwise |
| `canJump` | Whether player is allowed to jump | `false` in JUMP_COOLDOWN, `true` otherwise |
| `justLanded` | Flag set briefly after landing | `true` in LANDING, `false` otherwise |
| `jumpStartTime` | Timestamp when jump started | Set in JUMPING_UP, cleared in READY_TO_JUMP |
| `yVelocity` | Current vertical velocity | Used in FALLING state |

## Implementation Details

The state machine is implemented implicitly through boolean flags and function calls rather than as an explicit state machine object. This approach was chosen for simplicity and performance, as the jump state logic is relatively straightforward.

Key implementation functions that handle state transitions:

```javascript
// Start jump (READY_TO_JUMP → JUMPING_UP)
jump: function() { ... }

// Handle animation completion (JUMPING_UP → FALLING)
onAnimationComplete: function(phase) { ... }

// Physics-based falling (in FALLING state)
applyPhysics: function(deltaTime) { ... }

// Ground detection (FALLING → LANDING)
checkForGround: function() { ... }

// Reset jump state (LANDING → READY_TO_JUMP)
resetJump: function() { ... }

// Safety timeout (ANY_STATE → READY_TO_JUMP)
setupSafetyTimeout: function() { ... }
```
