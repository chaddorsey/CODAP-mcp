import React, { useState } from "react";
import TabContent from "./TabContent";
import Accordion from "./Accordion";

interface InspectorTabProps {
  tabId: "inspector";
  isActive?: boolean;
  tabState?: any;
  accordionState?: any;
  toggleAccordion?: (key: string) => void;
  onExecuteTool?: (toolName: string, parameters: any) => Promise<any>;
}

export const InspectorTab: React.FC<InspectorTabProps> = ({
  tabId,
  isActive,
  tabState,
  accordionState,
  toggleAccordion,
  onExecuteTool
}) => {
  const [nodeIdInput, setNodeIdInput] = useState("");
  const [linkIdInput, setLinkIdInput] = useState("");
  const [inspectorResult, setInspectorResult] = useState("");

  const handleGetAllNodes = async () => {
    try {
      const result = await onExecuteTool?.("sage_get_all_nodes", {});
      setInspectorResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setInspectorResult(`Error: ${error}`);
    }
  };

  const handleGetAllLinks = async () => {
    try {
      const result = await onExecuteTool?.("sage_get_all_links", {});
      setInspectorResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setInspectorResult(`Error: ${error}`);
    }
  };

  const handleGetNodeById = async () => {
    if (!nodeIdInput) return;
    try {
      const result = await onExecuteTool?.("sage_get_node_by_id", { id: nodeIdInput });
      setInspectorResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setInspectorResult(`Error: ${error}`);
    }
  };

  const handleGetLinkById = async () => {
    if (!linkIdInput) return;
    try {
      const result = await onExecuteTool?.("sage_get_link_by_id", { id: linkIdInput });
      setInspectorResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setInspectorResult(`Error: ${error}`);
    }
  };

  return (
    <TabContent tabId={tabId} isActive={isActive}>
      <Accordion
        title="Node/Link Inspector"
        isOpen={accordionState?.["inspector-controls"] ?? true}
        onToggle={() => toggleAccordion?.("inspector-controls")}
      >
        <div className="sage-button-row">
          <button onClick={handleGetAllNodes}>GET All Nodes</button>
          <button onClick={handleGetAllLinks}>GET All Links</button>
        </div>
        
        <div className="sage-input-row">
          <div className="sage-input-group">
            <label>Node ID:</label>
            <input
              type="text"
              value={nodeIdInput}
              onChange={(e) => setNodeIdInput(e.target.value)}
              placeholder="Enter node ID"
            />
            <button onClick={handleGetNodeById}>GET Node by ID</button>
          </div>
          <div className="sage-input-group">
            <label>Link ID:</label>
            <input
              type="text"
              value={linkIdInput}
              onChange={(e) => setLinkIdInput(e.target.value)}
              placeholder="Enter link ID"
            />
            <button onClick={handleGetLinkById}>GET Link by ID</button>
          </div>
        </div>
        
        <div className="sage-input-group">
          <label>Inspector Result:</label>
          <pre className="sage-inspector-result">
            {inspectorResult || "No data yet. Use the buttons above to query nodes and links."}
          </pre>
        </div>
      </Accordion>
    </TabContent>
  );
};

export default InspectorTab; 
