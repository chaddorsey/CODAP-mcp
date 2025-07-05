# PBI-22 Task 22-1: Reference Plugin Audit Results

## Executive Summary

This document provides a comprehensive audit of the reference SageModeler API plugin (`design/reference/sage-api-plugin.html`). The plugin is a sophisticated testing interface with 2,241 lines of HTML, CSS, and JavaScript providing complete SageModeler API coverage across 6 main functional areas.

## Overall Architecture Analysis

### Core Structure
- **Type**: Single-page HTML application with embedded CSS and JavaScript
- **Size**: 2,241 lines total
- **Architecture**: Modular JavaScript with event-driven design
- **API Communication**: Direct postMessage communication with SageModeler via `window.parent`
- **State Management**: JavaScript variables with reactive UI updates

### Main Components
1. **Tab System**: 6 main tabs with sub-tab support
2. **Status Management**: Real-time status updates and user feedback
3. **Activity Logging**: Comprehensive operation logging with timestamps
4. **Accordion System**: Collapsible property sections
5. **Event System**: Extensive event handlers for user interactions and SageModeler events

## Tab System Detailed Analysis

### 1. Nodes/Links Tab (Primary Tab)
**Sub-tabs**: Nodes, Links

#### Nodes Sub-tab
**Purpose**: Comprehensive node management and property editing

**UI Elements**:
- Create Random Node button
- Create New Node button  
- Update Node button (enabled when node selected + changes made)
- Delete Node button (enabled when node selected)

**Node Properties Section** (Accordion):
- **Basic Properties**:
  - Title (text input, default: "Test Node")
  - Initial Value (number input)
  - Min/Max (number inputs)
  - Is Accumulator (checkbox)
  - Is Flow Variable (checkbox)
  - Allow Negative Values (checkbox, default: true)
  - Value Defined Semi-Quantitatively (checkbox)
  - X/Y Position (number inputs)
  - Color (select: Yellow, Dark Blue, Medium Blue)

- **Advanced Properties** (Collapsed by default):
  - Combine Method (text input)
  - Image URL (text input)
  - Uses Default Image (checkbox)
  - Palette Item (text input)
  - Source App (text input)

**Functionality**:
- Property change tracking enables/disables Update button
- Node selection populates form with existing values
- Property validation for model type compatibility
- Button state management based on selection and changes

#### Links Sub-tab
**Purpose**: Comprehensive link management with relation system

**UI Elements**:
- Create Link button (enabled when 2 nodes selected)
- Update Link button (enabled when link selected + changes made)
- Delete Link button (enabled when link selected)

**Link Properties Section**:
- **Direction Control**:
  - Source/Target node display with swap control
  - Direction dropdown (→ forward, ← backward)

- **Relation System**:
  - Relation Vector (Increase, Decrease, Vary)
  - Relation Scalar (About the Same, A Little, A Lot, More and More, Less and Less)
  - Custom Data JSON input (for Vary relations)
  - Label (optional text)

- **Advanced Properties** (Collapsed):
  - Color (text input)
  - Source App (text input)

**Functionality**:
- Dynamic UI based on relation vector selection
- Context-aware property availability
- Direction control with source/target swapping
- Relation validation and constraint checking

### 2. Experiment Tab
**Purpose**: Sophisticated experiment configuration and execution

**UI Elements**:
- Reload Nodes button
- Mode controls (Static/Dynamic radio selection)
- Delivery Mode (Batch/Stream selection)
- Parameter configuration per node
- Run Experiment button
- Request preview display
- Results container

**Parameter System**:
- **Fixed**: Single value specification
- **Sweep**: Min/max range with automatic step calculation
- **Step**: Min/max with custom step count and boundary inclusion
- **Dynamic Mode**: Initial value specification only

**Advanced Features**:
- Row estimation with 50,000 limit warnings
- Real-time request preview
- Mode-specific control visibility
- Parameter validation and UI updates

### 3. Recording Tab
**Purpose**: Recording control and state management

**UI Elements**:
- Record/Record Continuously button
- Stop Recording button
- Duration input (number)
- Units input (text)
- Set Recording Options button

**State Management**:
- Mode-specific control visibility (Static vs Dynamic)
- Recording state synchronization with SageModeler
- Event-driven state updates from observed events

### 4. Import/Export Tab
**Purpose**: Model data interchange and format conversion

**UI Elements**:
- Model JSON textarea (large, resizable)
- Load Model button
- Export Model button
- Import SD-JSON button
- Export SD-JSON button

**Format Support**:
- **Native SageModeler JSON**: Complete model with nodes, links, settings
- **SD-JSON Format**: Simplified variables and influences format
- **Converter Functions**: Bidirectional conversion with validation

### 5. Settings Tab
**Purpose**: Model and UI configuration management

**UI Elements**:
- **Model Complexity**: Basic/Expanded radio buttons
- **UI Element Controls**: Checkboxes for visibility
  - Relationship Symbols
  - Guide
  - Lockdown Mode
  - Touch Device
  - Global Nav
  - Action Bar
  - Inspector Panel
  - Node Palette
  - Fullscreen Button
  - Scaling
- **Guide Items**: JSON array textarea
- Update buttons for each section

### 6. Inspector Tab
**Purpose**: Node/link querying and selection management

**UI Elements**:
- **Query Interface**:
  - GET All Nodes button
  - GET All Links button
  - Node ID input + GET Node by ID button
  - Link ID input + GET Link by ID button
- **Selection Lists**:
  - Nodes list (4-row select)
  - Links list (4-row select)
- **Results Display**: Formatted JSON pre-block

**Functionality**:
- Real-time list population from API responses
- Selection synchronization with form population
- Formatted result display for debugging

