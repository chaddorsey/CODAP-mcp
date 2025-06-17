# Relay Server Architecture Design

## Overview
This document specifies the architecture for a Vercel-hosted relay server that brokers communication between browser-based CODAP plugins and arbitrary LLMs. The relay enables zero-install, scalable MCP tool execution without requiring local servers or browser extensions.

## System Architecture

```
┌─────────────┐     HTTP POST      ┌──────────────┐     SSE/HTTP     ┌─────────────┐
│    LLM      │ ────────────────►  │    Vercel    │ ◄──────────────► │   Browser   │
│   Agent     │                    │    Relay     │                  │   (CODAP)   │
└─────────────┘                    └──────────────┘                  └─────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Vercel KV   │
                                   │   Storage    │
                                   └──────────────┘
```

## CODAP Integration Specifics

The relay server provides 6 core CODAP tools that enable comprehensive data analysis workflows:

### Data Management Tools
- **`create_codap_dataset`**: Creates new datasets with sample data (students, time series, random numbers) or custom data
- **`add_codap_cases`**: Adds new rows/cases to existing datasets  
- **`get_codap_datasets`**: Lists all available datasets in the current CODAP session

### Visualization Tools  
- **`create_codap_graph`**: Creates interactive visualizations (scatterplots, histograms, bar charts, line graphs)

### Analysis & Export Tools
- **`get_codap_status`**: Retrieves current CODAP state, datasets, and components
- **`export_codap_data`**: Exports dataset contents in JSON, CSV, or TSV formats

### Typical Workflow Example
1. LLM creates a dataset: `create_codap_dataset` with student performance data
2. LLM visualizes the data: `create_codap_graph` as a scatterplot of grades vs scores  
3. User sees the graph appear in CODAP browser interface
4. LLM can add more data: `add_codap_cases` with additional student records
5. LLM can export results: `export_codap_data` for further analysis

This provides a complete round-trip demonstrating meaningful data science workflows through natural language interaction.

## Endpoint Specification

### 1. `POST /api/sessions`
**Purpose**: Create a new session and return a pairing code.

**Request**:
```json
Content-Type: application/json
{}
```

**Response** (201):
```json
{
  "code": "ABCD1234",
  "ttl": 600,
  "expiresAt": "2025-01-16T16:45:00.000Z"
}
```

**Errors**:
- 429: Rate limit exceeded (30 req/min per IP)

### 2. `GET /stream?code=XXXX`
**Purpose**: SSE stream of tool requests for a session.

**Headers**:
```
Accept: text/event-stream
```

**Response**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: tool-request
data: {"id":"req-123","tool":"create_codap_graph","args":{"datasetName":"students","graphType":"scatterplot","xAttribute":"grade","yAttribute":"score","title":"Student Performance"}}

