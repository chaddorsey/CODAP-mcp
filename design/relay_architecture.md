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
data: {"id":"req-123","tool":"createCase","args":{"collection":"People","values":{"name":"Alice"}}}

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
  "tool": "createCase",
  "args": {
    "collection": "People",
    "values": {"name": "Alice", "age": 30}
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
    "success": true,
    "values": {"caseID": 42}
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
      "name": "createCase",
      "description": "Create a new case in CODAP",
      "inputSchema": {
        "type": "object",
        "properties": {
          "collection": {"type": "string"},
          "values": {"type": "object"}
        },
        "required": ["collection", "values"]
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
  "result": {"success": true, "values": {"caseID": 42}},
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