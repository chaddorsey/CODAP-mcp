import React from "react";
import { TabId, SubTabId, TabState, AccordionState } from "../../types/tabs";

interface TabContentProps {
  tabId: TabId;
  subTabId?: SubTabId;
  isActive?: boolean;
  tabState?: TabState;
  accordionState?: AccordionState;
  toggleAccordion?: (key: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({
  tabId,
  subTabId,
  isActive = false,
  tabState,
  accordionState,
  toggleAccordion,
  children,
  className = ""
}) => {
  if (!isActive) {
    return null;
  }

  return (
    <div 
      className={`sage-tab-content ${className}`}
      data-tab-id={tabId}
      data-subtab-id={subTabId || ""}
    >
      {children}
    </div>
  );
};

export default TabContent; 
