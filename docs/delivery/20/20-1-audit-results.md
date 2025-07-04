# SageModeler Plugin Function Audit - Task 20-1 Results

## Overview
This document provides a comprehensive audit of all user-facing functions in the SageModeler plugin (`design/reference/sage-api-plugin.html`) and their corresponding API endpoints (`design/reference/OpenAPI-schema.md`).

## Audit Methodology
- Analyzed all button onclick handlers and JavaScript functions in the plugin
- Cross-referenced with OpenAPI schema for parameter validation
- Grouped functions by functional area for organization
- Defined consistent schema suitable for MCP tool definitions

## Function Categories and Definitions

### 1. Node Management Functions

#### 1.1 Create New Node
- **Function Name**: `createNewNode()`
- **MCP Tool Name**: `sage_create_node`
- **Description**: Create a new node in the SageModeler with specified properties
- **Parameters**:
  - `title` (string, required): Node title/name
  - `initialValue` (number, optional): Initial numeric value
  - `x` (number, optional): X position coordinate
  - `y` (number, optional): Y position coordinate
  - `min` (number, optional): Minimum value
  - `max` (number, optional): Maximum value
  - `isAccumulator` (boolean, optional): Whether node is an accumulator
  - `isFlowVariable` (boolean, optional): Whether node is a flow variable
  - `allowNegativeValues` (boolean, optional): Allow negative values
  - `valueDefinedSemiQuantitatively` (boolean, optional): Semi-quantitative definition
  - `color` (string, optional): Node color (hex code)
  - `combineMethod` (string, optional): Combine method for inputs
  - `image` (string, optional): Image URL
  - `usesDefaultImage` (boolean, optional): Use default image
  - `paletteItem` (string, optional): Palette item reference
  - `sourceApp` (string, optional): Source application identifier
- **API Mapping**: `action: "create", resource: "nodes"`

#### 1.2 Create Random Node
- **Function Name**: `createRandomNode()`
- **MCP Tool Name**: `sage_create_random_node`
- **Description**: Create a node with random properties for testing
- **Parameters**: None (all properties generated randomly)
- **API Mapping**: `action: "create", resource: "nodes"`

#### 1.3 Update Selected Node
- **Function Name**: `updateSelectedNode()`
- **MCP Tool Name**: `sage_update_node`
- **Description**: Update properties of an existing node
- **Parameters**:
  - `nodeId` (string, required): ID of node to update
  - All optional parameters from create node (title, initialValue, etc.)
- **API Mapping**: `action: "update", resource: "nodes/{nodeId}"`

#### 1.4 Delete Selected Node
- **Function Name**: `deleteSelectedNode()`
- **MCP Tool Name**: `sage_delete_node`
- **Description**: Delete a node from the model
- **Parameters**:
  - `nodeId` (string, required): ID of node to delete
- **API Mapping**: `action: "delete", resource: "nodes/{nodeId}"`

#### 1.5 Get All Nodes
- **Function Name**: `getAllNodes()`
- **MCP Tool Name**: `sage_get_all_nodes`
- **Description**: Retrieve all nodes in the model
- **Parameters**: None
- **API Mapping**: `action: "get", resource: "nodes"`

#### 1.6 Get Node by ID
- **Function Name**: `getNodeById()`
- **MCP Tool Name**: `sage_get_node_by_id`
- **Description**: Retrieve a specific node by its ID
- **Parameters**:
  - `nodeId` (string, required): ID of node to retrieve
- **API Mapping**: `action: "get", resource: "nodes/{nodeId}"`

#### 1.7 Select Node
- **Function Name**: `selectNode(nodeId)`
- **MCP Tool Name**: `sage_select_node`
- **Description**: Select a node in the UI
- **Parameters**:
  - `nodeId` (string, required): ID of node to select
- **API Mapping**: UI operation, no direct API call

### 2. Link Management Functions

#### 2.1 Create Selected Link
- **Function Name**: `createSelectedLink()`
- **MCP Tool Name**: `sage_create_link`
- **Description**: Create a link between two nodes
- **Parameters**:
  - `source` (string, required): Source node ID
  - `target` (string, required): Target node ID
  - `relationVector` (string, required): Relationship type ("increase", "decrease", "vary")
  - `relationScalar` (string, optional): Relationship strength ("aboutTheSame", "aLittle", "aLot", "moreAndMore", "lessAndLess")
  - `customData` (array, optional): Custom relationship data for "vary" type
  - `label` (string, optional): Link label
  - `color` (string, optional): Link color
  - `sourceApp` (string, optional): Source application identifier
- **API Mapping**: `action: "create", resource: "links"`

#### 2.2 Update Selected Link
- **Function Name**: `updateSelectedLink()`
- **MCP Tool Name**: `sage_update_link`
- **Description**: Update properties of an existing link
- **Parameters**:
  - `linkId` (string, required): ID of link to update
  - All optional parameters from create link
- **API Mapping**: `action: "update", resource: "links/{linkId}"`

#### 2.3 Delete Selected Link
- **Function Name**: `deleteSelectedLink()`
- **MCP Tool Name**: `sage_delete_link`
- **Description**: Delete a link from the model
- **Parameters**:
  - `linkId` (string, required): ID of link to delete
- **API Mapping**: `action: "delete", resource: "links/{linkId}"`

#### 2.4 Get All Links
- **Function Name**: `getAllLinks()`
- **MCP Tool Name**: `sage_get_all_links`
- **Description**: Retrieve all links in the model
- **Parameters**: None
- **API Mapping**: `action: "get", resource: "links"`

