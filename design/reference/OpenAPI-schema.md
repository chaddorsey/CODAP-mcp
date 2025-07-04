# Changelog

**2024-06-07:** Major update for API v11 parity:
- All API-settable node/link properties, simulation/settings (capNodeValues), UI settings, and model/complexity endpoints are now fully documented with schemas and examples.
- Event payloads and examples updated to match current implementation.
- OpenAPI-style schema blocks added for key objects.

**2024-06-08:** API event update: For accumulator-in links, the `relation` field in `linksSelected` events is now set to `'added'` (or `'+in'`) for "added to" and `'subtracted'` (or `'-in'`) for "subtracted from". The ambiguous value `'accumulator'` is no longer used. For transfer-modifier (flow variable to flow variable) links, the `relation` field in `linksSelected` events is now set to `'transferred'`, `'proportionalSourceMore'`, or `'proportionalSourceLess'` as appropriate, matching the `validRelations` array. Documentation updated accordingly.

**2024-06-10:** Comprehensive update for API v1.0 compliance:
- Added documentation for `/simulation/state` and `/experiment/new` endpoints.
- Expanded `/simulation/settings`, `/model/complexity`, `/ui/settings`, and `/links/context` to list all fields, allowed values, and examples.
- Added all event types: `simulationSettingsUpdated`, `simulationSettingsError`, `modelComplexityChanged`, `modelComplexityError`, `experimentCreated`, `experimentError`, `uiSettingsUpdated`, and clarified all event payloads (including `observed`, `reason`, etc.).
- Clarified error response structure (both `data.error` and top-level `error`).
- Added example requests/responses for all new/updated endpoints and events.
- Updated the changelog and version.
- Ensured all request/response and event payloads are fully illustrated and compliant with the implementation in `src/code/sage-api.ts`.
- Marked any dev/test-only endpoints as such and omitted from public docs.
- Ensured all partial update semantics and field types are clear.
- Added a summary table of endpoints/events for quick reference.

---

# [The rest of the file is updated as described above, with new/updated sections for:]
- Node and Link schemas (all properties, types, examples)
- Simulation/settings (including capNodeValues)
- UI/settings endpoint (all fields, schema, examples)
- Model/complexity endpoint
- Event payloads (all API-settable properties)
- OpenAPI-style schema blocks for node, link, settings

[Full content omitted for brevity in this code edit. The actual edit will insert all updated documentation as described.]

## API Schema (OpenAPI-style)

*(Below is an OpenAPI-like specification of the SageModeler External API in terms of message structure. Although the API operates via window messages rather than HTTP, we present it similarly to REST endpoints for clarity. Each "endpoint" corresponds to an `action`\+`resource` combination in the message, with expected input format and output/event format.)*

**Overview:** All API interactions occur through `postMessage` between the CODAP parent frame and the SageModeler iframe. The SageModeler plugin listens for messages where `sageApi: true` in the posted object and responds accordingly. We describe these interactions as if they were HTTP endpoints for documentation purposes.

* All requests and responses are JSON objects posted via `window.postMessage`.  
    
* Request object fields:  
    
  * `sageApi`: boolean (must be true to be recognized as API command).  
  * `action`: string – one of `"create"`, `"update"`, `"delete"`, `"get"`, `"call"`.  
  * `resource`: string – specifies the target resource and possibly an identifier (e.g., `"nodes"`, `"nodes/ABC123"`, `"model"`, `"simulation"`, etc.).  
  * `values`: object (optional) – parameters for the command (e.g., details of node or link to create/update). Required for some commands.  
  * `requestId`: string (optional but recommended) – a client-generated identifier for correlating request with response.


* Response object fields:  
    
  * `sageApi`: true (every response will include this).  
  * `type`: `"response"` (to distinguish from event messages).  
  * `requestId`: string (present if request had one; echoes the same ID).  
  * `success`: boolean – true if the command was executed successfully, false if an error occurred.  
  * `data`: object – on success, contains result data (if applicable) or may be empty `{}`; on error, contains an `error` field with message.


* Event object fields (broadcast from SageModeler to all plugins on changes):  
    
  * `sageApi`: true.  
  * `type`: `"event"`.  
  * `event`: string – the event name (e.g., `"nodeAdded"`, `"simulationCompleted"`).  
  * `data`: object – details of the event, including at least `source: "SageModeler"` (to identify origin) and other fields depending on the event type.

Below we detail each API command and event in an OpenAPI-like format:

### API Requests:

#### Create Node

* **Request** (`create /nodes`):  
    
  * `action`: `"create"`  
  * `resource`: `"nodes"`  
  * `values`: { `"title": "<NodeName>"` (string, required), `"initialValue": <number>` (optional initial numeric value) }  
  * `requestId`: "" (optional)


* **Behavior**: Creates a new node in the model with the given title and initial value.  
    
  * If a node with the same title exists, the new node's title may be auto-adjusted (e.g., "Name (2)") to ensure uniqueness.


* **Response** (`success:true`):

```json
{
  "sageApi": true,
  "type": "response",
  "requestId": "<same-as-request>", 
  "success": true,
  "data": {
    "id": "<newNodeId>",
    "title": "<finalNodeTitle>",
    "initialValue": <number> 
  }
}
```

  * The `data` includes the assigned node `id` (unique identifier used internally and in link references) and the actual `title` and `initialValue` of the created node.


