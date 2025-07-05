export type TabId = "nodes" | "experiment" | "recording" | "import" | "settings" | "inspector";

export type SubTabId = "nodes" | "links";

export interface TabConfig {
  id: TabId;
  label: string;
  subTabs?: SubTabConfig[];
}

export interface SubTabConfig {
  id: SubTabId;
  label: string;
}

export interface TabState {
  activeTab: TabId;
  activeSubTab: SubTabId | null;
  tabHistory: TabId[];
}

export type AccordionState = Record<string, boolean>;

export interface TabContextValue {
  tabState: TabState;
  setActiveTab: (tabId: TabId) => void;
  setActiveSubTab: (subTabId: SubTabId) => void;
  accordionState: AccordionState;
  toggleAccordion: (key: string) => void;
}

export const TAB_CONFIGS: TabConfig[] = [
  {
    id: "nodes",
    label: "Nodes/Links",
    subTabs: [
      { id: "nodes", label: "Nodes" },
      { id: "links", label: "Links" }
    ]
  },
  {
    id: "experiment",
    label: "Experiment"
  },
  {
    id: "recording",
    label: "Recording"
  },
  {
    id: "import",
    label: "Import/Export"
  },
  {
    id: "settings",
    label: "Settings"
  },
  {
    id: "inspector",
    label: "Inspector"
  }
];

export const DEFAULT_TAB_STATE: TabState = {
  activeTab: "nodes",
  activeSubTab: "nodes",
  tabHistory: ["nodes"]
}; 
