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

  const createSelectedLink = async () => {
    if (!linkData.sourceNode || !linkData.targetNode) {
      setStatus("Please select both source and target nodes");
      return;
    }

    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      await executeTool("sage_create_link", linkData);
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

  const reloadNodes = async () => {
    await refreshAvailableNodes();
    setStatus("Nodes reloaded");
  };

  const runExperiment = async () => {
    if (!browserWorker?.isRunning) {
      return;
    }

    try {
      await executeTool("sage_run_experiment", {});
      setStatus("Experiment started");
    } catch (error) {
      setStatus("Failed to start experiment");
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
    logApiCall(`📋 Switched to ${tabId} tab`);
  }, []);

  const handleSubTabChange = useCallback((subTabId: SubTabId) => {
    logApiCall(`📋 Switched to ${subTabId} sub-tab`);
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