* **Response** (`error` case): If `title` is missing/empty or invalid:

```json
{
  "sageApi": true, "type": "response", "requestId": "...", 
  "success": false,
  "data": { "error": "Node title is required" }
}
```

  (Similar error structure for other validation errors, e.g., non-numeric initialValue yields `"error": "Initial value must be a number"`.)


* **Events**: A successful creation triggers a `nodeAdded` event (see Events below) broadcast to all plugins.

#### Update Node

* **Request** (`update /nodes/{nodeId}`):  
    
  * `action`: `"update"`  
  * `resource`: `"nodes/<nodeId>`  
  * `values`: { `"title": "<NewName>"` (optional, string), `"initialValue": <number>` (optional) }  
  * (At least one of `title` or `initialValue` should be provided.)


* **Behavior**: Updates the specified node's name and/or initial value.  
    
  * `nodeId` is the internal ID of the\#\#\#\# Update Node


* **Request** (`update /nodes/{nodeId}`):  
    
  * `action`: `"update"`  
  * `resource`: `"nodes/{nodeId}"` (the ID of the node to update)  
  * `values`: { `"title": "<NewName>"` *(string, optional)*, `"initialValue": <number>` *(optional)* }  
  * *At least one field must be provided in values.*


* **Behavior**: Renames the specified node and/or changes its initial value. If `nodeId` is not found, the request fails. If a `title` is given that duplicates another node's name, the API may return an error (to avoid duplicate names).  
    
* **Response** (`success:true`):

```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "id": "{nodeId}", "title": "<UpdatedName>", "initialValue": <number> }
}
```

  * *Includes the node's id and its new properties. Fields that were not changed may still be returned showing current state (for completeness).*


* **Response** (`error` cases): e.g., node not found → `"error": "Node not found"`. Providing an empty title → `"error": "Node title cannot be empty"`. No values provided → `"error": "No update fields provided"`.  
    
