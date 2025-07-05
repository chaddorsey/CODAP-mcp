# PBI-20: Enhance Plugin to Add SageModeler Tools

## Overview
This PBI aims to extend the current CODAP plugin to support SageModeler tools, enabling LLMs to control both CODAP and SageModeler in an integrated environment. The work will leverage the comprehensive SageModeler API documentation and the functional-spec SageModeler plugin as reference points for tool definition and translation logic.

## Problem Statement
Currently, the plugin only supports CODAP tools. There is a need to support SageModeler as a parallel application, exposing its full set of API-driven capabilities to LLMs via the MCP tool interface. This requires a systematic audit of the SageModeler plugin's user-facing functions, mapping them to MCP tool definitions, and implementing translation logic to convert tool calls into SageModeler API requests.

## User Stories
- As a plugin developer, I want to audit all user-facing functions in the SageModeler plugin so that I can define a comprehensive set of MCP tools.
- As a developer, I want to generate translation logic for each tool so that MCP tool calls are correctly mapped to SageModeler API calls.
- As an LLM user, I want to use both CODAP and SageModeler tools in a single session so that I can perform integrated modeling and data analysis workflows.

## Technical Approach
1. **Audit and Schema Extraction**
   - Review the SageModeler plugin spec (`design/reference/sage-api-plugin.html`) and API documentation (`design/reference/OpenAPI-schema.md`).
   - Enumerate all user-facing functions, capturing their names, inputs, and expected outputs.
   - For each function, define a consistent schema (name, description, parameters, return type).
2. **API Call Mapping and Translation**
   - For each audited function, document the corresponding SageModeler API call (endpoint, method, payload).
   - Define a translation scheme that maps MCP tool call parameters to SageModeler API request formats.
3. **Tool Registry Integration**
   - Transform the audited and schematized functions into MCP tool definitions ready for registry integration.
   - Implement translation functions in the relay plugin to handle tool calls and invoke the correct SageModeler API endpoints.
4. **Testing and Documentation**
   - Develop E2E tests to verify LLM-driven SageModeler tool calls.
   - Update documentation to reflect dual-application support.

## UX/UI Considerations
- No direct UI changes are required for end users, but developer documentation and tool schemas must be clear and consistent.
- Ensure tool names and descriptions are intuitive and non-overlapping with CODAP tools.

## Acceptance Criteria
- All user-facing functions in the SageModeler plugin are audited and documented with schemas.
- Each function has a corresponding MCP tool definition and translation logic to a SageModeler API call.
- The plugin can relay and execute SageModeler tool calls in addition to CODAP tools.
- Integrated tool registry supports both toolsets without conflict.
- E2E test verifies LLM can use both toolsets in a CODAP+Sage session.
- Documentation is updated for dual-application support.

## Dependencies
- [design/reference/OpenAPI-schema.md]: SageModeler API documentation
- [design/reference/sage-api-plugin.html]: SageModeler plugin functional spec
- Existing CODAP plugin and relay infrastructure

## Open Questions
- Are there any SageModeler functions that require special handling or authentication?
- How should tool names be namespaced or disambiguated between CODAP and SageModeler?
- Are there edge cases in parameter translation that require custom logic?
- What is the best approach for error handling and reporting for SageModeler tool calls?

## Related Tasks
- [Audit SageModeler plugin functions and define schemas]
- [Map each function to SageModeler API calls and define translation logic]
- [Integrate new tools into MCP registry]
- [Implement relay plugin translation functions]
- [Develop E2E tests for SageModeler tool calls]
- [Update documentation for dual-application support]

## Dual-Mode Plugin Architecture

The CODAP MCP plugin now supports both CODAP and SageModeler environments in a single, unified interface. Users can switch between modes using the UI, and the plugin dynamically loads the appropriate tool registry and API routing for each environment. This enables seamless LLM-driven and direct API tool calls for both applications.

### User Stories
- As a user, I can switch between CODAP and SageModeler modes in the plugin UI.
- As a developer, I can register tools for either or both modes and have them routed correctly.
- As a tester, I can verify tool calls in both modes using E2E tests and the direct API panel.

### E2E Test Coverage
- Comprehensive E2E tests verify LLM-driven and direct UI tool calls in both modes.
- See [README.md](../../README.md) and [Audit Results](./20-5-audit-results.md) for details on test coverage and plugin usage.

### Documentation Links
- [README.md](../../README.md): Authoritative entry point for setup, usage, and development
- [Audit Results](./20-5-audit-results.md): Detailed audit and implementation summary

[View in Backlog](../backlog.md#user-content-20) 