# PBI-3: Browser Worker SSE Implementation with Polling Fallback

[View in Backlog](../backlog.md#user-content-3)

## Overview

This PBI implements the browser worker component that establishes a connection to the Vercel relay server to fetch tool requests via Server-Sent Events (SSE) and post execution results back. This enables real-time communication between LLM agents and the CODAP browser environment.

## Problem Statement

The current system has a Vercel relay that can create sessions and store tool requests/responses, and a pairing banner that displays connection codes. However, there's no mechanism for the browser to actively listen for incoming tool requests from LLM agents and execute them in the CODAP environment.

Without this component:
- LLM agents cannot execute MCP tools in real-time
- The pairing connection remains dormant after establishment
- The full MCP workflow from agent to browser execution is incomplete

## User Stories

**Primary**: As a browser worker, I want to fetch tool requests via SSE (with polling fallback) and post results so that CODAP executes LLM commands in real time.

**Supporting Stories**:
- As a browser worker, I want to establish an EventSource connection to the relay server so that I can receive tool requests immediately
- As a browser worker, I want to fallback to polling when SSE fails so that the connection remains robust
- As a browser worker, I want to execute received tool requests against the CODAP API so that LLM commands take effect
- As a browser worker, I want to post execution results back to the relay so that LLM agents receive responses

## Technical Approach

### Architecture
- **SSE Connection**: Primary connection method using EventSource API
- **Polling Fallback**: 1-second interval polling when SSE unavailable/fails
- **Tool Execution**: Integration with existing CODAP plugin API
- **Result Posting**: HTTP POST to relay `/response` endpoint

### Key Components
1. **Connection Manager**: Handles SSE connection lifecycle and fallback logic
2. **Tool Executor**: Processes MCP tool requests against CODAP API with sequential execution queue
3. **Response Handler**: Posts execution results back to relay
4. **Error Recovery**: Robust error handling and connection retry logic

### SSE Implementation
- Connect to `GET /stream/{sessionId}` endpoint
- Handle connection events: open, message, error, close
- Parse incoming tool request messages
- Implement exponential backoff for connection retries
- **Connection heartbeat/keepalive**: Monitor heartbeat events and detect connection failures

### Polling Fallback
- Activate when SSE connection fails or is unsupported
- **Poll `GET /request/{sessionId}` every 1 second** (confirmed acceptable interval)
- Use same tool execution and response posting logic
- Include connection state management

## UX/UI Considerations

- **Connection Status**: Visual indicator of SSE/polling connection state
- **Execution Feedback**: User feedback when tools are being executed
- **Error Handling**: Clear error messages for connection/execution failures
- **Performance**: Minimal UI impact from background SSE/polling operations

## Acceptance Criteria

1. **EventSource Connection Established**: Browser successfully connects to relay SSE endpoint with valid session ID
2. **Tool Request Reception**: Incoming tool requests are received and parsed correctly via SSE
3. **Tool Execution**: Received tool requests are executed sequentially against CODAP plugin API (one at a time, immediate processing)
4. **Response Posting**: Execution results are posted back to relay `/response` endpoint
5. **Polling Fallback**: When SSE fails, system falls back to 1-second polling of `/request` endpoint
6. **Robust Error Handling**: Connection failures, parsing errors, and execution errors are handled gracefully
7. **Demo Integration**: Successful round-trip demonstration works end-to-end

## Dependencies

- **PBI 1**: Vercel relay with `/stream`, `/request`, `/response` endpoints (Done)
- **PBI 2**: Pairing banner with session code display (Done)
- **CODAP Plugin API**: Existing MCP tool registry and execution framework

## Open Questions

1. ~~Should we implement connection heartbeat/keepalive for SSE?~~ ✅ **RESOLVED**: Yes, implement heartbeat monitoring for connection health detection
2. ~~What's the optimal polling interval for the fallback (currently 1s)?~~ ✅ **RESOLVED**: 1 second is acceptable
3. ~~How should we handle concurrent tool requests if multiple arrive simultaneously?~~ ✅ **RESOLVED**: Sequential processing (queue and process one at a time)
4. ~~Should tool execution be queued or processed immediately?~~ ✅ **RESOLVED**: Immediate execution (process as soon as received)

### ✅ **Final Design Decisions**

**Concurrent Request Handling**: **Sequential Processing**
- Queue all requests and process one at a time to avoid CODAP API race conditions
- Simpler implementation with predictable execution order
- Easier error handling and request correlation

**Execution Timing**: **Immediate Execution**  
- Execute tool requests as soon as they're received and validated
- Lower latency provides immediate user feedback
- Real-time execution matches user expectations for interactive tools

**Implementation Approach**: **Sequential + Immediate**
- Process tool requests one at a time in order received
- Execute immediately upon receipt (no artificial batching delays)  
- Implement simple request queue for ordering guarantees
- Provide clear status feedback during execution

## Related Tasks

[View Task List](./tasks.md) 