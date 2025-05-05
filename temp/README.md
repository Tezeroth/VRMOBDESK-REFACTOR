# Temporary Files - DEPRECATED

⚠️ **WARNING: DEPRECATED FILES** ⚠️

This directory contains older versions of files that have been refactored and moved to the main `js` directory. These files are kept for reference purposes only and **SHOULD NOT BE USED IN PRODUCTION**.

## File Mapping

| Temp File | Current Implementation | Status |
|-----------|------------------------|--------|
| `MOBDESK.js` | `js\components\DesktopMobileControls.js` | DEPRECATED |
| `control-manager.js` | `js\components\ControlManager.js` | DEPRECATED |
| `navigate-on-click.js` | `js\components\NavigateOnClick.js` | DEPRECATED |
| `model-utils.js` | `js\components\SimpleNavmeshConstraint.js` and `js\components\MakeTransparent.js` | DEPRECATED |
| `VR.js` | `js\components\TogglePhysics.js` | DEPRECATED |
| `test.html` | Use `index.html` instead | DEPRECATED |
| `test-original.html` | Use `index.html` instead | DEPRECATED |
| `test-pickup.html` | Use `index.html` instead | DEPRECATED |
| `test-modular.html` | Use `index.html` instead | DEPRECATED |

## Important Notes

- **DO NOT** include these files in your production code. They are kept only for reference during the transition to the modular structure.

- The files in this directory register components with different names than their current implementations.
  - For example, `MOBDESK.js` registers `desktop-and-mobile-controls` while the current implementation uses `desktop-mobile-controls`.

- These files may contain duplicate or conflicting code, especially regarding cursor color management:
  - The current implementation in `js\utils\InteractionUtils.js` properly handles cursor colors based on interaction state.
  - The current implementation preserves the blue cursor color in VR mode.

- If you're experiencing issues with cursor colors or state management, make sure you're not including these temp files in your project.

## Planned Removal

These files will be removed in a future update once the transition to the modular structure is complete and all functionality has been verified in the new implementation.

## Migration Guide

If you need to reference functionality from these files, please look at the corresponding files in the `js` directory instead. The new implementation is more modular, better organized, and includes performance optimizations.
