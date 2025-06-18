# Browser Worker Architecture

## Overview

The Browser Worker is a service component that establishes a persistent connection to the Vercel relay server to receive MCP tool requests via Server-Sent Events (SSE) and execute them against the CODAP plugin API. It provides a robust connection mechanism with automatic fallback to polling when SSE is unavailable.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser Worker                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Connection      │  │ Tool Executor   │  │ Response        │  │
│  │ Manager         │  │                 │  │ Handler         │  │
│  │                 │  │                 │  │                 │  │
│  │ • SSE Client    │  │ • Tool Parser   │  │ • HTTP Client   │  │
│  │ • Polling       │  │ • CODAP API     │  │ • Retry Logic   │  │
│  │ • Retry Logic   │  │ • Error Handling│  │ • Rate Limiting │  │
│  │ • State Mgmt    │  │ • Validation    │  │ • Logging       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                     │                     │        │
│           │                     │                     │        │
│           └─────────────────────┼─────────────────────┘        │
│                                 │                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                State Management                           │  │
│  │ • Connection Status  • Error Tracking  • Metrics         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Connection Manager

**Responsibilities:**
- Establish and maintain SSE connection to relay server
- Handle connection lifecycle (connect, disconnect, reconnect)
- Implement fallback to polling when SSE fails
- Manage connection state and error handling
- Provide event-driven interface for tool requests

**Implementation Details:**
- Primary connection: EventSource API to `GET /api/stream?code={sessionCode}`
- Fallback mechanism: HTTP polling to `GET /api/request/{sessionCode}` (1-second intervals)
- Exponential backoff for reconnection attempts
- **Connection health monitoring with heartbeat/keepalive detection**
- Graceful degradation when SSE is not supported

### 2. Tool Executor

**Responsibilities:**
- Parse incoming tool requests from SSE/polling
- Validate tool request format and arguments
- Execute tools against CODAP plugin API
- Handle tool execution errors and timeouts
- Generate tool response objects

**Implementation Details:**
- Integration with existing `@concord-consortium/codap-plugin-api`
- Support for CODAP commands: create, get, update, delete
- Tool mapping: MCP tool names → CODAP API calls
- **Sequential processing**: Execute one tool request at a time to avoid race conditions
- **Immediate execution**: Process requests as soon as received for low latency
- Error categorization and handling
- Execution timing and performance monitoring

### 3. Response Handler

**Responsibilities:**
- Post tool execution results back to relay server
- Handle response posting errors and retries
- Manage response queuing and rate limiting
- Provide delivery confirmation

**Implementation Details:**
- HTTP POST to `POST /api/response` endpoint
- Retry logic with exponential backoff
- Request/response correlation via request ID
- Timeout handling and error reporting

## Integration Points

### Existing Codebase Integration

#### 1. Session Management
- **Integration Point**: `src/services/SessionService.ts`
- **Interface**: `SessionIntegration`
- **Purpose**: Access current session data and validate session state
- **Methods**:
  - `getSessionData()`: Retrieve current session code and TTL
  - `isSessionValid()`: Check if session is still active

#### 2. CODAP Plugin API
- **Integration Point**: `src/components/CODAPCommandProcessor.tsx`
- **Interface**: `CODAPIntegration`
- **Purpose**: Execute MCP tools against CODAP
- **Methods**:
  - `executeCommand(action, resource, values)`: Execute CODAP command
  - `isAvailable()`: Check if CODAP API is accessible

#### 3. UI Components
- **Integration Point**: `src/components/PairingBanner.tsx`
- **Purpose**: Display connection status and tool execution feedback
- **Integration**: Event-driven status updates and user notifications

### Relay Server Integration

#### 1. SSE Stream Endpoint
- **Endpoint**: `GET /api/stream?code={sessionCode}`
- **Purpose**: Receive tool requests via Server-Sent Events
- **Event Types**:
  - `connected`: Connection established
  - `tool-request`: New tool request received
  - `heartbeat`: Keep-alive signal
  - `error`: Server-side error
  - `timeout`: Session timeout

#### 2. Request Polling Endpoint
- **Endpoint**: `GET /api/request/{sessionCode}`
- **Purpose**: Fallback polling for tool requests
- **Response**: Array of pending tool requests

