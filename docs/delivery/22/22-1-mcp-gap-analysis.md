# PBI-22 Task 22-1: MCP Tool Gap Analysis

## Overview

This document provides a detailed analysis of MCP tool coverage for the reference plugin functionality, identifying confirmed coverage, gaps, and implementation strategies for complete feature parity.

## Current MCP Tool Inventory

Based on the existing tool registry, the following SageModeler MCP tools are available:

### Confirmed Available MCP Tools

#### Node Operations
- **`sage_create_node`**: Create new nodes with properties
- **`sage_update_node`**: Update existing node properties  
- **`sage_delete_node`**: Delete specified nodes
- **`sage_get_all_nodes`**: Retrieve all nodes with properties
- **`sage_get_node_by_id`**: Get specific node by ID (if available)

#### Link Operations  
- **`sage_create_link`**: Create new links between nodes
- **`sage_update_link`**: Update existing link properties
- **`sage_delete_link`**: Delete specified links
- **`sage_get_all_links`**: Retrieve all links with properties
- **`sage_get_link_by_id`**: Get specific link by ID (if available)

#### Model Operations
- **`sage_export_model`**: Export complete model JSON
- **`sage_import_model`**: Import model from JSON (if available)
- **`sage_get_simulation_state`**: Get current simulation state
- **`sage_get_model_info`**: Get basic model information (if available)

#### Experiment Operations
- **`sage_run_experiment`**: Execute experiment with parameters (basic)

## Detailed Gap Analysis by Functional Area

### 1. Node Management Gaps

#### Covered by MCP Tools ✅
- Basic node CRUD operations
- Standard property setting (title, initialValue, x, y, color)
- Node retrieval and listing

#### MCP Tool Gaps ❌

**Node Property Context Queries**:
- `getNodePropertyConstraints(nodeId)` - Property validation rules
- `getNodePropertyDefaults(modelType)` - Default values by model type  
- `validateNodeProperties(properties)` - Property validation
- `getNodeTypeInfo(nodeId)` - Node type and capability information

**Advanced Node Properties**:
- Dynamic property availability based on model type (static vs dynamic)
- Property interdependencies (e.g., accumulator affects other properties)
- Property validation with user-friendly error messages

**Implementation Strategy**: 
- Use existing MCP tools for basic operations
- Implement direct API calls for property context and validation
- Cache validation rules to minimize API calls

### 2. Link Management Gaps

#### Covered by MCP Tools ✅
- Basic link CRUD operations
- Standard property setting (relationVector, relationScalar, label)

#### MCP Tool Gaps ❌

**Link Context Operations**:
- `getLinkContext(sourceId, targetId)` - Available relations for node pair
- `getValidRelationTypes(sourceId, targetId)` - Valid relation vectors/scalars
- `validateLinkConfiguration(linkData)` - Link validation
- `getLinkDirection(sourceId, targetId)` - Direction control information

**Advanced Link Features**:
- Dynamic relation options based on node types
- Context-aware property availability
- Circular dependency detection
- Relation constraint validation

**Implementation Strategy**:
- Use existing MCP tools for basic link operations
- Implement `sage_get_link_context` tool for relation information
- Add direct API calls for complex validation scenarios

### 3. Experiment System Gaps

#### Covered by MCP Tools ✅
- Basic experiment execution

#### MCP Tool Gaps ❌

**Experiment Configuration**:
- `getExperimentCapabilities()` - Available parameter types and modes
- `validateExperimentParameters(experiment)` - Parameter validation
- `estimateExperimentRows(experiment)` - Row count estimation
- `getExperimentModes()` - Static vs dynamic mode detection

**Advanced Experiment Features**:
- Parameter type system (fixed, sweep, step)
- Row estimation with limit warnings
- Delivery mode configuration (batch vs stream)
- Real-time experiment preview

**Implementation Strategy**:
- Enhance existing `sage_run_experiment` with parameter types
- Add new tools: `sage_estimate_experiment`, `sage_validate_experiment_params`
- Implement direct API calls for complex parameter validation

### 4. Recording System Gaps

#### Covered by MCP Tools ✅
- None currently available

#### MCP Tool Gaps ❌

**Recording Management**:
- `startRecording(options)` - Start recording with duration/units
- `stopRecording()` - Stop current recording
- `getRecordingState()` - Current recording status
- `setRecordingOptions(options)` - Configure recording parameters

**Recording State Synchronization**:
- Recording state queries and updates
- Duration and units configuration
- Event synchronization with SageModeler

**Implementation Strategy**:
- Implement comprehensive recording MCP tools
- Add event listeners for recording state changes
- Cache recording state for UI synchronization

### 5. Settings Management Gaps

#### Covered by MCP Tools ✅
- None currently available

#### MCP Tool Gaps ❌

**Model Settings**:
- `getModelComplexity()` - Current complexity setting
- `setModelComplexity(complexity)` - Update complexity (basic/expanded)
- `getModelSettings()` - All model configuration

**UI Settings**:
- `getUISettings()` - Current UI element visibility
- `setUISettings(settings)` - Update UI element visibility
- `resetUISettings()` - Restore default UI settings

