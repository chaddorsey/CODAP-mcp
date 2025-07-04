# CODAP MCP Claude Desktop Extension

## Overview
This extension enables Claude Desktop to control CODAP via the Model Context Protocol (MCP) using a one-click installable Desktop Extension (.dxt).

---

## User Guide

### Installation
1. Build the extension (or download the `.dxt` file).
2. Open Claude Desktop and go to Settings > Extensions.
3. Drag-and-drop the `.dxt` file into the Extensions window, or use the "Install" button.
4. Confirm the extension appears in the list and is enabled.

### Connecting to CODAP
1. Start or access your CODAP session in the browser.
2. Copy the session code from the CODAP plugin.
3. In Claude, use the extension to connect to your session (e.g., via the `connect_to_session` tool).
4. Use available tools to interact with CODAP.

### Troubleshooting
- **Extension not listed?** Ensure you are using the latest Claude Desktop and the `.dxt` file is valid.
- **Tool calls not working?** Check your session code and network connection.
- **Errors in logs?** See Claude Desktop logs and extension stderr for details.

---

## Developer Guide

### Build & Packaging
1. Install dependencies:
   ```sh
   npm install
   ```
2. Build the extension package:
   ```sh
   npm run build:dxt
   ```
   This produces a `.dxt` file ready for install.

### Update & Test
- Update `manifest.json` or `server/index.js` as needed.
- Rebuild the extension after changes.
- Use the E2E test protocol (see below) to validate.

### E2E Test Protocol
1. Build and install the extension as above.
2. Use Claude Desktop to discover and invoke tools.
3. Verify tool calls are relayed to the remote MCP server and responses are received.
4. Check logs for errors.

### Contribution Guidelines
- Fork the repo and create a feature branch.
- Make changes and submit a pull request.
- Ensure all tests and build steps pass before submitting.

---

## FAQ
- **Can I use this with a local CODAP instance?**
  - The extension is designed to relay all calls to the remote MCP server. Local integration is not currently supported.
- **How do I update the extension?**
  - Rebuild and reinstall the `.dxt` file, or use the update feature in Claude Desktop if available.

---

For more details, see the project documentation in `docs/delivery/19/`.
