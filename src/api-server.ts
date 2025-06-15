// src/api-server.ts
import express from "express";
import cors from "cors";

const app = express();
const PORT = 8083; // Different port from webpack dev server (8082)

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to generate sample data
function generateSampleData(dataType: string, recordCount: number) {
  const data: any[] = [];
  let attributes: any[] = [];

  switch (dataType) {
    case "random_numbers": {
      attributes = [
        { name: "x", type: "numeric" },
        { name: "y", type: "numeric" },
        { name: "category", type: "categorical" }
      ];
      for (let i = 0; i < recordCount; i++) {
        data.push({
          x: Math.round(Math.random() * 100),
          y: Math.round(Math.random() * 100),
          category: ["A", "B", "C"][Math.floor(Math.random() * 3)]
        });
      }
      break;
    }
      
    case "sample_students": {
      attributes = [
        { name: "name", type: "categorical" },
        { name: "grade", type: "numeric" },
        { name: "subject", type: "categorical" },
        { name: "score", type: "numeric" }
      ];
      const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"];
      const subjects = ["Math", "Science", "English", "History"];
      for (let i = 0; i < recordCount; i++) {
        data.push({
          name: names[Math.floor(Math.random() * names.length)],
          grade: Math.floor(Math.random() * 4) + 9,
          subject: subjects[Math.floor(Math.random() * subjects.length)],
          score: Math.round(Math.random() * 40 + 60)
        });
      }
      break;
    }
      
    case "time_series": {
      attributes = [
        { name: "date", type: "categorical" },
        { name: "value", type: "numeric" },
        { name: "trend", type: "numeric" }
      ];
      const startDate = new Date();
      for (let i = 0; i < recordCount; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        data.push({
          date: date.toISOString().split("T")[0],
          value: Math.round(Math.random() * 50 + 25),
          trend: Math.round((i * 0.5) + Math.random() * 10)
        });
      }
      break;
    }
  }

  return { data, attributes };
}

// Store for CODAP commands to be executed by the frontend
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

const commandQueue: CODAPCommand[] = [];
const completedCommands = new Map<string, CODAPCommand>();

// Generate unique command ID
function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "CODAP API Server",
    queueLength: commandQueue.length,
    completedCount: completedCommands.size
  });
});

// Frontend polls this endpoint to get pending CODAP commands
app.get("/api/codap/commands", (req, res) => {
  const pendingCommands = commandQueue.splice(0); // Get all and clear queue
  res.json({
    success: true,
    commands: pendingCommands
  });
});

// Frontend posts results of executed CODAP commands
app.post("/api/codap/results", (req, res) => {
  try {
    const { commandId, success, result, error } = req.body;
    
    const command = completedCommands.get(commandId);
    if (command) {
      command.status = success ? "completed" : "error";
      command.result = result;
      command.error = error;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error processing command result:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Wait for command completion
async function waitForCommandCompletion(commandId: string, timeoutMs = 10000): Promise<CODAPCommand> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const command = completedCommands.get(commandId);
      
      if (command && command.status !== "pending") {
        clearInterval(checkInterval);
        resolve(command);
      }
      
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        reject(new Error(`Command ${commandId} timed out after ${timeoutMs}ms`));
      }
    }, 100);
  });
}