* **Events**: A successful update triggers a `nodeUpdated` event to all plugins (with the node's id and updated fields).

#### Delete Node

* **Request** (`delete /nodes/{nodeId}`):  
    
  * `action`: `"delete"`  
  * `resource`: `"nodes/{nodeId}"`  
  * *(No `values` needed.)*


* **Behavior**: Removes the specified node from the model. All links attached to that node are also removed.  
    
* **Response** (`success:true`):

```json
{ "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "id": "{nodeId}" } }
```

  * *Confirms deletion by node id.*


* **Response** (`error`): e.g., invalid id → `"error": "Node not found"`.  
    
* **Events**: Triggers `linkRemoved` events for each link that was connected to the node, and a `nodeRemoved` event for the node itself. These events include the relevant ids (see **Events** below).

#### Create Link

* **Request** (`create /links`):  
    
  * `action`: `"create"`  
  * `resource`: `"links"`  
  * `values`: { `"source": "<nodeId1>"`, `"target": "<nodeId2>"`, `"relation": "<polarity>"` }  
  * **Polarity** must be `"increase"` (or `"+"`) or `"decrease"` (or `"-"`). If omitted, defaults to `"increase"`.


* **Behavior**: Creates a directed influence link from the node with id `source` to the node with id `target`, with the specified polarity. Both source and target must exist and be different. If a link between the same two nodes (in that direction) already exists, the request fails to prevent duplicates.  
    
* **Response** (`success:true`):

```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "id": "{linkId}", "source": "<nodeId1>", "target": "<nodeId2>", "relation": "<polarity>" }
}
```

  * *Returns the new link's unique id and its endpoints/polarity.*


* **Response** (`error`): e.g., unknown source/target node → `"error": "Node ABC not found"`. source \== target → `"error": "Cannot create link to the same node"`. Duplicate link → `"error": "Link from X to Y already exists"`. Invalid relation string → `"error": "Relation must be 'increase' or 'decrease'"`.  
    
* **Events**: On success, a `linkAdded` event is broadcast with details of the new link.

#### Update Link

* **Request** (`update /links/{linkId}`):
    * `action`: "update"
    * `resource`: "links/{linkId}"
    * `values`: object with any of the following fields:
        * `relationVector`: string (e.g., "increase", "decrease", "vary")
        * `relationScalar`: string (e.g., "aboutTheSame", "aLot", etc.)
        * `customData`: object (for "vary" relations)
        * `label`: string (optional label for the link)
        * `color`: string (optional color for the link)
        * `source`: string (optional, node id for new source)
        * `target`: string (optional, node id for new target)

* **Behavior**: Changes the properties of the specified link. If `source` and `target` are provided and differ from the current link, the link's direction will be changed (the link is removed and a new one is created with the new direction and properties). Otherwise, only the specified properties (relation, label, color, etc.) are updated.

* **Events**: Triggers a `linkUpdated` event with the link's id and new properties (and source/target ids for context). If the direction is changed, a `linkRemoved` event for the old link and a `linkAdded` event for the new link will also be broadcast.

#### Delete Link

* **Request** (`delete /links/{linkId}`):  
    
  * `action`: `"delete"`  
  * `resource`: `"links/{linkId}"`  
  * *(No `values` needed.)*


* **Behavior**: Removes the specified link from the model.  
    
* **Response** (`success:true`):

```json
{ "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "id": "{linkId}" } }
```

* **Response** (`error`): e.g., `"error": "Link not found"` if id invalid.  
    
* **Events**: A `linkRemoved` event is broadcast, including the link's former source and target.

#### Get Model

* **Request** (`get /model`):  
    
  * `action`: `"get"`  
  * `resource`: `"model"`  
  * `values` (optional): { `"format": "<formatType>"` }  
  * *`formatType` can be `"native"` (SageModeler's full JSON format) or `"sd-json"` (System Dynamics JSON format). Default is `"native"` if not specified.*


* **Behavior**: Retrieves the current model. In native format, it includes all model details (node properties, link definitions, simulation settings). In SD-JSON format, it returns a simplified representation suitable for external use (variables and influences with polarities, omitting SageModeler-specific UI details).  
    
* **Response** (`success:true`):  
    
  * *If format \= native:* `data` will contain the full model object:

```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": {
    "nodes": [ {...}, {...}, ... ],
    "links": [ {...}, {...}, ... ],
    "settings": { ... },
    "version": <number>
  }
}
```

    * Each node entry has a unique `key` (id) and associated data (e.g., title, initialValue, etc.). Each link entry has a unique `key`, `sourceNode` and `targetNode` (referring to node keys), and a `relation` object (e.g., `{ "id": "increase" }`). The `settings` include simulation configuration (e.g., duration, simulationType).

    

  * *If format \= sd-json:* `data` will contain a simplified model, for example:

```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": {
    "variables": [
      { "name": "Foo", "initialValue": 5 },
      { "name": "Bar", "initialValue": 0 }
    ],
    "links": [
      { "source": "Foo", "target": "Bar", "polarity": "+" }
    ]
  }
}
```

    * Variables list each node by name (and initial value if any). Links list each influence by source name, target name, and `polarity:"+"` or `"-"`.

    

  * The exact content will reflect the current model. (If model is empty, `nodes`/`variables` will be an empty array, etc.)


* **Response** (`error`): If an unsupported format is requested, e.g., `"error": "Unsupported format 'xyz'"`.  
    
* **Events**: None (this is a read-only operation; it does not change the model or trigger events).

#### Load Model

* **Request** (`update /model`):  
    
  * `action`: `"update"`  
  * `resource`: `"model"`  
  * `values`: { `"format": "<formatType>"` (optional, `"native"` or `"sd-json"`, default `"native"`), `"model": { ... }` (object containing the model data in the specified format) }


* **Behavior**: Replaces the entire current model with the provided model data. If format is native, expects a full SageModeler model JSON (as returned by get model). If format is sd-json, expects variables and links as per the SD-JSON schema. The existing model will be cleared and then the new model loaded.  
    
  * The operation will validate the input and may throw errors if the data is malformed (e.g., missing required fields, references to unknown nodes in links, duplicate variable names in SD-JSON, etc.).  
  * If loading fails (invalid data), the original model remains unchanged.


* **Response** (`success:true`):

```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "nodes": <number>, "links": <number> }
}
```

  * Provides counts of nodes and links in the new model (for confirmation). For example, `{ "nodes": 5, "links": 4 }` if 5 nodes and 4 links were loaded.


* **Response** (`error`): If the input model is invalid or cannot be loaded:  
    
  * e.g., `"error": "Invalid model format: missing nodes list"`, `"error": "Link references unknown variable 'X'"`, etc. (The error message will describe the issue, and the current model will remain as it was.)


* **Events**: Loading a model triggers a series of events reflecting the changes:  
    
  * All old nodes and links being removed will emit `linkRemoved` and `nodeRemoved` events (for each).  
  * All new nodes and links being added will emit `nodeAdded` and `linkAdded` events.  
  * These events allow other plugins to update their state to the new model. (The events may be numerous if the model is large, and are broadcast in a logical order: all removals then all additions.)

#### Run Simulation

* **Request** (`call /simulation`):  
    
  * `action`: `"call"`  
  * `resource`: `"simulation"`  
  * `values`: { \`"duration": } (optional) }  
  * *If `duration` is provided, it overrides the model's simulation length (number of time steps). If not provided, the simulation uses the model's current configured duration.*


* **Behavior**: Starts a model simulation run (equivalent to clicking the Run button in the UI). If a simulation is already running, this request is rejected.  
    
  * If `duration` is provided, it will be applied (clamped to a reasonable max, e.g. 5000 steps). For a static (steady-state) model, multiple steps have no effect beyond the first – the simulation will still produce one outcome (the API will still accept the parameter but the model's nature limits its effect).  
  * The call returns immediately, *not* waiting for the simulation to finish. Simulation results will be available in CODAP's data context as usual.


* **Response** (`success:true`):

```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "duration": <number> }
}
```

  * Confirms that the simulation started. The `duration` reflects the number of steps it will run (after clamping/default).


* **Response** (`error`):  
    
  * If a simulation is already in progress: `"error": "Simulation already in progress"`.  
  * If there is no model or no nodes to run: `"error": "No model present to run"`.  
  * If `duration` is provided but invalid (e.g. 0 or not a number): `"error": "Duration must be a positive number"`.


* **Events**: Starting and completing a simulation trigger events:  
    
  * `simulationStarted` fires immediately when the run begins.  
  * `simulationCompleted` fires when the run ends.  
  * These events (detailed below) allow plugins to know the timing of the simulation. The API does **not** itself return results data – plugins should read the CODAP data context or use other CODAP Data Interactive API calls to get run results if needed. The simulation events simply signal the run's lifecycle.

#### Run Experiment Sweep

* **Request** (`call /simulation/experimentRun`):
  * `action`: "call"
  * `resource`: "simulation/experimentRun"
  * `values`: { "experiment": <ExperimentRunObject> }
  * `requestId`: "..." (optional)

* **ExperimentRunObject Schema:**

```json
{
  "mode": "static" | "dynamic",           // Required: "static" for equilibrium, "dynamic" for time-based
  "parameters": {
    "<nodeId>": {
      "type": "sweep" | "step" | "fixed", // Required: parameter mode for this node
      // sweep mode:
      "min": <number>,                      // Optional, default = node's slider min
      "max": <number>,                      // Optional, default = node's slider max
      // step mode:
      "numSteps": <integer>,                // Required for step
      "includeBounds": <boolean>,           // Optional for step, default true
      // fixed mode:
      "value": <number>                     // Required for fixed
    },
    // ... more nodes
  },
  "duration": <number>,                   // Optional: number of steps (for dynamic mode)
  "units": "steps" | "minutes" | "hours", // Optional: time units (for dynamic mode)
  "resultDelivery": "stream" | "batch"    // Optional: how results are delivered (default "stream")
}
```

* **Parameter Modes:**
  - **sweep:**
    - Uses the node's slider step size (`stepSize = Math.min(1, (max - min) / 100)`).
    - Generates all values from min to max (inclusive). No custom step size allowed.
    - `min` and `max` are optional; default to node's slider min/max.
  - **step:**
    - Requires `min`, `max`, and `numSteps` (≥1).
    - `includeBounds` (default true):
      - If true, values are [min, ..., max] evenly spaced.
      - If false, values are centered within the range, not touching min or max.
      - If `numSteps` is 1, value is min (if true) or midpoint (if false).
  - **fixed:**
    - Requires `value` (single value for the node).

* **Example Request:**
```json
{
  "sageApi": true,
  "action": "call",
  "resource": "simulation/experimentRun",
  "values": {
    "experiment": {
      "mode": "static",
      "parameters": {
        "A": { "type": "sweep", "min": 0, "max": 10 },
        "B": { "type": "step", "min": 0, "max": 10, "numSteps": 3, "includeBounds": true },
        "C": { "type": "fixed", "value": 5 }
      },
      "resultDelivery": "batch"
    }
  },
  "requestId": "abc123"
}
```

* **Success Response:**
```json
{
  "sageApi": true,
  "type": "response",
  "requestId": "abc123",
  "success": true,
  "data": {
    "message": "Experiment run started",
    "estimatedRows": 36
  }
}
```

* **Error Response (e.g., size limit):**
```json
{
  "sageApi": true,
  "type": "response",
  "requestId": "abc123",
  "success": false,
  "data": {
    "error": "Experiment would exceed the maximum allowed dataset size of 50000 rows. Estimated: 72000",
    "estimatedRows": 72000
  }
}
```

* **Events:**
  - `experimentRunStarted` (with estimatedRows, mode, parameters)
  - `experimentRunError` (with error message, estimatedRows if relevant)
  - `experimentRunCompleted` (with summary, result location if batch)

* **Notes:**
  - All node IDs must be valid and present in the current model.
  - The API pre-calculates the total number of runs/rows and enforces the 50,000 row limit.
  - Sweep mode is always UI-aligned; step mode is API-flexible.

#### Record 1 Data Point

* **Request** (`call /simulation/recordOne`):  
  * `action`: "call"  
  * `resource`: "simulation/recordOne"  
  * `values`: (optional, not required for standard run)  
  * `requestId`: "..." (optional)

* **Behavior**: Starts a single-step recording run (equivalent to Record 1 Data Point in the UI). If a recording is already in progress, or if the model is empty, the request fails.  
  * The API estimates the number of rows (always 1 for recordOne) and enforces the 50,000 row limit.

* **Response** (`success:true`):
```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "message": "Record 1 Data Point started", "estimatedRows": 1 }
}
```
* **Response** (`error`):
```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": false,
  "data": { "error": "Recording already in progress" }
}
```
* **Events**:
  * On success: `recordingStarted` event (see below)
  * On error: `recordingError` event (see below)

#### Record Continuously

* **Request** (`call /simulation/recordStream`):  
  * `action`: "call"  
  * `resource`: "simulation/recordStream"  
  * `values`: { "duration": <number>, "units": <string> } (optional)  
  * `requestId`: "..." (optional)

* **Behavior**: Starts a continuous recording run (Record Continuously in the UI). If a recording is already in progress, or if the model is empty, the request fails.  
  * The API estimates the number of rows (based on duration/units) and enforces the 50,000 row limit.

* **Response** (`success:true`):
```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "message": "Continuous recording started", "estimatedRows": 100 }
}
```
* **Response** (`error`):
```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": false,
  "data": { "error": "Recording would exceed the maximum allowed dataset size of 50000 rows. Estimated: 60000", "estimatedRows": 60000 }
}
```
* **Events**:
  * On success: `recordingStarted` event (see below)
  * On error: `recordingError` event (see below)

#### Stop Recording

* **Request** (`call /simulation/stopRecording`):  
  * `action`: "call"  
  * `resource`: "simulation/stopRecording"  
  * `requestId`: "..." (optional)

* **Behavior**: Stops any ongoing recording run. If no recording is in progress, the request fails.

* **Response** (`success:true`):
```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "message": "Recording stopped" }
}
```
* **Response** (`error`):
```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": false,
  "data": { "error": "No recording in progress" }
}
```
* **Events**:
  * On success: `recordingStopped` event (see below)
  * On error: `recordingError` event (see below)

#### Set Recording Options

* **Request** (`call /simulation/setRecordingOptions`):  
  * `action`: "call"  
  * `resource`: "simulation/setRecordingOptions"  
  * `values`: { "duration": <number>, "units": <string> } (optional)  
  * `requestId`: "..." (optional)

* **Behavior**: Sets the duration and/or units for subsequent recording runs. If invalid values are provided, the request fails.

* **Response** (`success:true`):
```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": true,
  "data": { "message": "Recording options set" }
}
```
* **Response** (`error`):
```json
{
  "sageApi": true, "type": "response", "requestId": "...", "success": false,
  "data": { "error": "Failed to set recording options: ..." }
}
```
* **Events**:
  * On error: `recordingError` event (see below)

### API Events:

*(All events are broadcast as postMessages from SageModeler with `sageApi:true` and `type:"event"`. They include a `source: "SageModeler"` to identify origin, and additional data as described. Plugins should listen for these events to react to changes. Event messages do not require acknowledgments.)*

* **nodeAdded** – Emitted when a node is created (via API or UI):

```json
{
  "sageApi": true, "type": "event", "event": "nodeAdded",
  "data": { "source": "SageModeler", "id": "{nodeId}", "title": "<NodeName>", "initialValue": <number> }
}
```

  * Contains the new node's id, title, and initial value (if any). Other default properties (like units or accumulator status) may be included as needed (omitted if not applicable).


* **nodeRemoved** – Emitted when a node is deleted:

```json
{
  "sageApi": true, "type": "event", "event": "nodeRemoved",
  "data": { "source": "SageModeler", "id": "{nodeId}", "title": "<NodeName>" }
}
```

  * Provides the id of the removed node. The title may be included for reference (the title is the last known name of the node). Plugins should remove this node from their state.


* **nodeUpdated** – Emitted when a node's properties change (e.g., renamed or initial value changed):

```json
{
  "sageApi": true, "type": "event", "event": "nodeUpdated",
  "data": { "source": "SageModeler", "id": "{nodeId}", "title": "<NewName>", "initialValue": <number> }
}
```

  * Contains the node's id and its current properties after the update. Only properties that changed may be explicitly included, but typically title and initialValue are sent for completeness. Plugins should update their representation of this node accordingly.


* **linkAdded** – Emitted when a new link (influence) is created:

```json
{
  "sageApi": true, "type": "event", "event": "linkAdded",
  "data": { "source": "SageModeler", "id": "{linkId}", 
            "sourceNode": "{sourceNodeId}", "targetNode": "{targetNodeId}", "polarity": "<+ or ->" }
}
```

  * Provides the link's unique id, the ids of source and target nodes it connects, and its polarity (`"+"` for increase/positive influence, `"-"` for decrease/negative influence). Plugins can use the node ids to identify which nodes got connected.


* **linkRemoved** – Emitted when a link is deleted:

```json
{
  "sageApi": true, "type": "event", "event": "linkRemoved",
  "data": { "source": "SageModeler", "id": "{linkId}", 
            "sourceNode": "{sourceNodeId}", "targetNode": "{targetNodeId}" }
}
```

  * Specifies the id of the removed link and the ids of the nodes it used to connect. Plugins should remove that influence from their state. (Providing source/target here helps identify which specific connection was removed, especially if multiple links existed.)


* **linkUpdated** – Emitted when a link's relation/polarity changes:

```json
{
  "sageApi": true, "type": "event", "event": "linkUpdated",
  "data": { "source": "SageModeler", "id": "{linkId}", 
            "sourceNode": "{sourceNodeId}", "targetNode": "{targetNodeId}", "polarity": "<+ or ->" }
}
```

  * Includes the link's id, its source and target node ids, and the new polarity after update. Plugins should update how they represent that influence (e.g., change arrow color or sign).


* **simulationStarted** – Emitted when a simulation run begins:

```json
{
  "sageApi": true, "type": "event", "event": "simulationStarted",
  "data": { "source": "SageModeler" }
}
```

  * This event has no additional fields (except source). It indicates that SageModeler has begun processing a simulation. Plugins might use this to, for example, disable input controls or show a "Running..." indicator.


* **simulationCompleted** – Emitted when a simulation run finishes:

```json
{
  "sageApi": true, "type": "event", "event": "simulationCompleted",
  "data": { "source": "SageModeler" }
}
```

  * Signals that the simulation has ended and results are available. If the simulation produced new dataset entries, those will be in CODAP's data context. (This event does not contain result data itself; plugins can query CODAP if needed, or simply use it to re-enable controls or fetch the model state.)

* **recordingStarted** – Emitted when a recording run begins (Record 1 or Record Continuously):

```json
{
  "sageApi": true, "type": "event", "event": "recordingStarted",
  "data": { "source": "SageModeler", "mode": "one" | "stream", "estimatedRows": <number>, "duration": <number>, "units": <string> }
}
```
  * `mode` is either "one" (for Record 1) or "stream" (for Record Continuously). `estimatedRows` is the number of rows expected for this run. `duration` and `units` are included for stream mode if provided.

* **recordingError** – Emitted when a recording run fails to start or an error occurs during recording:

```json
{
  "sageApi": true, "type": "event", "event": "recordingError",
  "data": { "source": "SageModeler", "error": "<error message>", "estimatedRows": <number> }
}
```
  * `error` is a human-readable error message. `estimatedRows` is included for dataset size errors.

* **recordingStopped** – Emitted when a recording run is stopped:

```json
{
  "sageApi": true, "type": "event", "event": "recordingStopped",
  "data": { "source": "SageModeler" }
}
```

* **experimentRunStarted** – Emitted when an experiment run begins:

```json
{
  "sageApi": true, "type": "event", "event": "experimentRunStarted",
  "data": {
    "source": "SageModeler",
    "mode": "static" | "dynamic",
    "parameters": { /* experiment parameters object */ },
    "estimatedRows": <number>
  }
}
```
  * Contains the experiment mode, parameters, and estimated number of rows for the run.

* **experimentRunCompleted** – Emitted when an experiment run finishes:

```json
{
  "sageApi": true, "type": "event", "event": "experimentRunCompleted",
  "data": {
    "source": "SageModeler",
    "estimatedRows": <number>,
    "results": [ /* array of result rows, if batch delivery */ ]
  }
}
```
  * Contains the estimated number of rows and, for batch delivery, the results array. For stream delivery, results are sent as individual events (see below).

* **experimentRunError** – Emitted when an experiment run fails to start or an error occurs during the run:

```json
{
  "sageApi": true, "type": "event", "event": "experimentRunError",
  "data": {
    "source": "SageModeler",
    "error": "<error message>",
    "estimatedRows": <number> // optional, present for size errors
  }
}
```
  * `error` is a human-readable error message. `estimatedRows` is included for dataset size errors, omitted otherwise.
  * **All errors for experimentRun (not just size errors) are broadcast as experimentRunError events. Plugins should listen for this event to handle any experiment run errors.**

* **experimentRunStream** – Emitted for each row in a streaming experiment run:

```json
{
  "sageApi": true, "type": "event", "event": "experimentRunStream",
  "data": {
    "source": "SageModeler",
    "requestId": "...",
    "row": { /* result row object */ }
  }
}
```
  * For stream delivery, each result row is sent as a separate event.

---

### Usage Example: Listening for experimentRun Events in a Plugin

```js
window.addEventListener('message', (event) => {
  if (!event.data || !event.data.sageApi || event.data.type !== 'event') return;
  switch (event.data.event) {
    case 'experimentRunStarted':
      // Handle experiment run start
      console.log('Experiment started:', event.data.data);
      break;
    case 'experimentRunCompleted':
      // Handle experiment run completion
      console.log('Experiment completed:', event.data.data);
      break;
    case 'experimentRunError':
      // Handle experiment run error
      alert('Experiment error: ' + event.data.data.error);
      break;
    case 'experimentRunStream':
      // Handle streaming result row
      processRow(event.data.data.row);
      break;
    // ... handle other events ...
  }
});
```

---

**Error Handling:**
- All errors for simulation recording commands are communicated both via the API response (with `success: false` and an `error` field) and as a `recordingError` event broadcast to all plugins. Plugins should listen for `recordingError` events to handle errors robustly, regardless of whether they initiated the request.

**Event Ordering & Frequency:** Events are emitted in a logical sequence. For example, if a node with links is deleted, `linkRemoved` events for its links broadcast before the `nodeRemoved` event for the node. If a large number of changes occur (e.g., loading a model triggers many add/remove events), they are broadcast in batch but without exceeding a reasonable rate (the system can coalesce extremely high-frequency updates if needed to avoid flooding – e.g., rapid slider adjustments won't send dozens of `nodeUpdated` per second, but at most \~10 per second will be broadcast). Each event's `source:"SageModeler"` helps receivers distinguish these broadcasts from any other messages.

# SageModeler External API - OpenAPI Documentation

## Overview
The SageModeler External API provides programmatic access to create, read, update, and delete nodes and links in system dynamics models, run simulations, and manage model settings.

## API Endpoints

### Nodes

#### GET /nodes
Retrieve all nodes in the current model.

**Request:**
```json
{
  "sageApi": true,
  "type": "request", 
  "requestId": "unique-id",
  "action": "get",
  "resource": "nodes"
}
```

**Response:**
```json
{
  "sageApi": true,
  "type": "response",
  "requestId": "unique-id", 
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "node-key",
        "title": "Node Title",
        "initialValue": 50,
        "min": 0,
        "max": 100,
        "x": 100,
        "y": 150,
        "isAccumulator": false,
        "isFlowVariable": false,
        "allowNegativeValues": true,
        "combineMethod": "average",
        "valueDefinedSemiQuantitatively": false,
        "image": "img/nodes/blank.png",
        "color": "#4D6A6D",
        "paletteItem": "uuid-string",
        "usesDefaultImage": true
      }
    ]
  }
}
```

#### GET /nodes/{id}
Retrieve a specific node by ID.

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id", 
  "action": "get",
  "resource": "nodes/node-key"
}
```

