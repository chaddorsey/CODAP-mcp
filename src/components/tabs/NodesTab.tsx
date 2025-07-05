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

  // Handle node selection
  const handleNodeSelect = useCallback(async (nodeId: string | null) => {
    if (nodeId && onExecuteTool) {
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
            }
          }));
        }
      } catch (error) {
        console.error("Error getting node:", error);
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
        }
      }));
    }
  }, [onExecuteTool]);

  // Handle creating a new node
  const handleCreateNode = useCallback(async (properties: NodeProperties) => {
    if (!onExecuteTool) return;

    setNodeManagement(prev => ({ ...prev, isCreating: true }));
    
    try {
      const result = await onExecuteTool("sage_create_node", properties);
      if (result?.id) {
        // Select the new node
        await handleNodeSelect(result.id);
        
        setNodeManagement(prev => ({
          ...prev,
          lastOperation: `Created node: ${properties.title}`
        }));
      }
    } catch (error) {
      console.error("Error creating node:", error);
    } finally {
      setNodeManagement(prev => ({ ...prev, isCreating: false }));
    }
  }, [onExecuteTool, handleNodeSelect]);

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

  // Handle updating a node
  const handleUpdateNode = useCallback(async () => {
    if (!onExecuteTool || !nodeManagement.selection.selectedNodeId) return;

    setNodeManagement(prev => ({ ...prev, isUpdating: true }));
    
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
        lastOperation: `Updated node: ${nodeManagement.formState.properties.title}`
      }));
    } catch (error) {
      console.error("Error updating node:", error);
    } finally {
      setNodeManagement(prev => ({ ...prev, isUpdating: false }));
    }
  }, [onExecuteTool, nodeManagement.selection.selectedNodeId, nodeManagement.formState.properties]);

  // Handle deleting a node
  const handleDeleteNode = useCallback(async () => {
    if (!onExecuteTool || !nodeManagement.selection.selectedNodeId) return;

    try {
      await onExecuteTool("sage_delete_node", {
        nodeId: nodeManagement.selection.selectedNodeId
      });
      
      // Clear selection and manually refresh the nodes list
      await handleNodeSelect(null);
      
      // Refresh nodes list after deletion
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
      
      setNodeManagement(prev => ({
        ...prev,
        lastOperation: "Node deleted successfully"
      }));
    } catch (error) {
      console.error("Error deleting node:", error);
    }
  }, [onExecuteTool, nodeManagement.selection.selectedNodeId, handleNodeSelect]);

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
    } catch (error) {
      console.error("Error refreshing nodes:", error);
    }
  }, [onExecuteTool]);

  // Auto-refresh nodes when tab becomes active
  React.useEffect(() => {
    if (isActive && onExecuteTool) {
      // Call handleRefreshNodes directly without including it in dependencies
      const refreshNodes = async () => {
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
        } catch (error) {
          console.error("Error refreshing nodes:", error);
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
        <div className="sage-operation-status">
          <span>✅ {nodeManagement.lastOperation}</span>
        </div>
      )}
    </TabContent>
  );
};

export default NodesTab; 
