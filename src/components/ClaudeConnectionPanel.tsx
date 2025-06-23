import React from "react";
import { StatusIndicator } from "./StatusIndicator";

interface ClaudeConnectionPanelProps {
  sessionId: string;
  relayConnected: boolean;
  relayConnecting?: boolean;
  claudeConnected: boolean;
  onCopyConnectionPrompt: () => void;
  onShowSetupGuide: () => void;
  isLoading?: boolean;
}

export const ClaudeConnectionPanel: React.FC<ClaudeConnectionPanelProps> = ({ 
  sessionId, 
  relayConnected, 
  relayConnecting = false,
  claudeConnected, 
  onCopyConnectionPrompt,
  onShowSetupGuide,
  isLoading = false
}) => {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log("Session ID copied to clipboard");
    }).catch(err => {
      console.error("Failed to copy session ID:", err);
    });
  };

  return (
    <div className="claude-connection-panel">
      {/* Header */}
      <div className="panel-header">
        <h2>🤖 CODAP + Claude AI</h2>
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
            onClick={() => copyToClipboard(sessionId)}
            title="Copy Session ID"
            disabled={!sessionId}
          >
            📋
          </button>
        </div>
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
