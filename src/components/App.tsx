import React, { useEffect, useState } from "react";
import { initializePlugin, sendMessage } from "@concord-consortium/codap-plugin-api";
// import { CODAPCommandProcessor } from "./CODAPCommandProcessor"; // Disabled - conflicts with SSE browser worker
import { PairingBanner } from "./PairingBanner";
import "./App.css";

export const App = () => {
  const [dataContext, setDataContext] = useState<unknown>(null);
  const [codapResponse, setCodapResponse] = useState<unknown>(null);
  const [listenerNotification] = useState<string>("");

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
        // Don't assume CODAP is unavailable - the API might still work
        console.log("CODAP plugin initialization had issues, but continuing...", error);
        
        // Test if we can still use CODAP API directly
        try {
          await sendMessage("get", "interactiveFrame");
          console.log("CODAP interface is actually available despite initialization error");
        } catch {
          console.log("CODAP interface confirmed unavailable - running in standalone mode");
        }
      }
    };

    initializeCodapPlugin();
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

  return (
    <div className="App">
      <div className="title">CODAP MCP Plugin</div>
      
      <PairingBanner
        relayBaseUrl="https://codap-e9fut2tgz-cdorsey-concordorgs-projects.vercel.app"
        autoStart={false}
        onSessionCreated={(sessionData) => {
          console.log("Session created:", sessionData);
        }}
        onError={(error) => {
          console.error("Session error:", error);
        }}
      />
      
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
        <h3>CODAP Response</h3>
        <pre id={responseId}>{JSON.stringify(codapResponse, null, 2)}</pre>
      </div>

      <div className="section">
        <h3>Listener Notification</h3>
        <pre id={notificationId}>{listenerNotification}</pre>
      </div>

      {/* CODAPCommandProcessor disabled - using SSE-based browser worker instead */}
    </div>
  );
};
