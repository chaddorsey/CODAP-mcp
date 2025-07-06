import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserWorkerService } from "../services/BrowserWorkerService";
import "./SageModelerAPIPanel.css";

interface SageModelerAPIPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  apiCallLogs: string[];
  onClearLogs: () => void;
  browserWorker: BrowserWorkerService | null;
}

interface NodeData {
  id?: string;
  title: string;
  initialValue?: number;
  min?: number;
  max?: number;
  isAccumulator?: boolean;
  isFlowVariable?: boolean;
  allowNegativeValues?: boolean;
  valueDefinedSemiQuantitatively?: boolean;
  x?: number;
  y?: number;
  color?: string;
  combineMethod?: string;
  image?: string;
  usesDefaultImage?: boolean;
  paletteItem?: string;
  sourceApp?: string;
}

interface LinkData {
  id?: string;
  sourceNode?: string;
  targetNode?: string;
  relationVector?: string;
  relationScalar?: string;
  customData?: string;
}

export const SageModelerAPIPanel: React.FC<SageModelerAPIPanelProps> = ({
  isVisible,
  onToggle
}) => {
  return (
    <div className="sage-api-panel">
      <div className="sage-accordion">
        <button 
          className={`sage-accordion-header ${isVisible ? "" : "collapsed"}`}
          onClick={onToggle}
        >
          <span className="arrow">&#9660;</span>
          Direct SageModeler API Testing
        </button>
        {isVisible && (
          <div className="sage-accordion-content">
            <SageAPIEmbeddedPanel expanded={isVisible} />
          </div>
        )}
      </div>
    </div>
  );
};

// New component for embedding the reference plugin
const SageAPIEmbeddedPanel: React.FC<{ expanded: boolean }> = ({ expanded }) => {
  const width = 420;
  const height = expanded ? 600 : 325;
  return (
    <div style={{ width, height, maxWidth: width, margin: "0 auto", transition: "height 0.3s" }}>
      <iframe
        src="/sage-api-reference.html"
        title="Sage API Reference Plugin"
        style={{ width: "100%", height: "100%", border: "none", minHeight: 325, transition: "height 0.3s" }}
        sandbox="allow-scripts allow-same-origin"
        aria-label="SageModeler API Reference Plugin"
      />
    </div>
  );
}; 
