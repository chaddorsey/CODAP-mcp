import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserWorkerService } from "../services/BrowserWorkerService";
import { TabSystem, TabContent, NodesTab, RecordingTab, SettingsTab, InspectorTab } from "./tabs";
import { TabId, SubTabId } from "../types/tabs";
import "./SageModelerAPIPanel.css";

interface SageModelerAPIPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  apiCallLogs: string[];
  onClearLogs: () => void;
  browserWorker: BrowserWorkerService | null;
}

// NodeData interface removed - now handled by NodesTab component

interface LinkData {
  id?: string;
  sourceNode?: string;
  targetNode?: string;
  relationVector?: string;
  relationScalar?: string;
  customData?: string;
}

export const SageModelerAPIPanel: React.FC<SageModelerAPIPanelProps> = ({
  isVisible,
  onToggle,
  apiCallLogs,
  onClearLogs,
  browserWorker
}) => {
  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [linkData, setLinkData] = useState<LinkData>({
    relationVector: "increase",
    relationScalar: "aboutTheSame"
  });
  const [availableNodes, setAvailableNodes] = useState<{id: string, title: string}[]>([]);
  const [status, setStatus] = useState("Ready to control SageModeler");
  const logRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when logs update
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [apiCallLogs]);

  // Enhanced logging system with different message types
  const logApiCall = (message: string, type: "info" | "success" | "error" | "request" | "response" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    let formattedMessage = `[${timestamp}] `;
    
    switch (type) {
      case "request":
        formattedMessage += `📤 REQUEST: ${message}`;
        break;
      case "response":
        formattedMessage += `📥 RESPONSE: ${message}`;
        break;
      case "success":
        formattedMessage += `✅ SUCCESS: ${message}`;
        break;
      case "error":
        formattedMessage += `❌ ERROR: ${message}`;
        break;
      case "info":
      default:
        formattedMessage += `ℹ️ ${message}`;
        break;
    }

    const event = new CustomEvent("sage-api-call", {
      detail: { message: formattedMessage }
    });
    window.dispatchEvent(event);
  };

  // Enhanced tool execution with comprehensive error handling and logging
  const executeTool = async (toolName: string, parameters: any) => {
    if (!browserWorker) {
      const errorMsg = "Browser worker not available";
      logApiCall(errorMsg, "error");
      setStatus(`Error: ${errorMsg}`);
      return Promise.reject(new Error(errorMsg));
    }

    if (!browserWorker?.isRunning) {
      const errorMsg = "Browser worker not running";
      logApiCall(errorMsg, "error");
      setStatus(`Error: ${errorMsg}`);
      return Promise.reject(new Error(errorMsg));
    }

    try {
      // Update status and log request
      setStatus(`Executing ${toolName}...`);
      logApiCall(`${toolName}`, "request");
      logApiCall(JSON.stringify(parameters, null, 2), "request");

      // Execute the tool with timeout
      const startTime = Date.now();
      const result = await Promise.race([
        browserWorker.executeTool(toolName, parameters),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Tool execution timeout")), 30000)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      // Log successful response
      logApiCall(`${toolName} completed in ${duration}ms`, "success");
      if (result && typeof result === "object") {
        logApiCall(JSON.stringify(result, null, 2), "response");
      } else {
        logApiCall(String(result), "response");
      }
      
      setStatus(`${toolName} completed successfully`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logApiCall(`${toolName} failed: ${errorMessage}`, "error");
      setStatus(`${toolName} failed: ${errorMessage}`);
      throw error;
    }
  };

  // Enhanced status management
  const updateStatus = (message: string, type: "info" | "success" | "error" = "info") => {
    setStatus(message);
    logApiCall(message, type === "info" ? "info" : type);
  };

  // Node Management Functions
  // Node management functions removed - now handled by NodesTab component

  const refreshAvailableNodes = async () => {
    try {
      updateStatus("Refreshing available nodes...", "info");
      const result = await executeTool("sage_get_all_nodes", {});
      if (result?.nodes) {
        const nodeList = result.nodes.map((node: any) => ({ 
          id: node.id || node.key, 
          title: node.title || node.data?.title || `Node ${node.id}` 
        }));
        setAvailableNodes(nodeList);
        updateStatus(`Loaded ${nodeList.length} nodes`, "success");
      } else {
        setAvailableNodes([]);
        updateStatus("No nodes found in model", "info");
      }
    } catch (error) {
      // Error already logged and status set by executeTool
      setAvailableNodes([]);
    }
  };

  const createSelectedLink = async () => {
    if (!linkData.sourceNode || !linkData.targetNode) {
      updateStatus("Please select both source and target nodes", "error");
      return;
    }

    if (linkData.sourceNode === linkData.targetNode) {
      updateStatus("Source and target nodes must be different", "error");
      return;
    }

    try {
      const result = await executeTool("sage_create_link", linkData);
      const sourceNode = availableNodes.find(n => n.id === linkData.sourceNode);
      const targetNode = availableNodes.find(n => n.id === linkData.targetNode);
      updateStatus(`Link created: ${sourceNode?.title || linkData.sourceNode} → ${targetNode?.title || linkData.targetNode}`, "success");
      
      if (result?.id) {
        setSelectedLinkId(result.id);
      }
    } catch (error) {
      // Error already logged and status set by executeTool
    }
  };

  const updateSelectedLink = async () => {
    if (!selectedLinkId) {
      updateStatus("No link selected for update", "error");
      return;
    }

    try {
      await executeTool("sage_update_link", { id: selectedLinkId, ...linkData });
      updateStatus(`Link ${selectedLinkId} updated successfully`, "success");
    } catch (error) {
      // Error already logged and status set by executeTool
    }
  };

  const reloadNodes = async () => {
    await refreshAvailableNodes();
  };

  const runExperiment = async () => {
    try {
      updateStatus("Starting experiment...", "info");
      const result = await executeTool("sage_run_experiment", {});
      if (result) {
        updateStatus("Experiment completed successfully", "success");
      } else {
        updateStatus("Experiment started", "success");
      }
    } catch (error) {
      // Error already logged and status set by executeTool
    }
  };

  // Ensure the following useEffect is inside the SageModelerAPIPanel component, after browserWorker and refreshAvailableNodes are defined
  useEffect(() => {
    if (browserWorker?.isRunning) {
      refreshAvailableNodes();
    }
    // Only run when browserWorker?.isRunning transitions to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserWorker?.isRunning]);

  const handleTabChange = useCallback((tabId: TabId) => {
    logApiCall(`Switched to ${tabId} tab`, "info");
    updateStatus(`Viewing ${tabId} tab`, "info");
  }, []);

  const handleSubTabChange = useCallback((subTabId: SubTabId) => {
    logApiCall(`Switched to ${subTabId} sub-tab`, "info");
    updateStatus(`Viewing ${subTabId} controls`, "info");
  }, []);

  return (
    <div className="sage-api-panel">
      <div className="sage-accordion">
        <button 
          className={`sage-accordion-header ${isVisible ? "" : "collapsed"}`}
          onClick={onToggle}
        >
          <span className="arrow">&#9660;</span>
          Direct SageModeler API tools
        </button>
        
        {isVisible && (
          <div className="sage-accordion-content">
            <div className="sage-controls-panel">
              <div className="sage-status">{status}</div>
              
              <TabSystem onTabChange={handleTabChange} onSubTabChange={handleSubTabChange}>
                {/* Nodes Sub-tab */}
                <NodesTab 
                  tabId="nodes" 
                  subTabId="nodes" 
                  isActive={true}
                  onExecuteTool={executeTool}
                />

                {/* Links Sub-tab */}
                <TabContent tabId="nodes" subTabId="links">
                  <div className="sage-subtab-content">
                    <div className="sage-button-row">
                      <button 
                        onClick={createSelectedLink}
                        disabled={!linkData.sourceNode || !linkData.targetNode}
                      >
                        Create Link
                      </button>
                      <button 
                        onClick={updateSelectedLink}
                        disabled={!selectedLinkId}
                      >
                        Update Link
                      </button>
                    </div>

                    <div className="sage-input-row">
                      <div className="sage-input-group">
                        <label>Source Node:</label>
                        <select 
                          value={linkData.sourceNode || ""} 
                          onChange={(e) => setLinkData({...linkData, sourceNode: e.target.value})}
                        >
                          <option value="">Select source...</option>
                          {availableNodes.map(node => (
                            <option key={node.id} value={node.id}>{node.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sage-input-group">
                        <label>Target Node:</label>
                        <select 
                          value={linkData.targetNode || ""} 
                          onChange={(e) => setLinkData({...linkData, targetNode: e.target.value})}
                        >
                          <option value="">Select target...</option>
                          {availableNodes.map(node => (
                            <option key={node.id} value={node.id}>{node.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sage-input-row">
                      <div className="sage-input-group">
                        <label>Relation Vector:</label>
                        <select 
                          value={linkData.relationVector || "increase"} 
                          onChange={(e) => setLinkData({...linkData, relationVector: e.target.value})}
                        >
                          <option value="increase">Increase</option>
                          <option value="decrease">Decrease</option>
                          <option value="vary">Vary (Custom)</option>
                        </select>
                      </div>
                      <div className="sage-input-group">
                        <label>Relation Scalar:</label>
                        <select 
                          value={linkData.relationScalar || "aboutTheSame"} 
                          onChange={(e) => setLinkData({...linkData, relationScalar: e.target.value})}
                        >
                          <option value="aboutTheSame">About the Same</option>
                          <option value="aLittle">A Little</option>
                          <option value="aLot">A Lot</option>
                          <option value="moreAndMore">More and More</option>
                          <option value="lessAndLess">Less and Less</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </TabContent>

                {/* Experiment Tab */}
                <TabContent tabId="experiment">
                  <div className="sage-button-row">
                    <button onClick={reloadNodes}>Reload Nodes</button>
                    <button onClick={runExperiment}>Run Experiment</button>
                  </div>
                </TabContent>

                {/* Recording Tab */}
                <RecordingTab 
                  tabId="recording" 
                  onExecuteTool={executeTool}
                />

                {/* Import/Export Tab */}
                <TabContent tabId="import">
                  <div className="sage-button-row">
                    <button onClick={() => executeTool("sage_export_model", {})}>
                      Export Model
                    </button>
                    <button onClick={() => executeTool("sage_get_simulation_state", {})}>
                      Get Simulation State
                    </button>
                  </div>
                </TabContent>

                {/* Settings Tab */}
                <SettingsTab 
                  tabId="settings" 
                  onExecuteTool={executeTool}
                />

                {/* Inspector Tab */}
                <InspectorTab 
                  tabId="inspector" 
                  onExecuteTool={executeTool}
                />
              </TabSystem>

              {/* API Call Log */}
              <div className="sage-log-section">
                <div className="sage-log-header">
                  <span>API Call Log</span>
                  <button className="sage-clear-btn" onClick={onClearLogs}>
                    Clear
                  </button>
                </div>
                <div className="sage-log" ref={logRef}>
                  {apiCallLogs.map((log, index) => (
                    <div key={index} className="sage-log-entry">
                      {log}
                    </div>
                  ))}
                  {apiCallLogs.length === 0 && (
                    <div className="sage-log-entry sage-log-empty">
                      No API calls yet. Try using the tools above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 