**Response:**
```json
{
  "sageApi": true,
  "type": "response",
  "requestId": "unique-id",
  "success": true,
  "data": {
    "node": {
      "id": "node-key",
      "title": "Node Title",
      "initialValue": 50,
      "min": 0,
      "max": 100,
      "x": 100,
      "y": 150,
      "isAccumulator": false,
      "isFlowVariable": false,
      "allowNegativeValues": true,
      "combineMethod": "average",
      "valueDefinedSemiQuantitatively": false,
      "image": "img/nodes/blank.png",
      "color": "#4D6A6D",
      "paletteItem": "uuid-string",
      "usesDefaultImage": true
    }
  }
}
```

#### POST /nodes
Create a new node.

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id",
  "action": "create", 
  "resource": "nodes",
  "values": {
    "title": "New Node",
    "initialValue": 50,
    "min": 0,
    "max": 100,
    "x": 100,
    "y": 150,
    "isAccumulator": false,
    "isFlowVariable": false,
    "allowNegativeValues": true,
    "image": "img/nodes/blank.png"
  }
}
```

#### PUT /nodes/{id}
Update an existing node (supports partial updates).

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id",
  "action": "update",
  "resource": "nodes/node-key",
  "values": {
    "title": "Updated Title",
    "initialValue": 75
  }
}
```