## Cross-Cutting Systems

### Activity Logging System
**Purpose**: Comprehensive operation tracking and debugging

**Features**:
- Timestamped operation logs
- Success/error status indication
- Parameter logging for API calls
- Clear log functionality
- Terminal-style formatting (green text on black background)

**Log Entry Format**:
```
📤 [Description]: [JSON parameters]
✅ Success: [Response message]
❌ Error: [Error message]
📢 Event: [Event type] [JSON data]
```

### Status Management System
**Purpose**: Real-time user feedback and state indication

**Status Display**:
- Prominent status bar with current operation state
- Color-coded status (green for success, red for errors)
- Dynamic status updates for all operations

### Event System and SageModeler Integration
**Purpose**: Bidirectional communication with SageModeler

**Event Handlers**:
- **Selection Events**: `nodesSelected`, `nodesDeselected`, `linksSelected`, `linksDeselected`
- **Recording Events**: `recordingStarted`, `recordingStopped`, `simulationStarted`, `simulationStopped`
- **Model Events**: `simulationSettingsUpdated`

**Selection Synchronization**:
- Auto-populate forms when nodes/links selected in SageModeler
- Auto-switch to appropriate tabs/sub-tabs
- Update inspector lists and button states

### API Communication System
**Purpose**: Structured SageModeler API interaction

**Message Format**:
```javascript
{
  sageApi: true,
  action: "create|update|delete|get|call",
  resource: "nodes|links|model|simulation/...",
  values: { /* parameters */ },
  requestId: "plugin-{counter}"
}
```

**Response Handling**:
- Success/error differentiation
- Data extraction and processing
- UI updates based on responses
- Comprehensive error logging

## Advanced Features and Patterns

### Property State Management
**Dynamic Property Enablement**:
- Model type detection (static vs dynamic)
- Context-aware property availability
- Real-time validation and constraint checking

### Button State Management
**Intelligent UI Controls**:
- Selection-based enabling/disabling
- Change tracking for update operations
- Multi-selection support for link creation

### Data Validation and Conversion
**Robust Data Handling**:
- Type validation for numeric inputs
- JSON parsing with error handling
- Format conversion between model types

### Performance Optimizations
**Efficient Operations**:
- Event delegation for dynamic content
- Minimal DOM manipulation
- Efficient state synchronization

## MCP Tool Coverage Analysis

### Confirmed Coverage (Existing MCP Tools)
✅ **Node Operations**:
- `sage_create_node` - Create new nodes
- `sage_update_node` - Update existing nodes  
- `sage_delete_node` - Delete nodes
- `sage_get_all_nodes` - Retrieve all nodes

✅ **Link Operations**:
- `sage_create_link` - Create new links
- `sage_update_link` - Update existing links
- `sage_delete_link` - Delete links
- `sage_get_all_links` - Retrieve all links

✅ **Model Operations**:
- `sage_export_model` - Export model JSON
- `sage_get_simulation_state` - Get simulation state

### Identified Gaps (Requiring Direct API or New Tools)
❌ **Node Property Context**:
- Dynamic property availability based on model type
- Property validation rules and constraints
- Default value population

❌ **Link Context Operations**:
- Available relation types based on node types
- Link validation and constraint checking
- Direction-aware property controls

❌ **Experiment System**:
- Parameter type configuration
- Row estimation and limit checking
- Mode detection and delivery configuration

❌ **Recording Management**:
- Recording state queries
- Duration/units configuration
- Event state synchronization

❌ **Settings Management**:
- Model complexity configuration
- UI element visibility controls
- Guide item management

❌ **Selection Synchronization**:
- Selection event handling
- Form population from selections
- Tab switching automation

❌ **Import/Export Extensions**:
- SD-JSON conversion functions
- Format validation and error handling
- Multi-format support

## Implementation Complexity Assessment

### High Complexity (Multiple Sprints)
1. **Experiment Builder**: Complex parameter system with estimation
2. **Selection Synchronization**: Event handling and form population
3. **Property Context System**: Dynamic availability and validation

### Medium Complexity (1-2 Sprints)
1. **Link Direction Control**: Bidirectional creation and editing
2. **Recording State Management**: Event synchronization
3. **Import/Export with SD-JSON**: Format conversion

### Low Complexity (Within Sprint)
1. **Basic Property Controls**: Form inputs and validation
2. **Inspector Query Interface**: Simple API calls and display
3. **Settings Management**: Configuration persistence

## Critical Implementation Notes

### State Management
- Use React hooks for component state
- Implement change tracking for button enablement
- Maintain selection state synchronization

### Event Integration
- Listen for SageModeler selection events
- Auto-populate forms based on selections
- Update UI state reactively

### API Integration Strategy
- Use MCP tools where available
- Implement direct API calls for gaps
- Maintain comprehensive logging

### Performance Considerations
- Lazy load complex property panels
- Optimize re-render cycles
- Efficient event handling

## Recommended Migration Approach

### Phase 1: Foundation (Tasks 22-2 to 22-4)
- Implement tab system architecture
- Port base styling and accordion system
- Enhance MCP tool execution framework

### Phase 2: Core Features (Tasks 22-5 to 22-12)
- Node management with all properties
- Link management with relation system
- Basic CRUD operations via MCP tools

### Phase 3: Advanced Features (Tasks 22-13 to 22-20)
- Experiment builder and recording system
- Import/export with format conversion
- Inspector and selection synchronization

### Phase 4: Polish and Integration (Tasks 22-21 to 22-24)
- Gap analysis and direct API integration
- Comprehensive testing and validation
- Performance optimization and documentation

This audit provides the comprehensive foundation needed for successful migration of all reference plugin functionality while identifying clear priorities and implementation strategies. 