import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App";
import "./index.scss";

import { createMcpClient } from "./mcp-client";

async function main() {
  // Render the app first
  const container = document.getElementById("app");
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }

  // Then try to initialize MCP client in the background
  try {
    await createMcpClient();
    console.log("MCP client initialized successfully");
  } catch (error) {
    console.error("Failed to initialize MCP client:", error);
    console.log("App will continue to work without MCP client");
  }
}

main();

