/**
 * CODAP Tool Registry for MCP Server
 * Exports the complete set of CODAP tools for registration with the MCP server
 */

const CODAP_TOOLS = [
  {
    name: "initializePlugin",
    title: "Initialize CODAP Plugin",
    description: "Initialize the CODAP plugin with name, title, and version",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Plugin name" },
        title: { type: "string", description: "Plugin title" },
        version: { type: "string", description: "Plugin version" }
      },
      required: ["name", "title", "version"]
    }
  }
];

// Export for CommonJS compatibility
module.exports = { CODAP_TOOLS };
