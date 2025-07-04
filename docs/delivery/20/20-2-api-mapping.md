# SageModeler API Mapping and Translation Logic - Task 20-2 Results

## Overview
This document provides detailed API mappings and translation logic for each of the 25 SageModeler functions identified in task 20-1. Each mapping shows how MCP tool parameters are translated into SageModeler API requests using the postMessage protocol.

## API Request Structure
All SageModeler API calls use the following postMessage format:
```javascript
{
  sageApi: true,
  action: string,      // "create", "update", "delete", "get", "call"
  resource: string,    // API resource path
  values: object,      // Parameters (optional)
  requestId: string    // Unique request identifier (optional)
}
```

## Translation Mappings by Function Category

### 1. Node Management Functions

#### 1.1 sage_create_node
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_create_node",
  "parameters": {
    "title": "Population",
    "initialValue": 100,
    "x": 200,
    "y": 150,
    "isAccumulator": true,
    "color": "#72c0cc"
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "create",
  "resource": "nodes",
  "values": {
    "title": "Population",
    "initialValue": 100,
    "x": 200,
    "y": 150,
    "isAccumulator": true,
    "color": "#72c0cc"
  },
  "requestId": "mcp-create-node-{timestamp}"
}
```
**Translation Logic**: Direct parameter mapping with optional field filtering.

#### 1.2 sage_create_random_node
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_create_random_node",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "create",
  "resource": "nodes",
  "values": {
    "title": "Random Node {counter}",
    "initialValue": Math.floor(Math.random() * 100),
    "x": Math.floor(Math.random() * 600) + 50,
    "y": Math.floor(Math.random() * 400) + 50,
    "isAccumulator": Math.random() > 0.7
  },
  "requestId": "mcp-create-random-node-{timestamp}"
}
```
**Translation Logic**: Generate random values for all parameters.

#### 1.3 sage_update_node
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_update_node",
  "parameters": {
    "nodeId": "node123",
    "title": "Updated Population",
    "initialValue": 150
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "update",
  "resource": "nodes/node123",
  "values": {
    "title": "Updated Population",
    "initialValue": 150
  },
  "requestId": "mcp-update-node-{timestamp}"
}
```
**Translation Logic**: Extract nodeId for resource path, pass remaining parameters as values.

#### 1.4 sage_delete_node
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_delete_node",
  "parameters": {
    "nodeId": "node123"
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "delete",
  "resource": "nodes/node123",
  "requestId": "mcp-delete-node-{timestamp}"
}
```
**Translation Logic**: Use nodeId in resource path, no values needed.

#### 1.5 sage_get_all_nodes
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_get_all_nodes",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "get",
  "resource": "nodes",
  "requestId": "mcp-get-all-nodes-{timestamp}"
}
```
**Translation Logic**: Simple GET request, no parameters.

#### 1.6 sage_get_node_by_id
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_get_node_by_id",
  "parameters": {
    "nodeId": "node123"
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "get",
  "resource": "nodes/node123",
  "requestId": "mcp-get-node-{timestamp}"
}
```
**Translation Logic**: Use nodeId in resource path.

#### 1.7 sage_select_node
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_select_node",
  "parameters": {
    "nodeId": "node123"
  }
}

// Translated API Request
// Note: This is a UI operation, handled internally by the plugin
// No direct API call to SageModeler
```
**Translation Logic**: UI state management, no API call required.

### 2. Link Management Functions

#### 2.1 sage_create_link
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_create_link",
  "parameters": {
    "source": "node123",
    "target": "node456",
    "relationVector": "increase",
    "relationScalar": "aLot",
    "label": "influences"
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "create",
  "resource": "links",
  "values": {
    "source": "node123",
    "target": "node456",
    "relationVector": "increase",
    "relationScalar": "aLot",
    "label": "influences"
  },
  "requestId": "mcp-create-link-{timestamp}"
}
```
**Translation Logic**: Direct parameter mapping with relation validation.

#### 2.2 sage_update_link
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_update_link",
  "parameters": {
    "linkId": "link789",
    "relationVector": "decrease",
    "label": "inhibits"
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "update",
  "resource": "links/link789",
  "values": {
    "relationVector": "decrease",
    "label": "inhibits"
  },
  "requestId": "mcp-update-link-{timestamp}"
}
```
**Translation Logic**: Extract linkId for resource path, pass remaining parameters as values.

#### 2.3 sage_delete_link
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_delete_link",
  "parameters": {
    "linkId": "link789"
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "delete",
  "resource": "links/link789",
  "requestId": "mcp-delete-link-{timestamp}"
}
```
**Translation Logic**: Use linkId in resource path, no values needed.

