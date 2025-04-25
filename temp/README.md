# Temporary Files

This directory contains older versions of files that have been refactored and moved to the main `js` directory. These files are kept for reference purposes only and **should not be used in production**.

## File Mapping

| Temp File | Current Implementation |
|-----------|------------------------|
| `MOBDESK.js` | `js\components\DesktopMobileControls.js` |
| `control-manager.js` | `js\components\ControlManager.js` |
| `navigate-on-click.js` | `js\components\NavigateOnClick.js` |
| `model-utils.js` | `js\components\SimpleNavmeshConstraint.js` |

## Important Notes

- The files in this directory register components with different names than their current implementations.
  - For example, `MOBDESK.js` registers `desktop-and-mobile-controls` while the current implementation uses `desktop-mobile-controls`.
  
- These files may contain duplicate or conflicting code, especially regarding cursor color management:
  - The current implementation in `js\utils\InteractionUtils.js` properly handles cursor colors based on interaction state.
  - The current implementation preserves the blue cursor color in VR mode.

- If you're experiencing issues with cursor colors or state management, make sure you're not including these temp files in your project.
