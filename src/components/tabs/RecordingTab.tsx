import React from "react";
import TabContent from "./TabContent";
import Accordion from "./Accordion";

interface RecordingTabProps {
  tabId: "recording";
  isActive?: boolean;
  tabState?: any;
  accordionState?: any;
  toggleAccordion?: (key: string) => void;
  onExecuteTool?: (toolName: string, parameters: any) => Promise<any>;
}

export const RecordingTab: React.FC<RecordingTabProps> = ({
  tabId,
  isActive,
  tabState,
  accordionState,
  toggleAccordion,
  onExecuteTool
}) => {
  return (
    <TabContent tabId={tabId} isActive={isActive}>
      <Accordion
        title="Recording Controls"
        isOpen={accordionState?.["recording-controls"] ?? true}
        onToggle={() => toggleAccordion?.("recording-controls")}
      >
        <div className="sage-button-row">
          <button onClick={() => onExecuteTool?.("sage_start_recording", {})}>
            Start Recording
          </button>
          <button onClick={() => onExecuteTool?.("sage_stop_recording", {})}>
            Stop Recording
          </button>
        </div>
        
        <div className="sage-input-row">
          <div className="sage-input-group">
            <label>Duration (optional):</label>
            <input type="number" placeholder="e.g. 100" />
          </div>
          <div className="sage-input-group">
            <label>Units (optional):</label>
            <input type="text" placeholder="e.g. steps, minutes" />
          </div>
        </div>
      </Accordion>
    </TabContent>
  );
};

export default RecordingTab; 
