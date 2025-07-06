import React, { useState, useCallback } from "react";
import TabContent from "./TabContent";
import Accordion from "./Accordion";
import NodePropertiesForm from "./NodePropertiesForm";
import NodeCreationControls from "./NodeCreationControls";
import NodeSelectionList from "./NodeSelectionList";
import { 
  NodeProperties, 
  NodeManagementState, 
  DEFAULT_NODE_PROPERTIES 
} from "../../types/tabs";

interface NodesTabProps {
  tabId: "nodes";
  subTabId: "nodes";
  isActive?: boolean;
  tabState?: any;
  accordionState?: any;
  toggleAccordion?: (key: string) => void;
  onExecuteTool?: (toolName: string, parameters: any) => Promise<any>;
}

export const NodesTab: React.FC<NodesTabProps> = ({
  tabId,
  subTabId,
  isActive,
  tabState,
  accordionState,
  toggleAccordion,
  onExecuteTool
}) => {


  const [nodeManagement, setNodeManagement] = useState<NodeManagementState>({
    formState: {
      properties: DEFAULT_NODE_PROPERTIES,
      hasChanges: false,
      isValid: true,
      errors: {}
    },
    selection: {
      selectedNodeId: null,
      availableNodes: []
    },
    isCreating: false,
    isUpdating: false,
    lastOperation: null
  });

  // Handle property changes from the form
  const handlePropertiesChange = useCallback((properties: NodeProperties, hasChanges: boolean) => {
    setNodeManagement(prev => ({
      ...prev,
      formState: {
        ...prev.formState,
        properties,
        hasChanges
      }
    }));
  }, []);

  // Handle form validation changes
  const handleValidationChange = useCallback((isValid: boolean, errors: Record<string, string>) => {
    setNodeManagement(prev => ({
      ...prev,
      formState: {
        ...prev.formState,
        isValid,
        errors
      }
    }));
  }, []);

  // Handle node selection with comprehensive error handling
  const handleNodeSelect = useCallback(async (nodeId: string | null) => {
    if (nodeId && onExecuteTool) {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: `Loading node: ${nodeId}...`
      }));

      try {
        // Get the selected node's properties
        const result = await onExecuteTool("sage_get_node_by_id", { nodeId });
        if (result?.node) {
          setNodeManagement(prev => ({
            ...prev,
            selection: {
              ...prev.selection,
              selectedNodeId: nodeId
            },
            formState: {
              properties: result.node,
              hasChanges: false,
              isValid: true,
              errors: {}
            },
            lastOperation: `✅ Loaded node: ${result.node.title || nodeId}`
          }));
        } else {
          setNodeManagement(prev => ({
            ...prev,
            lastOperation: `❌ Failed to load node: No data returned`
          }));
        }
      } catch (error: any) {
        console.error("Error getting node:", error);
        const errorMessage = error?.message || "Unknown error occurred";
        setNodeManagement(prev => ({
          ...prev,
          lastOperation: `❌ Failed to load node: ${errorMessage}`
        }));
        
        // Clear selection on error
        setNodeManagement(prev => ({
          ...prev,
          selection: {
            ...prev.selection,
            selectedNodeId: null
          },
          formState: {
            properties: DEFAULT_NODE_PROPERTIES,
            hasChanges: false,
            isValid: true,
            errors: {}
          }
        }));
      }
    } else {
      // Clear selection
      setNodeManagement(prev => ({
        ...prev,
        selection: {
          ...prev.selection,
          selectedNodeId: null
        },
        formState: {
          properties: DEFAULT_NODE_PROPERTIES,
          hasChanges: false,
          isValid: true,
          errors: {}
        },
        lastOperation: nodeId ? "❌ No connection to SageModeler" : "Selection cleared"
      }));
    }
  }, [onExecuteTool]);

  // Handle manual refresh of nodes list
  const handleRefreshNodes = useCallback(async () => {
    if (!onExecuteTool) return;

    try {
      const result = await onExecuteTool("sage_get_all_nodes", {});
      if (result?.nodes) {
        const availableNodes = result.nodes.map((node: any) => ({
          id: node.id || node.key,
          title: node.title || node.data?.title || `Node ${node.id || node.key}`
        }));
        
        setNodeManagement(prev => ({
          ...prev,
          selection: {
            ...prev.selection,
            availableNodes
          }
        }));
      }
    } catch (error: any) {
      console.error("Error refreshing nodes:", error);
    }
  }, [onExecuteTool]);

  // Handle creating a new node with comprehensive error handling
  const handleCreateNode = useCallback(async (properties: NodeProperties) => {
    if (!onExecuteTool) {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "Error: No connection to SageModeler"
      }));
      return;
    }

    // Validate properties before creation
    if (!properties.title || properties.title.trim() === "") {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "Error: Node title is required"
      }));
      return;
    }

    setNodeManagement(prev => ({ 
      ...prev, 
      isCreating: true,
      lastOperation: `Creating node: ${properties.title}...`
    }));
    
    try {
      const result = await onExecuteTool("sage_create_node", properties);
      if (result?.id) {
        // Auto-refresh nodes list and select the new node
        await handleRefreshNodes();
        await handleNodeSelect(result.id);
        
        setNodeManagement(prev => ({
          ...prev,
          lastOperation: `✅ Successfully created node: ${properties.title}`
        }));
      } else {
        setNodeManagement(prev => ({
          ...prev,
          lastOperation: "❌ Failed to create node: No ID returned"
        }));
      }
    } catch (error: any) {
      console.error("Error creating node:", error);
      const errorMessage = error?.message || "Unknown error occurred";
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: `❌ Failed to create node: ${errorMessage}`
      }));
    } finally {
      setNodeManagement(prev => ({ ...prev, isCreating: false }));
    }
  }, [onExecuteTool, handleNodeSelect, handleRefreshNodes]);

  // Handle creating a random node
  const handleCreateRandomNode = useCallback(async () => {
    const randomProperties: NodeProperties = {
      title: `Random Node ${Date.now()}`,
      initialValue: Math.floor(Math.random() * 100),
      x: Math.floor(Math.random() * 400) + 50,
      y: Math.floor(Math.random() * 300) + 50,
      color: "#f7be33",
      allowNegativeValues: true,
      usesDefaultImage: true,
      isAccumulator: Math.random() > 0.7,
      isFlowVariable: false,
      valueDefinedSemiQuantitatively: false
    };

    await handleCreateNode(randomProperties);
  }, [handleCreateNode]);

  // Handle updating a node with comprehensive error handling
  const handleUpdateNode = useCallback(async () => {
    if (!onExecuteTool) {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "❌ Error: No connection to SageModeler"
      }));
      return;
    }

    if (!nodeManagement.selection.selectedNodeId) {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "❌ Error: No node selected for update"
      }));
      return;
    }

    // Validate properties before update
    if (!nodeManagement.formState.properties.title || nodeManagement.formState.properties.title.trim() === "") {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "❌ Error: Node title is required"
      }));
      return;
    }

    setNodeManagement(prev => ({ 
      ...prev, 
      isUpdating: true,
      lastOperation: `Updating node: ${nodeManagement.formState.properties.title}...`
    }));
    
    try {
      await onExecuteTool("sage_update_node", {
        nodeId: nodeManagement.selection.selectedNodeId,
        ...nodeManagement.formState.properties
      });
      
      setNodeManagement(prev => ({
        ...prev,
        formState: {
          ...prev.formState,
          hasChanges: false
        },
        lastOperation: `✅ Successfully updated node: ${nodeManagement.formState.properties.title}`
      }));
      
      // Refresh nodes list to reflect changes
      await handleRefreshNodes();
    } catch (error: any) {
      console.error("Error updating node:", error);
      const errorMessage = error?.message || "Unknown error occurred";
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: `❌ Failed to update node: ${errorMessage}`
      }));
    } finally {
      setNodeManagement(prev => ({ ...prev, isUpdating: false }));
    }
  }, [onExecuteTool, nodeManagement.selection.selectedNodeId, nodeManagement.formState.properties, handleRefreshNodes]);

  // Handle deleting a node with confirmation and comprehensive error handling
  const handleDeleteNode = useCallback(async () => {
    if (!onExecuteTool) {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "❌ Error: No connection to SageModeler"
      }));
      return;
    }

    if (!nodeManagement.selection.selectedNodeId) {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "❌ Error: No node selected for deletion"
      }));
      return;
    }

    // Get the current node title for confirmation
    const nodeTitle = nodeManagement.formState.properties.title || "this node";
    
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${nodeTitle}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) {
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "❌ Delete operation cancelled"
      }));
      return;
    }

    setNodeManagement(prev => ({
      ...prev,
      lastOperation: `Deleting node: ${nodeTitle}...`
    }));

    try {
      await onExecuteTool("sage_delete_node", {
        nodeId: nodeManagement.selection.selectedNodeId
      });
      
      // Clear selection and refresh the nodes list
      await handleNodeSelect(null);
      await handleRefreshNodes();
      
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: `✅ Successfully deleted node: ${nodeTitle}`
      }));
    } catch (error: any) {
      console.error("Error deleting node:", error);
      const errorMessage = error?.message || "Unknown error occurred";
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: `❌ Failed to delete node: ${errorMessage}`
      }));
    }
  }, [onExecuteTool, nodeManagement.selection.selectedNodeId, nodeManagement.formState.properties.title, handleNodeSelect, handleRefreshNodes]);

  // Auto-refresh nodes when tab becomes active
  React.useEffect(() => {
    if (isActive && onExecuteTool) {
      // Call handleRefreshNodes directly without including it in dependencies
      const refreshNodes = async () => {
        try {
          console.log("🔍 Calling sage_get_all_nodes...");
          const result = await onExecuteTool("sage_get_all_nodes", {});
          console.log("🔍 sage_get_all_nodes result:", result);
          
          if (result?.nodes) {
            console.log("🔍 Found nodes:", result.nodes);
            const availableNodes = result.nodes.map((node: any) => ({
              id: node.id || node.key,
              title: node.title || node.data?.title || `Node ${node.id || node.key}`
            }));
            
            console.log("🔍 Transformed nodes:", availableNodes);
            
            setNodeManagement(prev => ({
              ...prev,
              selection: {
                ...prev.selection,
                availableNodes
              }
            }));
          } else {
            console.log("❌ No nodes found in result:", result);
            setNodeManagement(prev => ({
              ...prev,
              lastOperation: "ℹ️ No nodes found in SageModeler"
            }));
          }
        } catch (error: any) {
          console.error("❌ Error refreshing nodes:", error);
          setNodeManagement(prev => ({
            ...prev,
            lastOperation: `❌ Failed to get nodes: ${error?.message || "Unknown error"}`
          }));
        }
      };
      
      refreshNodes();
    }
  }, [isActive, onExecuteTool]);

  return (
    <TabContent tabId={tabId} subTabId={subTabId} isActive={isActive}>
      {/* Node Creation Controls */}
      <div className="sage-section">
        <NodeCreationControls
          onCreateNode={handleCreateNode}
          onCreateRandomNode={handleCreateRandomNode}
          nodeProperties={nodeManagement.formState.properties}
          canCreate={nodeManagement.formState.isValid}
          isCreating={nodeManagement.isCreating}
          disabled={!onExecuteTool}
        />
      </div>

      {/* Node Selection */}
      <div className="sage-section">
        <NodeSelectionList
          selection={nodeManagement.selection}
          onNodeSelect={handleNodeSelect}
          onRefreshNodes={handleRefreshNodes}
          disabled={!onExecuteTool}
        />
      </div>

      {/* Node Properties Form */}
      <Accordion
        title="Node Properties"
        isOpen={accordionState?.["node-properties"] ?? true}
        onToggle={() => toggleAccordion?.("node-properties")}
      >
        <NodePropertiesForm
          nodeData={nodeManagement.formState.properties}
          onPropertiesChange={handlePropertiesChange}
          onValidationChange={handleValidationChange}
          disabled={!onExecuteTool}
        />
        
        {/* Update and Delete buttons */}
        <div className="sage-button-row sage-mt-2">
          <button
            type="button"
            onClick={handleUpdateNode}
            disabled={
              !nodeManagement.selection.selectedNodeId ||
              !nodeManagement.formState.hasChanges ||
              !nodeManagement.formState.isValid ||
              nodeManagement.isUpdating
            }
            className="sage-button sage-button-primary"
          >
            {nodeManagement.isUpdating ? "Updating..." : "Update Node"}
          </button>
          
          <button
            type="button"
            onClick={handleDeleteNode}
            disabled={!nodeManagement.selection.selectedNodeId}
            className="sage-button sage-button-danger"
          >
            Delete Node
          </button>
        </div>
      </Accordion>

      {/* Operation Status */}
      {nodeManagement.lastOperation && (
        <div className={`sage-operation-status ${
          nodeManagement.lastOperation.includes("❌") ? "sage-status-error" :
          nodeManagement.lastOperation.includes("✅") ? "sage-status-success" :
          "sage-status-info"
        }`}>
          <span>{nodeManagement.lastOperation}</span>
        </div>
      )}
    </TabContent>
  );
};

export default NodesTab; 
