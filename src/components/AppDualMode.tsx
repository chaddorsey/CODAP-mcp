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

  // Add state for SageModeler info message and session ID flash
  const [showSageInfo, setShowSageInfo] = useState(false);
  const [flashSessionId, setFlashSessionId] = useState(false);

  // Prevent multiple initializations
  const initializationRef = useRef(false);

  // Determine capabilities based on manual mode selection and auto-detection
  const determineCapabilities = useCallback((): string[] => {
    // PRIORITY 1: If manually set to SageModeler mode, ALWAYS enable dual capabilities (regardless of detection)
    if (pluginMode === "sagemodeler") {
      console.log("🎯 Manual SageModeler mode - enabling dual capabilities (forced)");
      return ["CODAP", "SAGEMODELER"];
    }
    
    // PRIORITY 2: If in CODAP mode, check if SageModeler is actually available for auto-upgrade
    const sageAPI = (window as any).SageAPI;
    const hasSageModeler = sageAPI && typeof sageAPI.isApiInitialized === "function" && sageAPI.isApiInitialized();
    
    if (hasSageModeler) {
      console.log("🎯 SageModeler detected and available - enabling dual capabilities (auto-upgrade)");
      return ["CODAP", "SAGEMODELER"];
    } else {
      console.log("📋 CODAP-only mode - using CODAP capabilities");
      return ["CODAP"];
    }
  }, [pluginMode]);

  // Services
  const sessionService = createSessionService(RELAY_BASE_URL);
  const clipboard = useClipboard();

  // Memoize the config for useBrowserWorker
  const browserWorkerConfig = useMemo(() => {
    // Use determined capabilities based on manual mode selection and auto-detection
    const capabilities = determineCapabilities();
    
    return {
      relayBaseUrl: RELAY_BASE_URL,
      sessionCode: sessionId,
      debug: false, // No debug toggle
      autoStart: true, // Ensure worker starts automatically
      capabilities,
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
    };
  }, [sessionId, determineCapabilities]);

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
        // Determine capabilities based on manual mode selection and auto-detection
        const capabilities = determineCapabilities();
        
        // Auto-set plugin mode based on detected capabilities (only if currently in CODAP mode)
        if (capabilities.includes("SAGEMODELER") && pluginMode === "codap") {
          setPluginMode("sagemodeler");
          console.log("🎯 Auto-switching to SageModeler mode due to detected capabilities");
        }
        
        const session = await sessionService.createSession(capabilities);
        setSessionId(session.code);
        console.log("Session auto-generated:", session.code, "with capabilities:", capabilities);
      }
      setIsInitializing(false);
    } catch (error) {
      console.error("Auto-initialization failed:", error);
      setInitializationError(error instanceof Error ? error.message : "Failed to initialize");
      setIsInitializing(false);
    } finally {
      initializationRef.current = false;
    }
  }, [sessionService, sessionId, pluginMode, determineCapabilities]);

  // Auto-initialize session on mount with small delay to allow SageModeler to initialize
  useEffect(() => {
    if (!sessionId) {
      // Small delay to allow SageModeler to initialize if present
      const timer = setTimeout(() => {
        initializeSession();
      }, 500); // 500ms delay
      
      return () => clearTimeout(timer);
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
    setShowSageAccordion(false);
    setSessionId(""); // Clear session to trigger new session creation with new capabilities
    
    // Show SageModeler info message if switching to SageModeler
    if (newMode === "sagemodeler") {
      setShowSageInfo(true);
      setTimeout(() => setShowSageInfo(false), 30000); // Hide after 30 seconds
    } else {
      setShowSageInfo(false);
    }
    
    // Log the mode switch with capability info
    // Note: We need to determine capabilities after the mode switch, so we simulate the new mode
    const capabilities = newMode === "sagemodeler" ? ["CODAP", "SAGEMODELER"] : ["CODAP"];
    const logEntry = `[${new Date().toISOString()}] Mode switched to: "${newMode}" (capabilities: ${capabilities.join(", ")})`;
    setApiCallLogs(prev => [...prev, logEntry]);
  };

  const handleClearLogs = () => {
    setApiCallLogs([]);
  };

  // Flash session ID when it changes
  useEffect(() => {
    if (sessionId) {
      setFlashSessionId(true);
      const timeout = setTimeout(() => setFlashSessionId(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [sessionId]);

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
        showSageInfo={showSageInfo}
        flashSessionId={flashSessionId}
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
