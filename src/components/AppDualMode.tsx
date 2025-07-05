import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { initializePlugin } from "@concord-consortium/codap-plugin-api";
import { ClaudeConnectionPanel } from "./ClaudeConnectionPanel";
import { ClaudeSetupModal } from "./ClaudeSetupModal";
import { SageModelerAPIPanel } from "./SageModelerAPIPanel";
import { createSessionService } from "../services";
import { useBrowserWorker } from "../hooks/useBrowserWorker";
import { useClipboard } from "../hooks/useClipboard";
import { generateClaudeConnectionPrompt } from "../utils/claudeInstructions";
import "./App.css";
import "../styles/claude-integration.css";
import { ConnectionStatus, BrowserWorkerError } from "../services/browserWorker";

const RELAY_BASE_URL = "https://codap-mcp-stable.vercel.app";

type PluginMode = "codap" | "sagemodeler";

export const AppDualMode = () => {
  // Core state for Claude MVP
  const [sessionId, setSessionId] = useState<string>("");
  const [relayConnected, setRelayConnected] = useState(false);
  const [relayConnecting, setRelayConnecting] = useState(false);
  const [claudeConnected, setClaudeConnected] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [promptCopyFeedback, setPromptCopyFeedback] = useState<string>("");
  
  // Dual-mode state
  const [pluginMode, setPluginMode] = useState<PluginMode>("codap");
  const [showSageAccordion, setShowSageAccordion] = useState(false);
  const [apiCallLogs, setApiCallLogs] = useState<string[]>([]);

  // Prevent multiple initializations
  const initializationRef = useRef(false);

  // Services
  const sessionService = createSessionService(RELAY_BASE_URL);
  const clipboard = useClipboard();

  // Memoize the config for useBrowserWorker
  const browserWorkerConfig = useMemo(() => ({
    relayBaseUrl: RELAY_BASE_URL,
    sessionCode: sessionId,
    debug: false, // No debug toggle
    autoStart: true, // Ensure worker starts automatically
    capabilities: pluginMode === "sagemodeler" ? ["CODAP", "SAGEMODELER"] : ["CODAP"],
    onStatusChange: (status: ConnectionStatus) => {
      if (status.state === "connected") {
        setRelayConnected(true);
        setRelayConnecting(false);
      } else if (status.state === "connecting" || status.state === "reconnecting") {
        setRelayConnecting(true);
        setRelayConnected(false);
      } else if (status.state === "disconnected" || status.state === "error") {
        setRelayConnected(false);
        setRelayConnecting(false);
      }
    },
    onError: (error: BrowserWorkerError) => {
      setRelayConnected(false);
    }
  }), [sessionId, pluginMode]);

  const browserWorker = useBrowserWorker(browserWorkerConfig);

  // Modified initialization function
  const initializeSession = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    try {
      setIsInitializing(true);
      setInitializationError(null);
      // Only generate a session if not present
      if (!sessionId) {
        const session = await sessionService.createSession();
        setSessionId(session.code);
        console.log("Session auto-generated:", session.code);
      }
      setIsInitializing(false);
    } catch (error) {
      console.error("Auto-initialization failed:", error);
      setInitializationError(error instanceof Error ? error.message : "Failed to initialize");
      setIsInitializing(false);
    } finally {
      initializationRef.current = false;
    }
  }, [sessionService, sessionId]);

  // Auto-initialize session on mount
  useEffect(() => {
    if (!sessionId) {
      initializeSession();
    }
  }, [initializeSession, sessionId]);

  // Add logging to confirm worker start
  useEffect(() => {
    if (sessionId && browserWorker && !browserWorker.isRunning) {
      console.log("[AppDualMode] Attempting to start browser worker for session:", sessionId);
    }
  }, [sessionId, browserWorker]);

  // Listen for Claude connection events
  useEffect(() => {
    const handleClaudeConnection = (event: CustomEvent) => {
      setClaudeConnected(event.detail.connected);
    };

    window.addEventListener("claude-connected", handleClaudeConnection as EventListener);
    return () => {
      window.removeEventListener("claude-connected", handleClaudeConnection as EventListener);
    };
  }, []);

  // Listen for API call logs from SageModeler panel
  useEffect(() => {
    const handleApiCallLog = (event: CustomEvent) => {
      const logEntry = `[${new Date().toISOString()}] ${event.detail.message}`;
      setApiCallLogs(prev => [...prev, logEntry]);
    };

    window.addEventListener("sage-api-call", handleApiCallLog as EventListener);
    return () => {
      window.removeEventListener("sage-api-call", handleApiCallLog as EventListener);
    };
  }, []);

  const handleCopyConnectionPrompt = async () => {
    if (!sessionId) return;

    const prompt = generateClaudeConnectionPrompt(sessionId);
    const result = await clipboard.copyToClipboard(prompt);
    
    if (result.success) {
      setPromptCopyFeedback("✅ Prompt copied! Paste in Claude Desktop to connect.");
    } else {
      setPromptCopyFeedback(`❌ Copy failed: ${result.error || "Unknown error"}`);
    }
    
    // Clear feedback after 5 seconds (longer for this important message)
    setTimeout(() => setPromptCopyFeedback(""), 5000);
  };

  const handleShowSetupGuide = () => {
    setShowSetupModal(true);
  };

  const handleCloseSetupModal = () => {
    setShowSetupModal(false);
  };

  const handleModeSwitch = (newMode: PluginMode) => {
    setPluginMode(newMode);
    setShowSageAccordion(false); // Close accordion when switching modes
    
    // Log the mode switch
    const logEntry = `[${new Date().toISOString()}] Mode switched to: "${newMode}"`;
    setApiCallLogs(prev => [...prev, logEntry]);
  };

  const handleClearLogs = () => {
    setApiCallLogs([]);
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="codap-mcp-plugin minimal">
        <div className="initialization-loading">
          <div className="loading-spinner">⏳</div>
          <div className="loading-text">
            Initializing {pluginMode === "codap" ? "CODAP" : "SageModeler"} + Claude...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (initializationError) {
    return (
      <div className="codap-mcp-plugin minimal">
        <div className="initialization-error">
          <div className="error-icon">❌</div>
          <div className="error-text">
            <strong>Initialization Failed</strong>
            <br />
            {initializationError}
          </div>
          <button 
            className="retry-btn"
            onClick={initializeSession}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Main dual-mode interface
  return (
    <div className="codap-mcp-plugin minimal">
      <ClaudeConnectionPanel
        sessionId={sessionId}
        relayConnected={relayConnected}
        relayConnecting={relayConnecting}
        claudeConnected={claudeConnected}
        onCopyConnectionPrompt={handleCopyConnectionPrompt}
        onShowSetupGuide={handleShowSetupGuide}
        isLoading={clipboard.state.isLoading}
        promptCopyFeedback={promptCopyFeedback}
        pluginMode={pluginMode}
      />
      
      {/* SageModeler API Panel - only visible in SageModeler mode */}
      {pluginMode === "sagemodeler" && (
        <SageModelerAPIPanel
          isVisible={showSageAccordion}
          onToggle={() => setShowSageAccordion(!showSageAccordion)}
          apiCallLogs={apiCallLogs}
          onClearLogs={handleClearLogs}
          browserWorker={browserWorker.service}
        />
      )}
      
      {/* Mode Switch Controls - positioned in lower-left corner */}
      <div className="mode-switch-controls">
        <span className="mode-switch-label">Mode:</span>
        <button
          className={`mode-switch-btn ${pluginMode === "codap" ? "active" : ""}`}
          onClick={() => handleModeSwitch("codap")}
        >
          CODAP
        </button>
        <span className="mode-switch-separator">|</span>
        <button
          className={`mode-switch-btn ${pluginMode === "sagemodeler" ? "active" : ""}`}
          onClick={() => handleModeSwitch("sagemodeler")}
        >
          SageModeler
        </button>
      </div>
      
      {showSetupModal && (
        <ClaudeSetupModal
          sessionId={sessionId}
          isOpen={showSetupModal}
          onClose={handleCloseSetupModal}
          relayBaseUrl={RELAY_BASE_URL}
        />
      )}
    </div>
  );
}; 
