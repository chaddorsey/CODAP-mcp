import React, { useCallback } from "react";
import { NodeSelection } from "../../types/tabs";

interface NodeSelectionListProps {
  selection: NodeSelection;
  onNodeSelect?: (nodeId: string | null) => void;
  onRefreshNodes?: () => Promise<void>;
  disabled?: boolean;
  isRefreshing?: boolean;
}

export const NodeSelectionList: React.FC<NodeSelectionListProps> = ({
  selection,
  onNodeSelect,
  onRefreshNodes,
  disabled = false,
  isRefreshing = false
}) => {
  const handleNodeSelect = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const nodeId = event.target.value || null;
    onNodeSelect?.(nodeId);
  }, [onNodeSelect]);

  const handleRefresh = useCallback(async () => {
    if (onRefreshNodes && !isRefreshing) {
      try {
        await onRefreshNodes();
      } catch (error) {
        console.error("Error refreshing nodes:", error);
      }
    }
  }, [onRefreshNodes, isRefreshing]);

  return (
    <div className="sage-node-selection-list">
      <div className="sage-input-group">
        <label htmlFor="node-selector">Selected Node:</label>
        <div className="sage-select-with-refresh">
          <select
            id="node-selector"
            value={selection.selectedNodeId || ""}
            onChange={handleNodeSelect}
            disabled={disabled}
            className="sage-select"
          >
            <option value="">Select a node...</option>
            {selection.availableNodes.map(node => (
              <option key={node.id} value={node.id}>
                {node.title} ({node.id})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={disabled || isRefreshing}
            className="sage-button sage-button-icon"
            title="Refresh node list"
          >
            {isRefreshing ? "⟳" : "↻"}
          </button>
        </div>
      </div>
      
      <div className="sage-selection-info">
        <span className="sage-info-text">
          {selection.availableNodes.length} node{selection.availableNodes.length !== 1 ? "s" : ""} available
        </span>
        {selection.selectedNodeId && (
          <span className="sage-info-text">
            • {selection.availableNodes.find(n => n.id === selection.selectedNodeId)?.title || "Unknown"} selected
          </span>
        )}
      </div>
    </div>
  );
};

export default NodeSelectionList; 
