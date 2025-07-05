import React, { useState, useCallback } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { useClipboard } from "../hooks/useClipboard";

interface ClaudeConnectionPanelProps {
  sessionId: string;
  relayConnected: boolean;
  relayConnecting?: boolean;
  claudeConnected: boolean;
  onCopyConnectionPrompt: () => void;
  onShowSetupGuide: () => void;
  isLoading?: boolean;
  promptCopyFeedback?: string;
  pluginMode?: "codap" | "sagemodeler";
}

export const ClaudeConnectionPanel: React.FC<ClaudeConnectionPanelProps> = ({ 
  sessionId, 
  relayConnected, 
  relayConnecting = false,
  claudeConnected, 
  onCopyConnectionPrompt,
  onShowSetupGuide,
  isLoading = false,
  promptCopyFeedback,
  pluginMode = "codap"
}) => {
  const clipboard = useClipboard();
  const [sessionCopyFeedback, setSessionCopyFeedback] = useState<string>("");

  const selectSessionText = () => {
    // Helper to select session ID text for easy copying
    const sessionElement = document.querySelector(".session-id");
    if (sessionElement) {
      const range = document.createRange();
      range.selectNodeContents(sessionElement);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  };

  const copySessionId = useCallback(async () => {
    if (!sessionId) return;
    
    const result = await clipboard.copyToClipboard(sessionId);
    
    if (result.success) {
      setSessionCopyFeedback("✅ Session ID copied!");
    } else {
      setSessionCopyFeedback(`❌ Copy failed: ${result.error || "Unknown error"}`);
    }
    
    // Clear feedback after 3 seconds
    setTimeout(() => setSessionCopyFeedback(""), 3000);
  }, [sessionId, clipboard]);

  return (
    <div className="claude-connection-panel">
      {/* Header */}
      <div className="panel-header">
        <h2>🤖 {pluginMode === "codap" ? "CODAP + Claude AI" : "SageModeler + Claude"}</h2>
        <div className="connection-indicators">
          <StatusIndicator 
            label="Relay" 
            connected={relayConnected} 
            loading={relayConnecting}
            icon="🌐"
          />
          <StatusIndicator 
            label="Claude" 
            connected={claudeConnected} 
            icon="🤖"
          />
        </div>
      </div>

      {/* Session Display */}
      <div className="session-section">
        <label className="session-label">Session ID:</label>
        <div className="session-display">
          <span 
            className="session-id" 
            onClick={selectSessionText}
            title="Click to select session ID"
          >
            {sessionId || "Generating..."}
          </span>
          <button 
            className="copy-session-btn"
            onClick={copySessionId}
            title="Copy Session ID"
            disabled={!sessionId || clipboard.state.isLoading}
          >
            {clipboard.state.isLoading ? "⏳" : "📋"}
          </button>
        </div>
        
        {/* Session copy feedback */}
        {sessionCopyFeedback && (
          <div 
            className={`copy-feedback session-copy-feedback ${
              sessionCopyFeedback.includes("❌") ? "error" : ""
            }`}
            role="status"
            aria-live="polite"
          >
            {sessionCopyFeedback}
          </div>
        )}
      </div>

      {/* Connection Action */}
      <div className="connection-section">
        <button 
          className="copy-prompt-btn primary"
          onClick={onCopyConnectionPrompt}
          disabled={!sessionId || isLoading}
        >
          {isLoading ? "⏳" : "📋"} Copy Claude Connect Prompt
        </button>
        <div className="connection-hint">
          Copy this prompt and paste it into Claude Desktop to connect
        </div>
        
        {/* Prompt copy feedback */}
        {promptCopyFeedback && (
          <div 
            className={`copy-feedback prompt-copy-feedback ${
              promptCopyFeedback.includes("❌") ? "error" : ""
            }`}
            role="status"
            aria-live="polite"
          >
            {promptCopyFeedback}
          </div>
        )}
      </div>

      {/* Setup Help */}
      <div className="help-section">
        <a 
          href="#" 
          className="setup-link"
          onClick={(e) => {
            e.preventDefault();
            onShowSetupGuide();
          }}
        >
          First time? Get my Claude Ready →
        </a>
      </div>
    </div>
  );
}; 