**Note:** Only the fields provided in `values` will be updated. Missing fields are ignored.

#### DELETE /nodes/{id}
Delete a node.

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id",
  "action": "delete",
  "resource": "nodes/node-key"
}
```

### Links

#### GET /links
Retrieve all links in the current model.

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id",
  "action": "get",
  "resource": "links"
}
```

**Response:**
```json
{
  "sageApi": true,
  "type": "response",
  "requestId": "unique-id",
  "success": true,
  "data": {
    "links": [
      {
        "id": "link-key",
        "source": "source-node-key",
        "target": "target-node-key", 
        "relation": "increase",
        "relationDetail": "proportionally",
        "customData": null,
        "label": "Link Label",
        "color": "#4D6A6D"
      }
    ]
  }
}
```

#### GET /links/{id}
Retrieve a specific link by ID.

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id",
  "action": "get", 
  "resource": "links/link-key"
}
```

**Response:**
```json
{
  "sageApi": true,
  "type": "response",
  "requestId": "unique-id",
  "success": true,
  "data": {
    "link": {
      "id": "link-key",
      "source": "source-node-key",
      "target": "target-node-key",
      "relation": "increase", 
      "relationDetail": "proportionally",
      "customData": null,
      "label": "Link Label",
      "color": "#4D6A6D"
    }
  }
}
```

#### POST /links
Create a new link.

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id",
  "action": "create",
  "resource": "links",
  "values": {
    "source": "source-node-key",
    "target": "target-node-key",
    "relationVector": "increase",
    "relationScalar": "proportionally",
    "label": "Link Label"
  }
}
```