// Create dataset in CODAP
app.post("/api/codap/createDataset", async (req, res) => {
  try {
    const { name, attributes, data, dataType, recordCount } = req.body;
    
    let finalData = data;
    let finalAttributes = attributes;
    
    // Generate data if not provided
    if (!finalData && dataType && recordCount) {
      const generated = generateSampleData(dataType, recordCount);
      finalData = generated.data;
      finalAttributes = generated.attributes;
    }
    
    // Create command for data context creation
    const dataContextCommandId = generateCommandId();
    const dataContextCommand: CODAPCommand = {
      id: dataContextCommandId,
      action: "create",
      resource: "dataContext",
      values: {
        name,
        collections: [
          {
            name: "Cases",
            attrs: finalAttributes
          }
        ]
      },
      timestamp: Date.now(),
      status: "pending"
    };
    
    commandQueue.push(dataContextCommand);
    completedCommands.set(dataContextCommandId, dataContextCommand);
    
    // Wait for data context creation
    const dataContextResult = await waitForCommandCompletion(dataContextCommandId);
    
    if (dataContextResult.status === "error") {
      throw new Error(dataContextResult.error || "Failed to create data context");
    }
    
    // Add cases if data provided using createItems approach
    let casesResult = null;
    if (finalData && finalData.length > 0) {
      const casesCommandId = generateCommandId();
      const casesCommand: CODAPCommand = {
        id: casesCommandId,
        action: "createItems",
        resource: "dataContext",
        values: {
          dataContext: name,
          items: finalData  // Direct data array without wrapping
        },
        timestamp: Date.now(),
        status: "pending"
      };
      
      commandQueue.push(casesCommand);
      completedCommands.set(casesCommandId, casesCommand);
      
      casesResult = await waitForCommandCompletion(casesCommandId);
      
      if (casesResult.status === "error") {
        throw new Error(casesResult.error || "Failed to add cases");
      }
    }
    
    res.json({
      success: true,
      dataContext: dataContextResult.result,
      cases: casesResult?.result,
      recordCount: finalData?.length || 0,
      attributes: finalAttributes
    });
    
  } catch (error) {
    console.error("Error creating dataset:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get all datasets from CODAP
app.post("/api/codap/getDatasets", async (req, res) => {
  try {
    const commandId = generateCommandId();
    const command: CODAPCommand = {
      id: commandId,
      action: "get",
      resource: "dataContextList",
      values: {},
      timestamp: Date.now(),
      status: "pending"
    };
    
    commandQueue.push(command);
    completedCommands.set(commandId, command);
    
    const result = await waitForCommandCompletion(commandId);
    
    if (result.status === "error") {
      throw new Error(result.error || "Failed to get datasets");
    }
    
    res.json({
      success: true,
      datasets: result.result
    });
  } catch (error) {
    console.error("Error getting datasets:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add cases to existing dataset
app.post("/api/codap/addCases", async (req, res) => {
  try {
    const { datasetName, cases } = req.body;
    
    // Create items individually for better compatibility
    const allResults = [];
    
    for (const caseItem of cases) {
      const commandId = generateCommandId();
              const command: CODAPCommand = {
          id: commandId,
          action: "create",
          resource: "item",
          values: {
            dataContext: datasetName,
            item: {
              values: caseItem  // Wrap data in values property
            }
          },
          timestamp: Date.now(),
          status: "pending"
        };
      
      commandQueue.push(command);
      completedCommands.set(commandId, command);
      
      const result = await waitForCommandCompletion(commandId);
      
      if (result.status === "error") {
        throw new Error(result.error || "Failed to add case");
      }
      
      allResults.push(result.result);
    }
    
    res.json({
      success: true,
      results: allResults,
      casesAdded: cases.length
    });
  } catch (error) {
    console.error("Error adding cases:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Create graph/visualization
app.post("/api/codap/createGraph", async (req, res) => {
  try {
    const { datasetName, graphType, xAttribute, yAttribute, title } = req.body;
    
    // Map graph types to CODAP component types
    const componentTypeMap: Record<string, string> = {
      scatterplot: "graph",
      histogram: "graph",
      bar_chart: "graph",
      line_graph: "graph"
    };
    
    const componentType = componentTypeMap[graphType] || "graph";
    
    const commandId = generateCommandId();
    const command: CODAPCommand = {
      id: commandId,
      action: "create",
      resource: "component",
      values: {
        type: componentType,
        dataContext: datasetName,
        title: title || `${graphType} of ${datasetName}`,
        dimensions: { width: 400, height: 300 },
        position: { left: 50, top: 50 }
      },
      timestamp: Date.now(),
      status: "pending"
    };
    
    // Add graph-specific configuration
    if (xAttribute || yAttribute) {
      command.values.configuration = {};
      if (xAttribute) command.values.configuration.xAttributeName = xAttribute;
      if (yAttribute) command.values.configuration.yAttributeName = yAttribute;
    }
    
    commandQueue.push(command);
    completedCommands.set(commandId, command);
    
    const result = await waitForCommandCompletion(commandId);
    
    if (result.status === "error") {
      throw new Error(result.error || "Failed to create graph");
    }
    
    res.json({
      success: true,
      result: result.result,
      graphType,
      datasetName
    });
  } catch (error) {
    console.error("Error creating graph:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get CODAP status
app.post("/api/codap/getStatus", async (req, res) => {
  try {
    const commandId = generateCommandId();
    const command: CODAPCommand = {
      id: commandId,
      action: "get",
      resource: "componentList",
      values: {},
      timestamp: Date.now(),
      status: "pending"
    };
    
    commandQueue.push(command);
    completedCommands.set(commandId, command);
    
    const result = await waitForCommandCompletion(commandId);
    
    if (result.status === "error") {
      throw new Error(result.error || "Failed to get status");
    }
    
    res.json({
      success: true,
      status: "connected",
      components: result.result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error getting status:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Export data from CODAP
app.post("/api/codap/exportData", async (req, res) => {
  try {
    const { datasetName, format } = req.body;
    
    // Get the data from CODAP
    const commandId = generateCommandId();
    const command: CODAPCommand = {
      id: commandId,
      action: "get",
      resource: "dataContext",
      values: {
        name: datasetName
      },
      timestamp: Date.now(),
      status: "pending"
    };
    
    commandQueue.push(command);
    completedCommands.set(commandId, command);
    
    const result = await waitForCommandCompletion(commandId);
    
    if (result.status === "error") {
      throw new Error(result.error || "Failed to export data");
    }
    
    // Format the data based on requested format
    let formattedData = result.result;
    let contentType = "application/json";
    
    if (format === "csv" || format === "tsv") {
      // Convert to CSV/TSV format
      const separator = format === "csv" ? "," : "\t";
      const data = result.result;
      
      if (data?.collections?.[0]?.cases) {
        const cases = data.collections[0].cases;
        const attributes = data.collections[0].attrs || [];
        
        // Create header row
        const headers = attributes.map((attr: any) => attr.name).join(separator);
        
        // Create data rows
        const rows = cases.map((case_: any) => {
          return attributes.map((attr: any) => {
            const value = case_.values[attr.name];
            return value !== undefined ? value : "";
          }).join(separator);
        });
        
        formattedData = [headers, ...rows].join("\n");
        contentType = "text/plain";
      }
    }
    
    res.json({
      success: true,
      data: formattedData,
      format,
      datasetName,
      contentType
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Cleanup old completed commands periodically
setInterval(() => {
  const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
  for (const [id, command] of completedCommands.entries()) {
    if (command.timestamp < cutoffTime) {
      completedCommands.delete(id);
    }
  }
}, 60000); // Run every minute

// Start server
app.listen(PORT, () => {
  console.log(`CODAP API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Commands endpoint: http://localhost:${PORT}/api/codap/commands`);
});

export default app; 
