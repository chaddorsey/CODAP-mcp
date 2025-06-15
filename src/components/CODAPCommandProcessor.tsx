import React, { useEffect, useRef, useCallback } from "react";
import { sendMessage } from "@concord-consortium/codap-plugin-api";

interface CODAPCommand {
  id: string;
  action: string;
  resource: string;
  values: any;
  timestamp: number;
  status: "pending" | "completed" | "error";
  result?: any;
  error?: string;
}

const API_SERVER_URL = "http://localhost:8083";

export const CODAPCommandProcessor: React.FC = () => {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  const processCommand = async (command: CODAPCommand) => {
    try {
      console.log(`Executing CODAP command: ${command.action} ${command.resource}`, command.values);
      
      let result;
      
      // Execute the CODAP command based on action and resource
      if (command.action === "create" && command.resource === "dataContext") {
        result = await sendMessage("create", "dataContext", command.values);
      } else if (command.action === "create" && command.resource === "item") {
        result = await sendMessage("create", "item", command.values);
      } else if (command.action === "createItems" && command.resource === "dataContext") {
        // Use the createItems function for bulk data insertion
        const { createItems } = await import("@concord-consortium/codap-plugin-api");
        result = await createItems(command.values.dataContext, command.values.items);
      } else if (command.action === "create" && command.resource === "component") {
        result = await sendMessage("create", "component", command.values);
      } else if (command.action === "get" && command.resource === "dataContextList") {
        result = await sendMessage("get", "dataContextList");
      } else if (command.action === "get" && command.resource === "componentList") {
        result = await sendMessage("get", "componentList");
      } else if (command.action === "get" && command.resource === "dataContext") {
        result = await sendMessage("get", "dataContext", command.values);
      } else {
        throw new Error(`Unsupported command: ${command.action} ${command.resource}`);
      }

      console.log("CODAP command result:", result);

      // Send result back to API server
      await fetch(`${API_SERVER_URL}/api/codap/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commandId: command.id,
          success: true,
          result
        })
      });

    } catch (error) {
      console.error(`Error executing CODAP command ${command.id}:`, error);
      
      // Send error back to API server
      await fetch(`${API_SERVER_URL}/api/codap/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commandId: command.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      });
    }
  };

  const pollForCommands = useCallback(async () => {
    if (isProcessingRef.current) {
      return; // Avoid overlapping polls
    }

    try {
      isProcessingRef.current = true;
      
      const response = await fetch(`${API_SERVER_URL}/api/codap/commands`);
      if (!response.ok) {
        console.error("Failed to fetch commands:", response.statusText);
        return;
      }

      const data = await response.json();
      if (data.success && data.commands && data.commands.length > 0) {
        console.log(`Processing ${data.commands.length} CODAP commands`);
        
        for (const command of data.commands) {
          await processCommand(command);
        }
      }
    } catch (error) {
      console.error("Error polling for commands:", error);
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Start polling for commands
    console.log("Starting CODAP command processor...");
    
    // Initial poll
    pollForCommands();
    
    // Set up interval polling
    pollingIntervalRef.current = setInterval(pollForCommands, 1000); // Poll every second

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      console.log("CODAP command processor stopped");
    };
  }, [pollForCommands]);

  return (
    <div style={{ 
      position: "fixed", 
      bottom: "10px", 
      right: "10px", 
      background: "#f0f0f0", 
      padding: "8px", 
      borderRadius: "4px",
      fontSize: "12px",
      color: "#666",
      border: "1px solid #ddd"
    }}>
      🔄 CODAP Command Processor Active
    </div>
  );
}; 