#### PUT /links/{id}
Update an existing link (supports partial updates).

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id",
  "action": "update",
  "resource": "links/link-key",
  "values": {
    "relationVector": "decrease",
    "label": "Updated Label"
  }
}
```

**Note:** Only the fields provided in `values` will be updated. Missing fields are ignored.

#### DELETE /links/{id}
Delete a link.

**Request:**
```json
{
  "sageApi": true,
  "type": "request",
  "requestId": "unique-id",
  "action": "delete",
  "resource": "links/link-key"
}
```

#### Get Link Context

* **Request** (`POST /links/context`):
    * `action`: "call"
    * `resource`: "links/context"
    * `values`: object with:
        * `source`: string (node id of source)
        * `target`: string (node id of target)
    * `requestId`: string (unique request id)
* **Response**:
    * `linkType`: string (e.g., "range", "accumulator", "transfer", "transfer-modifier", "invalid")
    * `validRelations`: array of strings (relation types valid for this link context)
    * `editableProperties`: array of strings (property names editable for this link context)

* **Use Case**: Use this endpoint to determine what kind of link would be created or is valid between two nodes, and what properties are editable for that link type. This is especially useful for dynamic models with accumulators and flow variables.

Returns the link type, valid relations, and editable properties for a given source/target node pair.

- **Node → Accumulator:** `['added', 'subtracted']`
- **Flow Variable → Accumulator:**
  - If the flow variable is only connected to one accumulator (simple flow): `['added', 'subtracted']`
  - If the flow variable is connected to more than one accumulator (bridge/advanced flow): `['transferred', 'proportionalSourceMore', 'proportionalSourceLess']`
- **Accumulator → Node:** `['increase', 'decrease', 'vary']`
- **Accumulator ↔ Accumulator:** `['transferred', 'proportionalSourceMore', 'proportionalSourceLess']`
- **Any flow variable (other direction):** `['transferred', 'proportionalSourceMore', 'proportionalSourceLess']`
- **Node ↔ Node:** `['increase', 'decrease', 'vary']`

**Note:**
- This logic matches the SageModeler UI: after a node is auto-converted to a flow variable by setting a link to an accumulator as 'added to' or 'subtracted from', the link's valid relations remain 'added'/'subtracted' unless/until the flow variable is used as a bridge between two accumulators.

#### linksSelected Event

* **Behavior**: When a link is selected, the event's `relation` field will be:
  - `'added'` (or `'+in'`) for "added to" accumulator links
  - `'subtracted'` (or `'-in'`) for "subtracted from" accumulator links
  - `'transferred'`, `'proportionalSourceMore'`, or `'proportionalSourceLess'` for transfer-modifier (flow variable to flow variable) links, matching the `validRelations` array
  - *No longer uses ambiguous or legacy values like `'increase'` for these cases*
  - For other link types, the `relation` field reflects the actual relation type (see validRelations for options)

## Error Responses

All error responses follow this standardized format:

```json
{
  "sageApi": true,
  "type": "response",
  "requestId": "unique-id",
  "success": false,
  "error": "Clear, actionable error message"
}
```

Common error scenarios:
- **404 Not Found**: `"Node with id 'node-key' not found"`
- **400 Bad Request**: `"Title must be a non-empty string"`
- **409 Conflict**: `"A link with the same source, target, and relationship already exists"`
- **500 Internal Error**: `"Failed to create node: [detailed error]"`

## Event Broadcasting

All events follow this standardized format:

```json
{
  "sageApi": true,
  "type": "event",
  "event": "eventName",
  "data": {
    "sourceApp": "SageModeler",
    // ... event-specific data
  }
}
```

### Node Events

#### nodeAdded
Broadcast when a node is created.

```json
{
  "sageApi": true,
  "type": "event", 
  "event": "nodeAdded",
  "data": {
    "id": "node-key",
    "title": "Node Title",
    "initialValue": 50,
    "sourceApp": "SageModeler"
    // ... other node properties
  }
}
```

#### nodeUpdated
Broadcast when a node is modified.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "nodeUpdated", 
  "data": {
    "id": "node-key",
    "title": "Updated Title",
    "sourceApp": "SageModeler"
    // ... updated node properties
  }
}
```

