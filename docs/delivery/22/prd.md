# PBI-22: Comprehensive SageModeler API Panel Migration

## Overview

This PBI focuses on migrating the complete and comprehensive SageModeler API testing interface from the reference plugin to the current plugin's SageModeler mode. The current SageModeler API panel is a minimal proof-of-concept that lacks the extensive functionality needed for comprehensive API exploration and testing. This migration will provide developers and API explorers with a complete testing ground for all SageModeler API functionality while validating MCP tool coverage.

**Link to Backlog**: [View in Backlog](../backlog.md#user-content-22)

## Problem Statement

The current SageModeler API panel in the plugin is severely limited compared to the comprehensive reference plugin (`design/reference/sage-api-plugin.html`). The reference plugin provides:

- 6 comprehensive tabs (Nodes/Links, Experiment, Recording, Import/Export, Settings, Inspector)
- Extensive node management with 15+ properties and advanced controls
- Complete link management with relation vectors, scalars, and direction control
- Sophisticated experiment builder with parameter types and estimation
- Recording controls with duration/units and state management
- Model and SD-JSON import/export with converter functions
- Settings panel for model complexity and UI controls
- Inspector panel with querying and selection synchronization
- Comprehensive activity logging and real-time feedback

The current plugin's SageModeler panel has only basic node/link creation and limited experiment functionality. This gap prevents effective SageModeler API exploration and limits the ability to validate MCP tool coverage.

## User Stories

### Primary User Stories

1. **As a plugin developer**, I want a comprehensive SageModeler API testing interface that matches the reference plugin feature-for-feature, so that I can validate all SageModeler API functionality within the MCP context.

2. **As an API explorer**, I want a complete testing ground for all SageModeler API functionality, so that I can discover API capabilities, test edge cases, and validate tool coverage.

3. **As a developer**, I want to ensure that MCP tool coverage is validated against the comprehensive reference implementation, so that I can identify gaps and ensure complete functionality.

4. **As a user**, I want all existing MCP functionality to remain intact and undisturbed, so that Claude Desktop integration continues to work perfectly.

### Secondary User Stories

5. **As a QA tester**, I want comprehensive logging and feedback for all API operations, so that I can identify issues and validate functionality.

6. **As a SageModeler user**, I want selection synchronization between the plugin and SageModeler, so that I can seamlessly work with selected nodes and links.

7. **As a developer**, I want documented gaps between MCP tool coverage and reference functionality, so that I can prioritize future tool development.

## Technical Approach

### Migration Strategy

1. **Complete UI Migration**: Port all 6 tabs from the reference plugin to the current SageModeler panel
2. **MCP-First Approach**: Use MCP tools for all functionality where possible
3. **Gap Documentation**: Document areas where MCP tools are insufficient
4. **Direct API Fallback**: Implement direct API calls for gaps with comprehensive logging
5. **Preservation**: Maintain all existing MCP functionality without disruption

### Architecture Components

#### 1. Tab System Architecture
- **Main Tabs**: Nodes/Links, Experiment, Recording, Import/Export, Settings, Inspector
- **Sub-tabs**: Nodes and Links sub-tabs within Nodes/Links tab
- **Accordion System**: Collapsible sections for property groups
- **State Management**: React state for tab switching and content visibility

#### 2. Node Management System
- **Basic Properties**: Title, initial value, position, color
- **Advanced Properties**: Min/max values, accumulator flags, flow variables
- **Dynamic Properties**: Semi-quantitative values, negative value handling
- **Visual Properties**: Custom images, palette items, source app tracking
- **Property Validation**: Type checking and constraint validation

#### 3. Link Management System
- **Relation System**: Vector/scalar combinations with custom data support
- **Direction Control**: Bidirectional link creation and editing
- **Context Awareness**: Dynamic property availability based on node types
- **Validation**: Link constraint checking and circular dependency detection

#### 4. Experiment Builder
- **Parameter Types**: Fixed values, sweep ranges, step sequences
- **Mode Detection**: Static vs dynamic simulation type detection
- **Estimation**: Row count estimation with limit warnings
- **Delivery Modes**: Batch vs stream result delivery
- **Preview System**: Real-time experiment configuration preview

#### 5. Recording System
- **State Management**: Integration with SageModeler recording state
- **Duration Controls**: Flexible duration and unit specifications
- **Event Listening**: Recording state event synchronization
- **Mode Adaptation**: Different controls for static vs dynamic models

#### 6. Import/Export System
- **Model Formats**: Native SageModeler JSON and SD-JSON support
- **Converter Functions**: Bidirectional SD-JSON conversion
- **Validation**: Input validation and error handling
- **Bulk Operations**: Multiple model format support

#### 7. Settings Management
- **Model Complexity**: Basic vs expanded relationship complexity
- **UI Controls**: Show/hide interface elements
- **Guide Management**: Custom guide item configuration
- **Restoration**: Quick restore to default settings

#### 8. Inspector System
- **Query Interface**: Get all nodes/links with filtering
- **Selection Lists**: Interactive node/link selection
- **Detail Views**: Comprehensive property display
- **Synchronization**: Two-way sync with SageModeler selections

### MCP Tool Coverage Analysis

#### Confirmed Available Tools
- Node CRUD operations (create, read, update, delete)
- Link CRUD operations (create, read, update, delete)
- Model export/import operations
- Simulation state queries
- Basic experiment execution

#### Potential Gaps (To Be Validated)
- Node property context queries
- Link relation context queries
- Recording state management
- UI settings management
- Advanced experiment configuration
- Selection event handling

### Implementation Phases

#### Phase 1: Core Tab Structure (Tasks 22-1 to 22-4)
- Complete reference plugin audit and analysis
- Implement 6-tab system with proper state management
- Port basic UI structure and styling
- Establish MCP tool execution framework

#### Phase 2: Node Management (Tasks 22-5 to 22-8)
- Implement comprehensive node property controls
- Add advanced property sections with accordion system
- Integrate node CRUD operations via MCP tools
- Add property validation and change tracking

#### Phase 3: Link Management (Tasks 22-9 to 22-12)
- Implement link property controls with relation system
- Add direction control and context awareness
- Integrate link CRUD operations via MCP tools
- Add link validation and constraint checking

#### Phase 4: Advanced Features (Tasks 22-13 to 22-16)
- Implement experiment builder with parameter types
- Add recording controls with state management
- Implement import/export with converter functions
- Add settings management and UI controls

#### Phase 5: Inspector & Integration (Tasks 22-17 to 22-20)
- Implement inspector system with query interface
- Add selection synchronization with SageModeler
- Integrate comprehensive logging and feedback
- Add gap documentation and validation

#### Phase 6: Testing & Validation (Tasks 22-21 to 22-24)
- Comprehensive testing of all migrated functionality
- MCP tool coverage validation and gap analysis
- Performance testing and optimization
- Final integration testing with existing MCP functionality

## UX/UI Considerations

### Design Consistency
- Match reference plugin styling and behavior exactly
- Maintain existing plugin design language
- Ensure responsive design for different screen sizes
- Preserve accessibility standards

### User Experience
- Intuitive tab navigation and state management
- Clear property grouping with logical accordion sections
- Comprehensive feedback for all operations
- Error handling with user-friendly messages

### Performance Considerations
- Efficient state management to prevent unnecessary re-renders
- Lazy loading for complex property panels
- Optimized event handling for selection synchronization
- Memory management for large experiment configurations

## Acceptance Criteria

### Functional Requirements
1. **Complete Tab System**: All 6 tabs implemented with proper navigation
2. **Node Management**: All node properties and operations available
3. **Link Management**: Complete link creation, editing, and validation
4. **Experiment Builder**: Full parameter configuration and execution
5. **Recording Controls**: Duration, units, and state management
6. **Import/Export**: Model and SD-JSON support with converters
7. **Settings Management**: Model complexity and UI controls
8. **Inspector System**: Query interface and selection synchronization

### Technical Requirements
1. **MCP Integration**: All functionality uses MCP tools where possible
2. **Gap Documentation**: Comprehensive documentation of MCP tool gaps
3. **Functionality Preservation**: Existing MCP functionality remains intact
4. **Performance**: No degradation in existing plugin performance
5. **Error Handling**: Comprehensive error handling and user feedback

### Quality Requirements
1. **Feature Parity**: 100% feature parity with reference plugin
2. **UI Consistency**: Pixel-perfect match to reference plugin design
3. **Test Coverage**: Comprehensive test coverage for all new functionality
4. **Documentation**: Complete API gap analysis and usage documentation

## Dependencies

### Internal Dependencies
- Current MCP tool registry and execution system
- Existing SageModeler API panel structure
- Browser worker service and tool execution
- Session management and capability filtering

### External Dependencies
- SageModeler API for direct calls where MCP tools are insufficient
- SD-JSON converter functions for import/export
- Reference plugin codebase for UI and functionality reference

## Open Questions

1. **MCP Tool Gaps**: Which specific functionality gaps exist between MCP tools and reference plugin capabilities?
2. **Selection Events**: How should selection synchronization be implemented for optimal UX?
3. **Experiment Complexity**: What are the performance implications of complex experiment configurations?
4. **Direct API Integration**: What is the best approach for direct API calls when MCP tools are insufficient?
5. **Testing Strategy**: How should comprehensive testing be approached for this complex migration?

## Related Tasks

This PBI will be broken down into approximately 24 tasks covering:
- Reference plugin audit and analysis
- Tab system implementation
- Node management migration
- Link management migration
- Experiment builder implementation
- Recording system integration
- Import/export functionality
- Settings management
- Inspector system implementation
- Selection synchronization
- MCP tool gap analysis
- Comprehensive testing
- Documentation and validation

The task breakdown will ensure systematic migration while preserving all existing functionality and maintaining the highest quality standards. 