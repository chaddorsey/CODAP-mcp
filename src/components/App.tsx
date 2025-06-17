import React, { useEffect, useState } from "react";
import { initializePlugin, sendMessage } from "@concord-consortium/codap-plugin-api";
import { CODAPCommandProcessor } from "./CODAPCommandProcessor";
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
        // This is expected when running standalone (not embedded in CODAP)
        console.log("Running in standalone mode (CODAP not available)");
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
        relayBaseUrl="https://codap-mcp-cdorsey-concordorgs-projects.vercel.app"
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

      <CODAPCommandProcessor />
    </div>
  );
};
