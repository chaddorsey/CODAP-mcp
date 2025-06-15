import React, { useEffect, useState } from "react";
import { initializePlugin, sendMessage } from "@concord-consortium/codap-plugin-api";
import { 
  createMcpClient, 
  testEchoTool, 
  testAddNumbersTool, 
  testGetTimeTool, 
  listMcpTools, 
  testMcpDirectly, 
  testEchoDirectly,
  testCodapDatasetTool,
  createMcpDataInCodap
} from "../mcp-client";
import "./App.css";

export const App = () => {
  const [dataContext, setDataContext] = useState<unknown>(null);
  const [codapResponse, setCodapResponse] = useState<unknown>(null);
  const [listenerNotification] = useState<string>("");
  const [mcpResponse, setMcpResponse] = useState<string>("");
  const [mcpConnected, setMcpConnected] = useState<boolean>(false);

  const responseId = "response";
  const notificationId = "notification";

  useEffect(() => {
    const initializeCodapPlugin = async () => {
      try {
        await initializePlugin({
          pluginName: "CODAP MCP Plugin",
          version: "0.0.1",
          dimensions: { width: 380, height: 680 }
        });
        console.log("CODAP interface initialized");
      } catch (error) {
        console.error("CODAP initialization failed:", error);
      }
    };

    const initializeMcp = async () => {
      try {
        await createMcpClient();
        console.log("MCP client initialized successfully");
        setMcpConnected(true);
      } catch (error) {
        console.error("MCP initialization failed:", error);
        console.log("App will continue to work without MCP client");
      }
    };

    initializeCodapPlugin();
    initializeMcp();
  }, []);

  const handleCreateData = async () => {
    try {
      const result = await sendMessage("create", "dataContext", {
        name: "Sample Data",
        collections: [
          {
            name: "Cases",
            attrs: [
              { name: "x", type: "numeric" },
              { name: "y", type: "numeric" }
            ]
          }
        ]
      });
      setDataContext(result);
      setCodapResponse(result);
    } catch (error) {
      console.error("Error creating data context:", error);
      setCodapResponse({ error });
    }
  };

  const handleOpenTable = async () => {
    try {
      const result = await sendMessage("create", "component", {
        type: "caseTable",
        dataContext: "Sample Data"
      });
      setCodapResponse(result);
    } catch (error) {
      console.error("Error opening table:", error);
      setCodapResponse({ error });
    }
  };

  const handleGetResponse = async () => {
    try {
      const result = await sendMessage("get", "dataContext[Sample Data].allItems");
      setCodapResponse(result);
    } catch (error) {
      console.error("Error getting all items:", error);
      setCodapResponse({ error });
    }
  };

  // MCP Tool Test Functions (SDK-based)
  const handleTestEcho = async () => {
    try {
      const result = await testEchoTool("Hello from CODAP MCP Plugin!");
      setMcpResponse(result);
    } catch (error) {
      setMcpResponse(`Error: ${error}`);
    }
  };

  const handleTestAddNumbers = async () => {
    try {
      const result = await testAddNumbersTool(42, 58);
      setMcpResponse(result);
    } catch (error) {
      setMcpResponse(`Error: ${error}`);
    }
  };

  const handleTestGetTime = async () => {
    try {
      const result = await testGetTimeTool();
      setMcpResponse(result);
    } catch (error) {
      setMcpResponse(`Error: ${error}`);
    }
  };

  const handleListTools = async () => {
    try {
      const result = await listMcpTools();
      setMcpResponse(result);
    } catch (error) {
      setMcpResponse(`Error: ${error}`);
    }
  };

  // Direct HTTP Test Functions (bypass SDK)
  const handleTestMcpDirectly = async () => {
    console.log("handleTestMcpDirectly called");
    try {
      const result = await testMcpDirectly();
      console.log("testMcpDirectly result:", result);
      setMcpResponse(result);
    } catch (error) {
      console.error("testMcpDirectly error:", error);
      setMcpResponse(`Error: ${error}`);
    }
  };

  const handleTestEchoDirectly = async () => {
    try {
      const result = await testEchoDirectly("Hello via Direct HTTP!");
      setMcpResponse(result);
    } catch (error) {
      setMcpResponse(`Error: ${error}`);
    }
  };

  const handleTestCodapDataset = async () => {
    try {
      const result = await testCodapDatasetTool();
      setMcpResponse(result);
    } catch (error) {
      setMcpResponse(`Error: ${error}`);
    }
  };

  return (
    <div className="App">
      <div className="title">CODAP MCP Plugin</div>
      
      <div className="section">
        <h3>CODAP Functions</h3>
        <div className="buttons">
          <button onClick={handleCreateData}>
            Create some data
          </button>
          <button onClick={handleOpenTable} disabled={!dataContext}>
            Open Table
          </button>
          <button onClick={handleGetResponse}>
            See getAllItems response
          </button>
        </div>
      </div>

      <div className="section">
        <h3>MCP Tools (SDK) {mcpConnected ? "✅" : "❌"}</h3>
        <div className="buttons">
          <button onClick={handleListTools} disabled={!mcpConnected}>
            List MCP Tools
          </button>
          <button onClick={handleTestEcho} disabled={!mcpConnected}>
            Test Echo Tool
          </button>
          <button onClick={handleTestAddNumbers} disabled={!mcpConnected}>
            Test Add Numbers (42 + 58)
          </button>
          <button onClick={handleTestGetTime} disabled={!mcpConnected}>
            Get Server Time
          </button>
        </div>
      </div>

      <div className="section">
        <h3>MCP Tools (Direct HTTP) 🔧</h3>
        <div className="buttons">
          <button onClick={handleTestMcpDirectly}>
            Test List Tools (Direct)
          </button>
          <button onClick={handleTestEchoDirectly}>
            Test Echo Tool (Direct)
          </button>
          <button onClick={handleTestCodapDataset}>
            Test CODAP Dataset Tool
          </button>
        </div>
      </div>

      <div className="section">
        <h3>MCP + CODAP Integration 🚀</h3>
        <div className="buttons">
          <button onClick={async () => {
            try {
              const result = await createMcpDataInCodap();
              setMcpResponse(result);
            } catch (error) {
              setMcpResponse(`Error: ${error}`);
            }
          }}>
            Create MCP Data in CODAP
          </button>
        </div>
      </div>

      <div className="response-area">
        <label htmlFor={responseId}>CODAP Response:</label>
        <output id={responseId} className="response">
          { codapResponse ? JSON.stringify(codapResponse, null, 2) : "" }
        </output>
      </div>

      <div className="response-area">
        <label htmlFor="mcp-response">MCP Response:</label>
        <output id="mcp-response" className="response">
          { mcpResponse }
        </output>
      </div>

      <div className="response-area">
        <label htmlFor={notificationId}>Listener Notification:</label>
        <output id={notificationId} className="response">
          { listenerNotification && listenerNotification }
        </output>
      </div>
    </div>
  );
};
