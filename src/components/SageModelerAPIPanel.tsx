import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserWorkerService } from "../services/BrowserWorkerService";
import { TabSystem, TabContent, RecordingTab, SettingsTab, InspectorTab } from "./tabs";
import { TabId, SubTabId } from "../types/tabs";
import "./SageModelerAPIPanel.css";

interface SageModelerAPIPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  apiCallLogs: string[];
  onClearLogs: () => void;
  browserWorker: BrowserWorkerService | null;
}

interface NodeData {
  id?: string;
  title: string;
  initialValue?: number;
  min?: number;
  max?: number;
  isAccumulator?: boolean;
  isFlowVariable?: boolean;
  allowNegativeValues?: boolean;
  valueDefinedSemiQuantitatively?: boolean;
  x?: number;
  y?: number;
  color?: string;
  combineMethod?: string;
  image?: string;
  usesDefaultImage?: boolean;
  paletteItem?: string;
  sourceApp?: string;
}

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
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [nodeData, setNodeData] = useState<NodeData>({
    title: "Test Node",
    initialValue: 0,
    color: "#f7be33"
  });
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
  const createRandomNode = async () => {
    const randomNode = {
      title: `Node_${Date.now()}`,
      initialValue: Math.floor(Math.random() * 100),
      x: Math.floor(Math.random() * 400),
      y: Math.floor(Math.random() * 300),
      color: nodeData.color
    };
    
    try {
      const result = await executeTool("sage_create_node", randomNode);
      if (result?.id) {
        setSelectedNodeId(result.id);
        await refreshAvailableNodes();
        updateStatus(`Random node "${randomNode.title}" created with ID: ${result.id}`, "success");
      } else {
        updateStatus("Random node created successfully", "success");
      }
    } catch (error) {
      // Error already logged and status set by executeTool
    }
  };

  const createNewNode = async () => {
    if (!nodeData.title?.trim()) {
      updateStatus("Node title is required", "error");
      return;
    }

    try {
      const result = await executeTool("sage_create_node", nodeData);
      if (result?.id) {
        setSelectedNodeId(result.id);
        await refreshAvailableNodes();
        updateStatus(`Node "${nodeData.title}" created with ID: ${result.id}`, "success");
      } else {
        updateStatus("Node created successfully", "success");
      }
    } catch (error) {
      // Error already logged and status set by executeTool
    }
  };

  const updateSelectedNode = async () => {
    if (!selectedNodeId) {
      updateStatus("No node selected for update", "error");
      return;
    }

    if (!nodeData.title?.trim()) {
      updateStatus("Node title is required", "error");
      return;
    }

    try {
      await executeTool("sage_update_node", { id: selectedNodeId, ...nodeData });
      updateStatus(`Node "${nodeData.title}" updated successfully`, "success");
    } catch (error) {
      // Error already logged and status set by executeTool
    }
  };

  const deleteSelectedNode = async () => {
    if (!selectedNodeId) {
      updateStatus("No node selected for deletion", "error");
      return;
    }

    try {
      await executeTool("sage_delete_node", { id: selectedNodeId });
      const deletedTitle = nodeData.title;
      setSelectedNodeId("");
      // Reset node data to defaults
      setNodeData({
        title: "Test Node",
        initialValue: 0,
        color: "#f7be33"
      });
      await refreshAvailableNodes();
      updateStatus(`Node "${deletedTitle}" deleted successfully`, "success");
    } catch (error) {
      // Error already logged and status set by executeTool
    }
  };

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
                {/* Nodes/Links Tab */}
                <TabContent tabId="nodes" subTabId="nodes">
                  <div className="sage-subtab-content">
                    <div className="sage-button-row">
                      <button onClick={createRandomNode}>Create Random Node</button>
                    </div>
                    <div className="sage-button-row">
                      <button onClick={createNewNode}>Create New Node</button>
                      <button 
                        onClick={updateSelectedNode}
                        disabled={!selectedNodeId}
                      >
                        Update Node
                      </button>
                    </div>
                    
                    <div className="sage-input-group">
                      <label>Selected Node:</label>
                      <select 
                        value={selectedNodeId} 
                        onChange={async (e) => {
                          const nodeId = e.target.value;
                          setSelectedNodeId(nodeId);
                          
                          if (nodeId) {
                            try {
                              // Fetch node details to populate form
                              const nodeDetails = await executeTool("sage_get_node", { id: nodeId });
                              if (nodeDetails) {
                                setNodeData({
                                  title: nodeDetails.title || nodeDetails.data?.title || "",
                                  initialValue: nodeDetails.initialValue || nodeDetails.data?.initialValue,
                                  min: nodeDetails.min || nodeDetails.data?.min,
                                  max: nodeDetails.max || nodeDetails.data?.max,
                                  x: nodeDetails.x || nodeDetails.data?.x,
                                  y: nodeDetails.y || nodeDetails.data?.y,
                                  color: nodeDetails.color || nodeDetails.data?.color || "#f7be33",
                                  isAccumulator: nodeDetails.isAccumulator || nodeDetails.data?.isAccumulator,
                                  isFlowVariable: nodeDetails.isFlowVariable || nodeDetails.data?.isFlowVariable,
                                  allowNegativeValues: nodeDetails.allowNegativeValues || nodeDetails.data?.allowNegativeValues,
                                  valueDefinedSemiQuantitatively: nodeDetails.valueDefinedSemiQuantitatively || nodeDetails.data?.valueDefinedSemiQuantitatively,
                                  combineMethod: nodeDetails.combineMethod || nodeDetails.data?.combineMethod,
                                  image: nodeDetails.image || nodeDetails.data?.image,
                                  usesDefaultImage: nodeDetails.usesDefaultImage || nodeDetails.data?.usesDefaultImage,
                                  paletteItem: nodeDetails.paletteItem || nodeDetails.data?.paletteItem,
                                  sourceApp: nodeDetails.sourceApp || nodeDetails.data?.sourceApp
                                });
                                updateStatus(`Loaded properties for node: ${nodeDetails.title || nodeDetails.data?.title}`, "success");
                              }
                            } catch (error) {
                              // Error already logged by executeTool
                            }
                          } else {
                            // Reset form when no node selected
                            setNodeData({
                              title: "Test Node",
                              initialValue: 0,
                              color: "#f7be33"
                            });
                            updateStatus("Node selection cleared", "info");
                          }
                        }}
                      >
                        <option value="">Select a node...</option>
                        {availableNodes.map(node => (
                          <option key={node.id} value={node.id}>{node.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sage-input-row">
                      <div className="sage-input-group">
                        <label>Title:</label>
                        <input 
                          type="text" 
                          value={nodeData.title}
                          onChange={(e) => setNodeData({...nodeData, title: e.target.value})}
                        />
                      </div>
                      <div className="sage-input-group">
                        <label>Initial Value:</label>
                        <input 
                          type="number" 
                          value={nodeData.initialValue || ""}
                          onChange={(e) => setNodeData({...nodeData, initialValue: Number(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="sage-input-row">
                      <div className="sage-input-group">
                        <label>X Position:</label>
                        <input 
                          type="number" 
                          value={nodeData.x || ""}
                          onChange={(e) => setNodeData({...nodeData, x: Number(e.target.value)})}
                        />
                      </div>
                      <div className="sage-input-group">
                        <label>Y Position:</label>
                        <input 
                          type="number" 
                          value={nodeData.y || ""}
                          onChange={(e) => setNodeData({...nodeData, y: Number(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="sage-button-row">
                      <button 
                        onClick={deleteSelectedNode}
                        disabled={!selectedNodeId}
                        className="sage-delete-btn"
                      >
                        Delete Node
                      </button>
                    </div>
                  </div>
                </TabContent>

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
