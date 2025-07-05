# PBI-21: MCP Registry Filtering and Capability-Based Tool Exposure

[View in Backlog](../backlog.md#user-content-21)

## Overview
Implement dynamic tool registry filtering and capability-based tool exposure in the MCP relay and plugin. The system should allow the plugin to register its capabilities (e.g., CODAP, SageModeler) at session creation, and the server should filter the tool registry per session so that only the correct set of tools is exposed to the LLM for each session context.

## Problem Statement
Currently, all tools are exposed to the LLM regardless of the session context or plugin capabilities. This creates security risks, user confusion, and the potential for unsupported tool calls. There is no mechanism for the plugin to register its capabilities or for the server to filter the tool registry dynamically.

## User Stories
- As a platform architect, I want the plugin to register its capabilities (CODAP, SageModeler, etc.) with the server at session creation so that only the correct set of tools is exposed for each session.
- As a developer, I want the server to filter the tool registry per session so that the LLM only sees tools available for the session context.
- As a security engineer, I want session keys to be cryptographically secure and encode capability context to prevent spoofing.
- As a QA engineer, I want E2E tests to verify correct tool exposure for each session type.

## Technical Approach
1. **Capability Registration**: Extend the plugin to send a list of capabilities when creating a session.
2. **Session Key Security**: Ensure session keys are cryptographically secure and encode capability context.
3. **Dynamic Registry Filtering**: Update the server to filter the tool registry based on session capabilities.
4. **Metadata Endpoint**: Ensure the `/metadata` endpoint returns only the tools available for the session context.
5. **Security**: Mitigate spoofing risks and ensure only authorized tools are exposed.
6. **Testing**: Add E2E tests to verify correct tool exposure for each session type.
7. **Documentation**: Update documentation to describe capability registration and filtering.

## UX/UI Considerations
- No direct UI impact for end users.
- Developers and integrators should have clear documentation and error messages if unsupported tools are requested.

## Acceptance Criteria
- Plugin registers capabilities at session creation.
- Session keys are cryptographically secure and encode capability context.
- Server filters tool registry per session and exposes only authorized tools.
- `/metadata` endpoint returns correct tool list for each session.
- Security and spoofing risks are mitigated.
- E2E tests verify correct tool exposure for each session type.
- Documentation is updated for capability registration and filtering.

## Dependencies
- Existing session management and tool registry infrastructure.
- Security and cryptography libraries for session key generation.
- E2E testing framework.

## Open Questions
- What is the best format for encoding capabilities in session keys?
- How should capability changes be handled mid-session (if at all)?
- What are the security implications of exposing capability information?

## Related Tasks
Tasks will be defined in `tasks.md` when this PBI moves from Proposed to Agreed status. 