#### 2.4 sage_get_all_links
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_get_all_links",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "get",
  "resource": "links",
  "requestId": "mcp-get-all-links-{timestamp}"
}
```
**Translation Logic**: Simple GET request, no parameters.

#### 2.5 sage_get_link_by_id
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_get_link_by_id",
  "parameters": {
    "linkId": "link789"
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "get",
  "resource": "links/link789",
  "requestId": "mcp-get-link-{timestamp}"
}
```
**Translation Logic**: Use linkId in resource path.

### 3. Experiment Functions

#### 3.1 sage_reload_experiment_nodes
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_reload_experiment_nodes",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "get",
  "resource": "model",
  "requestId": "mcp-reload-experiment-{timestamp}"
}
```
**Translation Logic**: Get model to analyze node dependencies for experiment setup.

#### 3.2 sage_run_experiment
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_run_experiment",
  "parameters": {
    "mode": "static",
    "delivery": "batch",
    "parameters": {
      "node123": {
        "type": "sweep",
        "min": 0,
        "max": 100
      },
      "node456": {
        "type": "fixed",
        "value": 50
      }
    }
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "call",
  "resource": "simulation/experimentRun",
  "values": {
    "experiment": {
      "mode": "static",
      "parameters": {
        "node123": {
          "type": "sweep",
          "min": 0,
          "max": 100
        },
        "node456": {
          "type": "fixed",
          "value": 50
        }
      }
    },
    "delivery": "batch"
  },
  "requestId": "mcp-run-experiment-{timestamp}"
}
```
**Translation Logic**: Restructure parameters into experiment object, separate delivery mode.

### 4. Recording Functions

#### 4.1 sage_start_recording
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_start_recording",
  "parameters": {
    "duration": 30,
    "units": "SECOND"
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "call",
  "resource": "simulation/record",
  "values": {
    "duration": 30,
    "units": "SECOND"
  },
  "requestId": "mcp-start-recording-{timestamp}"
}
```
**Translation Logic**: Direct parameter mapping for recording configuration.

#### 4.2 sage_stop_recording
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_stop_recording",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "call",
  "resource": "simulation/stopRecord",
  "requestId": "mcp-stop-recording-{timestamp}"
}
```
**Translation Logic**: Simple call, no parameters.

#### 4.3 sage_set_recording_options
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_set_recording_options",
  "parameters": {
    "options": {
      "autoRecord": true,
      "recordInterval": 1000
    }
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "update",
  "resource": "simulation/settings",
  "values": {
    "autoRecord": true,
    "recordInterval": 1000
  },
  "requestId": "mcp-set-recording-options-{timestamp}"
}
```
**Translation Logic**: Extract options object contents as values.

### 5. Model Import/Export Functions

#### 5.1 sage_load_model
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_load_model",
  "parameters": {
    "model": {
      "nodes": [...],
      "links": [...],
      "settings": {...}
    }
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "update",
  "resource": "model",
  "values": {
    "format": "native",
    "model": {
      "nodes": [...],
      "links": [...],
      "settings": {...}
    }
  },
  "requestId": "mcp-load-model-{timestamp}"
}
```
**Translation Logic**: Wrap model in format specification.

#### 5.2 sage_export_model
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_export_model",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "get",
  "resource": "model",
  "values": {
    "format": "native"
  },
  "requestId": "mcp-export-model-{timestamp}"
}
```
**Translation Logic**: Request native format explicitly.

#### 5.3 sage_import_sd_json
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_import_sd_json",
  "parameters": {
    "sdModel": {
      "variables": [
        {"name": "Population", "initialValue": 100},
        {"name": "Growth Rate", "initialValue": 0.1}
      ],
      "influences": [
        {"source": "Growth Rate", "target": "Population", "polarity": "+"}
      ]
    }
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "update",
  "resource": "model",
  "values": {
    "format": "sd-json",
    "model": {
      "variables": [
        {"name": "Population", "initialValue": 100},
        {"name": "Growth Rate", "initialValue": 0.1}
      ],
      "influences": [
        {"source": "Growth Rate", "target": "Population", "polarity": "+"}
      ]
    }
  },
  "requestId": "mcp-import-sd-json-{timestamp}"
}
```
**Translation Logic**: Specify sd-json format, pass model directly.

