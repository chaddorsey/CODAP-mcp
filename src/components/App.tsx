import React, { useEffect, useState, useRef, useCallback } from "react";
import { initializePlugin } from "@concord-consortium/codap-plugin-api";
import { ClaudeConnectionPanel } from "./ClaudeConnectionPanel";
import { ClaudeSetupModal } from "./ClaudeSetupModal";
import { createSessionService } from "../services";
import { useBrowserWorker } from "../hooks/useBrowserWorker";
import { useClipboard } from "../hooks/useClipboard";
import { generateClaudeConnectionPrompt, generateConnectionInstructions } from "../utils/claudeInstructions";
import "./App.css";
import "../styles/claude-integration.css";

const RELAY_BASE_URL = "https://codap-mcp-stable.vercel.app";

export const App = () => {
  // Core state for Claude MVP
  const [sessionId, setSessionId] = useState<string>("");
  const [relayConnected, setRelayConnected] = useState(false);
  const [relayConnecting, setRelayConnecting] = useState(false);
  const [claudeConnected, setClaudeConnected] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Prevent multiple initializations
  const initializationRef = useRef(false);

  // Services
  const sessionService = createSessionService(RELAY_BASE_URL);
  const clipboard = useClipboard();

  // Stable initialization function
  const initializeSession = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;

    try {
      setIsInitializing(true);
      setInitializationError(null);

      // Initialize CODAP plugin
      try {
        await initializePlugin({
          pluginName: "CODAP + Claude AI",
          version: "1.0.0",
          dimensions: { width: 415, height: 295 } // Increased height by 25px for modal visibility
        });
        console.log("CODAP plugin initialized");
      } catch (error) {
        console.log("CODAP plugin initialization had issues, but continuing...", error);
      }

      // Auto-generate session (only if we don't have one)
      const session = await sessionService.createSession();
      setSessionId(session.code);
      console.log("Session auto-generated:", session.code);

      setIsInitializing(false);
      
    } catch (error) {
      console.error("Auto-initialization failed:", error);
      setInitializationError(error instanceof Error ? error.message : "Failed to initialize");
      setIsInitializing(false);
    } finally {
      initializationRef.current = false;
    }
  }, [sessionService]);

  // Browser worker for automatic startup - only when we have a session
  const browserWorker = useBrowserWorker({
    relayBaseUrl: RELAY_BASE_URL,
    sessionCode: sessionId,
    debug: true, // Enable debug logging to help troubleshoot
    autoStart: Boolean(sessionId), // Only auto-start when we have a valid session
    onStatusChange: (status) => {
      console.log("Browser worker status:", status);
      // Update relay connected state more responsively
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
      // Note: This provides immediate feedback for all connection states
    },
    onError: (error) => {
      console.error("Browser worker error:", error);
      setRelayConnected(false);
    }
  });

  // Auto-initialize CODAP plugin and session on mount
  useEffect(() => {
    // Only initialize if we don't already have a session
    if (!sessionId) {
      initializeSession();
    }
  }, [initializeSession, sessionId]);

  // Start browser worker when session is available
  useEffect(() => {
    if (sessionId && browserWorker && !browserWorker.isRunning) {
      console.log("Starting browser worker for session:", sessionId);
      setRelayConnecting(true); // Set connecting state immediately
      browserWorker.start().catch((error) => {
        console.error("Failed to start browser worker:", error);
        setRelayConnecting(false);
        setRelayConnected(false);
      });
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

  const handleCopyConnectionPrompt = async () => {
    if (!sessionId) return;

    const prompt = generateClaudeConnectionPrompt(sessionId);
    const result = await clipboard.copyToClipboard(prompt);
    
    if (result.success) {
      // Show success notification with instructions
      const instructions = generateConnectionInstructions(sessionId);
      console.log("Connection prompt copied:", instructions);
      
      // You could show a toast notification here
      // For now, we'll log the success
    }
  };

  const handleShowSetupGuide = () => {
    setShowSetupModal(true);
  };

  const handleCloseSetupModal = () => {
    setShowSetupModal(false);
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="codap-mcp-plugin minimal">
        <div className="initialization-loading">
          <div className="loading-spinner">⏳</div>
          <div className="loading-text">Initializing CODAP + Claude...</div>
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

  // Main minimal interface
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
      />
      
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
