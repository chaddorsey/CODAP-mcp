import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserWorkerService } from "../services/BrowserWorkerService";
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
  const [activeTab, setActiveTab] = useState("nodes");
  const [activeSubTab, setActiveSubTab] = useState("nodes");
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

  // Log API calls
  const logApiCall = (message: string) => {
    const event = new CustomEvent("sage-api-call", {
      detail: { message }
    });
    window.dispatchEvent(event);
  };

  // Execute tool via browser worker
  const executeTool = async (toolName: string, parameters: any) => {
    if (!browserWorker) {
      logApiCall(`❌ Error: Browser worker not available`);
      return;
    }

    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      logApiCall(`🔄 Executing ${toolName} with parameters: ${JSON.stringify(parameters)}`);
      const result = await browserWorker.executeTool(toolName, parameters);
      logApiCall(`✅ ${toolName} completed: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logApiCall(`❌ ${toolName} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  };

  // Node Management Functions
  const createRandomNode = async () => {
    if (!browserWorker?.isRunning) {
      return;
    }

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
      }
      setStatus("Random node created successfully");
    } catch (error) {
      setStatus("Failed to create random node");
    }
  };

  const createNewNode = async () => {
    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      const result = await executeTool("sage_create_node", nodeData);
      if (result?.id) {
        setSelectedNodeId(result.id);
        await refreshAvailableNodes();
      }
      setStatus("Node created successfully");
    } catch (error) {
      setStatus("Failed to create node");
    }
  };

  const updateSelectedNode = async () => {
    if (!selectedNodeId) {
      setStatus("No node selected for update");
      return;
    }

    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      await executeTool("sage_update_node", { id: selectedNodeId, ...nodeData });
      setStatus("Node updated successfully");
    } catch (error) {
      setStatus("Failed to update node");
    }
  };

  const deleteSelectedNode = async () => {
    if (!selectedNodeId) {
      setStatus("No node selected for deletion");
      return;
    }

    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      await executeTool("sage_delete_node", { id: selectedNodeId });
      setSelectedNodeId("");
      await refreshAvailableNodes();
      setStatus("Node deleted successfully");
    } catch (error) {
      setStatus("Failed to delete node");
    }
  };

  const refreshAvailableNodes = async () => {
    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      const result = await executeTool("sage_get_all_nodes", {});
      if (result?.nodes) {
        setAvailableNodes(result.nodes.map((node: any) => ({ 
          id: node.id || node.key, 
          title: node.title || node.data?.title || `Node ${node.id}` 
        })));
      }
    } catch (error) {
      console.error("Failed to refresh nodes:", error);
    }
  };

  // Link Management Functions
  const createSelectedLink = async () => {
    if (!linkData.sourceNode || !linkData.targetNode) {
      setStatus("Source and target nodes must be selected");
      return;
    }

    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      const result = await executeTool("sage_create_link", linkData);
      if (result?.id) {
        setSelectedLinkId(result.id);
      }
      setStatus("Link created successfully");
    } catch (error) {
      setStatus("Failed to create link");
    }
  };

  const updateSelectedLink = async () => {
    if (!selectedLinkId) {
      setStatus("No link selected for update");
      return;
    }

    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      await executeTool("sage_update_link", { id: selectedLinkId, ...linkData });
      setStatus("Link updated successfully");
    } catch (error) {
      setStatus("Failed to update link");
    }
  };

  // Experiment Functions
  const reloadNodes = async () => {
    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      await executeTool("sage_reload_nodes", {});
      await refreshAvailableNodes();
      setStatus("Nodes reloaded successfully");
    } catch (error) {
      setStatus("Failed to reload nodes");
    }
  };

  const runExperiment = async () => {
    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      await executeTool("sage_run_experiment", {});
      setStatus("Experiment started successfully");
    } catch (error) {
      setStatus("Failed to run experiment");
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
              
              {/* Tab Bar */}
              <div className="sage-tab-bar">
                <button 
                  className={`sage-tab-btn ${activeTab === "nodes" ? "selected" : ""}`}
                  onClick={() => setActiveTab("nodes")}
                >
                  Nodes/Links
                </button>
                <button 
                  className={`sage-tab-btn ${activeTab === "experiment" ? "selected" : ""}`}
                  onClick={() => setActiveTab("experiment")}
                >
                  Experiment
                </button>
                <button 
                  className={`sage-tab-btn ${activeTab === "import" ? "selected" : ""}`}
                  onClick={() => setActiveTab("import")}
                >
                  Import/Export
                </button>
              </div>

              {/* Nodes/Links Tab */}
              {activeTab === "nodes" && (
                <div className="sage-tab-content">
                  <div className="sage-tab-bar">
                    <button 
                      className={`sage-tab-btn ${activeSubTab === "nodes" ? "selected" : ""}`}
                      onClick={() => setActiveSubTab("nodes")}
                    >
                      Nodes
                    </button>
                    <button 
                      className={`sage-tab-btn ${activeSubTab === "links" ? "selected" : ""}`}
                      onClick={() => setActiveSubTab("links")}
                    >
                      Links
                    </button>
                  </div>

                  {/* Nodes Sub-tab */}
                  {activeSubTab === "nodes" && (
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
                          onChange={(e) => setSelectedNodeId(e.target.value)}
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
                  )}

                  {/* Links Sub-tab */}
                  {activeSubTab === "links" && (
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
                  )}
                </div>
              )}

              {/* Experiment Tab */}
              {activeTab === "experiment" && (
                <div className="sage-tab-content">
                  <div className="sage-button-row">
                    <button onClick={reloadNodes}>Reload Nodes</button>
                    <button onClick={runExperiment}>Run Experiment</button>
                  </div>
                </div>
              )}

              {/* Import/Export Tab */}
              {activeTab === "import" && (
                <div className="sage-tab-content">
                  <div className="sage-button-row">
                    <button onClick={() => executeTool("sage_export_model", {})}>
                      Export Model
                    </button>
                    <button onClick={() => executeTool("sage_get_simulation_state", {})}>
                      Get Simulation State
                    </button>
                  </div>
                </div>
              )}

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
