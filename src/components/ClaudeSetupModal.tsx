import React, { useState, useCallback, useMemo } from "react";
import { useClipboard } from "../hooks/useClipboard";
import { generateClaudeMCPConfig } from "../utils/claudeInstructions";
import "./ClaudeSetupModal.css";

interface ClaudeSetupModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  relayBaseUrl: string;
}

export const ClaudeSetupModal: React.FC<ClaudeSetupModalProps> = ({
  sessionId,
  isOpen,
  onClose,
  relayBaseUrl
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const clipboard = useClipboard();

  // Memoize the configuration to avoid recreating on every render
  const claudeConfig = useMemo(() => JSON.parse(generateClaudeMCPConfig()), []);

  const handleCopyConfiguration = useCallback(async () => {
    try {
      const configText = generateClaudeMCPConfig(); // Use the string directly
      const result = await clipboard.copyToClipboard(configText);
      if (result.success) {
        setCopyFeedback("Configuration copied to clipboard!");
      } else {
        setCopyFeedback(`Failed to copy: ${result.error || "Unknown error"}`);
      }
      setTimeout(() => setCopyFeedback(""), 3000);
    } catch {
      setCopyFeedback("Failed to copy configuration");
      setTimeout(() => setCopyFeedback(""), 3000);
    }
  }, [clipboard]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="claude-setup-modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="claude-setup-modal-title"
    >
      <div className="claude-setup-modal">
        <div className="claude-setup-modal-header">
          <h3 id="claude-setup-modal-title">Set up Claude Desktop MCP</h3>
          <button
            type="button"
            className="claude-setup-modal-close"
            onClick={onClose}
            aria-label="Close setup modal"
          >
            ✕
          </button>
        </div>

        <div className="claude-setup-modal-content">
          <div className="claude-setup-config-section">
            <div className="claude-setup-config-header">
              <span>
                Configuration JSON (one-time setup): 
                <a 
                  href="#"
                  className="claude-setup-copy-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCopyConfiguration();
                  }}
                >
                  Copy 📋
                </a>
              </span>
            </div>
            
            <pre className="claude-setup-config-block">
              {JSON.stringify(claudeConfig, null, 2)}
            </pre>
            
            {copyFeedback && (
              <div 
                className="claude-setup-copy-feedback"
                role="status"
                aria-live="polite"
              >
                {copyFeedback}
              </div>
            )}
          </div>

          <div className="claude-setup-instructions">
            <h4>Configuration File Location:</h4>
            <ul className="claude-setup-file-locations">
              <li>
                <strong>macOS:</strong> 
                <code>~/.config/claude-desktop/claude_desktop_config.json</code>
              </li>
              <li>
                <strong>Windows:</strong> 
                <code>%APPDATA%\Claude\claude_desktop_config.json</code>
              </li>
              <li>
                <strong>Linux:</strong> 
                <code>~/.config/claude-desktop/claude_desktop_config.json</code>
              </li>
            </ul>
            
            <div className="claude-setup-final-steps">
              <h4>Setup Steps:</h4>
              <ol>
                <li>Copy the configuration above</li>
                <li>Add it to your Claude Desktop config file</li>
                <li>Restart Claude Desktop</li>
                <li>Return to CODAP and copy connection instructions</li>
                <li>Tell Claude: &quot;Connect to CODAP session {sessionId}&quot;</li>
              </ol>
              

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 