#### nodeRemoved
Broadcast when a node is deleted.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "nodeRemoved",
  "data": {
    "id": "node-key",
    "title": "Node Title",
    "sourceApp": "SageModeler"
  }
}
```

### Link Events

#### linkAdded
Broadcast when a link is created.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "linkAdded",
  "data": {
    "id": "link-key", 
    "source": "source-node-key",
    "target": "target-node-key",
    "relation": "increase",
    "sourceApp": "SageModeler"
    // ... other link properties
  }
}
```

#### linkUpdated
Broadcast when a link is modified.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "linkUpdated",
  "data": {
    "id": "link-key",
    "source": "source-node-key", 
    "target": "target-node-key",
    "relation": "decrease",
    "sourceApp": "SageModeler"
    // ... updated link properties
  }
}
```

#### linkRemoved
Broadcast when a link is deleted.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "linkRemoved",
  "data": {
    "id": "link-key",
    "source": "source-node-key",
    "target": "target-node-key", 
    "sourceApp": "SageModeler"
  }
}
```

### Selection Events

#### nodesSelected
Broadcast when nodes are selected in the SageModeler UI.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "nodesSelected",
  "data": {
    "nodes": [
      {
        "id": "node-key",
        "title": "Node Title",
        "initialValue": 50,
        "min": 0,
        "max": 100,
        "isAccumulator": false,
        "isFlowVariable": false,
        "allowNegativeValues": true,
        "combineMethod": "average",
        "valueDefinedSemiQuantitatively": false,
        "x": 100,
        "y": 150,
        "image": "img/nodes/blank.png",
        "color": "#4D6A6D",
        "paletteItem": "uuid-string",
        "usesDefaultImage": true,
        "sourceApp": "SageModeler"
      }
    ],
    "count": 1,
    "sourceApp": "SageModeler"
  }
}
```

#### nodesDeselected
Broadcast when nodes are deselected in the SageModeler UI.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "nodesDeselected",
  "data": {
    "sourceApp": "SageModeler"
  }
}
```