event: heartbeat
data: {}
```

**Errors**:
- 400: Missing or invalid code
- 404: Session not found or expired

### 3. `POST /request`
**Purpose**: LLM posts a tool execution request.

**Request**:
```json
{
  "code": "ABCD1234",
  "id": "req-123",
  "tool": "create_codap_graph",
  "args": {
    "datasetName": "students",
    "graphType": "scatterplot", 
    "xAttribute": "grade",
    "yAttribute": "score",
    "title": "Student Performance"
  }
}
```

**Response** (202):
```json
{
  "id": "req-123",
  "status": "queued"
}
```

**Errors**:
- 400: Invalid request body
- 404: Session not found
- 429: Rate limit exceeded (60 req/min per IP+code)

### 4. `POST /response`
**Purpose**: Browser posts tool execution result.

**Request**:
```json
{
  "code": "ABCD1234", 
  "id": "req-123",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📈 Created scatterplot in CODAP!\n\n📊 Graph Details:\n• Dataset: students\n• Type: scatterplot\n• X-Axis: grade\n• Y-Axis: score\n• Title: Student Performance\n\n🎯 CODAP Response: {\"success\":true,\"values\":{\"id\":12345,\"title\":\"Student Performance\"}}\n\nThe visualization is now available in CODAP."
      }
    ]
  }
}
```

**Response** (202):
```json
{
  "id": "req-123",
  "status": "completed"
}
```

### 5. `GET /metadata?code=XXXX`
**Purpose**: JSON-Schema tool manifest for the session.

**Response**:
```json
{
  "version": "1.0.0",
  "tools": [
    {
      "name": "create_codap_dataset",
      "description": "Create a new dataset in CODAP with specified data",
      "inputSchema": {
        "type": "object",
        "properties": {
          "datasetName": {"type": "string", "description": "Name for the dataset in CODAP"},
          "dataType": {"type": "string", "enum": ["random_numbers", "sample_students", "time_series", "custom"], "description": "Type of data to generate"},
          "recordCount": {"type": "number", "minimum": 1, "maximum": 1000, "description": "Number of records to generate"},
          "customData": {"type": "array", "description": "Custom data array (only used when dataType is 'custom')", "items": {"type": "object"}}
        },
        "required": ["datasetName", "dataType", "recordCount"]
      }
    },
    {
      "name": "create_codap_graph",
      "description": "Create a graph/visualization in CODAP",
      "inputSchema": {
        "type": "object", 
        "properties": {
          "datasetName": {"type": "string", "description": "Name of the dataset to visualize"},
          "graphType": {"type": "string", "enum": ["scatterplot", "histogram", "bar_chart", "line_graph"], "description": "Type of graph to create"},
          "xAttribute": {"type": "string", "description": "Attribute for X-axis"},
          "yAttribute": {"type": "string", "description": "Attribute for Y-axis (optional for some graph types)"},
          "title": {"type": "string", "description": "Title for the graph"}
        },
        "required": ["datasetName", "graphType", "xAttribute"]
      }
    },
    {
      "name": "add_codap_cases",
      "description": "Add new cases (rows) to an existing CODAP dataset",
      "inputSchema": {
        "type": "object",
        "properties": {
          "datasetName": {"type": "string", "description": "Name of the existing dataset"},
          "cases": {"type": "array", "description": "Array of case objects to add", "items": {"type": "object"}}
        },
        "required": ["datasetName", "cases"]
      }
    },
    {
      "name": "get_codap_datasets",
      "description": "Get list of all datasets currently in CODAP",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    },
    {
      "name": "get_codap_status", 
      "description": "Get current status and information from CODAP",
      "inputSchema": {
        "type": "object",
        "properties": {
          "includeDatasets": {"type": "boolean", "description": "Whether to include dataset information", "default": true},
          "includeComponents": {"type": "boolean", "description": "Whether to include component information", "default": true}
        },
        "additionalProperties": false
      }
    },
    {
      "name": "export_codap_data",
      "description": "Export data from CODAP in various formats",
      "inputSchema": {
        "type": "object",
        "properties": {
          "datasetName": {"type": "string", "description": "Name of the dataset to export"},
          "format": {"type": "string", "enum": ["json", "csv", "tsv"], "description": "Export format", "default": "json"},
          "includeMetadata": {"type": "boolean", "description": "Whether to include metadata in export", "default": false}
        },
        "required": ["datasetName"]
      }
    }
  ]
}
```

## Data Models & KV Schema

### Session Storage
**Key**: `session:<code>`  
**Value**:
```json
{
  "code": "ABCD1234",
  "createdAt": "2025-01-16T15:30:00.000Z",
  "ttl": 600,
  "lastActivity": "2025-01-16T15:32:15.000Z"
}
```
**TTL**: 10 minutes (configurable)

### Request Queue  
**Key**: `req:<code>`  
**Type**: List  
**Values**: JSON strings of request objects  
**TTL**: 1 hour

### Response Storage
**Key**: `res:<code>:<id>`  
**Value**:
```json
{
  "id": "req-123", 
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📈 Created scatterplot in CODAP!\n\n📊 Graph Details:\n• Dataset: students\n• Type: scatterplot\n• X-Axis: grade\n• Y-Axis: score\n• Title: Student Performance\n\n🎯 CODAP Response: {\"success\":true,\"values\":{\"id\":12345,\"title\":\"Student Performance\"}}\n\nThe visualization is now available in CODAP."
      }
    ]
  },
  "timestamp": "2025-01-16T15:32:30.000Z"
}
```
**TTL**: 1 hour

## Security & Rate Limiting

### Session Code Generation
- **Format**: 8-character Base32 (A-Z, 2-7)
- **Entropy**: 40 bits (~1 trillion combinations)
- **Collision resistance**: < 0.01% at 1M active sessions

### Rate Limits
- `POST /api/sessions`: 30 requests/minute per IP
- `POST /request`: 60 requests/minute per IP+code combination
- `POST /response`: No limit (browser-controlled)

### Input Validation
- All JSON payloads validated with Zod schemas
- Session codes: `/^[A-Z2-7]{8}$/`
- Request IDs: UUIDs or alphanumeric strings
- Tool names: Alphanumeric + underscores only

## Implementation Details

### Vercel Edge Functions
- **Runtime**: Edge Runtime (V8 isolates)
- **Deployment**: Vercel Edge Network
- **Languages**: TypeScript

### Dependencies
```json
{
  "@vercel/kv": "^2.0.0",
  "zod": "^3.25.0"
}
```

### File Structure
```
server/relay/
├── post-session.ts      # POST /api/sessions
├── get-stream.ts        # GET /stream  
├── post-request.ts      # POST /request
├── post-response.ts     # POST /response
├── get-metadata.ts      # GET /metadata
├── schemas.ts           # Zod validation schemas
└── utils.ts             # Shared utilities

vercel.json              # Route configuration
```

### Error Handling
- Structured error responses with `error`, `message`, `code` fields
- Request correlation IDs for debugging
- Graceful degradation when KV unavailable

## Monitoring & Observability

### Logging
- Request/response latency
- Error rates by endpoint
- Session creation/expiry metrics
- Rate limit violations

### Alerts
- 95th percentile latency > 1s
- Error rate > 5%
- KV connection failures

## Deployment Strategy

### Development
- Branch deployments via Vercel GitHub integration
- Environment-specific KV namespacing
- Hot reloading for rapid iteration

### Production
- Main branch auto-deploys to production
- Blue/green deployments via Vercel
- Rollback capability

### Environment Variables
```bash
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=***
CORS_ORIGIN=https://codap.concord.org
SESSION_TTL_SECONDS=600
RATE_LIMIT_SESSION_PER_IP=30
RATE_LIMIT_REQUEST_PER_CODE=60
```

## Testing Strategy

### Unit Tests
- Zod schema validation
- Session code generation entropy
- Rate limiting logic

### Integration Tests  
- Full request/response round-trip
- SSE event delivery
- KV persistence and TTL

### Load Tests
- 1,000 concurrent SSE connections
- Burst request handling
- Memory and latency under load 