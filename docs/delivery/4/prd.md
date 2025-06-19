# PBI-4: LLM Agent Tool Manifest

## Overview

This PBI implements a `GET /metadata` endpoint that returns a JSON-Schema tool manifest for LLM agents to discover available CODAP tools and their parameter structures. This allows LLM agents to build correctly-shaped MCP calls without hardcoding tool definitions.

## Problem Statement

Currently, LLM agents need to hardcode tool schemas or guess at parameter structures when working with CODAP. This creates maintenance overhead and potential errors when tool schemas change. A dynamic metadata endpoint will allow agents to:

1. Discover available tools at runtime
2. Get accurate parameter schemas for each tool
3. Validate their requests before sending them
4. Adapt to schema changes automatically

## User Stories

**Primary Story**: As an LLM agent, I want to retrieve a JSON-Schema tool manifest for the current session so that I can build correctly-shaped MCP calls.

**Supporting Stories**:
- As a developer, I want the manifest to include version information so I can track API changes
- As an LLM agent, I want parameter schemas that follow JSON Schema draft-07 for consistency
- As a session user, I want the metadata endpoint to require my session code for security

## Technical Approach

### Architecture

1. **Endpoint**: `GET /api/sessions/:code/metadata`
2. **Data Source**: Leverage existing `DEFAULT_TOOL_REGISTRY` from `src/services/browserWorker/schemas/toolSchemas.ts`
3. **Response Format**: JSON-Schema draft-07 compliant manifest
4. **Authentication**: Session code validation using existing KV store

### Key Components

1. **Metadata Generator**: Transform internal `ToolRegistry` to external manifest format
2. **Schema Mapper**: Convert internal schema format to JSON Schema draft-07
3. **Version Management**: Include versioning for backward compatibility
4. **Security**: Session validation and rate limiting

### Data Flow

```
LLM Agent → GET /metadata?code=XXXX → Validate Session → Generate Manifest → Return JSON Schema
```

## UX/UI Considerations

- **Developer Experience**: Clear, well-documented JSON Schema output
- **Error Handling**: Meaningful error messages for invalid sessions
- **Performance**: Fast response times with potential caching
- **Consistency**: Follows existing API patterns from other endpoints

## Acceptance Criteria

1. **Manifest Generation**: `GET /api/sessions/:code/metadata` returns manifest derived from tool registry
2. **Version Field**: Response includes version field for API versioning
3. **Schema Validation**: Sample schema validates against JSON Schema draft-07 standard
4. **Session Security**: Endpoint requires valid session code and respects TTL
5. **Tool Coverage**: All tools from `DEFAULT_TOOL_REGISTRY` are included in manifest
6. **Parameter Accuracy**: Tool parameter schemas accurately reflect implementation schemas

## Dependencies

- Existing tool registry (`src/services/browserWorker/schemas/toolSchemas.ts`)
- Session management system (KV store)
- Existing API endpoint patterns

## Open Questions

1. Should we include examples in the schema output?
2. Do we need caching for performance optimization?
3. Should deprecated tools be marked in the manifest?
4. How should we handle tool registry changes during a session?

## Related Tasks

Tasks will be defined to implement:
- Metadata endpoint creation
- Schema transformation logic  
- Session validation integration
- Testing and validation
- Documentation updates 

**2025-06-18:** Cleanup complete after production success of metadata endpoint (see 4-1 task log). Debug logging and temporary endpoints removed. All tests pass in production. 

- **2024-06-19 02:50**: Task 4-4 (Implement version management) completed and committed. Version management features fully implemented with comprehensive testing. 
- **2024-06-19 03:50**: Task 4-5 (Create integration tests) completed and committed. Comprehensive integration test suite with 17 test cases covering all metadata endpoint functionality. 