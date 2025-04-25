# VRMOBDESK Changelog

All notable changes to the VRMOBDESK project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Created this changelog file to track project changes
- Added jump functionality using animation-based approach for reliable jumping
- Added spacebar control for jumping in desktop mode
- Added jump button for mobile devices
- Added momentum preservation during jumps

### Changed
- Modified object examination in desktop mode to use right mouse button (RMB) as the primary method
- Kept spacebar functionality as an alternative method for backward compatibility
- Updated documentation in Interactions.md, ProgramFlow.md, and Functionality.md to reflect these changes

### Fixed
- Prevented browser context menu from appearing when right-clicking for object examination
- Implemented navmesh constraint integration to prevent conflicts during jumps

## [1.0.0] - 2024-04-25

### Added
- Initial release of VRMOBDESK with modular architecture
- Multi-platform support (VR, mobile, desktop)
- Physics-based interactions using PhysX
- Adaptive controls for different devices
- Navigation system with collision detection
- Object manipulation (pickup, examine, throw)
- Performance optimizations for different devices
