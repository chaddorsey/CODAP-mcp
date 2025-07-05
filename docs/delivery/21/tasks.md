# Tasks for PBI 21: MCP Registry Filtering and Capability-Based Tool Exposure

This document lists all tasks associated with PBI 21.

**Parent PBI**: [PBI 21: MCP Registry Filtering and Capability-Based Tool Exposure](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| :------ | :--- | :----- | :---------- |
| 21-1 | [Sync MCP Server Tool Registry with Full Plugin Tool Set](./21-1.md) | Proposed | Update the MCP server tool registry to include all tools available in the current plugin (CODAP, SageModeler, and any new tools), ensuring server and plugin tool lists are fully aligned. |
| 21-2 | [Implement Capability Registration at Session Creation](./21-2.md) | Proposed | Extend the plugin and server to support capability registration when creating a session, allowing the plugin to specify its supported tool sets. |
| 21-3 | [Secure Session Key Generation with Capability Context](./21-3.md) | Proposed | Update session key generation to be cryptographically secure and encode capability context, preventing spoofing and unauthorized tool access. |
| 21-4 | [Dynamic Tool Registry Filtering by Session](./21-4.md) | Proposed | Implement server-side logic to filter the tool registry per session based on registered capabilities, exposing only authorized tools. |
| 21-5 | [Update Metadata Endpoint for Per-Session Tool Exposure](./21-5.md) | Proposed | Ensure the /metadata endpoint returns only the tools available for the current session context and capabilities. |
| 21-6 | [Security and Spoofing Mitigation](./21-6.md) | Proposed | Review and implement security measures to mitigate spoofing and ensure only authorized tools are exposed per session. |
| 21-7 | [E2E Tests for Capability-Based Tool Exposure](./21-7.md) | Proposed | Develop end-to-end tests to verify correct tool exposure for each session type and capability set. |
| 21-8 | [Documentation: Capability Registration and Filtering](./21-8.md) | Proposed | Update developer and user documentation to describe capability registration, dynamic filtering, and security implications. |

</rewritten_file> 