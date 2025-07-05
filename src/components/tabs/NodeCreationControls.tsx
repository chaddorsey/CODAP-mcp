import React, { useState, useCallback } from "react";
import { NodeProperties } from "../../types/tabs";

interface NodeCreationControlsProps {
  onCreateNode?: (properties: NodeProperties) => Promise<void>;
  onCreateRandomNode?: () => Promise<void>;
  nodeProperties?: NodeProperties;
  canCreate?: boolean;
  isCreating?: boolean;
  disabled?: boolean;
}

export const NodeCreationControls: React.FC<NodeCreationControlsProps> = ({
  onCreateNode,
  onCreateRandomNode,
  nodeProperties,
  canCreate = true,
  isCreating = false,
  disabled = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateNode = useCallback(async () => {
    if (!onCreateNode || !nodeProperties || isProcessing) return;

    setIsProcessing(true);
    try {
      await onCreateNode(nodeProperties);
    } catch (error) {
      console.error("Error creating node:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [onCreateNode, nodeProperties, isProcessing]);

  const handleCreateRandomNode = useCallback(async () => {
    if (!onCreateRandomNode || isProcessing) return;

    setIsProcessing(true);
    try {
      await onCreateRandomNode();
    } catch (error) {
      console.error("Error creating random node:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [onCreateRandomNode, isProcessing]);

  const isDisabled = disabled || isCreating || isProcessing;

  return (
    <div className="sage-node-creation-controls">
      <div className="sage-button-row">
        <button
          type="button"
          onClick={handleCreateRandomNode}
          disabled={isDisabled}
          className="sage-button sage-button-secondary"
        >
          {isProcessing ? "Creating..." : "Create Random Node"}
        </button>
        
        <button
          type="button"
          onClick={handleCreateNode}
          disabled={isDisabled || !canCreate}
          className="sage-button sage-button-primary"
        >
          {isProcessing ? "Creating..." : "Create New Node"}
        </button>
      </div>
      
      {!canCreate && (
        <div className="sage-help-text">
          <span>⚠ Please fix validation errors before creating a node</span>
        </div>
      )}
    </div>
  );
};

export default NodeCreationControls; 
