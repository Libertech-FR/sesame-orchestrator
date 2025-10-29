# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## About Sesame Orchestrator

Sesame Orchestrator is an open-source application designed to facilitate identity synchronization between different data sources, including databases, LDAP/Active Directory directories, and third-party applications, to OpenLDAP or Active Directory servers.

**🔗 Links:**
- [Documentation](https://libertech-fr.github.io/sesame-doc/)
- [Architecture](https://www.figma.com/file/OplQ0tHFHS5rFz5K6OCgEd/Sesame?type=whiteboard&node-id=0%3A1&t=ZiPEDwJPp0id8frN-1)
- [GitHub Repository](https://github.com/Libertech-FR/sesame-orchestrator)
- [Releases](https://github.com/Libertech-FR/sesame-orchestrator/releases)

## 📚 Table of Contents

- [Unreleased (v2.0.0)](#unreleased---v200)
- [Recent Releases](#recent-releases)
  - [v1.6.x Series](#v16x-series) - Extensions & Lifecycle Improvements
  - [v1.5.x Series](#v15x-series) - Lifecycle Management
  - [v1.4.x Series](#v14x-series) - Lifecycle Enhancements  
  - [v1.3.x Series](#v13x-series) - Architecture Improvements
  - [v1.2.x Series](#v12x-series) - Feature Updates
  - [v1.1.x Series](#v11x-series) - Identity Fusion
  - [v1.0.0](#100---2024-09-06) - First Stable Release
  - [v0.2.x Series](#v02x-series) - Beta Releases

## [Unreleased] - v2.0.0

> **⚠️ Breaking Changes Expected**: Version 2.0.0 will introduce significant architectural changes and may include breaking changes.

### Added
- Simulation target to Makefile for production environment setup
- `.yarnclean` file to exclude documentation files from yarn cleaning
- Production script support in package.json and turbo.json
- Validation decorators to ConfigRulesObjectIdentitiesDTO

### Changed
- Remove obsolete files and update entrypoint script for improved installation checks
- Refactor code structure for improved readability and maintainability
- Improve architecture handling in Dockerfile
- Update .gitignore to add environment files entries
- Improve InitInfoPart schema documentation with explanatory comments

### Fixed
- Remove husky dependency and clean up package.json scripts
- Remove Dockerfile conflicts and improve production support

### Migration Notes
- Detailed migration guide will be provided with the 2.0.0 release
- Review breaking changes documentation before upgrading

---

## Recent Releases

### v1.6.x Series
*Extensions & Lifecycle Improvements*

## [1.6.2] - 2025-10-07

### Added
- Icon and color properties to lifecycle states
- Logging for cron job execution in LifecycleService
- Custom states and rules configuration for lifecycle management

### Changed
- Enhanced lifecycle state management with updateLifecycle method
- Refactored getAllAvailableStates and getCustomStates methods
- Improved API operation decorators for lifecycle states endpoints
- Updated lifecycle enums, DTOs, and schemas
- Streamlined state retrieval and updated return types

### Fixed
- IdentityLifecycleState interface separation and color property inclusion
- Lifecycle management configuration and service improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.6.1...1.6.2

## [1.6.1] - 2025-10-01

### Fixed
- Bug fixes and improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.6.0...1.6.1

## [1.6.0] - 2025-10-01

### Added
- Extensions system with full support for modular functionality
- Extension management and configuration capabilities
- Extensible architecture for third-party integrations

**Pull Request**: https://github.com/Libertech-FR/sesame-orchestrator/pull/60
**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.5.2...1.6.0

### v1.5.x Series
*Lifecycle Management*

## [1.5.2] - 2025-09-16

### Fixed
- Bug fixes and improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.5.1...1.5.2

## [1.5.1] - 2025-09-01

### Fixed
- Bug fixes and improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.5.0...1.5.1

## [1.5.0] - 2025-08-08

### Added
- Comprehensive lifecycle management system
- Identity lifecycle states and transitions
- Automated lifecycle rules and processing
- Lifecycle configuration and customization options
- State-based identity management workflows

**Pull Request**: https://github.com/Libertech-FR/sesame-orchestrator/pull/58
**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.3.13...1.5.0

### v1.4.x Series
*Lifecycle Enhancements*

## [1.4.0] - 2025-07-25

### Added
- Lifecycle field to additional fields in IdentitiesCrudController
- LifecycleRefId constant for better lifecycle tracking
- Lifecycle history retrieval with total count support
- Enhanced before state tracking for create, update, and delete operations

### Changed
- Refactored lifecycle migration logic for improved clarity and consistency
- Improved lifecycle configuration and module structure organization
- Enhanced event emitter event names in AbstractServiceSchema
- Removed IdentityLifecycle enum dependency from LifecycleSource interface

### Fixed
- Added ignoreLifecycle property to Identities schema
- Removed unnecessary console logs and improved event emission
- Updated migration scripts for better lifecycle handling

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.3.12...1.4.0

### v1.3.x Series
*Architecture Improvements*

## [1.3.13] - 2025-07-22

### Fixed
- Bug fixes and improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.3.12...1.3.13

## [1.3.12] - 2025-06-24

### Fixed
- Bug fixes and improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.3.11...1.3.12

## [1.3.11] - 2025-06-22

### Fixed
- Bug fixes and improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.3.10...1.3.11

## [1.3.10] - 2025-05-26

### Fixed
- Bug fixes and improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.3.9...1.3.10

## [1.3.0] - 2025-04-02

### Added
- Major version update introducing significant architectural improvements
- Enhanced identity synchronization capabilities
- Improved multi-source data integration
- Advanced LDAP/Active Directory integration features
- New configuration management system

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.2.65...1.3.0

### v1.2.x Series
*Feature Updates*

## [1.2.65] - 2025-03-26

### Fixed
- Final bug fixes and improvements for 1.2.x series

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.2.64...1.2.65

## [1.2.60] - 2025-03-04

### Fixed
- Bug fixes and stability improvements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.2.59...1.2.60

## [1.2.50] - 2025-01-28

### Fixed
- Bug fixes and maintenance updates

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.2.49...1.2.50

## [1.2.0] - 2024-10-17

### Added
- Major feature updates and improvements
- Enhanced identity management capabilities
- Performance optimizations

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.1.9...1.2.0

### v1.1.x Series
*Identity Fusion*

## [1.1.0] - 2024-10-09

### Added
- Identity fusion functionality
- Advanced identity merging capabilities
- Enhanced identity relationship management

**Pull Request**: https://github.com/Libertech-FR/sesame-orchestrator/pull/36
**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v1.0.0...1.1.0

### v1.0.x Series
*First Stable Release*

## [1.0.0] - 2024-09-06

### Added
- **First stable release** of Sesame Orchestrator
- Complete identity synchronization system
- Multi-source data integration capabilities
- LDAP/Active Directory synchronization
- REST API for identity management
- Web interface for administration
- Configuration management system
- Comprehensive logging and monitoring

### Changed
- Finalized API structure and endpoints
- Stabilized configuration format
- Production-ready architecture

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v0.2.20...1.0.0

### v0.2.x Series
*Beta Releases*

## [0.2.20] - 2024-09-03

### Fixed
- Final beta improvements and bug fixes
- Pre-release stability enhancements

**Full Changelog**: https://github.com/Libertech-FR/sesame-orchestrator/compare/v0.2.19...0.2.20

---

## 🤝 Contributors

This project is maintained by [Libertech-FR](https://libertech.fr) and the open-source community.

## 📝 How to Contribute

1. Check the [issues](https://github.com/Libertech-FR/sesame-orchestrator/issues) for areas needing help
2. Read our [contributing guidelines](https://github.com/Libertech-FR/sesame-orchestrator/blob/main/CONTRIBUTING.md)
3. Follow our [code of conduct](https://github.com/Libertech-FR/sesame-orchestrator/blob/main/CODE_OF_CONDUCT.md)
4. Submit pull requests with detailed descriptions

## 📄 License

This project is licensed under the terms specified in the [LICENSE](https://github.com/Libertech-FR/sesame-orchestrator/blob/main/LICENSE) file.

---

*This changelog is automatically generated based on GitHub releases and commit history. For the most up-to-date information, visit our [GitHub releases page](https://github.com/Libertech-FR/sesame-orchestrator/releases).*
