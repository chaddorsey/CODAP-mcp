import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
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

export const SageModelerAPIPanel: React.FC<{ iframeRef?: React.RefObject<HTMLIFrameElement> }> = ({ iframeRef }) => {
  return <SageAPIEmbeddedPanel expanded={true} iframeRef={iframeRef} />;
};

const SageAPIEmbeddedPanel = forwardRef<HTMLIFrameElement, { expanded: boolean; iframeRef?: React.RefObject<HTMLIFrameElement> }>(
  ({ expanded, iframeRef }, ref) => {
    const localRef = React.useRef<HTMLIFrameElement>(null);
    useImperativeHandle(ref, () => localRef.current as HTMLIFrameElement);
    useImperativeHandle(iframeRef, () => localRef.current as HTMLIFrameElement);
    const width = 375;
    const height = expanded ? 600 : 325;
    return (
      <div style={{ width, height, background: "white", paddingTop: 0, margin: 0 }}>
        <iframe
          ref={localRef}
          src="/sage-api-reference.html"
          title="Sage API Reference Plugin"
          style={{ width: "100%", height: "100%", border: "none", minHeight: 325, background: "none" }}
          sandbox="allow-scripts allow-same-origin"
          aria-label="SageModeler API Reference Plugin"
        />
      </div>
    );
  }
);
SageAPIEmbeddedPanel.displayName = "SageAPIEmbeddedPanel"; 