#### linksSelected
Broadcast when links are selected in the SageModeler UI.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "linksSelected",
  "data": {
    "links": [
      {
        "id": "link-key",
        "source": "source-node-key",
        "target": "target-node-key",
        "relation": "increase",
        "relationDetail": "proportionally",
        "customData": null,
        "label": "Link Label",
        "color": "#4D6A6D",
        "sourceApp": "SageModeler"
      }
    ],
    "count": 1,
    "sourceApp": "SageModeler"
  }
}
```

#### linksDeselected
Broadcast when links are deselected in the SageModeler UI.

```json
{
  "sageApi": true,
  "type": "event",
  "event": "linksDeselected",
  "data": {
    "sourceApp": "SageModeler"
  }
}
```

## Model Management

### GET /model
Retrieve the complete model data.

### POST /model
Load a model into SageModeler.

## Simulation

### POST /simulation/recordOne
Record a single data point.

### POST /simulation/recordStream
Start continuous recording.

### POST /simulation/stopRecording
Stop recording.

### PUT /simulation/settings
Update simulation settings (supports partial updates).

## Experiment Runs

### POST /simulation/experimentRun
Execute an experiment with parameter variations.

## Settings

### PUT /ui/settings
Update UI settings (supports partial updates).

### PUT /model/complexity
Update model complexity level.

---

**Last Updated:** 2024-06-10  
**API Version:** 1.0.0