#### 3. Response Posting Endpoint
- **Endpoint**: `POST /api/response`
- **Purpose**: Submit tool execution results
- **Payload**: `ToolResponse` object with execution results

## State Management

### Connection States
- **DISCONNECTED**: Initial state, no connection established
- **CONNECTING**: Attempting to establish connection
- **CONNECTED**: Active connection established
- **RECONNECTING**: Attempting to reconnect after failure
- **ERROR**: Connection failed, waiting for retry

### State Transitions
```
DISCONNECTED → CONNECTING → CONNECTED
     ↑              ↓           ↓
     ←── ERROR ←── RECONNECTING ←─
```

### Error Handling Strategy

#### Error Categories
1. **Network Errors**: Connection failures, timeouts
2. **Authentication Errors**: Invalid session codes
3. **Parsing Errors**: Malformed tool requests
4. **Execution Errors**: CODAP API failures
5. **Server Errors**: Relay server issues

#### Recovery Strategies
- **Exponential Backoff**: Increasing delays between retry attempts
- **Connection Fallback**: SSE → Polling when SSE fails
- **Circuit Breaker**: Temporary suspension after repeated failures
- **Graceful Degradation**: Continue with limited functionality

## Configuration

### Environment Variables
- `RELAY_BASE_URL`: Base URL for relay server
- `SSE_TIMEOUT`: SSE connection timeout (default: 30s)
- `POLLING_INTERVAL`: Polling fallback interval (default: 1s)
- `MAX_RETRIES`: Maximum reconnection attempts (default: 5)
- `RETRY_DELAY`: Base retry delay (default: 1s)

### Runtime Configuration
- Session code from SessionService
- Debug mode for development
- Connection preferences (SSE vs polling)

## Performance Considerations

### Connection Efficiency
- Reuse existing connections when possible
- Implement connection pooling for HTTP requests
- Optimize polling frequency based on activity

### Memory Management
- Clean up event listeners on disconnect
- Implement request/response cleanup
- Monitor memory usage in long-running sessions

### Error Recovery
- Implement circuit breaker pattern for failing connections
- Use exponential backoff to prevent server overload
- Provide fallback mechanisms for critical functionality

## Security Considerations

### Authentication
- Session code validation on every request
- Secure transmission of session codes
- Session expiration handling

### Data Validation
- Validate all incoming tool requests
- Sanitize tool arguments before execution
- Implement rate limiting for tool execution

### Error Information
- Avoid exposing sensitive information in error messages
- Log security-relevant events
- Implement proper error boundaries

## Testing Strategy

### Unit Testing
- Mock SSE EventSource for connection testing
- Mock CODAP plugin API for tool execution testing
- Test error handling and retry logic

### Integration Testing
- Test with real relay server endpoints
- Verify SSE and polling fallback behavior
- Test tool execution against CODAP environment

### End-to-End Testing
- Full workflow testing with actual LLM agents
- Performance testing under load
- Error recovery testing with network interruptions

## Implementation Phases

### Phase 1: Core Architecture
- Implement TypeScript interfaces
- Create basic component structure
- Set up build and test infrastructure

### Phase 2: Connection Management
- Implement SSE connection handling
- Add polling fallback mechanism
- Implement retry and error handling

### Phase 3: Tool Execution
- Integrate with CODAP plugin API
- Implement tool request parsing
- Add execution error handling

### Phase 4: Response Handling
- Implement response posting
- Add retry logic for failed responses
- Implement response correlation

### Phase 5: UI Integration
- Connect to PairingBanner component
- Add status indicators
- Implement user notifications

### Phase 6: Testing & Optimization
- Add comprehensive test coverage
- Performance optimization
- Production readiness checks

## Monitoring and Observability

### Metrics
- Connection success/failure rates
- Tool execution timing
- Error categorization and frequency
- Response posting success rates

### Logging
- Connection lifecycle events
- Tool execution details
- Error conditions and recovery
- Performance metrics

### Health Checks
- Connection status monitoring
- Tool execution capability
- Response posting functionality
- Memory and resource usage 