**Guide Management**:
- `getGuideItems()` - Current guide configuration
- `setGuideItems(items)` - Update guide items

**Implementation Strategy**:
- Add comprehensive settings MCP tools
- Implement direct API calls for UI element control
- Create settings persistence system

### 6. Inspector System Gaps  

#### Covered by MCP Tools ✅
- Basic node/link retrieval (get all, get by ID)

#### MCP Tool Gaps ❌

**Advanced Querying**:
- `queryNodes(filter)` - Filtered node queries
- `queryLinks(filter)` - Filtered link queries
- `searchNodesById(pattern)` - Pattern-based node search
- `searchLinksById(pattern)` - Pattern-based link search

**Selection Integration**:
- Node/link detail formatting for display
- Efficient list population and updates
- Selection synchronization helpers

**Implementation Strategy**:
- Use existing get_all tools for basic functionality
- Add direct API integration for advanced querying
- Implement efficient UI update patterns

### 7. Selection Synchronization Gaps

#### Covered by MCP Tools ✅
- None currently available

#### MCP Tool Gaps ❌

**Selection Event Handling**:
- Event listeners for SageModeler selection changes
- Form population from selection data
- Tab switching automation
- Selection state management

**Bidirectional Synchronization**:
- Plugin → SageModeler selection updates
- SageModeler → Plugin form population
- Multi-selection handling

**Implementation Strategy**:
- Implement direct event listeners for SageModeler events
- Create selection state management system
- Add form population and tab switching logic

### 8. Import/Export System Gaps

#### Covered by MCP Tools ✅
- Basic model export (`sage_export_model`)

#### MCP Tool Gaps ❌

**SD-JSON Support**:
- `exportModelAsSDJSON()` - Convert to SD-JSON format
- `importModelFromSDJSON(sdJson)` - Import from SD-JSON
- `validateSDJSON(sdJson)` - SD-JSON format validation

**Format Conversion**:
- Bidirectional SD-JSON conversion functions
- Format validation and error handling
- Multi-format import/export support

**Implementation Strategy**:
- Port SD-JSON converter functions from reference plugin
- Add validation and error handling for both formats
- Implement file handling and user feedback

## Priority Gap Filling Strategy

### Immediate Priority (Blocks Core Functionality)
1. **Node Property Context** - Required for proper property validation
2. **Link Context Operations** - Essential for relation system
3. **Selection Synchronization** - Core user experience feature

### High Priority (Enhances User Experience)
1. **Experiment Parameter System** - Advanced experiment functionality
2. **Recording State Management** - Complete recording feature
3. **SD-JSON Conversion** - Format interoperability

### Medium Priority (Nice-to-Have)
1. **Advanced Inspector Queries** - Enhanced debugging capability
2. **Settings Management** - Configuration persistence
3. **UI Element Controls** - Advanced customization

### Low Priority (Future Enhancement)
1. **Advanced Validation** - Enhanced error checking
2. **Performance Optimizations** - Efficiency improvements
3. **Extended Format Support** - Additional file formats

## Recommended Implementation Approach

### Phase 1: Core Gap Filling
- Implement node/link context queries via direct API calls
- Add basic selection synchronization
- Enhance MCP tool error handling and logging

### Phase 2: Advanced Feature Gaps
- Add experiment parameter system tools
- Implement recording management tools
- Port SD-JSON conversion functions

### Phase 3: Polish and Optimization
- Add advanced validation and error handling
- Implement settings management tools
- Optimize performance and user experience

### Phase 4: Future Enhancements
- Add extended format support
- Implement advanced querying capabilities
- Add comprehensive automation features

## Technical Implementation Notes

### Direct API Call Strategy
For functionality gaps that cannot be efficiently covered by MCP tools:

```javascript
// Example: Node property context query
const getNodePropertyContext = async (modelType) => {
  const request = {
    sageApi: true,
    action: 'call',
    resource: 'nodes/propertyContext',
    values: { modelType }
  };
  // Send via existing postMessage system
  return await sendSageAPIRequest(request);
};
```

### MCP Tool Enhancement Strategy
For functionality that should be added as new MCP tools:

```javascript
// Example: Enhanced experiment estimation
const estimateExperimentRows = async (experimentConfig) => {
  return await browserWorker.executeTool('sage_estimate_experiment_rows', {
    experiment: experimentConfig
  });
};
```

### Hybrid Approach
Combine MCP tools with direct API calls for optimal user experience:

```javascript
// Use MCP tool for basic operation, direct API for context
const createNodeWithContext = async (nodeData) => {
  // Get property context via direct API
  const context = await getNodePropertyContext(modelType);
  
  // Validate against context
  const validatedData = validateNodeData(nodeData, context);
  
  // Create via MCP tool
  const result = await browserWorker.executeTool('sage_create_node', validatedData);
  
  return result;
};
```

This gap analysis provides a comprehensive roadmap for implementing complete feature parity with the reference plugin while leveraging existing MCP tools where possible and identifying clear areas for direct API integration. 