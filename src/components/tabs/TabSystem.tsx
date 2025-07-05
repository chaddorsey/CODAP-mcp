import React, { useState, useCallback } from "react";
import { TabId, SubTabId, TabState, AccordionState, TAB_CONFIGS, DEFAULT_TAB_STATE } from "../../types/tabs";

interface TabSystemProps {
  children: React.ReactNode;
  onTabChange?: (tabId: TabId) => void;
  onSubTabChange?: (subTabId: SubTabId) => void;
}

interface TabSystemState {
  tabState: TabState;
  accordionState: AccordionState;
}

export const TabSystem: React.FC<TabSystemProps> = ({ children, onTabChange, onSubTabChange }) => {
  const [state, setState] = useState<TabSystemState>({
    tabState: DEFAULT_TAB_STATE,
    accordionState: {}
  });

  const setActiveTab = useCallback((tabId: TabId) => {
    setState(prev => {
      const newTabState = {
        ...prev.tabState,
        activeTab: tabId,
        activeSubTab: TAB_CONFIGS.find(config => config.id === tabId)?.subTabs?.[0]?.id || null,
        tabHistory: [...prev.tabState.tabHistory, tabId].slice(-10) // Keep last 10 tabs
      };
      
      onTabChange?.(tabId);
      
      return {
        ...prev,
        tabState: newTabState
      };
    });
  }, [onTabChange]);

  const setActiveSubTab = useCallback((subTabId: SubTabId) => {
    setState(prev => ({
      ...prev,
      tabState: {
        ...prev.tabState,
        activeSubTab: subTabId
      }
    }));
    
    onSubTabChange?.(subTabId);
  }, [onSubTabChange]);

  const toggleAccordion = useCallback((key: string) => {
    setState(prev => ({
      ...prev,
      accordionState: {
        ...prev.accordionState,
        [key]: !prev.accordionState[key]
      }
    }));
  }, []);

  return (
    <div className="sage-tab-system">
      {/* Main Tab Bar */}
      <div className="sage-tab-bar">
        {TAB_CONFIGS.map(config => (
          <button
            key={config.id}
            className={`sage-tab-btn ${state.tabState.activeTab === config.id ? "selected" : ""}`}
            onClick={() => setActiveTab(config.id)}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab Bar for Nodes/Links */}
      {state.tabState.activeTab === "nodes" && (
        <div className="sage-subtab-bar">
          {TAB_CONFIGS.find(config => config.id === "nodes")?.subTabs?.map(subConfig => (
            <button
              key={subConfig.id}
              className={`sage-tab-btn ${state.tabState.activeSubTab === subConfig.id ? "selected" : ""}`}
              onClick={() => setActiveSubTab(subConfig.id)}
            >
              {subConfig.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div className="sage-tab-content">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            const props = child.props as any;
            if (props.tabId) {
              const isActive = props.tabId === state.tabState.activeTab;
              const isSubTabActive = !props.subTabId || props.subTabId === state.tabState.activeSubTab;
              
              return React.cloneElement(child, {
                ...props,
                isActive: isActive && isSubTabActive,
                tabState: state.tabState,
                accordionState: state.accordionState,
                toggleAccordion
              });
            }
          }
          return child;
        })}
      </div>
    </div>
  );
};

export default TabSystem; 
