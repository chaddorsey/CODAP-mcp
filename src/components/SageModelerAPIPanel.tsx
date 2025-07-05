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

  // Memoize the logApiCall function to prevent unnecessary re-renders
  const logApiCall = useCallback((message: string, type: "info" | "success" | "error" | "request" | "response" = "info") => {
    if (typeof onClearLogs === "function") {
      // Add the log entry to the parent component's log state
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
      console.log(logEntry);
      
      // Notify parent component about the new log
      if (typeof window !== "undefined" && (window as any).handleApiCallLog) {
        (window as any).handleApiCallLog(logEntry);
      }
    }
  }, [onClearLogs]);

  // Enhanced status management
  const updateStatus = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    setStatus(message);
    logApiCall(message, type === "info" ? "info" : type);
  }, [logApiCall]);

  // Mock data function for UI testing
  const getMockResult = useCallback((toolName: string, parameters: any) => {
    switch (toolName) {
      case "sage_get_all_nodes":
        return {
          nodes: [
            { id: "node1", title: "Population", data: { title: "Population" } },
            { id: "node2", title: "Birth Rate", data: { title: "Birth Rate" } },
            { id: "node3", title: "Death Rate", data: { title: "Death Rate" } }
          ]
        };
      case "sage_get_node_by_id":
        return {
          node: {
            id: parameters.nodeId,
            title: "Sample Node",
            initialValue: 100,
            x: 200,
            y: 150,
            color: "#f7be33",
            allowNegativeValues: true,
            usesDefaultImage: true,
            isAccumulator: false,
            isFlowVariable: false,
            valueDefinedSemiQuantitatively: false
          }
        };
      case "sage_create_node":
        return {
          id: `node_${Date.now()}`,
          ...parameters
        };
      case "sage_update_node":
        return { success: true };
      case "sage_delete_node":
        return { success: true };
      default:
        return { success: true, message: `Mock result for ${toolName}` };
    }
  }, []);

  // Memoize the executeTool function to prevent infinite loops
  const executeTool = useCallback(async (toolName: string, parameters: any) => {
    if (!browserWorker || !browserWorker?.isRunning) {
      // For UI testing when backend is down - return mock data
      const mockResult = getMockResult(toolName, parameters);
      logApiCall(`${toolName} (MOCK DATA)`, "request");
      logApiCall(JSON.stringify(parameters, null, 2), "request");
      logApiCall(`${toolName} completed with mock data`, "success");
      logApiCall(JSON.stringify(mockResult, null, 2), "response");
      setStatus(`${toolName} completed successfully (MOCK DATA)`);
      return mockResult;
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
  }, [browserWorker, logApiCall, getMockResult]);

  // Node Management Functions
  const refreshAvailableNodes = useCallback(async () => {
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
    } catch {
      // Error already logged and status set by executeTool
      setAvailableNodes([]);
    }
  }, [executeTool, updateStatus]);

  const createSelectedLink = useCallback(async () => {
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
      const statusMessage = 
        `Link created: ${sourceNode?.title || linkData.sourceNode} → ${targetNode?.title || linkData.targetNode}`;
      updateStatus(statusMessage, "success");
      
      if (result?.id) {
        setSelectedLinkId(result.id);
      }
    } catch {
      // Error already logged and status set by executeTool
    }
  }, [linkData, availableNodes, executeTool, updateStatus]);

  const updateSelectedLink = useCallback(async () => {
    if (!selectedLinkId) {
      updateStatus("No link selected for update", "error");
      return;
    }

    try {
      await executeTool("sage_update_link", { id: selectedLinkId, ...linkData });
      updateStatus(`Link ${selectedLinkId} updated successfully`, "success");
    } catch {
      // Error already logged and status set by executeTool
    }
  }, [selectedLinkId, linkData, executeTool, updateStatus]);

  const reloadNodes = useCallback(async () => {
    await refreshAvailableNodes();
  }, [refreshAvailableNodes]);

  const runExperiment = useCallback(async () => {
    try {
      updateStatus("Starting experiment...", "info");
      const result = await executeTool("sage_run_experiment", {});
      if (result) {
        updateStatus("Experiment completed successfully", "success");
      } else {
        updateStatus("Experiment started", "success");
      }
    } catch {
      // Error already logged and status set by executeTool
    }
  }, [executeTool, updateStatus]);

  // Initialize nodes when browser worker becomes available
  useEffect(() => {
    if (browserWorker?.isRunning) {
      refreshAvailableNodes();
    }
  }, [browserWorker?.isRunning, refreshAvailableNodes]);

  const handleTabChange = useCallback((tabId: TabId) => {
    logApiCall(`Switched to ${tabId} tab`, "info");
    updateStatus(`Viewing ${tabId} tab`, "info");
  }, [logApiCall, updateStatus]);

  const handleSubTabChange = useCallback((subTabId: SubTabId) => {
    logApiCall(`Switched to ${subTabId} sub-tab`, "info");
    updateStatus(`Viewing ${subTabId} controls`, "info");
  }, [logApiCall, updateStatus]);

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
          <div className={`sage-accordion-content ${isVisible ? "active" : ""}`}>
            <div className="sage-controls-panel">
              <div className="sage-status">{status}</div>
              


              <TabSystem onTabChange={handleTabChange} onSubTabChange={handleSubTabChange}>
                {/* Nodes Sub-tab */}
                <NodesTab 
                  tabId="nodes" 
                  subTabId="nodes" 
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
                    <button onClick={() => executeTool("sage_export_model", {})}>Export Model</button>
                    <button onClick={() => executeTool("sage_import_model", {})}>Import Model</button>
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
