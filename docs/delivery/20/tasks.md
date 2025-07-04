# Tasks for PBI 20: Enhance Plugin to Add SageModeler Tools

This document lists all tasks associated with PBI 20.

**Parent PBI**: [PBI 20: Enhance Plugin to Add SageModeler Tools](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| :------ | :--- | :----- | :---------- |
| 20-1 | [Audit SageModeler plugin functions and define schemas](./20-1.md) | Done | Review the SageModeler plugin and enumerate all user-facing functions, capturing their names, inputs, and outputs in a consistent schema. |
| 20-2 | [Map each function to SageModeler API calls and define translation logic](./20-2.md) | Done | For each audited function, document the corresponding SageModeler API call and define translation logic from MCP tool parameters to API requests. |
| 20-3 | [Integrate new tools into MCP registry](./20-3.md) | Done | Transform the audited and schematized functions into MCP tool definitions and add them to the registry. |
| 20-4 | [Implement relay plugin translation functions](./20-4.md) | Done | Implement translation functions in the relay plugin to handle tool calls and invoke the correct SageModeler API endpoints. |
| 20-5 | [Enable dual-mode plugin for SageModeler API direct testing and LLM E2E](./20-5.md) | Proposed | Add a dual-mode plugin with a SageModeler mode for direct API testing and LLM round-trip E2E, including a UI switch and developer-facing API test panel. |
| 20-6 | [Develop E2E tests for SageModeler tool calls](./20-6.md) | Proposed | Develop end-to-end tests to verify LLM-driven SageModeler tool calls work as expected. |
| 20-7 | [Update documentation for dual-application support](./20-7.md) | Proposed | Update developer and user documentation to reflect support for both CODAP and SageModeler tools. | 