#### 5.4 sage_export_sd_json
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_export_sd_json",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "get",
  "resource": "model",
  "values": {
    "format": "sd-json"
  },
  "requestId": "mcp-export-sd-json-{timestamp}"
}
```
**Translation Logic**: Request sd-json format explicitly.

### 6. Settings and Configuration Functions

#### 6.1 sage_update_model_complexity
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_update_model_complexity",
  "parameters": {
    "complexity": 2
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "update",
  "resource": "model/complexity",
  "values": {
    "complexity": 2
  },
  "requestId": "mcp-update-complexity-{timestamp}"
}
```
**Translation Logic**: Direct parameter mapping.

#### 6.2 sage_update_ui_settings
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_update_ui_settings",
  "parameters": {
    "relationshipSymbols": true,
    "guide": false,
    "uiElements": {
      "globalNav": true,
      "actionBar": false
    }
  }
}

// Translated API Request
{
  "sageApi": true,
  "action": "update",
  "resource": "ui/settings",
  "values": {
    "relationshipSymbols": true,
    "guide": false,
    "uiElements": {
      "globalNav": true,
      "actionBar": false
    }
  },
  "requestId": "mcp-update-ui-settings-{timestamp}"
}
```
**Translation Logic**: Direct parameter mapping with nested object support.

#### 6.3 sage_restore_ui
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_restore_ui",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "update",
  "resource": "ui/settings",
  "values": {
    "relationshipSymbols": true,
    "guide": true,
    "lockdown": false,
    "touchDevice": false,
    "uiElements": {
      "globalNav": true,
      "actionBar": true,
      "inspectorPanel": true,
      "nodePalette": true,
      "fullscreenButton": true,
      "scaling": true
    },
    "guideItems": []
  },
  "requestId": "mcp-restore-ui-{timestamp}"
}
```
**Translation Logic**: Use default UI settings values.

### 7. Simulation State Functions

#### 7.1 sage_get_simulation_state
**MCP Tool Parameters → API Request**
```javascript
// MCP Tool Call
{
  "tool": "sage_get_simulation_state",
  "parameters": {}
}

// Translated API Request
{
  "sageApi": true,
  "action": "get",
  "resource": "simulation/state",
  "requestId": "mcp-get-simulation-state-{timestamp}"
}
```
**Translation Logic**: Simple GET request for state information.

## Common Translation Patterns

### 1. Resource Path Construction
- **Simple resources**: `nodes`, `links`, `model`
- **ID-based resources**: `nodes/{nodeId}`, `links/{linkId}`
- **Nested resources**: `model/complexity`, `ui/settings`, `simulation/state`

### 2. Parameter Handling
- **Direct mapping**: Most parameters map directly to values object
- **ID extraction**: Extract ID parameters for resource path construction
- **Object wrapping**: Some APIs require parameters wrapped in specific objects
- **Default values**: Apply defaults for optional parameters when needed

### 3. Request ID Generation
- **Pattern**: `mcp-{tool-name}-{timestamp}`
- **Purpose**: Correlate responses with requests for async handling

### 4. Error Handling Considerations
- **Validation**: Validate required parameters before API call
- **Type conversion**: Convert string/number types as needed
- **Enum validation**: Validate enum values (relationVector, complexity levels)

## Implementation Notes

### Response Processing
All API calls return responses in this format:
```javascript
{
  "sageApi": true,
  "type": "response",
  "requestId": "...",
  "success": boolean,
  "data": object || { "error": "message" }
}
```

### Event Handling
Many operations trigger events that should be monitored:
- `nodeAdded`, `nodeUpdated`, `nodeRemoved`
- `linkAdded`, `linkUpdated`, `linkRemoved`
- `simulationStarted`, `simulationCompleted`
- `recordingStarted`, `recordingStopped`

### Async Operations
Some operations (experiments, simulations) are asynchronous and may require:
- Stream event handling for real-time updates
- Progress monitoring for long-running operations
- Timeout handling for failed operations

## Summary
- **Total API Mappings**: 25 functions mapped to SageModeler API calls
- **Translation Patterns**: 4 main patterns identified and documented
- **Error Handling**: Comprehensive validation and error handling considerations
- **Event Support**: Event monitoring for state changes and async operations 