#### 2.5 Get Link by ID
- **Function Name**: `getLinkById()`
- **MCP Tool Name**: `sage_get_link_by_id`
- **Description**: Retrieve a specific link by its ID
- **Parameters**:
  - `linkId` (string, required): ID of link to retrieve
- **API Mapping**: `action: "get", resource: "links/{linkId}"`

### 3. Experiment Functions

#### 3.1 Reload Experiment Nodes
- **Function Name**: `reloadExperimentNodes()`
- **MCP Tool Name**: `sage_reload_experiment_nodes`
- **Description**: Reload nodes available for experimentation
- **Parameters**: None
- **API Mapping**: Internal UI operation

#### 3.2 Run Experiment
- **Function Name**: `runExperiment()`
- **MCP Tool Name**: `sage_run_experiment`
- **Description**: Execute an experiment with specified parameters
- **Parameters**:
  - `mode` (string, required): Experiment mode ("static" or "dynamic")
  - `duration` (number, optional): Duration for dynamic experiments
  - `stepUnit` (string, optional): Step unit for dynamic experiments
  - `delivery` (string, optional): Delivery method ("batch" or "stream")
  - `parameters` (object, required): Experiment parameters per node
- **API Mapping**: `action: "call", resource: "simulation/experimentRun"`

### 4. Recording Functions

#### 4.1 Record Stream
- **Function Name**: `recordStreamBtnHandler()`
- **MCP Tool Name**: `sage_start_recording`
- **Description**: Start recording simulation data
- **Parameters**:
  - `duration` (number, optional): Recording duration
  - `units` (string, optional): Time units
- **API Mapping**: `action: "call", resource: "simulation/record"`

#### 4.2 Stop Recording
- **Function Name**: `stopRecordingBtnHandler()`
- **MCP Tool Name**: `sage_stop_recording`
- **Description**: Stop active recording
- **Parameters**: None
- **API Mapping**: `action: "call", resource: "simulation/stopRecord"`

#### 4.3 Set Recording Options
- **Function Name**: `setRecordingOptions()`
- **MCP Tool Name**: `sage_set_recording_options`
- **Description**: Configure recording settings
- **Parameters**:
  - `options` (object, required): Recording configuration options
- **API Mapping**: `action: "update", resource: "simulation/settings"`

### 5. Model Import/Export Functions

#### 5.1 Load Model from Input
- **Function Name**: `loadModelFromInput()`
- **MCP Tool Name**: `sage_load_model`
- **Description**: Load a model from JSON input
- **Parameters**:
  - `model` (object, required): Model data in SageModeler format
- **API Mapping**: `action: "update", resource: "model"`

#### 5.2 Export Model
- **Function Name**: `getModel()`
- **MCP Tool Name**: `sage_export_model`
- **Description**: Export the current model as JSON
- **Parameters**: None
- **API Mapping**: `action: "get", resource: "model"`

#### 5.3 Import SD-JSON
- **Function Name**: `importSdJson()`
- **MCP Tool Name**: `sage_import_sd_json`
- **Description**: Import a model from SD-JSON format
- **Parameters**:
  - `sdModel` (object, required): Model in SD-JSON format
- **API Mapping**: Custom conversion + `action: "update", resource: "model"`

#### 5.4 Export SD-JSON
- **Function Name**: `exportSdJson()`
- **MCP Tool Name**: `sage_export_sd_json`
- **Description**: Export model in SD-JSON format
- **Parameters**: None
- **API Mapping**: `action: "get", resource: "model"` + custom conversion

### 6. Settings and Configuration Functions

#### 6.1 Update Model Complexity
- **Function Name**: `updateModelComplexity()`
- **MCP Tool Name**: `sage_update_model_complexity`
- **Description**: Update the relationship complexity level
- **Parameters**:
  - `complexity` (number, required): Complexity level (0-2)
- **API Mapping**: `action: "update", resource: "model/complexity"`

#### 6.2 Update UI Settings
- **Function Name**: `updateUiSettings()`
- **MCP Tool Name**: `sage_update_ui_settings`
- **Description**: Update UI display settings
- **Parameters**:
  - `relationshipSymbols` (boolean, optional): Show relationship symbols
  - `guide` (boolean, optional): Show guide
  - `lockdown` (boolean, optional): Lockdown mode
  - `touchDevice` (boolean, optional): Touch device mode
  - `uiElements` (object, optional): UI element visibility settings
  - `guideItems` (array, optional): Guide items configuration
- **API Mapping**: `action: "update", resource: "ui/settings"`

#### 6.3 Restore All UI
- **Function Name**: `restoreAllUi()`
- **MCP Tool Name**: `sage_restore_ui`
- **Description**: Restore all UI elements to default state
- **Parameters**: None
- **API Mapping**: `action: "update", resource: "ui/settings"` with default values

### 7. Simulation State Functions

#### 7.1 Get Simulation State
- **Function Name**: Internal state queries
- **MCP Tool Name**: `sage_get_simulation_state`
- **Description**: Get current simulation and recording state
- **Parameters**: None
- **API Mapping**: `action: "get", resource: "simulation/state"`

## Summary Statistics
- **Total Functions Audited**: 25
- **Node Management**: 7 functions
- **Link Management**: 5 functions  
- **Experiment**: 3 functions
- **Recording**: 3 functions
- **Import/Export**: 4 functions
- **Settings**: 3 functions

## Notes
- All functions follow consistent parameter patterns suitable for MCP tool definitions
- API mappings use SageModeler's postMessage protocol with action/resource structure
- Functions are organized by functional area for logical grouping in tool registry
- Parameter validation aligns with OpenAPI schema specifications
- Tool names use `sage_` prefix to distinguish from CODAP tools 