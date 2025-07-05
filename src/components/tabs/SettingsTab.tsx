import React from "react";
import TabContent from "./TabContent";
import Accordion from "./Accordion";

interface SettingsTabProps {
  tabId: "settings";
  isActive?: boolean;
  tabState?: any;
  accordionState?: any;
  toggleAccordion?: (key: string) => void;
  onExecuteTool?: (toolName: string, parameters: any) => Promise<any>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
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
        title="Model Complexity & UI Settings"
        isOpen={accordionState?.["model-complexity"] ?? true}
        onToggle={() => toggleAccordion?.("model-complexity")}
      >
        <div className="sage-input-row">
          <div className="sage-input-group">
            <label>Relationship Complexity:</label>
            <div>
              <label>
                <input type="radio" name="modelComplexity" value="0" />
                Basic
              </label>
              <label>
                <input type="radio" name="modelComplexity" value="1" defaultChecked />
                Expanded
              </label>
            </div>
          </div>
        </div>
        
        <div className="sage-button-row">
          <button onClick={() => onExecuteTool?.("sage_update_model_complexity", {})}>
            Update Relationship Complexity
          </button>
        </div>
        
        <div className="sage-input-row">
          <div className="sage-input-group">
            <label>
              <input type="checkbox" defaultChecked />
              Show Relationship Symbols
            </label>
          </div>
          <div className="sage-input-group">
            <label>
              <input type="checkbox" defaultChecked />
              Show Guide
            </label>
          </div>
        </div>
        
        <div className="sage-input-row">
          <div className="sage-input-group">
            <label>
              <input type="checkbox" />
              Lockdown Mode
            </label>
          </div>
          <div className="sage-input-group">
            <label>
              <input type="checkbox" />
              Touch Device
            </label>
          </div>
        </div>
        
        <div className="sage-button-row">
          <button onClick={() => onExecuteTool?.("sage_update_ui_settings", {})}>
            Update UI Settings
          </button>
        </div>
      </Accordion>
    </TabContent>
  );
};

export default SettingsTab; 
