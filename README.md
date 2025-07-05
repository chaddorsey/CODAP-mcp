# CODAP MCP Dual-Mode Plugin

## Overview

The CODAP MCP plugin now supports both CODAP and SageModeler environments in a single, unified interface. Users can dynamically switch between modes, with the plugin automatically loading the appropriate tool registry and API routing for each environment. This enables seamless LLM-driven and direct API tool calls for both applications.

- **Dual-Mode:** Switch between CODAP and SageModeler modes using the UI
- **Dynamic Tool Registry:** Tools are registered and routed based on the selected mode
- **Direct API Panel:** SageModeler mode includes a developer-facing API test panel
- **Robust Worker Startup:** Stable, session-driven worker management ensures reliability

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the plugin:**
   ```bash
   npm start
   ```
3. **Switch modes:**
   - Use the mode switch in the lower-left corner to toggle between CODAP and SageModeler
4. **Connect to Claude:**
   - Use the connection panel to copy the prompt and connect Claude Desktop for LLM-driven tool calls

## Tool Registry and Capabilities

- **CODAP Mode:**
  - All standard CODAP tools are available
- **SageModeler Mode:**
  - All CODAP tools **plus** SageModeler-specific tools (see audit doc for full list)
- The plugin automatically registers and routes tool calls based on the selected mode

## Using the SageModeler API Panel

- In SageModeler mode, open the "Direct SageModeler API tools" panel
- Use the UI to trigger API calls, view responses, and debug tool execution
- All calls are routed through the MCP relay and tool registry

## E2E Testing

- Run all end-to-end tests with:
  ```bash
  npm run test:playwright
  ```
- Tests cover both LLM-driven and direct UI tool calls in both modes
- See `playwright/e2e/` for test definitions

## Troubleshooting

- **Worker not starting?**
  - Ensure a session is generated and the plugin is connected
  - Check browser console for errors
- **Tools not available?**
  - Verify the correct mode is selected
  - Check the tool registry in the developer console
- **Logs and Debugging:**
  - Use the API panel and browser console for detailed logs

## Developer Notes

- **Adding New Tools:**
  - Update the tool registry and schemas in `src/services/browserWorker/schemas/toolSchemas.ts`
  - Register new tools in the appropriate capability section
- **Extending Dual-Mode Support:**
  - Add new capabilities or modes by updating the plugin mode logic and registry
- **Maintaining E2E Tests:**
  - Add new tests in `playwright/e2e/` as new tools or features are added

## Links

- [PBI 20 PRD](docs/delivery/20/prd.md)
- [Audit Results](docs/delivery/20/20-5-audit-results.md)
