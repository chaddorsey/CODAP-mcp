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

// Node Management Types
export interface NodeProperties {
  title: string;
  initialValue?: number;
  x?: number;
  y?: number;
  color?: string;
  min?: number;
  max?: number;
  isAccumulator?: boolean;
  isFlowVariable?: boolean;
  allowNegativeValues?: boolean;
  valueDefinedSemiQuantitatively?: boolean;
  // Advanced properties
  combineMethod?: string;
  image?: string;
  usesDefaultImage?: boolean;
  paletteItem?: string;
  sourceApp?: string;
}

export interface NodeFormState {
  properties: NodeProperties;
  hasChanges: boolean;
  isValid: boolean;
  errors: Record<string, string>;
}

export interface NodeSelection {
  selectedNodeId: string | null;
  availableNodes: {
    id: string;
    title: string;
  }[];
}

export interface NodeManagementState {
  formState: NodeFormState;
  selection: NodeSelection;
  isCreating: boolean;
  isUpdating: boolean;
  lastOperation: string | null;
}

// Color palette for SageModeler nodes
export const SAGE_NODE_COLORS = [
  { value: "#f7be33", label: "Yellow" },
  { value: "#105262", label: "Dark Blue" },
  { value: "#72c0cc", label: "Medium Blue" },
  { value: "#e74c3c", label: "Red" },
  { value: "#2ecc71", label: "Green" },
  { value: "#9b59b6", label: "Purple" },
  { value: "#f39c12", label: "Orange" },
  { value: "#34495e", label: "Dark Gray" }
] as const;

// Default node properties
export const DEFAULT_NODE_PROPERTIES: NodeProperties = {
  title: "New Node",
  initialValue: 0,
  x: 100,
  y: 100,
  color: "#f7be33",
  allowNegativeValues: true,
  usesDefaultImage: true,
  isAccumulator: false,
  isFlowVariable: false,
  valueDefinedSemiQuantitatively: false
}; 
